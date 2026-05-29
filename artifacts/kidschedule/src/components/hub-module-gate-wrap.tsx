import type { ReactNode } from "react";
import { LockedBlock } from "@/components/locked-block";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";

/**
 * Client-side freemium gate for full-screen Parent Hub modules that do not use
 * HubModulePageShell. Mirrors hub-module-page-shell.tsx lock behaviour.
 */
export function HubModuleGateWrap({
  featureId,
  childId,
  childName = "your child",
  rounded = "rounded-2xl",
  children,
}: {
  featureId: string;
  childId?: number | null;
  childName?: string;
  rounded?: string;
  children: ReactNode;
}) {
  const { locked, journeySoft, onEngage } = useHubModuleGate(featureId, childId);

  const body = (
    <div
      onPointerDownCapture={() => onEngage()}
      onKeyDownCapture={(e) => {
        if (e.key === "Enter" || e.key === " ") onEngage();
      }}
    >
      {children}
    </div>
  );

  if (journeySoft) {
    return <JourneyPreviewContent childName={childName}>{body}</JourneyPreviewContent>;
  }

  return (
    <LockedBlock locked={locked} reason="hub_locked" rounded={rounded}>
      {body}
    </LockedBlock>
  );
}
