/**
 * Sprint 2 — shell / navigation flag helpers.
 * Defaults OFF → production chrome and routes unchanged.
 */

import { isV2FlagEnabled } from "@/lib/feature-flags";

export function isTodayV2Enabled(): boolean {
  return isV2FlagEnabled("today_v2");
}

export function isAskAmyV2Enabled(): boolean {
  return isV2FlagEnabled("ask_amy_v2");
}

export function isForChildV2Enabled(): boolean {
  return isV2FlagEnabled("for_child_v2");
}

export function isNewNavigationEnabled(): boolean {
  return isV2FlagEnabled("new_navigation");
}

/** V2 bottom tabs: Today · Ask Amy · For [Child] */
export function shouldUseV2Navigation(): boolean {
  return isNewNavigationEnabled();
}

/** Signed-in home lands on Today instead of Dashboard. */
export function shouldLandOnTodayHome(): boolean {
  return isTodayV2Enabled() && isNewNavigationEnabled();
}

/** Routes where the V2 tab bar is visible. */
export function isV2ShellTabRoute(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return (
    path === "/today" ||
    path === "/ask-amy" ||
    path === "/for-child" ||
    path.startsWith("/ask-amy/") ||
    path.startsWith("/for-child/")
  );
}
