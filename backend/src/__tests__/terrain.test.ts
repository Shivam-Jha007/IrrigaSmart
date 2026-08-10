import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aspectFor, buildPoints, fetchTerrain, slopeFrom, TerrainProviderError } from '../terrain.js';

/**
 * Terrain slope provider tests (item 10).
 *
 * Three real provider captures back these tests, each chosen because it pins
 * down something the design depends on. Reproduce any of them yourself:
 *
 *   # Birbhum reference farm — gentle real slope
 *   curl -s "https://api.open-meteo.com/v1/elevation?latitude=23.677,23.678347,23.675653,23.677,23.677&longitude=87.685,87.685,87.685,87.68747,87.68253"
 *
 *   # Punjab plain — flat ground, and the DEM's noise floor
 *   curl -s "https://api.open-meteo.com/v1/elevation?latitude=30.9,30.901347,30.898653,30.9,30.9&longitude=75.85,75.85,75.85,75.851566,75.848434"
 *
 *   # Manali valley side — a genuinely steep hill this method under-reports
 *   curl -s "https://api.open-meteo.com/v1/elevation?latitude=32.24,32.241347,32.238653,32.24,32.24&longitude=77.19,77.19,77.19,77.191593,77.188407"
 *
 * Read from disk rather than `import`: the backend compiles as NodeNext ESM,
 * where a JSON import needs an import attribute, and leaving the captures as
 * plain .json files keeps them diff-able against a fresh curl.
 */

interface Capture {
  elevation: number[];
}

function fixture(name: string): Capture {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8'),
  ) as Capture;
}

const BIRBHUM = fixture('elevation.birbhum.json');
const PUNJAB_FLAT = fixture('elevation.punjab-flat.json');
const MANALI_STEEP = fixture('elevation.manali-steep.json');

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Stub fetch with a single JSON reply. */
function stubJson(body: unknown, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok,
        status,
        json: () => Promise.resolve(body),
      } as unknown as Response),
    ),
  );
}

describe('buildPoints', () => {
  it('places the centre first, then N, S, E, W', () => {
    const p = buildPoints(23.677, 87.685);
    expect(p.latitudes[0]).toBeCloseTo(23.677, 10);
    expect(p.longitudes[0]).toBeCloseTo(87.685, 10);
    // 150 m of latitude is 150/111320 deg regardless of where on Earth you are.
    expect(p.latitudes[1]).toBeCloseTo(23.677 + 150 / 111_320, 9);
    expect(p.latitudes[2]).toBeCloseTo(23.677 - 150 / 111_320, 9);
    // N/S share the centre longitude; E/W share the centre latitude.
    expect(p.longitudes[1]).toBe(87.685);
    expect(p.longitudes[2]).toBe(87.685);
    expect(p.latitudes[3]).toBe(23.677);
    expect(p.latitudes[4]).toBe(23.677);
  });

  it('widens the longitude offset by 1/cos(lat) so both arms span 150 m', () => {
    // Without this the east-west arm would be ~9% shorter than the north-south
    // one at this latitude, and the two gradient components would be measured
    // over different baselines — a slope error that grows towards the poles.
    const p = buildPoints(23.677, 87.685);
    const dLon = p.longitudes[3]! - 87.685;
    const expected = 150 / 111_320 / Math.cos((23.677 * Math.PI) / 180);
    expect(dLon).toBeCloseTo(expected, 9);
    expect(dLon).toBeGreaterThan(150 / 111_320);
  });

  it('grows the correction with latitude', () => {
    const near = buildPoints(10, 0).longitudes[3]!;
    const far = buildPoints(60, 0).longitudes[3]!;
    // At 60° a degree of longitude is half as long, so the offset doubles.
    expect(far).toBeCloseTo(near * (Math.cos((10 * Math.PI) / 180) / Math.cos((60 * Math.PI) / 180)), 6);
    expect(buildPoints(23.677, 87.685).eastWestUsable).toBe(true);
  });

  it('abandons the east-west arm at the poles instead of overflowing it', () => {
    // cos(89.9°) is ~0.0017, so 1/cos would throw the sample thousands of km
    // east — past the meridian and onto different ground entirely.
    const p = buildPoints(89.9, 0);
    expect(p.eastWestUsable).toBe(false);
    expect(p.longitudes[3]).toBe(0);
    expect(p.longitudes[4]).toBe(0);
  });

  it('clamps latitude at the pole rather than asking for one past 90', () => {
    // The provider answers 400 for latitude > 90, which would turn a farm near
    // the pole into a hard failure instead of a slope reading.
    const p = buildPoints(89.999, 0);
    expect(Math.max(...p.latitudes)).toBeLessThanOrEqual(90);
    expect(Math.min(...p.latitudes)).toBeGreaterThanOrEqual(-90);
  });

  it('wraps longitude across the antimeridian instead of clamping it', () => {
    // 180.001 and -179.999 are the same ground; clamping would sample a point
    // 150 m away from where it was asked to.
    const p = buildPoints(0, 179.9995);
    for (const lon of p.longitudes) {
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(180);
    }
    expect(p.longitudes[3]).toBeLessThan(0);
  });
});

