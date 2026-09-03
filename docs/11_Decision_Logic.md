# 11_Decision_Logic.md

# IrrigaSmart

## Decision Logic Specification

Version: 1.6

Status: Active

---

# Purpose

This document defines the **deterministic logic** that converts Knowledge Base facts and weather data into an irrigation recommendation.

It is the missing link between:

- `02_Decision_Engine.md` — which defines the pipeline **stages** but explicitly excludes formulas.
- `10_Knowledge_Base.md` — which defines agronomic **facts** but explicitly excludes algorithms.

This document owns **how facts combine into a recommendation**: the formulas, parameters, thresholds, and mappings required for the engine to satisfy the Engineering Rule "same input always produces the same output."

This document does not define code, data storage, or UI. It defines behavior precisely enough to be implemented and unit-tested directly.

**Version 1.2 changes** (driven by `12_Product_Roadmap_v2.md` Features 4–6):

- Step 4b — soil-moisture carryover deficit from recent days' rainfall (Feature 6).
- Step 10 — decision factors with relative influence (Feature 4).
- Step 11 — multi-day irrigation plan (Feature 5).
- Section 9 — new parameter tables for the above.
- Section 10 Assumption 5 — revised: the engine now models a bounded multi-day carryover.

**Version 1.3 changes** (driven by `12_Product_Roadmap_v2.md` Feature 8):

- Step 2 — seasonal ETo factor (`seasonFactor`) shifts the demand baseline by Indian cropping season.
- Section 9 — seasonal ETo factor table.

**Version 1.4 changes** (driven by `12_Product_Roadmap_v2.md` Version 1.3 Feature 9):

- Step 12 — weather-based disease risk assessment, reading the same daily series and affecting nothing in Steps 1–11.
- Section 9 — disease risk parameter table.

**Version 1.5 changes** (accuracy correction, no new feature):

- Step 2 — **ETc_adj now uses provider-computed FAO-56 Penman-Monteith ETo** (`et0FaoMm`) when available. `ETo_ref`, `seasonFactor` and `weatherMultiplier` are demoted to a **per-day fallback** for days that lack it.
- Step 2 — records why the multiplier must NOT be applied to a measured ETo (double-counting), with the measured magnitude of the V1.4 error.
- Step 4b, Step 11 — daily demand delegates to the Step 2 formula instead of restating the approximation.
- Section 9 — `ETo_ref`, seasonal factors and the multiplier are marked fallback-only.
- Section 10 Assumption 3 — revised: ETo **is** computed, by the provider.

This version changes recommendation **values** for every farm with a post-V1.5 weather cache. That is deliberate: the V1.4 formula systematically overstated demand (Step 2), so advice moves downward towards the FAO-56 reference.

**Version 1.6 changes** (accuracy correction, no new feature):

- Step 4b — the unbounded carryover deficit is **replaced by the FAO-56 root-zone water balance**: total available water (`TAW`), readily available water (`RAW`) and root-zone depletion (`Dr`). The soil now has a finite capacity, and depletion carries across days as persisted state rather than being re-derived from two days of weather.
- Step 4 — `NIR` becomes the depletion to be refilled (`Dr`), not `ETc_adj − Pe + D_past`.
- Step 5 — the irrigation trigger becomes `Dr ≥ RAW`, the FAO-56 stress threshold, in place of the soil `skipThreshold`. `skipThreshold` is retained only for the pre-V1.6 fallback path.
- Step 11 — the plan chains `Dr` over forecast days with the same rule, so plan days and today's decision use one mechanism.
- Section 9 — new water-balance parameters; root depths (`Zr`) and depletion fractions (`p`) are agronomic facts and live in `10_Knowledge_Base.md` §3.3, soil hydraulic properties in §4.3.
- Section 10 Assumption 5 — revised: the engine now models a bounded root-zone water balance.

Why this matters: before V1.6 the engine was **open loop**. It summed demand minus rain over a two-day window with no notion of how much water the soil could hold, and nothing recorded that an irrigation had actually happened. A clay field irrigated yesterday and a sandy field dry for a week could produce the same advice. V1.6 closes the loop: the depletion ledger is updated by what the farmer applied, and the soil's own capacity bounds it.

---

# Relationship to Other Documents

| Concern | Owned by |
|--------|----------|
| Pipeline stages and responsibilities | `02_Decision_Engine.md` |
| Agronomic facts (crops, soils, methods, Kc) | `10_Knowledge_Base.md` |
| Deterministic formulas, parameters, thresholds | **This document** |
| Entity shapes | `03_Data_Models.md` |

If a numeric value influences a recommendation, it is defined **here** and nowhere else.

---

# Parameter Philosophy

All numeric constants in this document are **tunable engineering parameters**, not claimed scientific constants.

They are chosen to be:

- Consistent with the qualitative influence directions already documented in `10_Knowledge_Base.md`.
- Grounded in the FAO-56 framework the Knowledge Base adopts.
- Simple, bounded, and explainable.

Every parameter is defined in one place (Section 9) so it can be adjusted without touching engine logic. Changing a parameter must never require changing the pipeline.

---

# Inputs

The engine consumes exactly two inputs, both already defined elsewhere:

1. A **validated farm profile** (`Farm` + `Crop` + `Soil`, per `03_Data_Models.md`), including current **growth stage**.
2. A **normalized weather summary** (`WeatherData`, per `03_Data_Models.md`), including its observation timestamp.

