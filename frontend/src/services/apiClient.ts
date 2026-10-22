/**
 * Centralized API client (docs/07_Engineering_Rules.md: all network access is
 * centralized; docs/04_System_Interfaces.md Interface 1).
 *
 * Every backend call goes through this module so the base URL, response
 * envelope ({ status, data, timestamp } / { status, errorCode, message }), and
 * error handling live in one place. Feature services never call `fetch`
 * directly.
 */

/** Base URL of the backend API. Overridable via VITE_API_BASE_URL. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

interface SuccessEnvelope<T> {
  status: 'ok';
  data: T;
  timestamp: string;
}

interface ErrorEnvelope {
  status: 'error';
  errorCode?: string;
  message?: string;
  timestamp: string;
}

/** Error raised for any non-successful API interaction. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isErrorEnvelope(body: unknown): body is ErrorEnvelope {
  return typeof body === 'object' && body !== null && (body as { status?: unknown }).status === 'error';
}

/**
 * Send a request and unwrap the envelope.
 *
 * Shared by apiGet and apiPost so the three failure modes a caller has to tell
 * apart — unreachable network, unparseable body, and a well-formed error
 * envelope — are classified in exactly one place. `NETWORK_ERROR` in particular
 * is the code the offline paths key off, so a second copy of this logic that
 * drifted would silently change what "offline" means.
 */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    // Network unreachable (offline, DNS, connection refused).
    throw new ApiError('Network request failed', 'NETWORK_ERROR');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError('Invalid response from server', 'BAD_RESPONSE');
  }

  if (!response.ok || isErrorEnvelope(body)) {
    const err = isErrorEnvelope(body) ? body : undefined;
    throw new ApiError(
      err?.message ?? `Request failed (${response.status})`,
      err?.errorCode ?? 'REQUEST_FAILED',
    );
  }

  return (body as SuccessEnvelope<T>).data;
}

/**
 * Perform a GET request and return the unwrapped `data` payload.
 * Throws ApiError on network failure or a non-ok response.
 */
export async function apiGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }
  return request<T>(url.toString());
}

/**
 * Perform a POST request with a JSON body and return the unwrapped `data`.
 *
 * Added for the farmer assistant (item 17), which is the first route that sends
 * anything to the backend rather than only asking it for a provider's data. The
 * `signal` is part of the signature rather than an afterthought: a farmer who
 * closes the chat, switches farms, or asks a second question must be able to
 * abandon an in-flight answer, and an aborted fetch surfaces here as
 * NETWORK_ERROR — which is exactly what the caller should do with it, since the
 * offline rules have already answered.
 */
export async function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  return request<T>(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
}

/**
 * Perform a POST request whose success payload is BINARY (not the JSON
 * envelope), returning it as a Blob.
 *
 * Added for /api/tts (V2.4), which answers raw audio/mpeg bytes on success.
 * The base URL, the network-unreachable classification and the error-envelope
 * handling stay in this module so "what offline means" is still defined in
 * exactly one place — only the success decoding differs from `apiPost`, and
 * it differs because the response is not JSON when it succeeds.
 */
export async function apiPostBinary(path: string, body: unknown): Promise<Blob> {
  const url = new URL(path, API_BASE_URL);
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Network request failed', 'NETWORK_ERROR');
  }

  if (!response.ok) {
    let envelope: ErrorEnvelope | undefined;
    try {
      const parsed: unknown = await response.json();
      envelope = isErrorEnvelope(parsed) ? parsed : undefined;
    } catch {
      // Non-JSON error body (e.g. a proxy's HTML error page) — fall through
      // with the status code only.
    }
    throw new ApiError(
      envelope?.message ?? `Request failed (${response.status})`,
      envelope?.errorCode ?? 'REQUEST_FAILED',
    );
  }

  return response.blob();
}
