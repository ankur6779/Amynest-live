/**
 * Lightweight guest account-required sheet state (Phase 4D).
 * No routing — callers stay on the current screen when dismissed.
 * Intent is presentation-only (Ask Amy · For Child · default).
 */

export type GuestAccountSheetIntent = "default" | "ask_amy" | "for_child";

type Listener = () => void;

let open = false;
let intent: GuestAccountSheetIntent = "default";
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

export function isGuestAccountRequiredSheetOpen(): boolean {
  return open;
}

export function getGuestAccountSheetIntent(): GuestAccountSheetIntent {
  return intent;
}

export function openGuestAccountRequiredSheet(
  nextIntent: GuestAccountSheetIntent = "default",
): void {
  intent = nextIntent;
  open = true;
  notify();
}

export function closeGuestAccountRequiredSheet(): void {
  open = false;
  intent = "default";
  notify();
}

export function subscribeGuestAccountRequiredSheet(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetGuestAccountRequiredSheetForTests(): void {
  open = false;
  intent = "default";
  listeners.clear();
}
