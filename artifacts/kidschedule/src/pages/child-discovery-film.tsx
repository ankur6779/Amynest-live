/**
 * Child Discovery Film — Phase 3 Production Manufacturing
 * Day-0 questions FROZEN. Craft inherits Welcome FE materials.
 * Reuses finish transaction + analytics step ids. Zero new tables.
 * Does not touch NRT engine (decide-next) or Welcome/Signup surfaces.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import {
  readFirebaseUserId,
  readOAuthParentNameHint,
} from "@/lib/oauth-profile-hints";
import {
  loadFirstExperienceContinuity,
  peekFirstExperienceOnboardingSeed,
  shouldDeferMonetizationForFirstExperience,
} from "@/lib/first-experience/continuity";
import type { FirstExperienceTodayContext } from "@/lib/first-experience/types";
import { detectCountryFromIp } from "@/lib/onboarding-location";
import {
  OnboardingFinishError,
  runOnboardingFinishTransaction,
} from "@/lib/onboarding-completion";
import { clearOnboardingChatSession } from "@/lib/onboarding-chat-session";
import {
  clearOnboardingRunId,
  createOnboardingRunId,
} from "@/lib/onboarding-telemetry";
import { resetOnboardingAnalyticsOnceFlags } from "@/lib/onboarding-analytics-once";
import { trackOnboardingFunnel } from "@/lib/onboarding-analytics";
import {
  applySetupStatusUpdate,
  isSetupComplete,
  persistOnboardingCache,
  readOnboardingCache,
  resolveSetupStatus,
  type SetupStatus,
} from "@/lib/setup-status";
import {
  navigateAfterOnboardingComplete,
  POST_ONBOARDING_ACTIVATION_PATH,
} from "@/lib/onboarding-navigation";
import { FF_POST_ONBOARDING_TRIAL } from "@/lib/subscription-feature-flags";
import { wasOnboardingTrialSeen } from "@/lib/subscription-funnel-storage";
import { shouldRouteToPostOnboardingFreeTrial } from "@/lib/trial-paywall-variant";
import { ensureAuthContextSynced } from "@/lib/auth-session-sync";
import {
  forceSyncAuthFromCurrentUser,
  hasUsableAuthSession,
} from "@/lib/firebase-auth-listener";
import { waitForIdToken } from "@/lib/auth-token";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";
import { DiscoveryNrtPreviewCard } from "@/components/child-discovery/nrt-preview-card";
import { DiscoveryFilmShell } from "@/components/child-discovery/discovery-film-shell";
import {
  AGE_OPTIONS,
  FOCUS_OPTIONS,
  beatToAnalyticsStep,
  type DiscoveryBeat,
} from "@/lib/child-discovery/beats";
import { buildDiscoveryNrtPreview } from "@/lib/child-discovery/nrt-preview";
import {
  inferChildProfile,
  shouldAskInfantCare,
  shouldAskTodayWorld,
  type InferredChildProfile,
} from "@/lib/child-discovery/infer";
import { buildDiscoveryFinishPayload } from "@/lib/child-discovery/build-finish";

const PLACE_OPTIONS = [
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "AE", name: "UAE" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
];

function trackBeat(
  event: "step_viewed" | "step_completed" | "step_skipped",
  beat: DiscoveryBeat,
  extra?: Record<string, unknown>,
) {
  trackOnboardingFunnel({
    event,
    step: beatToAnalyticsStep(beat),
    extra: { discovery_film: true, discovery_beat: beat, ...extra },
  });
}

function nextAfterAge(
  years: number,
  months: number,
  todayContext: FirstExperienceTodayContext | null,
): DiscoveryBeat {
  if (shouldAskTodayWorld(todayContext)) return "today-world";
  if (shouldAskInfantCare(years, months)) return "infant-feeding";
  return "rhythm";
}

export default function ChildDiscoveryFilm() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { entitlements } = useSubscription();
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();

  const continuity = useMemo(() => loadFirstExperienceContinuity(), []);
  const seed = useMemo(() => peekFirstExperienceOnboardingSeed(), []);

  const [beat, setBeat] = useState<DiscoveryBeat>("arrival");
  const [countryCode, setCountryCode] = useState("US");
  const [ipInferred, setIpInferred] = useState(false);
  const [locationSource, setLocationSource] = useState<"gps" | "ip" | "manual">("manual");
  const [name, setName] = useState(seed?.name ?? continuity?.childName ?? "");
  const [nameDraft, setNameDraft] = useState(seed?.name ?? continuity?.childName ?? "");
  const [years, setYears] = useState(seed?.age ?? -1);
  const [months, setMonths] = useState(seed?.ageMonths ?? 0);
  const [todayContext, setTodayContext] = useState<FirstExperienceTodayContext | null>(
    continuity?.todayContext ?? (seed?.isSchoolGoing ? "school" : null),
  );
  const [feedingType, setFeedingType] = useState<string | null>(null);
  const [sleepPattern, setSleepPattern] = useState<string | null>(null);
  const [focusGoal, setFocusGoal] = useState<string | null>(null);
  const [adaptationNote, setAdaptationNote] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const completionOnceRef = useRef(false);
  const runIdRef = useRef<string | null>(null);
  const justFinishedRef = useRef(false);
  const viewedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ip = await detectCountryFromIp();
        if (cancelled || !ip?.countryCode) return;
        setCountryCode(ip.countryCode);
        setLocationSource("ip");
        setIpInferred(true);
      } catch {
        /* place beat if needed */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    trackOnboardingFunnel({
      event: "onboarding_started",
      step: "intro",
      extra: { discovery_film: true },
    });
  }, []);

  useEffect(() => {
    if (viewedRef.current.has(beat)) return;
    viewedRef.current.add(beat);
    trackBeat("step_viewed", beat);
  }, [beat]);

  const effectiveToday: FirstExperienceTodayContext =
    todayContext === "school" || todayContext === "home" ? todayContext : "home";

  const nrt = useMemo(
    () =>
      buildDiscoveryNrtPreview({
        childName: name,
        ageYears: years >= 0 ? years : -1,
        ageMonths: months,
        todayContext: effectiveToday,
        focusGoal,
      }),
    [name, years, months, effectiveToday, focusGoal],
  );

  const profile: InferredChildProfile | null = useMemo(() => {
    if (!name.trim() || years < 0) return null;
    return inferChildProfile({
      name,
      years,
      months,
      todayContext: effectiveToday,
      countryCode,
      feedingType: feedingType ?? undefined,
      sleepPattern: sleepPattern ?? undefined,
    });
  }, [name, years, months, effectiveToday, countryCode, feedingType, sleepPattern]);

  async function finishDiscovery() {
    if (completionOnceRef.current || !profile) return;
    completionOnceRef.current = true;
    setBusy(true);
    setFinishError(null);
    setBeat("saving");
    trackBeat("step_completed", "earned", { nrt_preview_shown: true });
    trackOnboardingFunnel({
      event: "finish_clicked",
      step: "parent-allergies",
      extra: { discovery_film: true, inferred_allergies: true },
    });

    if (!runIdRef.current) runIdRef.current = createOnboardingRunId();
    const payload = buildDiscoveryFinishPayload({
      child: profile,
      countryCode,
      locationSource,
      focusGoal,
      parentName: readOAuthParentNameHint(),
    });

    try {
      await ensureAuthContextSynced();
      const token = await waitForIdToken(getToken, {
        skipCache: true,
        maxAttempts: isNativeAmyNestAndroidWrapper() ? 24 : 12,
        delayMs: 200,
      });
      if (!token) {
        throw new OnboardingFinishError(
          "auth-token",
          "Sign-in session is not ready yet. Wait a moment and try again.",
        );
      }
      await runOnboardingFinishTransaction(authFetch, {
        ...payload,
        userId: user?.id ?? readFirebaseUserId(),
        onboardingRunId: runIdRef.current ?? undefined,
      });

      const completeStatus = { onboardingComplete: true, profileComplete: true };
      justFinishedRef.current = true;
      persistOnboardingCache(completeStatus);
      queryClient.setQueryData(["onboarding-status"], completeStatus);
      clearOnboardingChatSession();
      clearOnboardingRunId();
      resetOnboardingAnalyticsOnceFlags();
      runIdRef.current = null;

      trackOnboardingFunnel({
        event: "finish_success",
        step: "saving",
        extra: { discovery_film: true },
      });
      trackOnboardingFunnel({
        event: "onboarding_completed",
        step: "done",
        extra: { discovery_film: true },
      });
      void import("@/lib/startup-funnel").then(({ trackStartupFunnel }) => {
        trackStartupFunnel("onboarding_complete");
      });
      void import("@/lib/retention-engine").then(({ trackOnboardingMilestone }) => {
        trackOnboardingMilestone("signup_completed");
      });
      setBeat("done");
    } catch (e) {
      trackOnboardingFunnel({
        event: "finish_failed",
        step: "saving",
        extra: {
          discovery_film: true,
          message: e instanceof Error ? e.message : "unknown",
        },
      });
      setFinishError(
        e instanceof OnboardingFinishError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Something paused — your understanding is still here. Try again.",
      );
      setBeat("earned");
      completionOnceRef.current = false;
    } finally {
      setBusy(false);
    }
  }

  async function goNext() {
    if (navigating) return;
    setNavigating(true);
    if (justFinishedRef.current) {
      const completeStatus = { onboardingComplete: true, profileComplete: true };
      persistOnboardingCache(completeStatus);
      queryClient.setQueryData(["onboarding-status"], completeStatus);
      justFinishedRef.current = false;
      const offerFreeTrial = shouldRouteToPostOnboardingFreeTrial({
        featureEnabled: FF_POST_ONBOARDING_TRIAL,
        alreadySeen: wasOnboardingTrialSeen(),
        isPremiumSubscriber: entitlements?.isPremiumSubscriber === true,
        deferForFirstExperience: shouldDeferMonetizationForFirstExperience(),
      });
      const path = offerFreeTrial ? "/subscription-trial" : POST_ONBOARDING_ACTIVATION_PATH;
      navigateAfterOnboardingComplete(path);
      setLocation(path);
      setNavigating(false);
      return;
    }
    forceSyncAuthFromCurrentUser();
    await ensureAuthContextSynced().catch(() => forceSyncAuthFromCurrentUser());
    const cachedComplete = isSetupComplete(readOnboardingCache());
    if (!isSignedIn && !hasUsableAuthSession() && !cachedComplete) {
      setLocation("/sign-in");
      setNavigating(false);
      return;
    }
    try {
      await queryClient.invalidateQueries({ queryKey: ["children"] });
      const status = await resolveSetupStatus(authFetch);
      const merged = applySetupStatusUpdate(readOnboardingCache(), status);
      if (isSetupComplete(merged)) persistOnboardingCache(merged);
      queryClient.setQueryData(["onboarding-status"], merged as SetupStatus);
    } catch {
      /* keep cache */
    }
    navigateAfterOnboardingComplete(POST_ONBOARDING_ACTIVATION_PATH);
    setLocation(POST_ONBOARDING_ACTIVATION_PATH);
    setNavigating(false);
  }

  const titleForBeat = (): string => {
    switch (beat) {
      case "arrival":
        return name
          ? `Amy is already beginning to understand ${name}`
          : "Amy is ready to understand your child";
      case "place":
        return "Where should Amy personalize from?";
      case "child-name":
        return "Who are we understanding today?";
      case "child-age":
        return name ? `How old is ${name}?` : "How old is your child?";
      case "today-world":
        return name ? `What kind of day is ${name} in?` : "What kind of day is it?";
      case "infant-feeding":
        return name ? `How does ${name} usually feed?` : "How does feeding usually go?";
      case "infant-sleep":
        return name ? `How does ${name} usually sleep?` : "How does sleep usually go?";
      case "rhythm":
        return "Does this daily rhythm feel right?";
      case "focus":
        return "What would help most right now?";
      case "earned":
        return "Today’s next right thing";
      case "saving":
        return "Keeping this understanding safely…";
      case "done":
        return "Amy understands enough to begin today";
      default:
        return "";
    }
  };

  const subtitleForBeat = (): string => {
    switch (beat) {
      case "arrival":
        return "This is not a form. It’s how Amy earns the right to recommend today’s next step.";
      case "place":
        return "One gentle confirm — education and language fit follow from here.";
      case "child-name":
        return "A name turns advice into care.";
      case "child-age":
        return seed?.age != null && years === seed.age
          ? "Confirm what’s already known — or adjust."
          : "Age shapes today’s next right thing.";
      case "today-world":
        return "School days and home days need different next steps.";
      case "infant-feeding":
        return "This quietly changes today’s care step.";
      case "infant-sleep":
        return "Sleep pattern reshapes the next calm cue.";
      case "rhythm":
        return profile
          ? `Wake ${profile.wakeLabel} · Sleep ${profile.sleepLabel}`
          : "Amy inferred a calm default from age.";
      case "focus":
        return "Optional. One focus is enough — skip if you’re unsure.";
      case "earned":
        return "Nothing is unlocked. AmyNest has earned today’s recommendation.";
      case "done":
        return nrt?.title ?? "Your child’s next step is ready.";
      default:
        return "";
    }
  };

  /** Product pillar — every screen must answer why Amy asks now. */
  const whyNowForBeat = (): string => {
    switch (beat) {
      case "arrival":
        return "Why now: continue what already began — before any ask.";
      case "place":
        return "Why now: country shapes today’s education defaults.";
      case "child-name":
        return "Why now: today’s recommendation must name this child.";
      case "child-age":
        return "Why now: age chooses which next right thing is safe today.";
      case "today-world":
        return "Why now: school days and home days need different next steps.";
      case "infant-feeding":
        return "Why now: feeding rhythm changes today’s care step.";
      case "infant-sleep":
        return "Why now: sleep pattern reshapes today’s calm cue.";
      case "rhythm":
        return "Why now: wake and sleep frame today’s timeline.";
      case "focus":
        return "Why now: one focus softens today’s priority — skip if unsure.";
      case "earned":
      case "done":
        return "Why now: AmyNest has earned today’s recommendation.";
      default:
        return "";
    }
  };

  const answered =
    Boolean(adaptationNote) ||
    beat === "earned" ||
    beat === "done" ||
    beat === "saving";

  return (
    <DiscoveryFilmShell beat={beat} answered={answered}>
      <div className="fe-copy cd-copy fe-in">
        <p className="fe-kicker fe-kicker-whisper">Understanding</p>
        <h1
          className={beat === "earned" || beat === "done" ? "fe-title" : "fe-title fe-title-section"}
          data-testid="discovery-title"
        >
          {titleForBeat()}
        </h1>
        <p className="fe-body">{subtitleForBeat()}</p>
        <p className="cd-why-now">{whyNowForBeat()}</p>

        {beat !== "arrival" && beat !== "saving" ? (
          <DiscoveryNrtPreviewCard
            nrt={nrt}
            childName={name || "your child"}
            adaptationNote={adaptationNote}
          />
        ) : null}

        <div className="fe-actions" style={{ marginTop: "var(--space-4)" }}>
          {beat === "arrival" ? (
            <>
              {continuity?.nextThing ? (
                <DiscoveryNrtPreviewCard
                  nrt={continuity.nextThing}
                  childName={name || "your child"}
                  adaptationNote="Already begun — Discovery continues the same story."
                />
              ) : (
                <DiscoveryNrtPreviewCard nrt={null} childName={name || "your child"} />
              )}
              <button
                type="button"
                data-testid="discovery-arrival-continue"
                className="fe-btn fe-btn-primary"
                onClick={() => {
                  trackBeat("step_completed", "arrival");
                  if (!ipInferred) {
                    setBeat("place");
                    return;
                  }
                  trackBeat("step_skipped", "place", { reason: "inferred_safely" });
                  setBeat(name.trim() ? "child-age" : "child-name");
                }}
              >
                Continue
              </button>
            </>
          ) : null}

          {beat === "place" ? (
            <div className="fe-choice-stack">
              {PLACE_OPTIONS.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className="fe-choice"
                  data-active={countryCode === c.code ? "true" : "false"}
                  onClick={() => {
                    setCountryCode(c.code);
                    setLocationSource("manual");
                    setAdaptationNote(`Personalizing for ${c.name}.`);
                    trackBeat("step_completed", "place", { country: c.code });
                    setBeat(name.trim() ? "child-age" : "child-name");
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}

          {beat === "child-name" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const n = nameDraft.trim();
                if (!n) return;
                setName(n);
                setAdaptationNote(`Amy is learning ${n}.`);
                trackBeat("step_completed", "child-name");
                setBeat("child-age");
              }}
              style={{ display: "grid", gap: "var(--space-3)", width: "100%" }}
            >
              <input
                data-testid="discovery-name-input"
                className="fe-surface"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Child’s name"
                autoFocus
              />
              <button
                type="submit"
                className="fe-btn fe-btn-primary"
                disabled={!nameDraft.trim()}
              >
                Continue
              </button>
            </form>
          ) : null}

          {beat === "child-age" ? (
            <>
              {seed?.age != null && seed.age >= 0 ? (
                <button
                  type="button"
                  data-testid="discovery-age-confirm"
                  className="fe-choice"
                  data-active="true"
                  onClick={() => {
                    const y = seed.age;
                    const m = seed.ageMonths ?? 0;
                    setYears(y);
                    setMonths(m);
                    setAdaptationNote(
                      `Age confirmed — today’s step reshapes for ${name || "your child"}.`,
                    );
                    trackBeat("step_completed", "child-age", { inferred: true });
                    setBeat(nextAfterAge(y, m, todayContext));
                  }}
                >
                  Yes — about {seed.age === 0 ? "under 1" : `${seed.age}`}
                </button>
              ) : null}
              <div className="fe-choice-grid">
                {AGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="fe-choice"
                    data-active={
                      years === opt.years && months === opt.months ? "true" : "false"
                    }
                    onClick={() => {
                      setYears(opt.years);
                      setMonths(opt.months);
                      setAdaptationNote(`Today’s recommendation now fits age ${opt.label}.`);
                      trackBeat("step_completed", "child-age", { age_band: opt.id });
                      setBeat(nextAfterAge(opt.years, opt.months, todayContext));
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {beat === "today-world" ? (
            <div className="fe-choice-stack">
              {(
                [
                  { id: "school" as const, label: "A school / daycare day" },
                  { id: "home" as const, label: "A home day" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="fe-choice"
                  data-active={todayContext === opt.id ? "true" : "false"}
                  onClick={() => {
                    setTodayContext(opt.id);
                    setAdaptationNote(
                      opt.id === "school"
                        ? "School-day rhythm — the next step follows the day."
                        : "Home-day rhythm — the next step stays unhurried.",
                    );
                    trackBeat("step_completed", "today-world", { today: opt.id });
                    setBeat(
                      shouldAskInfantCare(years, months) ? "infant-feeding" : "rhythm",
                    );
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}

          {beat === "infant-feeding" ? (
            <div className="fe-choice-stack">
              {[
                { id: "breastfeeding", label: "Breastfeeding" },
                { id: "formula", label: "Formula" },
                { id: "mixed", label: "Mixed" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="fe-choice"
                  data-active={feedingType === opt.id ? "true" : "false"}
                  onClick={() => {
                    setFeedingType(opt.id);
                    setAdaptationNote("Care step updates with feeding rhythm.");
                    trackBeat("step_completed", "infant-feeding");
                    setBeat("infant-sleep");
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}

          {beat === "infant-sleep" ? (
            <div className="fe-choice-stack">
              {[
                { id: "flexible", label: "Flexible" },
                { id: "irregular", label: "Still finding a pattern" },
                { id: "short_naps", label: "Short naps" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="fe-choice"
                  data-active={sleepPattern === opt.id ? "true" : "false"}
                  onClick={() => {
                    setSleepPattern(opt.id);
                    setAdaptationNote("Sleep pattern reshapes today’s calm cue.");
                    trackBeat("step_completed", "infant-sleep");
                    setBeat("rhythm");
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}

          {beat === "rhythm" ? (
            <>
              <button
                type="button"
                data-testid="discovery-rhythm-confirm"
                className="fe-btn fe-btn-primary"
                onClick={() => {
                  setAdaptationNote("Daily rhythm held — today’s timeline settles.");
                  trackBeat("step_completed", "rhythm", { inferred: true });
                  setBeat("focus");
                }}
              >
                Yes — this feels right
              </button>
              <p className="fe-body-sm" style={{ textAlign: "center" }}>
                You can refine wake and sleep anytime later.
              </p>
            </>
          ) : null}

          {beat === "focus" ? (
            <>
              <div className="fe-choice-stack">
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="fe-choice"
                    data-active={focusGoal === opt.id ? "true" : "false"}
                    onClick={() => {
                      setFocusGoal(opt.id);
                      setAdaptationNote(`Focus held: ${opt.label.toLowerCase()}.`);
                      trackBeat("step_completed", "focus", { goal: opt.id });
                      setBeat("earned");
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="fe-btn fe-btn-quiet"
                onClick={() => {
                  setFocusGoal(null);
                  setAdaptationNote("No extra focus — Amy keeps today simple.");
                  trackBeat("step_skipped", "focus", { reason: "parent_skip" });
                  setBeat("earned");
                }}
              >
                Skip for now
              </button>
            </>
          ) : null}

          {beat === "earned" ? (
            <>
              {finishError ? (
                <p className="fe-body-sm" role="alert">
                  {finishError}
                </p>
              ) : null}
              <button
                type="button"
                data-testid="discovery-begin-today"
                className="fe-btn fe-btn-primary"
                disabled={busy || !profile}
                onClick={() => void finishDiscovery()}
              >
                Begin with this today
              </button>
            </>
          ) : null}

          {beat === "saving" ? (
            <p className="fe-body" role="status" aria-live="polite">
              Keeping this understanding safely…
            </p>
          ) : null}

          {beat === "done" ? (
            <>
              <DiscoveryNrtPreviewCard
                nrt={nrt}
                childName={name}
                adaptationNote="AmyNest has earned today’s recommendation."
              />
              <button
                type="button"
                data-testid="discovery-go-activate"
                className="fe-btn fe-btn-primary"
                disabled={navigating}
                onClick={() => void goNext()}
              >
                Continue
              </button>
            </>
          ) : null}
        </div>

        {!authLoaded ? (
          <p className="fe-body-sm" style={{ marginTop: "var(--space-3)" }}>
            Preparing session…
          </p>
        ) : null}
      </div>
    </DiscoveryFilmShell>
  );
}
