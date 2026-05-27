import type { CSSProperties, FocusEvent } from "react";
import { isLowMemoryIosClient } from "@/lib/device-lite";

/** Shared spacing + sizing for sign-in / sign-up — tuned for single-screen mobile viewports. */
export const AUTH_SPACING = {
  shellPaddingWeb: "24px 16px",
  cardPadding: "20px 24px 20px",
  cardMarginTop: 4,
  titleSize: 24,
  subtitleMarginBottom: 16,
  oauthGap: 8,
  dividerMargin: "14px 0",
  formGap: 11,
  labelMarginBottom: 5,
  footerMarginTop: 14,
  taglineMarginTop: 10,
  heroGlowHeight: 16,
  heroGlowWidth: 108,
} as const;

export const AUTH_INPUT_STYLE: CSSProperties = {
  width: "100%",
  height: "44px",
  padding: "0 14px",
  borderRadius: "12px",
  outline: "none",
  fontSize: "15px",
  background: "rgba(10,6,26,0.72)",
  border: "1px solid rgba(168,85,247,0.25)",
  color: "#F0E8FF",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "border-color 0.18s, box-shadow 0.18s",
};

export const AUTH_SUBMIT_BTN_STYLE: CSSProperties = {
  width: "100%",
  height: "46px",
  borderRadius: "999px",
  fontSize: "15px",
  fontWeight: 700,
  fontFamily: "inherit",
};

export const AUTH_OAUTH_BTN_STYLE: CSSProperties = {
  width: "100%",
  height: "46px",
  minHeight: "46px",
  borderRadius: "999px",
  fontSize: "14px",
  fontWeight: 600,
  fontFamily: "inherit",
};

const AUTH_CARD_BASE: CSSProperties = {
  background: "rgba(12,6,30,0.78)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  borderRadius: "24px",
  border: "1px solid rgba(168,85,247,0.28)",
  boxShadow: [
    "0 0 0 1px rgba(255,255,255,0.04) inset",
    "0 0 48px rgba(168,85,247,0.10)",
    "0 24px 56px rgba(0,0,0,0.55)",
  ].join(", "),
};

export function authCardStyle(): CSSProperties {
  if (!isLowMemoryIosClient()) return AUTH_CARD_BASE;
  return {
    background: "rgba(12,6,30,0.94)",
    borderRadius: "24px",
    border: "1px solid rgba(168,85,247,0.28)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.50)",
  };
}

/** Neon ring hero diameter — smaller on mobile / low-memory devices. */
export function authHeroRingSize(): number {
  if (isLowMemoryIosClient()) return 108;
  if (typeof window !== "undefined" && window.matchMedia("(max-height: 740px)").matches) {
    return 112;
  }
  return 128;
}

export function authInputGlowFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(168,85,247,0.75)";
  e.currentTarget.style.boxShadow =
    "0 0 0 3px rgba(168,85,247,0.18), 0 0 14px rgba(168,85,247,0.22)";
}

export function authInputGlowBlur(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(168,85,247,0.25)";
  e.currentTarget.style.boxShadow = "none";
}
