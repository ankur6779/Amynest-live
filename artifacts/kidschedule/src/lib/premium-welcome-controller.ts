import { useEffect, useState } from "react";

type Listener = (open: boolean) => void;

let welcomeOpen = false;
const listeners = new Set<Listener>();

function emit(open: boolean) {
  welcomeOpen = open;
  listeners.forEach((listener) => listener(open));
}

/** Show the post-purchase Premium welcome experience (after paywall closes). */
export function requestPremiumWelcome(): void {
  emit(true);
}

export function dismissPremiumWelcome(): void {
  emit(false);
}

export function isPremiumWelcomeOpen(): boolean {
  return welcomeOpen;
}

export function usePremiumWelcomeOpen(): boolean {
  const [open, setOpen] = useState(welcomeOpen);
  useEffect(() => {
    const listener: Listener = (next) => setOpen(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return open;
}
