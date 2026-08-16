import type { ComponentType } from "react";
import { Redirect } from "wouter";
import { livingDirectUrlContainment } from "@/lib/living-leave-containment";

/**
 * Living production: send leftover product URLs home.
 * Legacy / mixed: render the original protected page.
 */
export function LivingLeaveRedirect({
  path,
  Legacy,
}: {
  path: string;
  Legacy: ComponentType;
}) {
  const dest = livingDirectUrlContainment(path);
  if (dest) return <Redirect to={dest} replace />;
  return <Legacy />;
}