Knowledge Base values (Kc, efficiencies, factors) are looked up, never passed in.

If any required profile field (Crop, Soil Type, Field Size, Irrigation Method, Location, Growth Stage) is missing, the engine returns a **validation result requesting the missing field** and generates no recommendation (per Decision Engine Stage 1).

---

# Overview of the Computation

```
1.  Look up Kc, root depth Zr and depletion fraction p for crop + growth stage
2.  Compute crop water demand      ETc_adj  (mm/day)
3.  Compute effective rainfall     Pe       (mm)
4.  Update root-zone water balance TAW, RAW, Dr (mm)
5.  Compute net irrigation need    NIR = Dr (mm)
6.  Decide outcome                 Irrigate / Delay / Monitor
7.  Compute applied water          depth (mm) and volume (liters)
8.  Determine recommended time
9.  Compute confidence
10. Generate explanation
```

Each step is deterministic and depends only on its inputs.

---

# Step 1 — Crop Coefficient Lookup

`Kc_stage` is read from the Knowledge Base (`10_Knowledge_Base.md` §3.2):

- Initial, Mid Season, and Late Season are stored explicitly.
- **Development** is interpolated: `Kc_development = (Kc_initial + Kc_mid) / 2`.

Growth stage is a **farmer-provided input** (see Assumptions, Section 10).

---

# Step 2 — Crop Water Demand (ETc_adj)

The Knowledge Base adopts `ETc = Kc × ETo`. As of **V1.5** the weather provider supplies **ETo computed by the FAO-56 Penman-Monteith method** for the farm's coordinates (`et0FaoMm`, see `04_System_Interfaces.md`), so the engine uses it directly. This is the substitution Step 2 anticipated ("Future phases may replace `ETo_ref` with a computed ETo without changing this pipeline") and it does not change any other step.

**Primary path — measured ETo available:**

```
ETc_adj = Kc_stage × ETo_fao(d)
```

**Fallback path — no ETo for that day** (pre-V1.5 cache, or the provider omits the field):

```
ETc_adj = Kc_stage × ETo_ref × seasonFactor(season(d)) × weatherMultiplier(d)
```

The fallback is selected **per day**, not per request: a series may mix days that carry ETo with days that do not, and each day uses the best formula available to it.

## Why the multiplier is NOT applied to measured ETo

`weatherMultiplier`, `ETo_ref` and `seasonFactor` exist only to approximate ETo from the three weather signals the MVP had. FAO-56 Penman-Monteith **already accounts for temperature, humidity, wind and solar radiation** at the farm's location and date. Applying the multiplier or the seasonal factor on top of a measured ETo would count the same physics twice and **inflate demand**.

This is not a theoretical concern. Measured against Open-Meteo archive data for Kolkata (22.57, 88.36), the V1.4 approximation overstated demand by:

| Week | Season | V1.4 formula | FAO-56 ETo | Overstatement |
|------|--------|--------------|------------|---------------|
| 1–7 Jul 2025 | Kharif | 37.3 mm | 26.6 mm | **1.40×** |
| 1–7 May 2025 | Zaid | 48.7 mm | 40.1 mm | **1.22×** |
| 1–7 Jan 2025 | Rabi | 31.9 mm | 21.9 mm | **1.45×** |

Peak single-day error was **2.00×** on a humid monsoon day. Because the error is systematic and upward, the V1.4 path over-advises water in every season — directly against the product's stated purpose. Retaining the multiplier on the measured-ETo path would preserve that error, so it is removed there by design.

`seasonFactor` and `weatherMultiplier` remain **normative for the fallback path only** and are retained in Section 9.

## Weather Multiplier (fallback path only)

A single bounded multiplier derived from the three weather factors the Knowledge Base treats as demand-affecting:

```
adjTemp = clamp( 1 + (T  - T_BASE)  × TEMP_SENS,  TEMP_MIN,  TEMP_MAX )
adjHum  = clamp( 1 + (H_BASE - H)   × HUM_SENS,   HUM_MIN,   HUM_MAX )
adjWind = clamp( 1 + (W  - W_BASE)  × WIND_SENS,  WIND_MIN,  WIND_MAX )

weatherMultiplier = clamp( adjTemp × adjHum × adjWind, WMULT_MIN, WMULT_MAX )
```

Where `T` = temperature (°C), `H` = humidity (%), `W` = wind speed (m/s).

Direction of each term matches the Knowledge Base:
- Hotter than baseline → higher demand.
- Drier than baseline → higher demand.
- Windier than baseline → higher demand.

Cloud cover is **not** used numerically; radiation reaches the engine through the provider's FAO-56 ETo instead. This is intentional and documented rather than silently ignored.

---

# Step 3 — Effective Rainfall (Pe)

Forecast rainfall does not fully offset crop demand; a fraction is lost to runoff/evaporation, and its usefulness depends on soil (Knowledge Base §6.4).

```
Pe = rainfallForecast_mm × rainEffFactor(soil)
```

`rainEffFactor` per soil type is defined in Section 9. Clay retains a larger effective fraction than sandy soil, matching the Knowledge Base principle that the same rainfall remains effective longer on clay.

---

# Step 4 — Net Irrigation Need (NIR)

**V1.6 — primary path (root-zone water balance available):**

```
NIR = Dr_today                          // mm; refill the root zone to field capacity
```

`Dr_today` is the root-zone depletion computed in Step 4b. Irrigating `Dr` millimetres of *net* water returns the root zone to field capacity, which is the FAO-56 target for a full irrigation. Applying more than `Dr` is drainage below the roots, not crop water.

