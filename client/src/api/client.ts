// Hardcoded to the deployed backend — the console is now its own separate
// Vercel project/domain (no dev-proxy or same-origin rewrite to lean on in
// production), so a relative "/api/v1" would resolve against this app's own
// domain instead of the API's.
export const API_BASE = "https://soltech-backend-drab.vercel.app/api/v1";
const TOKEN_KEY = "soltech.token";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Extra headers — used for device-key telemetry ingestion, which bypasses user auth. */
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(API_BASE + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, headers = {} } = options;
  const token = getToken();

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, payload.message ?? res.statusText, payload.details);
  }

  return payload as T;
}
