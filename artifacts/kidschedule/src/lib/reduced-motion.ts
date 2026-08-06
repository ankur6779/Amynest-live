/**
 * Phase 6 — Reduced motion + visual-restraint helpers.
 *
 * Respects user OS-level prefers-reduced-motion and an in-app override stored
 * in localStorage. Components should clamp/disable celebrations and continuous
 * animations when this returns true.
 */

import { useEffect, useState } from "react";

const OVERRIDE_KEY = "amynest:reduced-motion";

function osPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function readOverride(): "auto" | "on" | "off" {
  if (typeof window === "undefined") return "auto";
  const v = window.localStorage.getItem(OVERRIDE_KEY);
  if (v === "on" || v === "off") return v;
  return "auto";
}

export function setReducedMotionPreference(pref: "auto" | "on" | "off"): void {
  if (typeof window === "undefined") return;
  if (pref === "auto") window.localStorage.removeItem(OVERRIDE_KEY);
  else window.localStorage.setItem(OVERRIDE_KEY, pref);
  window.dispatchEvent(new CustomEvent("amynest:reduced-motion-changed"));
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    const override = readOverride();
    if (override === "on") return true;
    if (override === "off") return false;
    return osPrefersReducedMotion();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let mq: MediaQueryList | null = null;
    try {
      mq = typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    } catch {
      mq = null;
    }

    const recompute = () => {
      const override = readOverride();
      if (override === "on") return setReduced(true);
      if (override === "off") return setReduced(false);
      setReduced(mq?.matches ?? false);
    };

    mq?.addEventListener?.("change", recompute);
    window.addEventListener("amynest:reduced-motion-changed", recompute);
    return () => {
      mq?.removeEventListener?.("change", recompute);
      window.removeEventListener("amynest:reduced-motion-changed", recompute);
    };
  }, []);

  return reduced;
}
