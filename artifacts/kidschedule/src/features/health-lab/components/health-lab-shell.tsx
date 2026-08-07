import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { HEALTH_LAB_SHELL } from "../theme";
import { HealthLabParticles } from "./health-lab-particles";
import { isHealthLabLivingV1Enabled } from "@/lib/health-lab/living-room";
import { cn } from "@/lib/utils";

export function HealthLabShell({
  children,
  className,
  showParticles = true,
}: {
  children: ReactNode;
  className?: string;
  showParticles?: boolean;
}) {
  const [visible, setVisible] = useState(true);
  const living = isHealthLabLivingV1Enabled();

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /** Living manufacturing — Care sanctuary opening; no violet galaxy wash on the house seat. */
  if (living) {
    return (
      <div className={cn("relative w-full min-w-0 bg-transparent", className)} data-hl-shell="living">
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn(HEALTH_LAB_SHELL, className)}>
      {visible && showParticles && <HealthLabParticles />}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.15),transparent_60%)]"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
