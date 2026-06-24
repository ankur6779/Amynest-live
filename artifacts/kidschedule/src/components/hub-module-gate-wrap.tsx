import type { ReactNode } from "react";
import { LockedBlock } from "@/components/locked-block";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";
import { PremiumBenefitsPanel } from "@/components/hub-module-page-shell";

/**
 * Client-side freemium gate for full-screen Parent Hub modules that do not use
 * HubModulePageShell. Mirrors hub-module-page-shell.tsx lock behaviour.
 */
export function HubModuleGateWrap({
  featureId,
  childId,
  childName = "your child",
  rounded = "rounded-2xl",
  gateMode = "page",
  children,
}: {
  featureId: string;
  childId?: number | null;
  childName?: string;
  rounded?: string;
  gateMode?: "page" | "action";
  children: ReactNode;
}) {
  const { locked, journeySoft, onEngage, isPremium } = useHubModuleGate(featureId, childId);

  if (gateMode === "action") {
    return (
      <>
        {!isPremium ? <PremiumBenefitsPanel className="mb-4" /> : null}
        {children}
      </>
    );
  }

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
