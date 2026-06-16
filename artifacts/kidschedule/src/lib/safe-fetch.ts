/**
 * safeFetch — a fetch wrapper that never throws.
 *
 * Returns parsed JSON on success, or `{ fallback: true, error }` when the
 * network is down, the server is not OK, or the response is not parseable.
 * Callers MUST check `data?.fallback` before using the result:
 *
 *   const data = await safeFetch("/api/foo");
 *   if (data?.fallback) return <FallbackUI />;
 *
 * For full type safety, pass the expected shape as a generic:
 *   const data = await safeFetch<{ items: Item[] }>("/api/items");
 */

import { safeJsonResponse } from "@/lib/safe-json-response";

export type SafeFetchResult<T> =
  | (T & { fallback?: false })
  | { fallback: true; error: string };

export async function safeFetch<T = Record<string, unknown>>(
  url: RequestInfo | URL,
  options?: RequestInit,
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      const msg = `API_ERROR ${res.status}${errorText ? `: ${errorText.slice(0, 120)}` : ""}`;
      console.error("safeFetch:", url, msg);
      return { fallback: true, error: msg };
    }
    const parsed = await safeJsonResponse<T>(res);
    if (!parsed.ok) {
      return { fallback: true, error: `PARSE_ERROR ${parsed.kind}` };
    }
    return parsed.data as T & { fallback?: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("safeFetch:", url, msg);
    return { fallback: true, error: msg };
  }
}

/**
 * Inline guard helper — narrows a SafeFetchResult to its success shape.
 * Usage: if (isFallback(data)) return <FallbackUI />;
 */
export function isFallback<T>(
  result: SafeFetchResult<T>,
): result is { fallback: true; error: string } {
  return (result as { fallback?: boolean }).fallback === true;
}
