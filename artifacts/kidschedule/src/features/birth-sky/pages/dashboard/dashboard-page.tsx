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
  const transitionFired = useRef(false);
  const viewedFired = useRef(false);
  const reduced = prefersReducedMotion();
  const { requestOpenComposer, activePromptId } = useReflectionSession();

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

  if (loadError || !snapshot || !heroVm || !skyVm || !astroVm) {
    return (
      <BirthSkyModuleShell title="Birth Sky" onBack={onExit} testId="birth-sky-dashboard-error">
        <p className="text-sm text-[hsl(40_20%_96%/0.78)]" role="alert">
          {loadError ?? "Loading Birth Sky…"}
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
      title="Birth Sky"
      onBack={onExit}
      testId="birth-sky-dashboard"
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
              onSelect={(key: SkyBodyKey) => setSession((s) => selectSkyBody(s, key))}
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
    </BirthSkyModuleShell>
  );
}
