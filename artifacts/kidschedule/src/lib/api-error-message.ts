type ApiErrorBody = {
  message?: string;
  error?: string;
};

/** Prefer server `message`, then `error`, then Error.message. */
export function extractApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (!error) return fallback;

  const err = error as { data?: ApiErrorBody; message?: string };
  const fromData = err.data?.message ?? err.data?.error;
  if (typeof fromData === "string" && fromData.trim()) {
    return fromData.trim();
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}
