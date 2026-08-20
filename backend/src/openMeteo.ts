/**
 * Shared Open-Meteo helpers (used by weather.ts Interface 5 and terrain.ts
 * Interface 7 — the two routes backed by that provider).
 */

/** Open-Meteo's refusal body: `{ "error": true, "reason": "..." }`. */
interface OpenMeteoErrorBody {
  reason?: unknown;
}

/**
 * Read the provider's own explanation for a non-ok response, as a suffix ready
 * to append to a failure message (`": Daily API request limit exceeded"`), or an
 * empty string when it gave none.
 *
 * The status alone does not identify a rate limit: Open-Meteo answers 429 for
 * the minutely cap, which clears within a minute, and for the daily cap, which
 * lasts until the quota resets — and on shared datacentre egress IPs the daily
 * cap can be exhausted by traffic that is not ours at all. Those demand
 * different responses from an operator, so discarding the one sentence that
 * tells them apart turns a diagnosable outage into a guess.
 *
 * Never throws: this runs on a path that is already failing, and a provider that
 * returns an unreadable body must not turn a clean 502 into a crash.
 */
export async function openMeteoFailureReason(response: globalThis.Response): Promise<string> {
  try {
    const body = (await response.json()) as OpenMeteoErrorBody;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    return reason ? `: ${reason}` : '';
  } catch {
    return '';
  }
}