**Fallback path** — used only when no depletion state and no daily series exist (a first run on a pre-V1.6 install, offline, with no cached series):

```
NIR = max( 0, ETc_adj − Pe )            // mm
```

This reproduces the V1.1 single-day formula, which is the most that can be said without any soil-moisture history.

# Step 4b — Root-Zone Water Balance (V1.6)

Replaces the V1.2 carryover deficit. The root zone is modelled as a bucket of finite capacity, following FAO-56 Chapter 8. Three quantities define it.

## Step 4b.1 — Total Available Water (TAW)

The total water the root zone can hold between field capacity and permanent wilting point:

```
TAW = 1000 × ( θ_FC − θ_WP ) × Zr       // mm
```

- `θ_FC`, `θ_WP` — volumetric water content at field capacity and permanent wilting point (m³/m³), a **soil** property from `10_Knowledge_Base.md` §4.3.
- `Zr` — rooting depth in metres, a **crop and growth stage** property from `10_Knowledge_Base.md` §3.3. Development interpolates linearly between Initial and Mid, exactly as Kc does (Step 1).
- The factor 1000 converts metres of water to millimetres.

TAW therefore rises as the crop roots deepen through the season: the same soil offers a young crop far less buffer than a mid-season one, which is why shallow-rooted and early-stage crops need more frequent irrigation.

## Step 4b.2 — Readily Available Water (RAW)

Not all of TAW is extractable without the crop suffering. FAO-56 defines the fraction that is:

```
RAW = p × TAW                            // mm
```

`p` is the depletion fraction for no stress, a per-crop value from `10_Knowledge_Base.md` §3.3. Below `RAW` the crop transpires at its potential rate; beyond it, stomata begin to close and actual ET falls below `ETc` — the crop is under water stress. `RAW` is therefore the irrigation trigger (Step 5).

`p` is **not** adjusted for ETc rate in this version. FAO-56 offers an optional correction (`p_adj = p + 0.04 × (5 − ETc)`); it is omitted deliberately to keep one documented value per crop, and its effect is small at the ETc values Indian field crops see. This is a stated simplification, not an oversight.

## Step 4b.3 — Daily Depletion Update

Depletion `Dr` is the millimetres of water the root zone is short of field capacity. `Dr = 0` means saturated to field capacity; `Dr = TAW` means the wilting point.

```
Dr_after(d) = clamp( Dr_before(d) + ETc_d − Pe_d − I_net_d , 0 , TAW )
```

- `ETc_d` — that day's crop water demand (Step 2 — measured ETo if present, else fallback).
- `Pe_d` — that day's effective rainfall (Step 3).
- `I_net_d` — **net** irrigation actually applied that day, i.e. the gross applied volume converted to depth and multiplied by `efficiency(method)`. Advice that was never acted on contributes nothing.
- The lower clamp at `0` discards water beyond field capacity as deep percolation and runoff; the engine does not model a saturated zone.
- The upper clamp at `TAW` reflects that a root zone cannot be depleted past the wilting point — the crop simply stops extracting.

The balance is carried forward as **persisted state per farm** (`03_Data_Models.md`), not recomputed from a rolling weather window. This is the substantive change from V1.2: an irrigation that happened yesterday is remembered.

## Step 4b.4 — Bringing the Ledger to Today

`Dr` is stored with the date it applies to. When a recommendation is generated, the stored value is rolled forward day by day to today using the daily series:

```
Dr = stored depletion, valid for date t
for each day d from t+1 to today (using that day's own weather record):
    Dr = clamp( Dr + ETc_d − Pe_d − I_net_d , 0 , TAW )
```

Missing days in the series are skipped rather than guessed; skipping under-states depletion, which errs towards advising *less* water, the safer direction for a scarce resource.

## Step 4b.5 — Seeding When No History Exists

A farm with no stored depletion (new farm, or first run after upgrade) must still receive advice. The engine seeds:

```
Dr_seed = RAW                            // assume the crop is at, but not past, the stress threshold
```

then rolls forward from the oldest available day in the daily series. Seeding at `RAW` rather than `0` avoids telling a farmer whose field is genuinely dry to wait, and avoids inventing a full profile of soil moisture the engine cannot know. The recommendation reports reduced confidence until at least one full day of balance has accumulated (Step 8).

If `Zr` or the soil's hydraulic properties are unavailable for the crop or soil in question, the engine falls back to Step 4's fallback path rather than substituting a default bucket size.

---

# Step 5 — Decision Outcome

The engine returns exactly one of the three statuses defined in `02_Decision_Engine.md`.

**V1.6 — primary path (root-zone water balance available):**

```
if Pe ≥ ETc_adj:
        status = "Delay Irrigation"        // forecast rain meets or exceeds demand
else if Dr < RAW:
        status = "Monitor Tomorrow"        // depletion below the stress threshold
else:
        status = "Irrigate Today"           // depletion has reached or passed the stress threshold
```

The trigger `Dr ≥ RAW` is the FAO-56 management allowed depletion: the crop can still transpire at its potential rate below `RAW`, so irrigation can wait; beyond `RAW` it begins to suffer water stress and should be irrigated.

**Fallback path** — used only when no root-zone balance exists (a first run on a pre-V1.6 install, offline, with no cached series):

```
if Pe ≥ ETc_adj:
        status = "Delay Irrigation"
else if NIR < skipThreshold(soil):
        status = "Monitor Tomorrow"
else:
        status = "Irrigate Today"
```

