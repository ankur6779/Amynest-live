import type { ReactNode } from "react";
import { useMemo } from "react";
import { Monitor, Smartphone, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { openSubscriptionGate } from "@/lib/subscription-gate";
import { isWorksheetStudioClientAllowed } from "@/lib/worksheet-studio-access";
import { WS_GLASS_CARD, WS_PAGE, WS_CONTAINER, WS_HEADING, WS_MUTED_TEXT, WS_PRIMARY_BTN } from "@/features/worksheet-studio/worksheet-studio-theme";

type Props = {
  children: ReactNode;
};

function GateShell({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Monitor;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn(WS_PAGE, "min-h-dvh")}>
      <div className={cn(WS_CONTAINER, "flex min-h-[70dvh] flex-col items-center justify-center py-12 text-center")}>
        <div className={cn(WS_GLASS_CARD, "flex w-full max-w-md flex-col items-center gap-4 p-8")}>
          <Icon className="h-12 w-12 text-[#1e3a5f]" aria-hidden />
          <h1 className={cn(WS_HEADING, "text-xl")}>{title}</h1>
          <p className={WS_MUTED_TEXT}>{body}</p>
          {action}
        </div>
      </div>
    </div>
  );
}

/**
 * Worksheet Studio — browser URL only, premium subscribers only.
 * Blocked inside the AmyNest iOS/Android app; mobile browsers are allowed.
 */
export function WorksheetStudioAccessGate({ children }: Props) {
  const allowedClient = useMemo(() => isWorksheetStudioClientAllowed(), []);
  const { isPremium, loading } = useSubscription();

  if (!allowedClient) {
    return (
      <GateShell
        icon={Smartphone}
        title="Open in your browser"
        body="LPS Worksheet Studio is not available inside the AmyNest mobile app. Open www.amynest.in/worksheet in Safari, Chrome, Samsung Internet, or any browser on your phone or tablet."
        action={
          <p className={cn("text-xs", WS_MUTED_TEXT)}>
            Copy and open <strong className="text-[#1e3a5f]">amynest.in/worksheet</strong> in your browser after subscribing.
          </p>
        }
      />
    );
  }

  if (loading) {
    return (
      <GateShell
        icon={Monitor}
        title="Loading…"
        body="Checking your subscription."
      />
    );
  }

  if (!isPremium) {
    return (
      <GateShell
        icon={Crown}
        title="Premium subscription required"
        body="Worksheet Studio is included with an AmyNest Premium plan. Subscribe, then open www.amynest.in/worksheet in your browser."
        action={
          <Button
            className={cn(WS_PRIMARY_BTN, "w-full")}
            onClick={() => openSubscriptionGate({ reason: "hub_locked", source: "worksheet_studio" })}
          >
            View Premium plans
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
