/**
 * Child Discovery Film — Phase 2
 * Scene 2 of the Welcome film. Not a wizard.
 * Reuses finish transaction + analytics step ids. Zero new tables.
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

const shellStyle: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  background: [
    "radial-gradient(ellipse 70% 45% at 50% 12%, rgba(212,175,120,0.12) 0%, transparent 55%)",
    "linear-gradient(175deg, #0c0a08 0%, #14110d 52%, #070605 100%)",
  ].join(", "),
  color: "rgba(244,238,230,0.96)",
  padding: "28px 20px 40px",
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  height: 52,
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(90deg, #c4a574 0%, #e8d4b0 100%)",
  color: "#1a140c",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 0 28px rgba(212,175,120,0.32), 0 4px 18px rgba(0,0,0,0.28)",
};

const chipBtn = (active = false): React.CSSProperties => ({
  padding: "12px 16px",
  borderRadius: 14,
  border: active
    ? "1px solid rgba(232,212,176,0.55)"
    : "1px solid rgba(212,175,120,0.22)",
  background: active ? "rgba(212,175,120,0.16)" : "rgba(255,255,255,0.04)",
  color: "rgba(244,238,230,0.92)",
  fontSize: 15,
  fontWeight: 560,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left" as const,
});

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

  return (
    <div className="amynest-discovery-film" style={shellStyle} data-testid="child-discovery-film">
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          margin: "0 auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <p
          style={{
            margin: "0 0 18px",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(232,212,176,0.45)",
          }}
        >
          Understanding
        </p>

        <h1
          data-testid="discovery-title"
          style={{
            margin: "0 0 10px",
            fontSize: beat === "earned" || beat === "done" ? 26 : 24,
            fontWeight: 700,
            letterSpacing: "-0.4px",
            lineHeight: 1.25,
            color: "#fff",
          }}
        >
          {titleForBeat()}
        </h1>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 14,
            lineHeight: 1.5,
            color: "rgba(244,238,230,0.58)",
          }}
        >
          {subtitleForBeat()}
        </p>

        {beat !== "arrival" && beat !== "saving" ? (
          <DiscoveryNrtPreviewCard
            nrt={nrt}
            childName={name || "your child"}
            adaptationNote={adaptationNote}
          />
        ) : null}

        <div style={{ flex: 1, marginTop: 22 }}>
          {beat === "arrival" ? (
            <div>
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
                style={{ ...primaryBtn, marginTop: 24 }}
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
            </div>
          ) : null}

          {beat === "place" ? (
            <div style={{ display: "grid", gap: 10 }}>
              {PLACE_OPTIONS.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  style={chipBtn(countryCode === c.code)}
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
              style={{ display: "grid", gap: 14 }}
            >
              <input
                data-testid="discovery-name-input"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Child’s name"
                autoFocus
                style={{
                  width: "100%",
                  height: 52,
                  borderRadius: 14,
                  border: "1px solid rgba(212,175,120,0.28)",
                  background: "rgba(0,0,0,0.25)",
                  color: "#fff",
                  padding: "0 16px",
                  fontSize: 16,
                  fontFamily: "inherit",
                }}
              />
              <button type="submit" style={primaryBtn} disabled={!nameDraft.trim()}>
                Continue
              </button>
            </form>
          ) : null}

          {beat === "child-age" ? (
            <div style={{ display: "grid", gap: 10 }}>
              {seed?.age != null && seed.age >= 0 ? (
                <button
                  type="button"
                  data-testid="discovery-age-confirm"
                  style={chipBtn(true)}
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                }}
              >
                {AGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    style={chipBtn(years === opt.years && months === opt.months)}
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
            </div>
          ) : null}

          {beat === "today-world" ? (
            <div style={{ display: "grid", gap: 10 }}>
              {(
                [
                  { id: "school" as const, label: "A school / daycare day" },
                  { id: "home" as const, label: "A home day" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  style={chipBtn(todayContext === opt.id)}
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
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { id: "breastfeeding", label: "Breastfeeding" },
                { id: "formula", label: "Formula" },
                { id: "mixed", label: "Mixed" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  style={chipBtn(feedingType === opt.id)}
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
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { id: "flexible", label: "Flexible" },
                { id: "irregular", label: "Still finding a pattern" },
                { id: "short_naps", label: "Short naps" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  style={chipBtn(sleepPattern === opt.id)}
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
            <div style={{ display: "grid", gap: 12 }}>
              <button
                type="button"
                data-testid="discovery-rhythm-confirm"
                style={primaryBtn}
                onClick={() => {
                  setAdaptationNote("Daily rhythm held — today’s timeline settles.");
                  trackBeat("step_completed", "rhythm", { inferred: true });
                  setBeat("focus");
                }}
              >
                Yes — this feels right
              </button>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "rgba(244,238,230,0.4)",
                  textAlign: "center",
                }}
              >
                You can refine wake and sleep anytime later.
              </p>
            </div>
          ) : null}

          {beat === "focus" ? (
            <div style={{ display: "grid", gap: 10 }}>
              {FOCUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  style={chipBtn(focusGoal === opt.id)}
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
              <button
                type="button"
                style={{
                  ...chipBtn(false),
                  border: "none",
                  background: "transparent",
                  color: "rgba(244,238,230,0.5)",
                  textAlign: "center",
                }}
                onClick={() => {
                  setFocusGoal(null);
                  setAdaptationNote("No extra focus — Amy keeps today simple.");
                  trackBeat("step_skipped", "focus", { reason: "parent_skip" });
                  setBeat("earned");
                }}
              >
                Skip for now
              </button>
            </div>
          ) : null}

          {beat === "earned" ? (
            <div style={{ display: "grid", gap: 14, marginTop: 8 }}>
              {finishError ? (
                <p style={{ margin: 0, color: "rgba(244,220,190,0.9)", fontSize: 13 }}>
                  {finishError}
                </p>
              ) : null}
              <button
                type="button"
                data-testid="discovery-begin-today"
                style={primaryBtn}
                disabled={busy || !profile}
                onClick={() => void finishDiscovery()}
              >
                Begin with this today
              </button>
            </div>
          ) : null}

          {beat === "saving" ? (
            <p
              role="status"
              aria-live="polite"
              style={{ marginTop: 24, color: "rgba(232,212,176,0.7)" }}
            >
              Keeping this understanding safely…
            </p>
          ) : null}

          {beat === "done" ? (
            <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
              <DiscoveryNrtPreviewCard
                nrt={nrt}
                childName={name}
                adaptationNote="AmyNest has earned today’s recommendation."
              />
              <button
                type="button"
                data-testid="discovery-go-activate"
                style={primaryBtn}
                disabled={navigating}
                onClick={() => void goNext()}
              >
                Continue
              </button>
            </div>
          ) : null}
        </div>

        {!authLoaded ? (
          <p style={{ marginTop: 16, fontSize: 11, color: "rgba(244,238,230,0.3)" }}>
            Preparing session…
          </p>
        ) : null}
      </div>
    </div>
  );
}
