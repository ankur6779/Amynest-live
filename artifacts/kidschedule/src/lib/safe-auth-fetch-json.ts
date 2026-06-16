import { safeJsonResponse } from "@/lib/safe-json-response";

type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

/** Authenticated JSON fetch — never throws; returns `{ fallback: true }` on failure. */
export async function safeAuthFetchJson<T extends Record<string, unknown> = Record<string, unknown>>(
  authFetch: AuthFetchFn,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<(T & { fallback?: boolean }) | { fallback: true }> {
  try {
    const res = await authFetch(input, init);
    const parsed = await safeJsonResponse<T>(res);
    if (!parsed.ok) {
      console.error("API parse error:", parsed.kind, input);
      return { fallback: true };
    }
    if (!res.ok) {
      console.error("API error: HTTP", res.status, input);
      return { fallback: true };
    }
    return parsed.data;
  } catch (e) {
    console.error("API error:", e);
    return { fallback: true };
  }
}
