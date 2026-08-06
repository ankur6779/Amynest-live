/**
 * V2 route loading — Amy quietly preparing.
 * Never full MEET AMY splash remount. Presentation only.
 */

import { V2_PREPARE_COPY } from "@/v2/craft";
import { V2CalmPrepare } from "./V2CalmPrepare";

/** In-shell calm prepare — used as Suspense fallback on V2 paths. */
export function V2CalmLoadingShell() {
  return (
    <V2CalmPrepare
      testId="v2-calm-loading"
      message={V2_PREPARE_COPY.quiet}
      ariaLabel={V2_PREPARE_COPY.quiet}
      density="standard"
    />
  );
}

/** True when pathname is an AmyNest V2 surface (presentation loading choice). */
export function isV2SurfacePath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  return (
    path === "/front-door" ||
    path === "/sign-up" ||
    path === "/today" ||
    path.startsWith("/today/") ||
    path === "/ask-amy" ||
    path === "/for-child" ||
    path === "/premium"
  );
}
