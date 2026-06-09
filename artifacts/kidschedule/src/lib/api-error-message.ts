type ApiErrorBody = {
  message?: string;
  error?: string;
};

const INTERNAL_ERROR_MARKERS = [
  /Failed query:/i,
  /\bon conflict\s*\(/i,
  /^params:\s*\d/i,
];

function looksLikeInternalError(text: string): boolean {
  if (text.length > 400) return true;
  return INTERNAL_ERROR_MARKERS.some((re) => re.test(text));
}

function sanitizeForClient(text: string, fallback: string): string {
  if (looksLikeInternalError(text)) return fallback;
  return text;
}

/** Prefer server `message`, then `error`, then Error.message. */
export function extractApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (!error) return fallback;

  const err = error as { data?: ApiErrorBody; message?: string; status?: number };
  const fromData = err.data?.message ?? err.data?.error;
  if (typeof fromData === "string" && fromData.trim()) {
    return sanitizeForClient(fromData.trim(), fallback);
  }

  if (err.status === 401) {
    return "Session expired. Please sign in again.";
  }

  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim();
    if (/^HTTP 401\b/i.test(msg)) {
      return "Session expired. Please sign in again.";
    }
    return sanitizeForClient(msg, fallback);
  }

  return fallback;
}
