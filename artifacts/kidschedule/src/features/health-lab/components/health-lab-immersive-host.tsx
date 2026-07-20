import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const IMMERSIVE_ROOT_CLASS = "health-lab-immersive";

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
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.add(IMMERSIVE_ROOT_CLASS);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      root.classList.remove(IMMERSIVE_ROOT_CLASS);
      document.body.style.overflow = prevOverflow;
    };
  }, [active]);

  if (!active || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn("health-lab-game-viewport", className)}
      data-health-lab-immersive-host
      role="presentation"
    >
      {children}
    </div>,
    document.body,
  );
}
