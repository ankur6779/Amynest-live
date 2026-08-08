import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Loader2, Lock, Sparkles, UserPlus } from "lucide-react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { useAppNavigate } from "@/components/app-link";
import { useAddChildGate } from "@/hooks/use-add-child-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LockedBlock } from "@/components/locked-block";
import { InfantExplorePreviewBanner } from "@/components/infant-explore-preview-banner";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";
import { openSubscriptionGate } from "@/lib/subscription-gate";
import { track } from "@/lib/analytics";
import { isExploreNextStageHubFeature, isHealthLabPreviewAge, isGamingHubPreviewAge } from "@/lib/hub-visibility";
import { PAGE_STICKY_HEADER_BASE } from "@/lib/page-sticky-header";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { AmyNestLeaveContinuity } from "@/components/amy-nest-leave-continuity";
import { cn } from "@/lib/utils";

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";
const seenPremiumGateKeys = new Set<string>();

type HubChild = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number | null;
};

export type HubModuleActionGateState = {
  locked: boolean;
  previewMode: boolean;
  onEngage: () => void;
  module: string;
  entitlementState: "free" | "premium" | "trial" | "unknown";
};

export function PremiumBenefitsPanel({ className }: { className?: string }) {
  return (
    <section
      className={cn("rounded-3xl border border-primary/25 bg-primary/10 p-4", className)}
      data-testid="premium-benefits-panel"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-quicksand text-base font-bold text-foreground">
            {PREMIUM_VOICE.includesLabel}
          </p>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {PREMIUM_VOICE.invitation}
          </p>
          <div className="mt-2 grid gap-1 text-sm font-semibold text-muted-foreground sm:grid-cols-2">
            <span>✓ Calm daily practice</span>
            <span>✓ Gentle progress notes</span>
            <span>✓ Amy beside you</span>
            <span>✓ Deeper support when ready</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PremiumActionGate({
  gate,
  children,
  className,
  label = "Premium action",
}: {
  gate: HubModuleActionGateState;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  useEffect(() => {
    if (!gate.previewMode || !gate.locked) return;
    const key = `${gate.module}:${label}:${gate.entitlementState}`;
    if (seenPremiumGateKeys.has(key)) return;
    seenPremiumGateKeys.add(key);
    track("premium_gate_seen", {
      module: gate.module,
      action: label,
      source: "learning_action_gate",
      entitlement_state: gate.entitlementState,
    });
  }, [gate.entitlementState, gate.locked, gate.module, gate.previewMode, label]);

  const openGate = () => {
    track("premium_gate_clicked", {
      module: gate.module,
      action: label,
      source: "learning_action_gate",
      entitlement_state: gate.entitlementState,
    });
    openSubscriptionGate({
      reason: "hub_locked",
      source: "learning_action_gate",
      module: gate.module,
      action: label,
      entitlementState: gate.entitlementState,
    });
  };

  if (!gate.previewMode) return className ? <div className={className}>{children}</div> : <>{children}</>;

  if (!gate.locked) {
    return (
      <div
        className={className}
        onPointerDownCapture={() => gate.onEngage()}
        onKeyDownCapture={(e) => {
          if (e.key === "Enter" || e.key === " ") gate.onEngage();
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-2xl", className)} data-testid="premium-action-gate">
      <div style={{ pointerEvents: "none" }} aria-hidden="true">
        {children}
      </div>
      <button
        type="button"
        onClick={openGate}
        aria-label={label}
        className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-2xl bg-background/35 px-3 backdrop-blur-[2px] transition-colors hover:bg-background/45"
      >
        <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[11px] font-bold tracking-normal normal-case text-foreground shadow-md">
          <Lock className="h-3 w-3" />
          {PREMIUM_VOICE.continueCta}
        </span>
      </button>
    </div>
  );
}

export function HubModulePageShell({
  featureId,
  title,
  subtitle,
  icon,
  filterChild,
  emptyMessage,
  gateMode = "page",
  children,
}: {
  featureId: string;
  title: string;
  subtitle?: (child: HubChild, totalAgeMonths: number) => string;
  icon: ReactNode;
  filterChild?: (child: HubChild, totalAgeMonths: number) => boolean;
  emptyMessage?: string;
  gateMode?: "page" | "action";
  children: (ctx: { child: HubChild; totalAgeMonths: number; gate: HubModuleActionGateState }) => ReactNode;
}) {
  const { navigate, back } = useAppNavigate();
  const { tryAddChild } = useAddChildGate();
  const { locked, journeySoft, onEngage, isPremium } = useHubModuleGate(featureId);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  });

  const { data: childProfiles = [], isLoading } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      refetchOnWindowFocus: true,
    },
  });

  const childList = (childProfiles ?? []) as HubChild[];
  const eligibleChildren = childList.filter((child) => {
    const totalAgeMonths = child.age * 12 + (child.ageMonths ?? 0);
    return filterChild ? filterChild(child, totalAgeMonths) : true;
  });

  const activeChild =
    eligibleChildren.find((child) => child.id === selectedChildId) ??
    eligibleChildren[0] ??
    null;

  const totalAgeMonths = activeChild
    ? activeChild.age * 12 + (activeChild.ageMonths ?? 0)
    : 0;

  useEffect(() => {
    if (!activeChild) return;
    setSelectedChildId(activeChild.id);
    window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(activeChild.id));
  }, [activeChild]);

  const goBack = () => {
    back("hub-module-shell-back");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <header className={PAGE_STICKY_HEADER_BASE}>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm font-bold text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </header>
        <main className="flex flex-1 items-center justify-center p-6 text-center">
          <Card className="max-w-md rounded-3xl border-border bg-card">
            <CardContent className="space-y-4 p-6">
              <UserPlus className="mx-auto h-10 w-10 text-primary" />
              <h1 className="font-quicksand text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">
                {emptyMessage ?? "Add a child profile to get started."}
              </p>
              <Button
                className="w-full rounded-2xl"
                onClick={() => {
                  if (tryAddChild("hub-module-add-child")) {
                    navigate("/children/new", { source: "hub-module-add-child" });
                  }
                }}
              >
                Add Child
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const headerSubtitle = subtitle?.(activeChild, totalAgeMonths) ?? activeChild.name;
  const healthLabPreview =
    featureId === "hub_health_lab" && isHealthLabPreviewAge(totalAgeMonths);
  const gamingHubPreview =
    featureId === "hub_gaming_rewards" && isGamingHubPreviewAge(totalAgeMonths);
  const infantExplorePreview =
    healthLabPreview ||
    gamingHubPreview ||
    (totalAgeMonths < 24 && isExploreNextStageHubFeature(featureId));
  const previewBannerKey =
    featureId === "hub_health_lab"
      ? "parent_hub.web_tiles.health-lab.preview_banner"
      : featureId === "hub_gaming_rewards"
        ? "parent_hub.web_tiles.gaming-rewards.preview_banner"
        : "parent_hub.explore_next.preview_banner";
  const actionGate: HubModuleActionGateState = {
    locked: locked && !infantExplorePreview,
    previewMode: !isPremium && !infantExplorePreview,
    onEngage,
    module: featureId,
    entitlementState: isPremium ? "premium" : journeySoft ? "trial" : "free",
  };
  useEffect(() => {
    if (gateMode !== "action" || !actionGate.previewMode) return;
    track("learning_preview_opened", {
      module: featureId,
      source: "hub_module_page",
      entitlement_state: actionGate.entitlementState,
    });
  }, [actionGate.entitlementState, actionGate.previewMode, featureId, gateMode]);
  const content = (
    <>
      {gateMode === "action" && actionGate.previewMode ? <PremiumBenefitsPanel className="mb-4" /> : null}
      {children({ child: activeChild, totalAgeMonths, gate: actionGate })}
    </>
  );

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background" data-hub-module-shell>
      <header className={cn(PAGE_STICKY_HEADER_BASE, "backdrop-blur")} data-hub-module-header>
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="font-quicksand text-xl font-black leading-tight text-foreground">{title}</h1>
            <p className="truncate text-xs text-muted-foreground">{headerSubtitle}</p>
          </div>
        </div>
      </header>

      {eligibleChildren.length > 1 && (
        <div
          className="mx-auto flex w-full max-w-4xl gap-2 overflow-x-auto px-4 pt-3 pb-1"
          data-hub-module-child-picker
        >
          {eligibleChildren.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => setSelectedChildId(child.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                activeChild.id === child.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}

      <main className="scroll-safe min-h-0 flex-1 px-4 py-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {infantExplorePreview ? (
            <InfantExplorePreviewBanner className="mb-4" messageKey={previewBannerKey} />
          ) : null}
          {gateMode === "action" ? (
            content
          ) : journeySoft && !infantExplorePreview ? (
            <JourneyPreviewContent childName={activeChild.name}>
              <div
                onPointerDownCapture={() => onEngage()}
                onKeyDownCapture={(e) => {
                  if (e.key === "Enter" || e.key === " ") onEngage();
                }}
              >
                {content}
              </div>
            </JourneyPreviewContent>
          ) : (
            <LockedBlock
              locked={locked && !infantExplorePreview}
              reason="hub_journey"
              rounded="rounded-2xl"
            >
              <div
                onPointerDownCapture={() => onEngage()}
                onKeyDownCapture={(e) => {
                  if (e.key === "Enter" || e.key === " ") onEngage();
                }}
              >
                {content}
              </div>
            </LockedBlock>
          )}
          <AmyNestLeaveContinuity
            continueHref="/parenting-hub"
            continueLabel="Back to rooms"
          />
        </div>
      </main>
    </div>
  );
}