describe('aspectFor', () => {
  it('maps bearings onto the 8-point compass, nearest wins', () => {
    expect(aspectFor(0)).toBe('N');
    expect(aspectFor(44)).toBe('NE');
    expect(aspectFor(90)).toBe('E');
    expect(aspectFor(180)).toBe('S');
    expect(aspectFor(270)).toBe('W');
    expect(aspectFor(315)).toBe('NW');
    // 359° is nearer to N than to NW, and 360 must not fall off the end.
    expect(aspectFor(359)).toBe('N');
    expect(aspectFor(360)).toBe('N');
  });

  it('normalises bearings outside 0-360', () => {
    expect(aspectFor(-90)).toBe('W');
    expect(aspectFor(450)).toBe('E');
  });
});

describe('slopeFrom', () => {
  it('computes the Birbhum capture by hand-checkable geometry', () => {
    // [61, 66, 57, 60, 58]: rises 9 m north-to-south over 300 m and 2 m
    // west-to-east over 300 m. Slope is the gradient MAGNITUDE, not either arm
    // alone and not their mean: hypot(0.03, 0.006667) = 3.073%.
    const d = slopeFrom(BIRBHUM.elevation, true)!;
    expect(d.slopePercent).toBeCloseTo(Math.hypot(9 / 300, 2 / 300) * 100, 10);
    expect(d.slopePercent).toBeCloseTo(3.073, 3);
    expect(d.centreM).toBe(61);
    // Ground falls to the south and to the west, so water runs south-southwest.
    expect(d.aspectDegrees).toBeCloseTo(192.53, 1);
    expect(aspectFor(d.aspectDegrees!)).toBe('S');
  });

  it('points aspect downhill, not uphill', () => {
    // This is the assertion that would catch a dropped sign. Land high in the
    // north must send water SOUTH; reporting 'N' would send a farmer looking
    // for erosion at the top of their field.
    const d = slopeFrom([100, 130, 70, 100, 100], true)!;
    expect(d.aspectDegrees).toBeCloseTo(180, 6);
    expect(aspectFor(d.aspectDegrees!)).toBe('S');

    const east = slopeFrom([100, 100, 100, 130, 70], true)!;
    expect(aspectFor(east.aspectDegrees!)).toBe('W');
  });

  it('reports no aspect at all on perfectly level ground', () => {
    // atan2(0, 0) is 0, which would name 'N' for a field with no downhill at
    // all — a direction invented out of nothing.
    const d = slopeFrom([50, 50, 50, 50, 50], true)!;
    expect(d.slopePercent).toBe(0);
    expect(d.aspectDegrees).toBeNull();
  });

  it('records the DEM noise floor on ground that is genuinely flat', () => {
    // Punjab plain: flat to the eye for kilometres, yet the capture reads
    // 250/250/260/250/253. ~3.4% out of pure DEM error — and almost exactly
    // the Birbhum farm's real 3.07%. This is why the consumer needs a deadband
    // and why `confidence` can never be better than 'approximate'.
    const d = slopeFrom(PUNJAB_FLAT.elevation, true)!;
    expect(d.slopePercent).toBeGreaterThan(3);
    expect(d.slopePercent).toBeLessThan(4);
  });

  it('under-reports a genuinely steep hillside', () => {
    // Manali, on a valley side well past 30% in reality, reads ~5.7%: a 300 m
    // baseline averages across a hill rather than measuring it. Slope from this
    // source may therefore never be used to tell a farmer a slope is safe.
    const d = slopeFrom(MANALI_STEEP.elevation, true)!;
    expect(d.slopePercent).toBeLessThan(8);
    expect(d.slopePercent).toBeGreaterThan(4);
  });

  it('falls back to a half-cross when one arm is missing', () => {
    // A lost point must not be read as zero elevation (which would fabricate a
    // cliff) nor as zero gradient (which would flatten a real slope). The
    // surviving half-arm is measured over 150 m instead of 300.
    const d = slopeFrom([100, null, 70, 100, 100], true)!;
    expect(d.slopePercent).toBeCloseTo((30 / 150) * 100, 6);
    expect(aspectFor(d.aspectDegrees!)).toBe('S');
  });

  it('ignores the east-west arm when the caller says it is unusable', () => {
    // Near the poles buildPoints collapses E/W onto the centre longitude, so
    // those samples are duplicates of the centre and carry no gradient.
    const d = slopeFrom([100, 130, 70, 100, 100], false)!;
    expect(d.slopePercent).toBeCloseTo((60 / 300) * 100, 6);
  });

  it('returns null when the centre elevation is unusable', () => {
    // Without a centre there is no elevation to report and no half-cross to
    // fall back on.
    expect(slopeFrom([null, 66, 57, 60, 58], true)).toBeNull();
    expect(slopeFrom([Number.NaN, 66, 57, 60, 58], true)).toBeNull();
  });

  it('returns null when every neighbour is missing', () => {
    expect(slopeFrom([61, null, null, null, null], true)).toBeNull();
  });

  it('treats a genuine sea-level zero as usable, not as absent', () => {
    // 0 m is a real elevation over much of coastal India. A falsy check here
    // would deny those farms terrain entirely.
    const d = slopeFrom([0, 3, 0, 0, 0], true)!;
    expect(d.centreM).toBe(0);
    expect(d.slopePercent).toBeGreaterThan(0);
  });
});