`skipThreshold(soil)` is defined in Section 9. Clay has the highest threshold; sandy the lowest. This reproduces the V1.1 behavior.

No single factor is evaluated in isolation — the outcome is a function of crop stage (via Kc or Zr), soil (via RAW/threshold and rainfall factor), and weather (via ETc_adj and Pe) together, satisfying Reasoning Principle 1.

---

# Step 6 — Water Estimation

Applied only when `status = "Irrigate Today"`. For the other two statuses the estimated amount is `0` for today.

```
grossDepth_mm  = NIR / efficiency(method)
volume_liters  = grossDepth_mm × area_m2
```

- `efficiency(method)` is the numeric application efficiency per irrigation method (Section 9). Lower efficiency → more gross water for the same net need, matching Knowledge Base §5.
- `area_m2` is the farm area converted to square metres (Section 9 conversions). `1 mm applied over 1 m² = 1 litre`, so `volume_liters = grossDepth_mm × area_m2` exactly.

On the V1.6 primary path `NIR = Dr`, so the gross depth is exactly the amount that returns the root zone to field capacity given the method's losses. This makes the estimate self-limiting: a field irrigated yesterday has a small `Dr` and receives a small recommendation, which the V1.2 formula could not express.

Both the **depth (mm)** and the **volume (liters)** are returned. The UI decides which to emphasize; units are metric (see Assumptions).

## Step 6a — Salinity Leaching Uplift (V2.2)

Applied on top of the gross depth, only when BOTH farmer-entered test figures say salts are a live problem:

```
if waterQuality.ECw exists AND soil ECe ≥ 2.0 dS/m:
        LR     = ECw / (5 × ECe_threshold(crop) − ECw)     // FAO-29 eq. 9
        depth  = grossDepth / (1 − LR)                      // when LR ≤ 0.9
        // LR > 0.9 or a non-positive denominator: no uplift; the water-quality
        // improvement issue tells the farmer the water does not suit this crop.
```

- `ECe_threshold(crop)` is the crop's FAO-29 Table 1 (Maas & Hoffman 1977) yield-decline threshold, transcribed in `services/waterQuality.ts` — per crop, not a blanket number: onion tolerates 1.3 dS/m, cotton 7.7, so the same water demands six times the leaching fraction on one as the other.
- The **ECe gate** (≥ 2.0 dS/m, from the soil's own quality reading or the Soil Health Card's EC field) matters as much as the formula: leaching responds to a saline FIELD irrigated with saline water, not to a water report alone. An ECw above zero on a non-saline field is normal and adds nothing.
- Only the threshold — the conservative end of the Maas-Hoffman piecewise curve — is used, so the extra water protects full yield rather than accepting decline.
- The explanation appends one sentence naming the leaching fraction and the extra mm, attributed to FAO-29, in the farmer's language.
- Absent either test: byte-for-byte the pre-V2.2 behaviour (tested).

---

# Step 7 — Recommended Time

The MVP uses a deterministic, evaporation-minimizing heuristic rather than an optimization model:

```
if status == "Irrigate Today":
        recommendedTime = IRRIGATION_TIME_DEFAULT   // early morning
else:
        recommendedTime = null                       // not applicable today
```

Early morning is chosen to minimize evaporative loss. This is a documented heuristic, not a scientific scheduling claim. `IRRIGATION_TIME_DEFAULT` is in Section 9.

---

# Step 8 — Confidence

Confidence reflects **information quality**, not correctness (Reasoning Principle 6). It is derived from weather freshness and profile completeness only.

```
weatherAgeHours = now − weather.observationTime

if requiredProfileComplete AND weatherAgeHours ≤ FRESH_MAX_HOURS:
        confidence = "High"
else if requiredProfileComplete AND weatherAgeHours ≤ STALE_MAX_HOURS:
        confidence = "Medium"
else:
        confidence = "Low"     // stale/absent weather, or optional data missing
```

Thresholds (`FRESH_MAX_HOURS`, `STALE_MAX_HOURS`) are in Section 9. When weather is unavailable and cached weather is used, `weatherAgeHours` is computed from the cached observation time; if no weather exists at all, confidence is `Low` and the explanation states weather was unavailable.

`STALE_MAX_HOURS` is the "preferred age" referenced but left undefined in `02_Decision_Engine.md` — it is now defined here.

---

# Step 9 — Explanation Generation

Every recommendation includes a human-readable explanation naming the **major contributing factors** (Reasoning Principle 5). The explanation is assembled deterministically from the factors that drove the outcome:

- Growth stage and its demand level (from Kc).
- Soil behavior (retention/frequency).
- Rainfall contribution (whether it reduced or removed the need).
- Notable weather (only factors that moved the multiplier meaningfully).
- Irrigation method (as it affects applied amount).

The explanation must translate values into plain language (per Decision Engine Stage 6): e.g., "Rain expected today is enough to meet your crop's needs, so you can delay irrigation." Numeric internals (Kc, multipliers) are **not** shown to the farmer.

---

# Step 10 — Decision Factors (V1.2)

Every recommendation includes the eight roadmap Feature 4 factors — crop, growth stage, temperature, rainfall, humidity, wind, soil type, irrigation method — each with a **relative influence** (`increases` / `decreases` / `neutral`) and a **strength** (`strong` / `moderate` / `weak`). Factors are a deterministic *explanation* of the outcome; they never change it. Weather factors are omitted when no weather exists.

