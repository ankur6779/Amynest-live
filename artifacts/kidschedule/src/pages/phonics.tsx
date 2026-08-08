import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Loader2, Play, UserPlus } from "lucide-react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { AddChildLink } from "@/components/add-child-link";
import { useAppNavigate } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PhonicsLearning } from "@/components/phonics-learning";
import { PhonicsUnavailableFallback } from "@/components/phonics-unavailable-fallback";
import { PremiumActionGate, PremiumBenefitsPanel } from "@/components/hub-module-page-shell";
import { AmyNestLeaveContinuity } from "@/components/amy-nest-leave-continuity";
import { PAGE_STICKY_HEADER_BASE } from "@/lib/page-sticky-header";
import { cn } from "@/lib/utils";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import {
  isGrowLivingV1Enabled,
  livingGrowEmptyPhonics,
  livingGrowLeaveEyebrow,
  livingGrowPageTitle,
} from "@/lib/grow/living-room";
import { getPhonicsLevel } from "@/lib/phonics-content";
import { warmPhonicsRouteOnOpen } from "@/lib/app-audio-prefetch";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";
import {
  ensurePhonicsManifestLoaded,
  isPhonicsModuleAvailable,
} from "@/lib/phonics-manifest-validation";
import {
  resolvePrimaryCta,
  type PhonicsPrimaryCta,
} from "@/lib/phonics-journey-roadmap";

import "@/components/grow/grow-living-deep.css";

type Child = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number | null;
};

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";

