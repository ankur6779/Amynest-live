import type { ComponentType } from "react";
import { Redirect } from "wouter";
import { livingDirectUrlContainment } from "@/lib/living-leave-containment";

/**
 * Living production: apply documented route aliases only.
 * Never wrap an active module (`/games`, `/progress`, `/insights`, `/study`,
 * `/rewards`) — those pages must render even if a containment map is wrong.
 * Legacy / mixed: livingDirectUrlContainment returns null, so Legacy renders.
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
