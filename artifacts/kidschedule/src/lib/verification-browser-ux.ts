/** Best-effort return to the mail app / previous screen after verification. */
export function tryReturnToInbox(): void {
  if (typeof window === "undefined") return;
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  try {
    window.close();
  } catch {
    /* Tab was not opened by script — user closes manually */
  }
}
