/** Parse failed dynamic-import URLs from browser error messages. */
export function failedModuleUrl(err: unknown): string | null {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  const match = msg.match(/(https?:\/\/[^\s"'<>]+\.js)/);
  return match?.[1] ?? null;
}
