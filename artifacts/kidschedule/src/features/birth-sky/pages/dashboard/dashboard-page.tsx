/**
 * Birth Sky Dashboard (Pack 4 + Pack 5 / IM-3 + Pack 7 lifecycle entry).
 * Hero · Sky · Astronomy · Tradition · Reflect.
 * Snapshot hydration for browse; edit/regen hosted via Pack 7 overlay (never silent overwrite).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { BirthSkyModuleShell } from "../../components/birth-sky-module-shell";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import { hydrateSkySnapshot } from "../../domain/models/sky-snapshot-compat";
import { useBirthSkyAi } from "../../application/orchestrators/use-birth-sky-ai";
import { editBirthDetailsAndRegenerate } from "../../application/orchestrators/edit-and-regenerate";
import {
  buildAstronomySegmentVM,
  buildDashboardHeroVM,
  buildSkySegmentVM,
  type CompletenessChip,
  type SkyBodyKey,
} from "../../application/view-models/dashboard-vm";
import { buildTraditionSegmentVM } from "../../application/view-models/tradition-vm";
import { buildReflectionSegmentVM } from "../../application/view-models/reflection-vm";
import { buildTraditionalData } from "../../infrastructure/traditional/build-traditional-data";
import {
  acceptTraditionIntro,
  dismissTraditionAstronomyOnly,
  loadTraditionSettings,
  type TraditionIntroState,
} from "../../infrastructure/repositories/tradition-settings-store";
import {
  loadReflectionStore,
  saveReflectionEntry,
} from "../../infrastructure/repositories/reflection-store";
import type { ReflectionStoreState } from "../../domain/models/reflection";
import { TRADITION_REFLECT_PROMPT } from "../../constants/reflection-prompts";
import {
  createTransitionReadiness,
  withReadinessPatch,
} from "../../application/orchestrators/transition-readiness";
import {
  bindSnapshotVersion,
  createDashboardSession,
  selectSkyBody,
  setDashboardSegment,
  type DashboardSegmentId,
} from "../../state/dashboard-session";
import { useReflectionSession } from "../../state/reflection-session";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { BirthSkyDashboardHero } from "./dashboard-hero";
import { BirthSkyDaySkyBanner } from "./day-sky-banner";
import { BirthSkySegmentNav } from "./segment-nav";
import { BirthSkySkySegment } from "./sky-segment";
import { BirthSkyAstronomySegment } from "./astronomy-segment";
import { BirthSkyTraditionSegment } from "./tradition-segment";
import { BirthSkyReflectSegment } from "./reflect-segment";
import { BirthSkyConversationSheet } from "./conversation-sheet";
import { BirthSkyEditDetailsBoundaryPage } from "./edit-details-boundary";
import { BirthSkyRegenerateOverlay } from "../settings/regenerate-overlay";
import { AMY_ASTRO_PRODUCT_NAME } from "../../lib/branding";
import type { KundliBody } from "../../components/north-indian-kundli";
import {
  AmyAstroExplorationDelight,
  hasExplorationMemory,
  markExplorationMemory,
} from "../../components/exploration-delight";
import { AmyAstroCosmicProgress } from "../../components/cosmic-progress";
import { AmyAstroPlanetJourney, type PlanetKey } from "../../components/planet-journey";
import { AmyAstroEmotionalCelebration } from "../../components/emotional-celebration";
import {
  buildMemoryLines,
  computeCosmicProgress,
  loadCosmicMemory,
  markEmotionalCompletion,
  rememberAiOpened,
  rememberCelebration,
  rememberChapter,
  rememberPlanet,
  shouldOfferEmotionalCompletion,
  touchCosmicVisit,
  type CosmicMemory,
} from "../../lib/cosmic-memory";
import { buildCosmicPortrait } from "../../lib/signature-insight";
import { buildTodaysSky } from "../../lib/todays-sky";
import {
  buildContinuityLine,
  buildDiscoveryNudge,
  type DiscoveryNudge,
} from "../../lib/discovery-guidance";
import { AmyAstroCosmicPortraitCard } from "../../components/cosmic-portrait-card";
import { AmyAstroTodaysSkyCard } from "../../components/todays-sky-card";
import { AmyAstroDiscoveryNudge } from "../../components/discovery-nudge";
import { AmyAstroEmotionalCompletion } from "../../components/emotional-completion";
import { useUser } from "@/lib/firebase-auth-hooks";
import { softHaptic } from "../../lib/soft-haptic";
import { DEEP_INSIGHTS_CONTENT_VERSION } from "../../constants/deep-insights-content";

type Props = {
  profile: BirthProfile;
  snapshot: SkySnapshot;
  childName: string;
  initialSegment?: DashboardSegmentId;
  /** True when arriving from Reveal CTA (enables transition_completed contract). */
  fromRevealTransition?: boolean;
  online?: boolean;
  onExit: () => void;
  onSegmentPath: (segment: DashboardSegmentId) => void;
  onOpenSettings: () => void;
  onProfileSnapshotChange: (profile: BirthProfile, snapshot: SkySnapshot) => void;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BirthSkyDashboardPage({
  profile,
  snapshot: snapshotProp,
  childName,
  initialSegment = "sky",
  fromRevealTransition = false,
  online = typeof navigator === "undefined" ? true : navigator.onLine,
  onExit,
  onSegmentPath,
  onOpenSettings,
  onProfileSnapshotChange,
}: Props) {
  const authFetch = useAuthFetch();
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();
  const hydrated = useMemo(() => hydrateSkySnapshot(snapshotProp), [snapshotProp]);
  const [session, setSession] = useState(() => createDashboardSession(initialSegment));
  const [readiness, setReadiness] = useState(() =>
    createTransitionReadiness(fromRevealTransition),
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editFocus, setEditFocus] = useState<"day" | "time" | "place" | undefined>();
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenFailed, setRegenFailed] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<Parameters<
    typeof editBirthDetailsAndRegenerate
  >[0]["next"] | null>(null);
  const [skyToast, setSkyToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [traditionSettings, setTraditionSettings] = useState<TraditionIntroState>(() =>
    loadTraditionSettings(profile.userId),
  );
  const [traditionLoading, setTraditionLoading] = useState(false);
  const [reflectionState, setReflectionState] = useState<ReflectionStoreState>(() =>
    loadReflectionStore(profile.profileId),
  );
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [insightOpens, setInsightOpens] = useState(0);
  const [showDelight, setShowDelight] = useState(false);
  const [memory, setMemory] = useState<CosmicMemory>(() =>
    loadCosmicMemory(profile.profileId),
  );
  const [planetJourney, setPlanetJourney] = useState<PlanetKey | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [pendingCelebration, setPendingCelebration] = useState<string | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [focusChapterId, setFocusChapterId] = useState<string | null>(null);
  const transitionFired = useRef(false);
  const viewedFired = useRef(false);
  const reduced = prefersReducedMotion();
  const { requestOpenComposer, activePromptId } = useReflectionSession();
  const { user: authUser } = useUser();
  const parentFirstName =
    authUser?.firstName?.trim() ||
    authUser?.fullName?.trim()?.split(/\s+/)[0] ||
    null;

  useEffect(() => {
    setMemory(touchCosmicVisit(profile.profileId));
  }, [profile.profileId]);

  useEffect(() => {
    if (insightOpens < 3) return;
    if (hasExplorationMemory(profile.profileId)) return;
    markExplorationMemory(profile.profileId);
    setShowDelight(true);
  }, [insightOpens, profile.profileId]);

  const progress = useMemo(() => {
    // 23 chapters approximate in deep insights pack
    return computeCosmicProgress(memory, 23);
  }, [memory]);
  const memoryLines = useMemo(
    () => buildMemoryLines(memory, childName),
    [memory, childName],
  );
  const continuityLine = useMemo(
    () => buildContinuityLine(memory, childName),
    [memory, childName],
  );
  const discoveryNudge = useMemo(
    () =>
      buildDiscoveryNudge(memory, childName, {
        daySky: snapshotProp.mode === "day_sky",
      }),
    [memory, childName, snapshotProp.mode],
  );

  useEffect(() => {
    if (memory.completionShown) return;
    if (!shouldOfferEmotionalCompletion(memory)) return;
    setShowCompletion(true);
    setMemory(markEmotionalCompletion(profile.profileId));
  }, [
    memory.completionShown,
    memory.chaptersOpened.length,
    memory.planetsVisited.length,
    profile.profileId,
  ]);

  const openPlanet = useCallback(
    (key: PlanetKey) => {
      softHaptic(reduced);
      setPlanetJourney(key);
      setMemory(rememberPlanet(profile.profileId, key));
      if (!memory.celebrationsShown.includes(`planet-${key}`)) {
        setMemory(rememberCelebration(profile.profileId, `planet-${key}`));
        // Queue until planet closes so celebration is never hidden under journey.
        setPendingCelebration("A beautiful memory has been added to their sky.");
      }
    },
    [profile.profileId, memory.celebrationsShown, reduced],
  );

  useEffect(() => {
    if (!hydrated.ok) {
      setLoadError("We couldn’t open this sky. Try again from Parenting Hub.");
      return;
    }
    setLoadError(null);
    setSession((s) => bindSnapshotVersion(s, hydrated.snapshot.snapshotVersion));
  }, [hydrated]);

  useEffect(() => {
    setSession((s) => setDashboardSegment(s, initialSegment));
  }, [initialSegment]);

  useEffect(() => {
    setTraditionSettings(loadTraditionSettings(profile.userId));
  }, [profile.userId]);

  useEffect(() => {
    setReflectionLoading(true);
    const t = window.setTimeout(() => {
      setReflectionState(loadReflectionStore(profile.profileId));
      setReflectionLoading(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [profile.profileId]);

  const snapshot = hydrated.ok ? hydrated.snapshot : null;

  const portrait = useMemo(
    () =>
      snapshot
        ? buildCosmicPortrait({
            childName,
            sunSign: snapshot.astronomy.sunSign,
            moonSign: snapshot.astronomy.moonSign,
            moonPhaseLabel: snapshot.astronomy.moonPhaseLabel,
            risingSign: snapshot.astronomy.risingSign ?? null,
            daySky: snapshot.mode === "day_sky",
          })
        : null,
    [snapshot, childName],
  );
  const todaysSky = useMemo(
    () =>
      snapshot
        ? buildTodaysSky({
            childName,
            moonSign: snapshot.astronomy.moonSign,
            moonPhaseLabel: snapshot.astronomy.moonPhaseLabel,
            sunSign: snapshot.astronomy.sunSign,
            daySky: snapshot.mode === "day_sky",
            visitIndex: memory.greetingIndex,
          })
        : null,
    [snapshot, childName, memory.greetingIndex],
  );

  const heroVm = useMemo(
    () => (snapshot ? buildDashboardHeroVM(profile, snapshot, childName) : null),
    [profile, snapshot, childName],
  );
  const skyVm = useMemo(() => (snapshot ? buildSkySegmentVM(snapshot) : null), [snapshot]);
  const astroVm = useMemo(
    () => (snapshot ? buildAstronomySegmentVM(profile, snapshot) : null),
    [profile, snapshot],
  );

  const traditionalData = useMemo(
    () => (snapshot ? buildTraditionalData(profile, snapshot) : null),
    [profile, snapshot],
  );

  const traditionVm = useMemo(
    () =>
      buildTraditionSegmentVM(traditionalData, {
        showTradition: traditionSettings.showTradition,
      }),
    [traditionalData, traditionSettings.showTradition],
  );

  const reflectionVm = useMemo(
    () =>
      buildReflectionSegmentVM({
        childName,
        entries: reflectionState.entries,
        timelineItems: reflectionState.timelineItems,
        emittedMilestones: reflectionState.emittedMilestones,
        prefills: activePromptId ? { promptId: activePromptId } : null,
        loading: reflectionLoading,
      }),
    [childName, reflectionState, reflectionLoading, activePromptId],
  );

  const ai = useBirthSkyAi({
    authFetch,
    profile,
    snapshot: snapshot ?? snapshotProp,
    childName,
    isPremiumClient: isPremium,
    openPaywall: () => openPaywall("premium_insight", { module: "birth_sky", source: "ask_amy" }),
    reflectionMeta: {
      reflectionIds: reflectionState.entries.map((e) => e.reflectionId),
      reflectionPromptIds: reflectionState.entries.map((e) => e.promptId),
      reflectionCount: reflectionState.entries.length,
    },
  });

  const followDiscovery = useCallback(
    (nudge: DiscoveryNudge) => {
      softHaptic(reduced);
      if (nudge.action === "planet" && nudge.target) {
        openPlanet(nudge.target as PlanetKey);
        return;
      }
      if (nudge.action === "chapter" && nudge.target) {
        setFocusChapterId(nudge.target);
        setSession((s) => setDashboardSegment(s, "sky"));
        onSegmentPath("sky");
        window.setTimeout(() => {
          document
            .querySelector('[data-testid="amy-astro-insights-panel"]')
            ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
        }, 80);
        return;
      }
      if (nudge.action === "amy") {
        setMemory(rememberAiOpened(profile.profileId));
        void ai.openAskAmy("reflect");
      }
    },
    [reduced, onSegmentPath, profile.profileId, openPlanet, ai.openAskAmy],
  );

  useEffect(() => {
    if (!snapshot || viewedFired.current) return;
    viewedFired.current = true;
    trackBirthSkyEvent("birth_sky.dashboard_viewed", {
      mode: snapshot.mode,
      time_precision: profile.timePrecision,
      place_provided: Boolean(profile.birthPlace),
    });
    trackBirthSkyEvent("birth_sky.dashboard_loaded", {
      mode: snapshot.mode,
    });
  }, [snapshot, profile.timePrecision, profile.birthPlace]);

  useEffect(() => {
    if (!readiness.completed || transitionFired.current) return;
    transitionFired.current = true;
    trackBirthSkyEvent("birth_sky.transition_completed", {
      mode: snapshot?.mode ?? "full",
      time_precision: profile.timePrecision,
    });
  }, [readiness.completed, snapshot?.mode, profile.timePrecision]);

  const patchReadiness = useCallback((patch: Parameters<typeof withReadinessPatch>[1]) => {
    setReadiness((r) => withReadinessPatch(r, patch));
  }, []);

  useEffect(() => {
    if (!fromRevealTransition) return;
    const tid = window.setTimeout(() => {
      patchReadiness({ transitionOverlayActive: false });
    }, reduced ? 120 : 400);
    return () => window.clearTimeout(tid);
  }, [fromRevealTransition, patchReadiness, reduced]);

  // Lazy Tradition chunk feel — brief loading on first focus (Pack 5 §10).
  useEffect(() => {
    if (session.activeSegment !== "tradition") return;
    setTraditionLoading(true);
    const t = window.setTimeout(() => setTraditionLoading(false), reduced ? 0 : 80);
    return () => window.clearTimeout(t);
  }, [session.activeSegment, reduced]);

  const openEdit = (field?: "day" | "time" | "place") => {
    setEditFocus(field);
    setEditOpen(true);
  };

  const runRegen = async (next: NonNullable<typeof pendingEdit>) => {
    setRegenBusy(true);
    setRegenFailed(false);
    setPendingEdit(next);
    try {
      const result = await editBirthDetailsAndRegenerate({
        authFetch,
        profile,
        next,
      });
      onProfileSnapshotChange(result.profile, result.snapshot);
      setSession((s) => bindSnapshotVersion(s, result.snapshot.snapshotVersion));
      setEditOpen(false);
      setRegenBusy(false);
      setPendingEdit(null);
      setSkyToast("Sky updated");
    } catch {
      setRegenFailed(true);
    }
  };

  if (editOpen) {
    return (
      <>
        <BirthSkyEditDetailsBoundaryPage
          profile={profile}
          focusField={editFocus}
          online={online}
          onCancel={() => setEditOpen(false)}
          onSaveAndRegenerate={(next) => runRegen(next)}
        />
        <BirthSkyRegenerateOverlay
          visible={regenBusy || regenFailed}
          failed={regenFailed}
          onRetry={() => {
            if (pendingEdit) void runRegen(pendingEdit);
          }}
          onDismiss={() => {
            setRegenBusy(false);
            setRegenFailed(false);
            setPendingEdit(null);
          }}
        />
      </>
    );
  }

  if (loadError || !snapshot || !heroVm || !skyVm || !astroVm || !portrait || !todaysSky) {
    return (
      <BirthSkyModuleShell title={AMY_ASTRO_PRODUCT_NAME} onBack={onExit} testId="birth-sky-dashboard-error">
        <p className="text-sm text-[hsl(40_20%_96%/0.78)]" role="alert">
          {loadError ?? `Loading ${AMY_ASTRO_PRODUCT_NAME}…`}
        </p>
        <button
          type="button"
          className="mt-6 min-h-12 w-full rounded-xl bg-white/10 font-semibold"
          onClick={onExit}
          data-testid="birth-sky-dashboard-error-exit"
        >
          Back to Parenting Hub
        </button>
      </BirthSkyModuleShell>
    );
  }

  const active = session.activeSegment;
  const needsIntro =
    active === "tradition" &&
    traditionSettings.showTradition &&
    !traditionSettings.traditionIntroAccepted;

  return (
    <BirthSkyModuleShell
      title={AMY_ASTRO_PRODUCT_NAME}
      onBack={onExit}
      testId="birth-sky-dashboard"
      reducedMotion={reduced}
      topBarEnd={
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-white/10"
          aria-label="Settings"
          onClick={onOpenSettings}
          data-testid="birth-sky-open-settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      }
    >
      {skyToast ? (
        <p role="status" className="mb-2 text-sm text-[hsl(150_40%_70%)]" data-testid="birth-sky-sky-toast">
          {skyToast}
        </p>
      ) : null}
      <div className="space-y-4 pb-8">
        <BirthSkyDashboardHero
          vm={heroVm}
          collapsed={session.heroCollapsed}
          reducedMotion={reduced}
          parentFirstName={parentFirstName}
          sunSign={snapshot.astronomy.sunSign}
          moonSign={snapshot.astronomy.moonSign}
          moonPhaseLabel={snapshot.astronomy.moonPhaseLabel}
          greetingIndex={memory.greetingIndex}
          onToggleCollapse={() => {
            setSession((s) => {
              const next = !s.heroCollapsed;
              trackBirthSkyEvent(
                next ? "birth_sky.hero_collapsed" : "birth_sky.hero_expanded",
                { mode: heroVm.mode },
              );
              return { ...s, heroCollapsed: next };
            });
          }}
          onChip={(chip: CompletenessChip) => openEdit(chip.id)}
          onRegenerateEntry={() => openEdit()}
          onHeroPainted={() => patchReadiness({ heroRendered: true })}
          onContinueJourney={() => {
            const el = document.querySelector(
              '[data-testid="amy-astro-cosmic-portrait-card"]',
            );
            el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
          }}
          onAskAmy={() => {
            setMemory(rememberAiOpened(profile.profileId));
            void ai.openAskAmy("reflect");
          }}
        />

        <AmyAstroTodaysSkyCard content={todaysSky} reducedMotion={reduced} />

        <AmyAstroCosmicPortraitCard
          childName={childName}
          portrait={portrait}
          reducedMotion={reduced}
          onContinue={() => {
            document
              .querySelector('[data-testid="amy-astro-discovery-nudge"]')
              ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
          }}
          onAskAmy={() => {
            setMemory(rememberAiOpened(profile.profileId));
            void ai.openAskAmy("reflect");
          }}
        />

        <AmyAstroDiscoveryNudge
          nudge={discoveryNudge}
          continuityLine={continuityLine}
          reducedMotion={reduced}
          onFollow={followDiscovery}
        />

        <AmyAstroCosmicProgress
          percent={progress.percent}
          nextLabel={progress.nextLabel}
          memoryLines={memoryLines}
          reducedMotion={reduced}
        />

        <BirthSkyDaySkyBanner
          visible={heroVm.daySky}
          alreadyViewed={session.daySkyBannerViewed}
          onViewed={() => setSession((s) => ({ ...s, daySkyBannerViewed: true }))}
          onAddTime={() => openEdit("time")}
        />

        <BirthSkySegmentNav
          active={active}
          onChange={(id) => {
            setSession((s) => setDashboardSegment(s, id));
            onSegmentPath(id);
            trackBirthSkyEvent("birth_sky.segment_switched", {
              mode: heroVm.mode,
            });
          }}
        />

        <div role="tabpanel" className="min-h-[16rem]">
          {active === "sky" ? (
            <BirthSkySkySegment
              vm={skyVm}
              selectedBody={session.selectedBody}
              reducedMotion={reduced}
              childName={childName}
              sunSign={snapshot.astronomy.sunSign}
              moonSign={snapshot.astronomy.moonSign}
              risingSign={snapshot.astronomy.risingSign ?? null}
              moonPhaseLabel={snapshot.astronomy.moonPhaseLabel}
              focusChapterId={focusChapterId}
              onInsightOpened={(chapterId) => {
                softHaptic(reduced);
                setInsightOpens((n) => n + 1);
                setMemory(rememberChapter(profile.profileId, chapterId));
                if (
                  !memory.celebrationsShown.includes(`chapter-${chapterId}`) &&
                  ["personality", "emotional", "learning"].includes(chapterId)
                ) {
                  setMemory(
                    rememberCelebration(profile.profileId, `chapter-${chapterId}`),
                  );
                  setCelebration("A beautiful memory has been added.");
                }
              }}
              onSelect={(key: SkyBodyKey) => {
                setSession((s) => selectSkyBody(s, key));
                openPlanet(key);
              }}
              onSkyInteractive={() => {
                patchReadiness({
                  skyInteractive: true,
                  firstFrameStable: true,
                });
              }}
            />
          ) : null}
          {active === "astronomy" ? (
            <BirthSkyAstronomySegment
              vm={astroVm}
              onAddTime={() => openEdit("time")}
            />
          ) : null}
          {active === "tradition" ? (
            <BirthSkyTraditionSegment
              vm={traditionVm}
              loading={traditionLoading}
              needsIntro={needsIntro}
              reducedMotion={reduced}
              childName={childName}
              moonPhaseLabel={snapshot.astronomy.moonPhaseLabel}
              kundliBodies={
                [
                  {
                    key: "sun",
                    label: "Sun",
                    sign: snapshot.astronomy.sunSign,
                    story: `You may notice daylight themes around ${childName} when ${snapshot.astronomy.sunSign} warmth meets being seen — vitality without pressure.`,
                  },
                  {
                    key: "moon",
                    label: "Moon",
                    sign: snapshot.astronomy.moonSign,
                    story: `Your child's emotional world is illuminated by a ${snapshot.astronomy.moonPhaseLabel} Moon resting in ${snapshot.astronomy.moonSign}, suggesting comfort often grows through belonging.`,
                  },
                  {
                    key: "rising",
                    label: "Rising",
                    sign: snapshot.astronomy.risingSign ?? "—",
                    locked: heroVm.daySky || !snapshot.astronomy.risingSign,
                    story: heroVm.daySky
                      ? "Rising waits for birth time — your Day Sky remains complete without it."
                      : `As ${childName} meets a room, Rising ${snapshot.astronomy.risingSign ?? ""} can feel like a soft doorway — never a script.`,
                  },
                ] satisfies KundliBody[]
              }
              onAcceptIntro={() => {
                const next = acceptTraditionIntro(profile.userId);
                setTraditionSettings(next);
                trackBirthSkyEvent("birth_sky.tradition_intro_accepted", {
                  traditionalContentVersion: traditionVm.traditionalContentVersion,
                });
              }}
              onAstronomyOnly={() => {
                const next = dismissTraditionAstronomyOnly(profile.userId);
                setTraditionSettings(next);
                trackBirthSkyEvent("birth_sky.tradition_intro_dismissed_astronomy_only", {});
              }}
              onAddTime={() => openEdit("time")}
              onReflectOnCard={() => {
                requestOpenComposer(TRADITION_REFLECT_PROMPT.id);
                setSession((s) => setDashboardSegment(s, "reflect"));
                onSegmentPath("reflect");
              }}
              onAskAmyAboutCard={(cardId) => {
                void ai.openAskAmy("tradition", { traditionCardId: cardId });
              }}
            />
          ) : null}
          {active === "reflect" ? (
            <BirthSkyReflectSegment
              vm={reflectionVm}
              childName={childName}
              reducedMotion={reduced}
              onSave={({ promptId, body }) => {
                const result = saveReflectionEntry({
                  profileId: profile.profileId,
                  snapshotVersion: snapshot.snapshotVersion,
                  promptId,
                  body,
                });
                setReflectionState(result.state);
                return {
                  milestoneId: result.milestoneId,
                  milestoneEmitted: result.milestoneEmitted,
                };
              }}
              onOpenTimelineItem={() => {
                /* analytics fired in segment */
              }}
              onAskAmy={() => {
                void ai.openAskAmy("reflect");
              }}
            />
          ) : null}
        </div>
      </div>

      <BirthSkyConversationSheet
        open={ai.open}
        reducedMotion={reduced}
        offline={ai.offline}
        state={ai.machine}
        conversations={ai.conversations}
        activeConversationId={ai.activeId}
        messages={ai.messages}
        streamingText={ai.streamingText}
        errorMessage={ai.errorMessage}
        composer={ai.composer}
        childName={childName}
        sunSign={snapshot.astronomy.sunSign}
        moonSign={snapshot.astronomy.moonSign}
        risingSign={snapshot.astronomy.risingSign ?? null}
        moonPhaseLabel={snapshot.astronomy.moonPhaseLabel}
        continuityHint={continuityLine}
        onComposerChange={ai.setComposer}
        onSend={() => {
          void ai.send();
        }}
        onRetry={() => {
          void ai.retry();
        }}
        onCancel={ai.cancel}
        onClose={() => ai.closeAiFlow(true)}
        onSelectConversation={(id) => {
          void ai.selectConversation(id);
        }}
        onNewConversation={ai.newConversation}
      />

      <AmyAstroExplorationDelight
        childName={childName}
        open={showDelight}
        reducedMotion={reduced}
        onClose={() => setShowDelight(false)}
      />

      <AmyAstroEmotionalCelebration
        open={Boolean(celebration)}
        message={celebration ?? ""}
        reducedMotion={reduced}
        onClose={() => setCelebration(null)}
      />

      <AmyAstroEmotionalCompletion
        open={showCompletion}
        childName={childName}
        reducedMotion={reduced}
        onClose={() => setShowCompletion(false)}
      />

      {planetJourney && snapshot ? (
        <AmyAstroPlanetJourney
          planet={planetJourney}
          childName={childName}
          sign={
            planetJourney === "sun"
              ? snapshot.astronomy.sunSign
              : planetJourney === "moon"
                ? snapshot.astronomy.moonSign
                : snapshot.astronomy.risingSign ?? "—"
          }
          locked={
            planetJourney === "rising" &&
            (heroVm.daySky || !snapshot.astronomy.risingSign)
          }
          moonPhaseLabel={snapshot.astronomy.moonPhaseLabel}
          reducedMotion={reduced}
          relatedChapterHint={
            planetJourney === "sun"
              ? "Lights Already Softly On"
              : planetJourney === "moon"
                ? "The Inner Weather"
                : "The Gentle Heart"
          }
          onClose={() => {
            setPlanetJourney(null);
            if (pendingCelebration) {
              setCelebration(pendingCelebration);
              setPendingCelebration(null);
            }
          }}
          onExploreChapter={() => {
            setPlanetJourney(null);
            if (pendingCelebration) {
              setCelebration(pendingCelebration);
              setPendingCelebration(null);
            }
            setSession((s) => setDashboardSegment(s, "sky"));
            onSegmentPath("sky");
            window.setTimeout(() => {
              document
                .querySelector('[data-testid="amy-astro-insights-panel"]')
                ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
            }, 50);
          }}
          onAskAmy={() => {
            setPlanetJourney(null);
            setPendingCelebration(null);
            setMemory(rememberAiOpened(profile.profileId));
            void ai.openAskAmy("reflect");
          }}
        />
      ) : null}

      {/* content version marker for support / QA */}
      <span className="sr-only" data-insights-version={DEEP_INSIGHTS_CONTENT_VERSION} />
    </BirthSkyModuleShell>
  );
}