describe('fetchTerrain', () => {
  it('rejects coordinates outside the valid range', async () => {
    // The only throwing path. Everything else degrades to `unavailable`.
    await expect(fetchTerrain(91, 0)).rejects.toBeInstanceOf(TerrainProviderError);
    await expect(fetchTerrain(0, 181)).rejects.toBeInstanceOf(TerrainProviderError);
    await expect(fetchTerrain(Number.NaN, 0)).rejects.toBeInstanceOf(TerrainProviderError);
    await expect(fetchTerrain(0, 0)).resolves.toBeDefined;
  });

  it('carries a 400 status on the error so the route can pass it through', async () => {
    await expect(fetchTerrain(91, 0)).rejects.toMatchObject({ status: 400 });
  });

  it('asks the provider for five points in exactly one request', async () => {
    // The whole cost argument for this feature is one request per farm, ever.
    const spy = vi.fn((_url: string | URL) =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(BIRBHUM) } as unknown as Response),
    );
    vi.stubGlobal('fetch', spy);

    await fetchTerrain(23.677, 87.685);

    expect(spy).toHaveBeenCalledTimes(1);
    const url = new URL(String(spy.mock.calls[0]![0]));
    expect(url.searchParams.get('latitude')!.split(',')).toHaveLength(5);
    expect(url.searchParams.get('longitude')!.split(',')).toHaveLength(5);
  });

  it('returns a usable payload from the reference capture', async () => {
    stubJson(BIRBHUM);
    const t = await fetchTerrain(23.677, 87.685);
    expect(t.source).toBe('dem');
    expect(t.slopePercent).toBe(3.07);
    expect(t.aspect).toBe('S');
    expect(t.elevationM).toBe(61);
    expect(t.sampleSpacingM).toBe(150);
    expect(t.confidence).toBe('approximate');
    expect(t.fallbackReason).toBeNull();
  });

  it('never claims better than approximate confidence, whatever comes back', async () => {
    // A steep, clean, unambiguous reading is still a ~90 m DEM over 300 m.
    for (const capture of [BIRBHUM, PUNJAB_FLAT, MANALI_STEEP]) {
      stubJson(capture);
      const t = await fetchTerrain(23.677, 87.685);
      expect(t.confidence).toBe('approximate');
    }
  });

  it('degrades to unavailable when the provider is unreachable', async () => {
    // Item 0: a farm must stay creatable when this provider is down, so the
    // failure is a payload rather than a throw.
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('ENOTFOUND'))));
    const t = await fetchTerrain(23.677, 87.685);
    expect(t.source).toBe('unavailable');
    expect(t.slopePercent).toBeNull();
    expect(t.elevationM).toBeNull();
    expect(t.fallbackReason).toBe('terrain provider is unreachable');
  });

  it('degrades on a non-OK status and names it', async () => {
    stubJson({}, false, 429);
    const t = await fetchTerrain(23.677, 87.685);
    expect(t.source).toBe('unavailable');
    expect(t.fallbackReason).toBe('terrain provider returned 429');
  });

  it('degrades on an unreadable body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error('not json')),
        } as unknown as Response),
      ),
    );
    const t = await fetchTerrain(23.677, 87.685);
    expect(t.source).toBe('unavailable');
    expect(t.fallbackReason).toBe('terrain provider returned an unreadable response');
  });

  it('refuses a short elevation array rather than misreading the indices', async () => {
    // Position is meaning here: index 1 is north and index 2 is south. Fewer
    // points back than were asked for and those indices no longer hold, so a
    // truncated reply could flip the aspect 180°.
    stubJson({ elevation: [61, 66, 57] });
    const t = await fetchTerrain(23.677, 87.685);
    expect(t.source).toBe('unavailable');
    expect(t.fallbackReason).toBe('terrain provider returned an incomplete elevation set');
  });

  it('degrades when the array is present but carries nothing usable', async () => {
    stubJson({ elevation: [null, null, null, null, null] });
    const t = await fetchTerrain(23.677, 87.685);
    expect(t.source).toBe('unavailable');
    expect(t.fallbackReason).toBe('terrain provider returned no usable elevation');
  });

  it('reports level ground as zero slope with no aspect, not as unavailable', async () => {
    // "Measured, and it is flat" and "could not measure" are different facts
    // and the frontend shows different things for them.
    stubJson({ elevation: [200, 200, 200, 200, 200] });
    const t = await fetchTerrain(23.677, 87.685);
    expect(t.source).toBe('dem');
    expect(t.slopePercent).toBe(0);
    expect(t.aspect).toBeNull();
    expect(t.aspectDegrees).toBeNull();
  });
});
