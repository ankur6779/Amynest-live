import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { HEALTH_LAB_SHELL } from "../theme";
import { HealthLabParticles } from "./health-lab-particles";
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

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

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
