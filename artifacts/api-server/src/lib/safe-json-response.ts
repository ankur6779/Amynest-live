import { recordCoachObservabilityEvent } from "../services/coachObservabilityService.js";

export type SafeJsonResult<T> =
  | { ok: true; data: T; contentType: string }
  | { ok: false; kind: "html" | "empty" | "parse_error" | "wrong_type"; status: number; snippet?: string };

const JSON_CONTENT_RE = /application\/json/i;
const HTML_CONTENT_RE = /text\/html/i;

function looksLikeHtml(text: string): boolean {
  const t = text.trimStart().slice(0, 32).toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.startsWith("<!");
}

/** Server-side JSON guard — logs coach incidents, never forwards HTML to clients. */
export async function safeJsonResponse<T = unknown>(res: Response): Promise<SafeJsonResult<T>> {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (!text.trim()) {
    return { ok: false, kind: "empty", status: res.status };
  }

  if (HTML_CONTENT_RE.test(contentType) || looksLikeHtml(text)) {
    recordCoachObservabilityEvent("coach_content_type_mismatch", {
      status: res.status,
      contentType,
      gatewayHtml: true,
    });
    if (res.status === 504 || res.status === 502 || res.status === 503) {
      recordCoachObservabilityEvent("coach_generate_gateway_failure", { status: res.status });
    }
    return { ok: false, kind: "html", status: res.status, snippet: text.slice(0, 120) };
  }

  if (contentType && !JSON_CONTENT_RE.test(contentType) && !contentType.includes("text/plain")) {
    recordCoachObservabilityEvent("coach_content_type_mismatch", { status: res.status, contentType });
    return { ok: false, kind: "wrong_type", status: res.status, snippet: text.slice(0, 120) };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T, contentType: contentType || "application/json" };
  } catch {
    recordCoachObservabilityEvent("coach_json_parse_failed", { status: res.status });
    return { ok: false, kind: "parse_error", status: res.status, snippet: text.slice(0, 120) };
  }
}
