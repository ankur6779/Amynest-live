export type SafeJsonResult<T> =
  | { ok: true; data: T; contentType: string }
  | { ok: false; kind: "html" | "empty" | "parse_error" | "wrong_type"; status: number; snippet?: string };

const JSON_CONTENT_RE = /application\/json/i;
const HTML_CONTENT_RE = /text\/html/i;

function contentTypeOf(res: Response): string {
  return res.headers.get("content-type") ?? "";
}

function looksLikeHtml(text: string): boolean {
  const t = text.trimStart().slice(0, 32).toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.startsWith("<!");
}

function logClientJsonIncident(kind: string, meta: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn("[safeJsonResponse]", kind, meta);
  }
  if (import.meta.env.PROD) {
    void import("@/lib/sentry").then(({ captureWebException }) => {
      captureWebException(new Error(`safeJsonResponse:${kind}`), {
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
        tags: { kind: String(kind), status: String(meta.status ?? "") },
      });
    }).catch(() => {});
  }
}

/**
 * Strict API JSON parse — throws on HTML/empty/parse errors (for authFetch flows).
 */
export async function parseApiJson<T = unknown>(res: Response): Promise<T> {
  const parsed = await safeJsonResponse<T>(res);
  if (!parsed.ok) {
    const traceId = res.headers.get("x-request-id") ?? res.headers.get("x-amynest-coach-trace-id");
    logClientJsonIncident(parsed.kind, { status: res.status, traceId });
    throw new Error(`API response not JSON (${parsed.kind})`);
  }
  return parsed.data;
}

/**
 * Parse a Response as JSON only when Content-Type is JSON (or text/plain).
 * Never surfaces HTML gateway pages to callers.
 */
export async function safeJsonResponse<T = unknown>(res: Response): Promise<SafeJsonResult<T>> {
  const contentType = contentTypeOf(res);
  const text = await res.text();

  if (!text.trim()) {
    return { ok: false, kind: "empty", status: res.status };
  }

  if (HTML_CONTENT_RE.test(contentType) || looksLikeHtml(text)) {
    logClientJsonIncident("html_response", { status: res.status, contentType });
    return {
      ok: false,
      kind: "html",
      status: res.status,
      snippet: text.slice(0, 120),
    };
  }

  if (contentType && !JSON_CONTENT_RE.test(contentType) && !contentType.includes("text/plain")) {
    logClientJsonIncident("wrong_content_type", { status: res.status, contentType });
    return { ok: false, kind: "wrong_type", status: res.status, snippet: text.slice(0, 120) };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T, contentType: contentType || "application/json" };
  } catch {
    return { ok: false, kind: "parse_error", status: res.status, snippet: text.slice(0, 120) };
  }
}

export const COACH_USER_FACING_LOADING =
  "We're preparing your personalized coaching win.";
export const COACH_USER_FACING_SLOW =
  "This is taking a little longer than usual. Amy is still working on it.";
export const COACH_USER_FACING_ERROR =
  "We're preparing your personalized coaching win.";
