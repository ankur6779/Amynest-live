import { useLocation } from "wouter";
import { AmyNestSplashShell } from "@/components/amynest-splash-shell";
import { useDelayedLoadingUi } from "@/hooks/use-delayed-loading-ui";
import { resolveRouteSkeleton } from "@/lib/route-skeleton-registry";
import {
  isV2SurfacePath,
  V2CalmLoadingShell,
} from "@/v2/shell/V2CalmLoadingShell";

type Mode = "content" | "full";

type Props = {
  /** `content` — in-layout skeleton; `full` — full-viewport splash for auth/boot. */
  mode?: Mode;
};

/**
 * Suspense fallback with a 150ms grace period. Fast navigations render with
 * no loading UI; slower loads show page skeletons or splash.
 * V2 surfaces never show MEET AMY — calm prepare only.
 */
export function SmartRouteFallback({ mode = "content" }: Props) {
  const [location] = useLocation();
  const show = useDelayedLoadingUi(true);

  if (!show) return null;

  if (isV2SurfacePath(location)) {
    return <V2CalmLoadingShell />;
  }

  if (mode === "full") {
    return <AmyNestSplashShell variant="transition" overlay />;
  }

  const Skeleton = resolveRouteSkeleton(location);
  return <Skeleton />;
}
