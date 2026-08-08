import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { isHealthLabLivingV1Enabled } from "@/lib/health-lab/living-room";

import "@/components/health-lab/health-lab-living-deep.css";

const IMMERSIVE_ROOT_CLASS = "health-lab-immersive";
const IMMERSIVE_LIVING_CLASS = "health-lab-immersive-living";

interface HealthLabImmersiveHostProps {
  active: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Fullscreen Health Lab host — portals to document.body so games escape
 * HubModulePageShell padding/scroll and sit above app/hub sticky headers.
 * Safe area → game chrome → flex viewport → bottom controls (owned by games).
 */
export function HealthLabImmersiveHost({
  active,
  children,
  className,
}: HealthLabImmersiveHostProps) {
  const living = isHealthLabLivingV1Enabled();

  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.add(IMMERSIVE_ROOT_CLASS);
    if (living) root.classList.add(IMMERSIVE_LIVING_CLASS);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      root.classList.remove(IMMERSIVE_ROOT_CLASS);
      root.classList.remove(IMMERSIVE_LIVING_CLASS);
      document.body.style.overflow = prevOverflow;
    };
  }, [active, living]);

  if (!active || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn("health-lab-game-viewport", living && "hl-living-deep", className)}
      data-health-lab-immersive-host
      data-hl-living={living ? "1" : undefined}
      role="presentation"
    >
      {children}
    </div>,
    document.body,
  );
}