| Factor | increases (raises need/amount) | decreases (lowers need) | Strength rule |
|--------|-------------------------------|--------------------------|---------------|
| Crop | Kc ≥ KC_HIGH | Kc ≤ KC_LOW | strong at extremes, else weak/moderate |
| Growth stage | Mid Season (strong) | Initial / Late Season (moderate) | Development → neutral/weak |
| Temperature | T ≥ T_BASE + TEMP_STRONG_DELTA (strong); T > T_BASE (moderate) | T ≤ T_BASE − TEMP_STRONG_DELTA (moderate) | by \|T − T_BASE\| vs TEMP_STRONG_DELTA |
| Rainfall | — | Pe > 0 (strong when Pe ≥ ETc_adj, else moderate) | no rain → neutral/weak |
| Humidity | H ≤ H_BASE − HUM_STRONG_DELTA (strong); H < H_BASE (weak) | H ≥ H_BASE + HUM_STRONG_DELTA (strong) | by \|H − H_BASE\| vs HUM_STRONG_DELTA |
| Wind | W ≥ W_BASE + WIND_STRONG_DELTA (strong) | — | else neutral/weak |
| Soil | Sandy (moderate: low retention) | Clay (moderate: buffers) | Loamy → neutral/weak |
| Irrigation method | efficiency ≤ METHOD_LOW_EFFICIENCY (moderate: more water must be applied) | — | else neutral/weak |

---

# Step 11 — Multi-Day Irrigation Plan (V1.2)

When a daily series is available, the engine also returns a plan for today plus the next `PLAN_DAYS_AHEAD` days (roadmap Feature 5). Day 0 reuses today's recommendation exactly; each future day is evaluated with the same demand/rainfall rules as today.

**V1.6 — primary path (root-zone water balance available):**

The plan chains `Dr` over forecast days with the same update rule as Step 4b:

```
Dr = today's Dr_after (zero if irrigating today, else Dr + ETc_today - Pe_today)
for each forecast day d (offset 1..PLAN_DAYS_AHEAD):
    ETc_d, Pe_d as in Step 4b
    Dr = clamp( Dr + ETc_d − Pe_d , 0 , TAW )    // no applied irrigation I_net_d in the forecast
    if Pe_d ≥ ETc_d:              action = "Delay Irrigation"
    else if Dr < RAW:             action = "Monitor Tomorrow"
    else:                         action = "Irrigate Today"; Dr = 0   // advised irrigation refills to field capacity
```

**Fallback path** — when no root-zone balance exists:

```
D = (today's NIR if not irrigating, else 0)
for each forecast day d (offset 1..PLAN_DAYS_AHEAD):
    ETc_d, Pe_d as in Step 4b
    D = max( 0, D + ETc_d − Pe_d )
    if Pe_d ≥ ETc_d:              action = "Delay Irrigation"
    else if D < skipThreshold:    action = "Monitor Tomorrow"
    else:                         action = "Irrigate Today"; D = 0
```

Per-day confidence reflects forecast distance, not data freshness: offsets 1..`PLAN_MEDIUM_MAX_OFFSET` → Medium; beyond → Low. Day 0 inherits today's confidence (Step 8). The plan also names the first irrigation day (`recommendedIrrigationDate`) and the first rain-covered day (`nextRainCoveredDate`), from which the UI assembles planning notes. The plan is returned alongside the recommendation; it is not persisted.


---

# Step 12 — Disease Risk Assessment (V1.4)

Added for `12_Product_Roadmap_v2.md` Version 1.3 Feature 9. Agronomic facts — which diseases apply to a crop, their temperature bands and humidity thresholds — are owned by `10_Knowledge_Base.md` §10.4. This step owns only **how those facts combine into a risk level**.

Disease risk is **advisory and strictly separate from the irrigation decision.** It reads the same daily weather series but is computed independently, and it must never influence status, water amount, timing, confidence, or factors. A farm's irrigation recommendation is byte-identical whether or not this step runs.

## Step 12a — Favourable Days

A day is *favourable* for a disease when its temperature band and its wetness requirement are met together (`10_Knowledge_Base.md` §10.1 — neither alone is sufficient):

```
tempOk_d = profile.tempMinC ≤ d.temperatureMax ≤ profile.tempMaxC
wet_d    = d.humidityMean ≥ profile.humidityMin
           OR d.precipitationSum ≥ WET_DAY_RAIN_MM
favourable_d = tempOk_d AND wet_d
```

Rainfall satisfies wetness on its own because rain wets the canopy directly, whatever the day's mean humidity.

## Step 12b — Runs

The window is the daily series already used by Steps 4b and 11: the past `CARRYOVER_DAYS` days, today, and the next `PLAN_DAYS_AHEAD` days. Infection needs *sustained* favourable conditions, so consecutive days are counted, not totals.

```
observedRun = length of the run of consecutive favourable days ending at today
              (0 when today is not favourable)
forecastRun = length of the run of consecutive favourable days
              starting at today + 1
```

`observedRun` counts conditions that have already occurred; `forecastRun` counts conditions still to come. When `observedRun > 0` the two runs are contiguous and describe one continuing spell.

## Step 12c — Score and Level

```
score = observedRun × OBSERVED_DAY_WEIGHT + forecastRun × FORECAST_DAY_WEIGHT

if score ≥ RISK_SCORE_HIGH:         level = "High"
else if score ≥ RISK_SCORE_MODERATE: level = "Moderate"
else if score > 0:                   level = "Low"
else:                                level = "None"
```

