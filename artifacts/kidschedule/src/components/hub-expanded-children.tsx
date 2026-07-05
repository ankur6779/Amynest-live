import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type HubExpandedChildrenProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
  /** Visually connect panel to expanded section header (same radius / timing). */
  connected?: boolean;
  /** Accessible panel id — pairs with header aria-controls. */
  panelId?: string;
};

const COLLAPSE_MS = 200;

/**
 * CSS grid height reveal — transform/opacity on inner panel only (60fps friendly).
 */
export function HubExpandedChildren({
  open,
  children,
  className,
  connected = false,
  panelId,
}: HubExpandedChildrenProps) {
  const [showChildren, setShowChildren] = useState(open);
  const [revealed, setRevealed] = useState(open);

  useEffect(() => {
    if (open) {
      setShowChildren(true);
      const frame = requestAnimationFrame(() => {
        setRevealed(true);
      });
      return () => cancelAnimationFrame(frame);
    }

    setRevealed(false);
    const timer = window.setTimeout(() => setShowChildren(false), COLLAPSE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!showChildren && !open) {
    return null;
  }

  return (
    <div
      id={panelId}
      role="region"
      aria-hidden={!open}
      aria-labelledby={panelId ? panelId.replace(/-panel$/, "-trigger") : undefined}
      className={cn(
        "hub-expanded-children",
        revealed && open && "hub-expanded-children--open",
        connected && "hub-expanded-children--connected",
      )}
    >
      <div className="hub-expanded-children__clip">
        <div
          className={cn(
            "hub-expanded-panel",
            connected && "hub-expanded-panel--connected",
            revealed && open && "hub-expanded-panel--revealed",
            className,
          )}
        >
          {showChildren ? children : null}
        </div>
      </div>
    </div>
  );
}
