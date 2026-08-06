/**
 * Pure helpers for V2 tab navigation history / active state (testable, no UI).
 */

import { safePathStartsWithSegment } from "@/lib/safe-route";

export const V2_TAB_HREFS = ["/today", "/ask-amy", "/for-child"] as const;

export type V2TabHref = (typeof V2_TAB_HREFS)[number];

export function isV2TabActive(
  location: string | null | undefined,
  href: V2TabHref | string,
): boolean {
  return safePathStartsWithSegment(location, href);
}

export type V2NavHistory = {
  location: string;
  stack: readonly string[];
  push: (path: string) => void;
  back: () => string;
};

/** In-memory stack mimicking Today → Ask Amy → For Child → Back. */
export function createV2NavHistory(initial: string = "/today"): V2NavHistory {
  const stack: string[] = [initial];
  return {
    get location() {
      return stack[stack.length - 1] ?? initial;
    },
    get stack() {
      return stack;
    },
    push(path: string) {
      if (stack[stack.length - 1] === path) return;
      stack.push(path);
    },
    back() {
      if (stack.length > 1) stack.pop();
      return stack[stack.length - 1] ?? initial;
    },
  };
}