Forecast days are weighted below observed days for two reasons: the forecast may not verify, and infection has not yet had the opportunity to occur.

With the Section 9 values this yields: three observed favourable days → High; two observed → Moderate; one observed → Low; a four-day favourable forecast with no favourable history → Moderate.

## Step 12d — Crop Result

Every profile for the crop is evaluated. The crop's reported risk is the profile with the **highest score**; ties are broken by declaration order in the Knowledge Base, which makes the result deterministic. Profiles scoring zero are still evaluated but are not reported.

The result carries the driving disease, the level, the score, both run lengths, and the weather values from the most recent favourable day, so the explanation can name the conditions responsible rather than asserting a conclusion.

## Step 12e — Assessment Confidence

Confidence expresses **how much of the window had data**, mirroring Step 8's principle that confidence reflects information quality and not correctness:

```
coverage = days available in the window / (CARRYOVER_DAYS + 1 + PLAN_DAYS_AHEAD)

if coverage ≥ RISK_COVERAGE_HIGH:    confidence = "High"
else if coverage ≥ RISK_COVERAGE_MED: confidence = "Medium"
else:                                 confidence = "Low"
```

When no daily series exists at all, the step returns **no assessment** — not a level of "None". "Cannot assess" and "conditions are unfavourable" are different statements and the farmer must be able to tell them apart.

## Step 12f — Output Restrictions

These are normative and derive from `10_Knowledge_Base.md` §10.2 and the Version 1.3 product boundaries:

- The output shall not contain a chemical, fungicide or pesticide name, a dose, a concentration, or a spray interval.
- The output shall not state that a disease is present, only that conditions favour it.
- The output shall direct the farmer to inspect the crop and, if symptoms are found, to consult a local agricultural extension officer.

---

# Final Recommendation Object

The engine returns the structure defined in `02_Decision_Engine.md` / `03_Data_Models.md`:

- Recommendation Status
- Recommended Time
- Estimated Water Amount (depth mm and volume liters)
- Explanation
- Confidence Level
- Generated Time

No UI formatting occurs in the engine.

---

# Section 9 — Parameter Table (single source of truth)

All values are tunable engineering parameters. Changing any value here must not require any logic change.

## Reference ET

**Primary source (V1.5):** `et0FaoMm` per day from the weather provider — FAO-56 Penman-Monteith, computed at the farm's coordinates. It is *data*, not a tunable parameter, so it has no row here.

The three tables below are **fallback-only** (Step 2). They apply solely to days with no `et0FaoMm`. They must never be applied on top of a measured ETo.

| Parameter | Value | Unit | Notes |
|-----------|-------|------|-------|
| ETo_ref | 5.0 | mm/day | Fallback baseline reference ET for warm growing conditions (FAO indicative range 4–7 mm/day). Used only when the provider supplies no ETo for that day. |

## Seasonal ETo factors (V1.3, Step 2 — fallback only)

| Season | seasonFactor | Rationale (docs/10 §9.4) |
|--------|--------------|---------------------------|
| Kharif (Jun–Sep) | 0.95 | monsoon humidity/cloud suppress ETo |
| Rabi (Oct–Feb) | 0.90 | cool season suppresses ETo |
| Zaid (Mar–May) | 1.15 | hot dry season raises ETo |

## Weather multiplier (fallback only)

Applied only when a day lacks `et0FaoMm`. Must never be applied to a measured ETo.

| Parameter | Value | Notes |
|-----------|-------|-------|
| T_BASE | 30 | °C reference |
| TEMP_SENS | 0.02 | per °C |
| TEMP_MIN / TEMP_MAX | 0.80 / 1.30 | clamp |
| H_BASE | 55 | % reference |
| HUM_SENS | 0.003 | per % (drier = higher) |
| HUM_MIN / HUM_MAX | 0.90 / 1.10 | clamp |
| W_BASE | 2 | m/s reference |
| WIND_SENS | 0.02 | per m/s |
| WIND_MIN / WIND_MAX | 1.00 / 1.20 | clamp |
| WMULT_MIN / WMULT_MAX | 0.70 / 1.50 | overall clamp |

## Rainfall effectiveness (by soil)

| Soil | rainEffFactor |
|------|---------------|
| Sandy | 0.60 |
| Sandy Loam | 0.70 |
| Loamy | 0.75 |
| Silty Loam | 0.80 |
| Clay Loam | 0.85 |
| Clay | 0.85 |

## Root-zone water balance (V1.6, Step 4b)

Rooting depths (`Zr`, metres) and depletion fractions (`p`) are **agronomic facts** and live in `10_Knowledge_Base.md` §3.3. Soil hydraulic properties (θ_FC, θ_PWP, volumetric water content at field capacity and permanent wilting point) are soil facts and live in `10_Knowledge_Base.md` §4.3. This section holds only the formulas that combine them into thresholds and the single update rule.

| Parameter | Value | Notes |
|-----------|-------|-------|
| `TAW = 1000 × (θ_FC − θ_PWP) × Zr` | computed | Total available water in the root zone (mm); grows with rooting depth across the season |
| `RAW = p × TAW` | computed | Readily available water (mm); the depletion threshold for no stress |

Depletion state is persisted per farm with its valid-as-of date. Update rule:

```
Dr_after(d) = clamp( Dr_before(d) + ETc_d − Pe_d − I_net_d , 0 , TAW )
```

