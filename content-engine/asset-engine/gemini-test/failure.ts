export type GeminiFailureClass =
  | "Authentication"
  | "Permission"
  | "Quota"
  | "Safety filter"
  | "Invalid request"
  | "Timeout"
  | "Internal provider error"
  | "Unknown";

export interface ClassifiedGeminiFailure {
  classification: GeminiFailureClass;
  message: string;
  rawSnippet?: string;
}

export function classifyGeminiFailure(
  error: unknown,
  rawResponse?: string,
): ClassifiedGeminiFailure {
  const message = error instanceof Error ? error.message : String(error);
  const haystack = `${message}\n${rawResponse ?? ""}`.toLowerCase();
  const rawSnippet = (rawResponse ?? message).slice(0, 1_500);

  if (
    /api[_ ]?key|unauthenticated|invalid.?api.?key|401|permission_denied.*api.?key/.test(
      haystack,
    ) ||
    /\b401\b/.test(haystack)
  ) {
    return { classification: "Authentication", message, rawSnippet };
  }
  if (/\b403\b|permission|forbidden|access.?denied|not.?allowed/.test(haystack)) {
    return { classification: "Permission", message, rawSnippet };
  }
  if (
    /quota|rate.?limit|resource.?exhausted|429|billing|insufficient.?credit/.test(
      haystack,
    )
  ) {
    return { classification: "Quota", message, rawSnippet };
  }
  if (
    /safety|blocked|rai|person.?generation|child|minor|policy|prohibited/.test(
      haystack,
    )
  ) {
    return { classification: "Safety filter", message, rawSnippet };
  }
  if (/timeout|timed?\s*out|deadline|etimedout|abort/.test(haystack)) {
    return { classification: "Timeout", message, rawSnippet };
  }
  if (/drawtext|no such filter|ffmpeg|ffprobe|libx264|filter not found/.test(haystack)) {
    return {
      classification: "Internal provider error",
      message: `Local render tooling failure: ${message}`,
      rawSnippet,
    };
  }
  if (
    /invalid.?argument|bad.?request|400|unsupported|unknown.?model|not.?found|404/.test(
      haystack,
    )
  ) {
    return { classification: "Invalid request", message, rawSnippet };
  }
  if (/500|502|503|internal|unavailable|server.?error/.test(haystack)) {
    return { classification: "Internal provider error", message, rawSnippet };
  }
  return { classification: "Unknown", message, rawSnippet };
}
