/** Best-effort return to the mail app after email verification (external browser flow only). */
export function tryReturnToInbox(): void {
  if (typeof window === "undefined") return;
  try {
    window.close();
  } catch {
    /* Tab was not opened by script — user closes manually */
  }
}