When no history exists, seed with `Dr = RAW` rather than inventing a full profile.

## Skip threshold — "Monitor Tomorrow" cutoff (by soil, V1.6 fallback only)

Applied only on the fallback path (Step 5) when no root-zone balance exists. These thresholds encode the soil buffering principle from `10_Knowledge_Base.md` §4: clay retains water longest, sandy drains fastest.

| Soil | skipThreshold (mm) |
|------|--------------------|
| Sandy | 3.0 |
| Sandy Loam | 4.5 |
| Loamy | 5.5 |
| Silty Loam | 6.0 |
| Clay Loam | 7.0 |
| Clay | 8.0 |

| Soil | skipThreshold (mm) |
|------|--------------------|
| Sandy | 1.0 |
| Loamy | 1.5 |
| Clay | 2.0 |

## Irrigation application efficiency (by method)

| Method | efficiency |
|--------|-----------|
| Drip | 0.90 |
| Sprinkler | 0.75 |
| Furrow | 0.60 |
| Flood | 0.50 |

These are the numeric counterparts to the qualitative efficiency ratings in `10_Knowledge_Base.md` §5.1.

## Area conversions (to m²)

| Area Unit | Multiplier to m² |
|-----------|------------------|
| Square metre | 1 |
| Acre | 4046.86 |
| Hectare | 10000 |

## Confidence & timing

| Parameter | Value | Notes |
|-----------|-------|-------|
| FRESH_MAX_HOURS | 6 | ≤ this → High (if profile complete) |
| STALE_MAX_HOURS | 24 | ≤ this → Medium; above → Low |
| IRRIGATION_TIME_DEFAULT | 06:00 local | evaporation-minimizing heuristic |

## Multi-day planning (V1.2, Steps 4b & 11)

| Parameter | Value | Notes |
|-----------|-------|-------|
| CARRYOVER_DAYS | 2 | past days feeding the carryover deficit |
| PLAN_DAYS_AHEAD | 4 | forecast days beyond today in the plan (5 total) |
| PLAN_MEDIUM_MAX_OFFSET | 2 | plan days ≤ this offset → Medium confidence; beyond → Low |

## Factor-influence thresholds (V1.2, Step 10)

| Parameter | Value | Notes |
|-----------|-------|-------|
| KC_HIGH | 1.1 | Kc ≥ this → crop strongly raises demand |
| KC_LOW | 0.6 | Kc ≤ this → crop lowers demand |
| TEMP_STRONG_DELTA | 4 | °C from T_BASE for strong temperature influence |
| HUM_STRONG_DELTA | 15 | % from H_BASE for strong humidity influence |
| WIND_STRONG_DELTA | 2 | m/s above W_BASE for strong wind influence |
| METHOD_LOW_EFFICIENCY | 0.6 | efficiency ≤ this → method raises applied water (moderate) |

## Disease risk (V1.4, Step 12)

Per-disease temperature bands and humidity thresholds are **agronomic facts** and live in `10_Knowledge_Base.md` §10.4, following the precedent of Kc. Only the generic scoring knobs are parameters:

| Parameter | Value | Notes |
|-----------|-------|-------|
| WET_DAY_RAIN_MM | 2.0 | mm; a day with at least this much rain counts as wet whatever its mean humidity |
| OBSERVED_DAY_WEIGHT | 1.0 | weight of one favourable day that has already occurred |
| FORECAST_DAY_WEIGHT | 0.5 | weight of one favourable forecast day — less certain, and infection has not yet had the chance to occur |
| RISK_SCORE_HIGH | 3.0 | score ≥ this → High (three observed favourable days) |
| RISK_SCORE_MODERATE | 1.5 | score ≥ this → Moderate (two observed, or a four-day favourable forecast) |
| RISK_COVERAGE_HIGH | 0.85 | fraction of the window with data for High assessment confidence |
| RISK_COVERAGE_MED | 0.5 | fraction of the window with data for Medium assessment confidence |

The window length is `CARRYOVER_DAYS + 1 + PLAN_DAYS_AHEAD` = 7 days, reusing the existing planning parameters rather than introducing its own.

---

# Section 10 — Assumptions (explicit)

These assumptions are required for the logic above and were previously implicit.