const DEFAULT_CTA: PhonicsPrimaryCta = resolvePrimaryCta({
  missionStarted: false,
  missionComplete: false,
  dailyQuizComplete: false,
});

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function PhonicsPage() {
  const [location] = useLocation();
  const { back } = useAppNavigate();
  const search = useSearch();
  const { locked, isPremium, onEngage } = useHubModuleGate("hub_phonics");
  const living = isGrowLivingV1Enabled();
  const phonicsShipped = isPhonicsModuleAvailable();
  const [primaryCta, setPrimaryCta] = useState<PhonicsPrimaryCta>(DEFAULT_CTA);
  const [lessonLaunchToken, setLessonLaunchToken] = useState(0);
  const [lessonSessionOpen, setLessonSessionOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  });

  const handlePrimaryCtaChange = useCallback((cta: PhonicsPrimaryCta) => {
    setPrimaryCta(cta);
  }, []);

  const handlePrimaryCtaClick = useCallback(() => {
    if (primaryCta.action === "open_lesson") {
      setLessonLaunchToken((n) => n + 1);
      requestAnimationFrame(() => scrollToSection("phonics-daily-session"));
      return;
    }
    scrollToSection(primaryCta.scrollTarget);
  }, [primaryCta]);

  const { data: children = [], isLoading } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      refetchOnWindowFocus: true,
    },
  });

  const childList = (children ?? []) as Child[];
  const eligibleChildren = childList.filter((child) => {
    const totalAgeMonths = child.age * 12 + (child.ageMonths ?? 0);
    return totalAgeMonths >= 12 && totalAgeMonths < 72;
  });
  const activeChild =
    eligibleChildren.find((child) => child.id === selectedChildId) ??
    eligibleChildren[0] ??
    null;

  const totalAgeMonths = activeChild
    ? activeChild.age * 12 + (activeChild.ageMonths ?? 0)
    : 0;
  const currentLevel = useMemo(() => getPhonicsLevel(totalAgeMonths), [totalAgeMonths]);

  useEffect(() => {
    if (!activeChild) return;
    setSelectedChildId(activeChild.id);
    window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(activeChild.id));
  }, [activeChild]);

  useEffect(() => {
    if (!location.includes("/phonics/test")) return;
    const type = new URLSearchParams(search).get("type");
    const target = type === "weekly" ? "phonics-test" : "phonics-daily-quiz";
    window.setTimeout(() => scrollToSection(target), 150);
  }, [location, search]);

  useEffect(() => {
    if (locked || !phonicsShipped) return;
    void ensurePhonicsManifestLoaded()
      .then(() => {
        warmPhonicsRouteOnOpen();
      })
      .catch(() => {
        /* audio layer degrades; route stays usable */
      });
  }, [locked, phonicsShipped]);

  const goBack = () => {
    back("phonics-back");
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex min-h-screen items-center justify-center bg-background text-muted-foreground",
          living && "gw-living-deep",
        )}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {living ? "Preparing today's practice…" : "Loading phonics..."}
      </div>
    );
  }

  if (!activeChild) {
    const noEligibleChild = childList.length > 0 && eligibleChildren.length === 0;
    return (
      <div className={cn("flex min-h-screen flex-col bg-background", living && "gw-living-deep")}>
        <header className={PAGE_STICKY_HEADER_BASE}>
          <button type="button" onClick={goBack} className="inline-flex min-h-12 items-center gap-2 text-sm font-bold text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </header>
        <main className="flex flex-1 items-center justify-center p-6 text-center">
          <Card className="max-w-md rounded-3xl border-border bg-card">
            <CardContent className="space-y-4 p-6">
              <UserPlus className="mx-auto h-10 w-10 text-primary" />
              <h1 className="font-quicksand text-2xl font-bold text-foreground">
                {living ? "Add a child to begin gently" : "Add a child to start phonics"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {noEligibleChild
                  ? living
                    ? livingGrowEmptyPhonics()
                    : "Phonics Learning supports ages 1–6. Select or add a child in that range."
                  : living
                    ? "Sounds & letters is personalised by age — create a child profile first."
                    : "Phonics Learning is personalised by age, so create a child profile first."}
              </p>
              <AddChildLink source="phonics-add-child">
                <Button className="w-full min-h-12 rounded-2xl">Add Child</Button>
              </AddChildLink>
              {living ? (
                <AmyNestLeaveContinuity
                  continueHref="/parenting-hub"
                  continueLabel="Back to rooms"
                />
              ) : null}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div
      className={cn("flex min-h-dvh w-full flex-col bg-background", living && "gw-living-deep")}
      data-gw-living={living ? "1" : undefined}
      data-gw-shell={living ? "1" : undefined}
    >
      <header className={cn(PAGE_STICKY_HEADER_BASE, "backdrop-blur")}>
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-10 w-10 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            {living ? <p className="gw-living-deep-eyebrow">{livingGrowLeaveEyebrow()}</p> : null}
            <h1
              className={cn(
                "font-quicksand text-xl leading-tight text-foreground",
                living ? "gw-living-deep-title font-bold" : "font-black",
              )}
            >
              {living ? livingGrowPageTitle("sounds") : "Learning Hub"}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {activeChild.name}
              {currentLevel
                ? ` · ${currentLevel.shortLabel}`
                : living
                  ? " · today's practice"
                  : " · today's lesson"}
            </p>
          </div>
        </div>
      </header>

      <main className={cn("scroll-safe min-h-0 flex-1 px-4 pt-4", lessonSessionOpen ? "pb-6" : "pb-24")}>
        <div className="mx-auto max-w-4xl space-y-4">
            {!isPremium ? <PremiumBenefitsPanel /> : null}
            {eligibleChildren.length > 1 && (
              <section className="flex gap-2 overflow-x-auto pb-1" aria-label="Choose child">
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
              </section>
            )}

            {!phonicsShipped ? (
              <PhonicsUnavailableFallback childName={activeChild.name} />
            ) : (
            <PhonicsLearning
              childQuery={search}
              childId={activeChild.id}
              childName={activeChild.name}
              totalAgeMonths={totalAgeMonths}
              onPrimaryCtaChange={handlePrimaryCtaChange}
              lessonLaunchToken={lessonLaunchToken}
              onLessonSessionChange={setLessonSessionOpen}
              initialTestType={
                (() => {
                  const t = new URLSearchParams(search).get("type");
                  return t === "daily" || t === "weekly" ? t : undefined;
                })()
              }
            />
            )}
            {living ? (
              <AmyNestLeaveContinuity
                continueHref="/parenting-hub"
                continueLabel="Back to rooms"
              />
            ) : null}
        </div>
      </main>

      {!lessonSessionOpen ? (
        <div
          className={cn(
            "bottom-controls z-50 border-t border-border px-4 pt-2 shadow-lg backdrop-blur",
            living ? "bg-background/95" : "bg-[#0B1220]",
          )}
        >
            <div className="mx-auto max-w-4xl">
              <PremiumActionGate
                gate={{
                  locked,
                  previewMode: !isPremium,
                  onEngage,
                  module: "hub_phonics",
                  entitlementState: isPremium ? "premium" : "free",
                }}
                label={living ? PREMIUM_VOICE.continueCta : "Unlock phonics learning"}
              >
                <Button
                  type="button"
                  onClick={handlePrimaryCtaClick}
                  className={cn(
                    "h-12 min-h-12 w-full rounded-2xl gap-2 font-semibold",
                    living
                      ? "gw-living-deep-primary-btn"
                      : "bg-primary text-primary-foreground",
                  )}
                  data-testid="phonics-primary-cta"
                >
                  <Play className="h-4 w-4" />
                  {primaryCta.label}
                </Button>
              </PremiumActionGate>
            </div>
        </div>
      ) : null}
    </div>
  );
}