1. **Growth stage is a farmer-provided input** (selected when creating/editing the farm). It is not derived from a planting date in the MVP.
2. **One primary crop per farm**, and **one recommendation per farm per day**, generated on demand.
3. **ETo is computed, but not by this engine** (V1.5). The weather provider computes daily reference evapotranspiration by FAO-56 Penman-Monteith and the engine consumes it as data (`et0FaoMm`, Step 2 primary path). The engine performs no radiation or aerodynamic modelling of its own, so it needs no solar-radiation, dewpoint or pressure inputs. Cloud cover is retained for display only. When a day carries no `et0FaoMm` — a farm offline with a pre-V1.5 cache — that day falls back to the `ETo_ref` × season × weather-multiplier estimate, which is a coarser approximation and, as measured in Step 2, biased high.
4. **Units are metric.** Water depth is reported in millimetres and volume in litres; area is converted from the farm's stored `Area Unit`.
5. **Effective rainfall** is a soil-scaled fraction of forecast rainfall. As of V1.6 the engine models a bounded **root-zone water balance** over the entire series: depletion (`Dr`) is updated each day by `ETc`, effective rainfall, and actual applied irrigation, and is constrained by the root zone's capacity (`TAW`). The balance is persisted across days as farm state rather than being recomputed from a rolling window.
6. **The Decision Engine runs client-side**, framework-independent, so recommendations work fully offline. Any backend "Generate Recommendation" endpoint in `04_System_Interfaces.md` is treated as future/optional.
7. **The daily weather series** (V1.2) covers the past `CARRYOVER_DAYS` days, today, and the next `PLAN_DAYS_AHEAD` days, in the farm's timezone. When it is unavailable (offline with a pre-V1.2 cache), the engine reproduces the V1.1 behavior exactly and returns no plan.
8. **Disease risk is advisory** (V1.4). It is computed from the same daily series but is never an input to the irrigation decision, and the application never claims a disease is present or advises a treatment (Step 12f). Daily aggregates stand in for the hourly leaf-wetness measurements the published infection models use; the substitution rule and its bias towards warning early are documented in `10_Knowledge_Base.md` §10.3.
9. **The water balance is modelled, not measured** (V1.6). No soil-moisture sensor exists, so `Dr` is an accounting estimate whose error accumulates from ETo error, rainfall error, and any irrigation the farmer performed without logging it. Two mechanisms bound the drift: the `[0, TAW]` clamp prevents unbounded accumulation in either direction, and heavy rain that exceeds the remaining depletion resets `Dr` to zero, re-anchoring the ledger to a known state. Unlogged irrigation is the largest residual source of error and biases the engine towards **over-advising**; the UI must therefore make logging the applied amount easy and must present `Dr` as an estimate, not a measurement.
10. **Capillary rise and a shallow water table are not modelled** (V1.6). FAO-56 includes an upward-flux term for fields where groundwater is within reach of the roots. It is omitted because the depth to water table is not among the farm inputs. Where it applies — parts of the Indo-Gangetic plain in particular — the engine will over-state depletion and therefore over-advise water. This is a documented limitation, not an oversight.

---

# Worked Example (non-normative)

Farm: Rice, Clay soil, Flood irrigation, 2 acres, Mid Season, Kharif. Weather: 34 °C, 50% humidity, 3 m/s wind, 2 mm forecast rain, observed 3 h ago. Today's daily entry carries `et0FaoMm = 5.2`. Persisted depletion state: `Dr = 18 mm` valid yesterday.

**Step 1 — Kc lookup:**
```
Kc_stage = 1.20  (rice, mid)
```

**Step 2 — Crop water demand (primary path):**
```
ETc_adj = 1.20 × 5.2 = 6.24 mm      // no multiplier — measured ETo (see §2)
```

**Step 3 — Effective rainfall:**
```
Pe = 2 × 0.85 = 1.70 mm             // clay rain efficiency
```

**Step 4b — Root-zone water balance:**
```
Zr     = 0.30 m                      // rice mid-season root depth (§3.3 Knowledge Base)
θ_FC   = 0.396,  θ_PWP = 0.272      // clay (§4.3 Knowledge Base)
TAW    = 1000 × (0.396 − 0.272) × 0.30 = 37.2 mm
p      = 0.20                        // rice depletion fraction (§3.3 Knowledge Base)
RAW    = 0.20 × 37.2 = 7.44 mm

Dr_before = 18 mm (yesterday's persisted state)
Dr_after  = clamp( 18 + 6.24 − 1.70 − 0 , 0 , 37.2 ) = 22.54 mm    // no irrigation yesterday
```

**Step 4 — Net irrigation need:**
```
NIR = Dr_after = 22.54 mm            // refill to field capacity
```

**Step 5 — Decision:**
```
Pe (1.70) < ETc_adj (6.24)
Dr (22.54) ≥ RAW (7.44)
→ status = "Irrigate Today"
```

**Step 6 — Water estimation:**
```
grossDepth = 22.54 / 0.50 = 45.08 mm
area_m2    = 2 × 4046.86 = 8093.72 m²
volume     = 45.08 × 8093.72 ≈ 364,864 liters
```

**Steps 7–9:**
```
recommendedTime = 06:00
confidence = High (profile complete, weather 3 h old ≤ 6 h)
```

Explanation (farmer-facing): "Your rice is at its peak water-demand stage. The soil has dried to the point where the crop will begin to suffer stress if you wait. The small forecast rain isn't enough to delay, so irrigate this morning. Because you use flood irrigation, more water is needed to deliver the same amount to the crop."

---

**Fallback comparison** — had this day carried no `et0FaoMm` and no persisted depletion (offline, pre-V1.6 cache):

```
weatherMultiplier ≈ 1.118 (as in V1.5)
ETc_adj = 1.20 × 5.0 × 0.95 × 1.118 ≈ 6.37 mm
NIR     = max(0, 6.37 − 1.70) = 4.67 mm
grossDepth = 4.67 / 0.50 = 9.34 mm → ≈ 75,595 liters
```

The fallback produces **one-fifth the water** because it has no memory of yesterday's depletion. The V1.6 primary path closes the loop: the ledger records that no irrigation occurred yesterday, so today's recommendation accounts for two days of accumulated demand.

---

# Success Criteria

This specification is successful if:

- The engine produces identical output for identical input.
- Every recommendation yields a status, amount, timing, confidence, and explanation.
- All numeric behavior is traceable to Section 9.
- Parameters can be tuned without changing pipeline logic.
- The logic runs entirely offline.

---

# Related Documents

- 02_Decision_Engine.md
- 03_Data_Models.md
- 04_System_Interfaces.md
- 10_Knowledge_Base.md
