/**
 * Birth Sky module root — IM-1 journey + IM-2 Dashboard (Hero · Sky · Astronomy).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useListChildren } from "@workspace/api-client-react";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useUser } from "@/lib/firebase-auth-hooks";
import { registerBirthSkyFoundation } from "../foundation/register-birth-sky";
import {
  getBirthSkyViewerEmail,
  isBirthSkyDeepLinksEnabled,
  isBirthSkyEnabled,
  setBirthSkyViewerEmail,
} from "../lib/feature-flags";
import { trackBirthSkyEvent } from "../lib/analytics";
import {
  normalizeBirthSkyPath,
  resolveBirthSkyEntry,
  type BirthSkyEntryReferrer,
  type BirthSkySetupStep,
} from "../lib/entry-resolver";
import { BirthSkyUnavailable } from "../components/birth-sky-unavailable";
import { BirthSkySealProvider } from "../components/birth-sky-seal-host";
import { BirthSkyReflectionSessionProvider } from "../state/reflection-session";
import { BirthSkyWelcomePage } from "./welcome-page";
import { BirthSkyChildConfirmationPage } from "./child-confirmation-page";
import { BirthSkyDatePage } from "./setup/date-page";
import { BirthSkyTimePage } from "./setup/time-page";
import { BirthSkyPlacePage } from "./setup/place-page";
import { BirthSkyConsentPage } from "./setup/consent-page";
import { BirthSkyReviewPage } from "./setup/review-page";
import { BirthSkyFormationPage } from "./formation-page";
import { BirthSkyRevealPage } from "./reveal-page";
import { BirthSkyDashboardPage } from "./dashboard/dashboard-page";
import { BirthSkySettingsPage } from "./settings/settings-page";
import { AmyAstroEmblem } from "../components/amy-astro-emblem";
import "../design/amy-astro.css";
import {
  clearSetupDraft,
  getOrCreateSetupDraft,
  saveSetupDraft,
} from "../infrastructure/repositories/setup-draft-store";
import type { SetupDraft } from "../domain/models/setup-draft";
import type { BirthProfile, SkySnapshot } from "../domain/models/birth-profile";
import { fetchBirthSkyForChild } from "../infrastructure/api/birth-sky-api";
import {
  loadOfflineBundle,
  saveOfflineBundle,
  clearOfflineBundle,
  rememberOfflineChildProfile,
  recallOfflineProfileId,
  clearOfflineChildIndex,
} from "../infrastructure/repositories/offline-cache-store";
import { loadPreferences } from "../infrastructure/repositories/settings-store";
import { runBirthSkySyncCycle } from "../application/orchestrators/lifecycle-sync";
import { runFirstSkyPipeline } from "../application/orchestrators/first-sky-pipeline";
import { BIRTH_SKY_CONSENT_VERSION } from "../constants/consent";
import type { DashboardSegmentId } from "../state/dashboard-session";

const REFERRER_KEY = "amynest:birth-sky:entryReferrer";
const ACTIVE_CHILD_KEY = "amynest:hub:activeChildId";
const SESSION_OPEN_KEY = "amynest:birth-sky:module_session_open";
const REVEAL_DONE_KEY = "amynest:birth-sky:reveal-done:";

function readReferrer(): BirthSkyEntryReferrer {
  try {
    const v = sessionStorage.getItem(REFERRER_KEY);
    if (
      v === "parenting_hub" ||
      v === "dashboard_widget" ||
      v === "child_profile" ||
      v === "child_intelligence" ||
      v === "deep_link" ||
      v === "amy_coach"
    ) {
      return v;
    }
  } catch {
    /* ignore */
  }
  return "unknown";
}

export function stashBirthSkyReferrer(referrer: BirthSkyEntryReferrer): void {
  try {
    sessionStorage.setItem(REFERRER_KEY, referrer);
  } catch {
    /* ignore */
  }
}

function revealDoneKey(childId: number): string {
  return `${REVEAL_DONE_KEY}${childId}`;
}

function BirthSkyAppInner() {
  const [location, setLocation] = useLocation();
  const path = normalizeBirthSkyPath(location);
  const authFetch = useAuthFetch();
  const { user: authUser } = useUser();
  const viewerEmail =
    authUser?.primaryEmailAddress?.emailAddress ??
    authUser?.emailAddresses?.[0]?.emailAddress ??
    getBirthSkyViewerEmail() ??
    null;
  const { data: children = [] } = useListChildren();

  useEffect(() => {
    setBirthSkyViewerEmail(viewerEmail);
  }, [viewerEmail]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [snapshot, setSnapshot] = useState<SkySnapshot | null>(null);
  const [revealCompleted, setRevealCompleted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [computeFailed, setComputeFailed] = useState(false);
  /** Keep ceremony loading until retries are exhausted. */
  const [isGenerating, setIsGenerating] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [ceremonyAllow, setCeremonyAllow] = useState<{
    formation: boolean;
    reveal: boolean;
  }>({ formation: false, reveal: false });
  const [retryToken, setRetryToken] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);
  /** Pack 3/4: true only for Reveal CTA → Dashboard transition in this session. */
  const [fromRevealTransition, setFromRevealTransition] = useState(false);
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const [offlineRead, setOfflineRead] = useState(false);
  const openLoggedRef = useRef(false);
  const syncingRef = useRef(false);
  /** Prevent duplicate create / Generate again from rapid taps. */
  const generationLockRef = useRef(false);
  /** Formation resume auto-regenerate at most once per formation visit. */
  const formationResumeAttemptedRef = useRef(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    registerBirthSkyFoundation();
    return () => {
      // Pack 2 Addendum B: Birth Sky unmount clears pending AI intent.
      void import("../infrastructure/repositories/pending-ai-intent-store").then(
        ({ clearPendingAiIntent }) => {
          clearPendingAiIntent("module_exit");
        },
      );
    };
  }, []);

  useEffect(() => {
    let shouldLogOpen = false;
    try {
      if (sessionStorage.getItem(SESSION_OPEN_KEY) !== "1") {
        sessionStorage.setItem(SESSION_OPEN_KEY, "1");
        shouldLogOpen = true;
      }
    } catch {
      shouldLogOpen = !openLoggedRef.current;
    }
    if (shouldLogOpen && !openLoggedRef.current) {
      openLoggedRef.current = true;
      trackBirthSkyEvent("birth_sky.module_open", {
        referrer: readReferrer(),
        has_profile: false,
      });
    }
  }, []);

  const childOptions = useMemo(
    () =>
      children.map((c) => ({
        id: c.id,
        name: c.name,
        dob: "dob" in c ? ((c as { dob?: string | null }).dob ?? null) : null,
      })),
    [children],
  );

  useEffect(() => {
    if (selectedChildId != null) return;
    try {
      const stored = localStorage.getItem(ACTIVE_CHILD_KEY);
      const parsed = stored ? Number(stored) : NaN;
      if (Number.isFinite(parsed) && childOptions.some((c) => c.id === parsed)) {
        setSelectedChildId(parsed);
        return;
      }
    } catch {
      /* ignore */
    }
    if (childOptions[0]) setSelectedChildId(childOptions[0].id);
  }, [childOptions, selectedChildId]);

  const selectedChild =
    childOptions.find((c) => c.id === selectedChildId) ?? childOptions[0] ?? null;

  useEffect(() => {
    if (!selectedChild) return;
    setDraft(
      getOrCreateSetupDraft(selectedChild.id, selectedChild.name, selectedChild.dob),
    );
    try {
      setRevealCompleted(localStorage.getItem(revealDoneKey(selectedChild.id)) === "1");
    } catch {
      setRevealCompleted(false);
    }
  }, [selectedChild?.id, selectedChild?.name, selectedChild?.dob]);

  useEffect(() => {
    if (!selectedChild || !isBirthSkyEnabled()) return;
    let cancelled = false;
    setProfileLoading(true);
    setOfflineRead(false);
    fetchBirthSkyForChild(authFetch, selectedChild.id)
      .then(async (res) => {
        if (cancelled) return;
        setProfile(res.profile);
        setSnapshot(res.snapshot);
        if (res.profile && res.snapshot) {
          rememberOfflineChildProfile(selectedChild.id, res.profile.profileId);
          await saveOfflineBundle({
            schemaVersion: "1",
            cachedAt: new Date().toISOString(),
            profile: res.profile,
            snapshot: res.snapshot,
            preferences: loadPreferences(res.profile.userId),
          });
          trackBirthSkyEvent("birth_sky.snapshot_loaded", {
            snapshotVersion: res.snapshot.snapshotVersion,
            engineVersion: res.snapshot.engineVersion,
            offline: false,
          });
        }
      })
      .catch(async () => {
        if (cancelled) return;
        const priorId = recallOfflineProfileId(selectedChild.id);
        const cached = priorId ? await loadOfflineBundle(priorId) : null;
        if (cached && cached.profile.childId === selectedChild.id) {
          setProfile(cached.profile);
          setSnapshot(cached.snapshot);
          setOfflineRead(true);
          trackBirthSkyEvent("birth_sky.snapshot_loaded", {
            snapshotVersion: cached.snapshot.snapshotVersion,
            engineVersion: cached.snapshot.engineVersion,
            offline: true,
          });
        } else {
          setProfile(null);
          setSnapshot(null);
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedChild?.id, authFetch]);

  // Pack 7 reconnect sync (one cycle per online edge / profile)
  useEffect(() => {
    if (!online || !profile || syncingRef.current) return;
    syncingRef.current = true;
    const profileId = profile.profileId;
    const userId = profile.userId;
    void runBirthSkySyncCycle({
      authFetch,
      profileId,
      userId,
    })
      .then(async (r) => {
        if (!r.ok) return;
        const bundle = await loadOfflineBundle(profileId);
        if (bundle) {
          setProfile(bundle.profile);
          setSnapshot(bundle.snapshot);
          setOfflineRead(false);
        }
      })
      .finally(() => {
        syncingRef.current = false;
      });
  }, [online, profile?.profileId, authFetch]);

  const persistDraft = useCallback((next: SetupDraft) => {
    setDraft(next);
    saveSetupDraft(next);
  }, []);

  const exitToHub = () => {
    try {
      sessionStorage.removeItem(SESSION_OPEN_KEY);
    } catch {
      /* ignore */
    }
    // Pack 2 Addendum B: module exit clears pending AI intent.
    void import("../infrastructure/repositories/pending-ai-intent-store").then(
      ({ clearPendingAiIntent }) => {
        clearPendingAiIntent("module_exit");
        trackBirthSkyEvent("birth_sky.pending_ai_intent_cleared", { cause: "module_exit" });
      },
    );
    trackBirthSkyEvent("birth_sky.module_closed", { referrer: readReferrer() });
    setLocation("/parenting-hub", { replace: true });
  };

  const enabled = isBirthSkyEnabled(viewerEmail);
  const deepLinksEnabled = isBirthSkyDeepLinksEnabled(viewerEmail);
  const isDeepLink = readReferrer() === "deep_link";
  const hasCommittedProfile = Boolean(profile);
  const hasSnapshot = Boolean(snapshot);

  const resolved = resolveBirthSkyEntry({
    path,
    enabled,
    deepLinksEnabled,
    hasCommittedProfile,
    hasSnapshot,
    revealCompleted,
    isDeepLink,
    allowFormationRoute: ceremonyAllow.formation || path === "/birth-sky/formation",
    allowRevealRoute: ceremonyAllow.reveal || path === "/birth-sky/reveal",
  });

  useEffect(() => {
    if (resolved.land === "redirect" && resolved.to !== path) {
      setLocation(resolved.to, { replace: true });
    }
  }, [path, resolved, setLocation]);

  useEffect(() => {
    if (!enabled) return;
    if (normalizeBirthSkyPath(location) === "/birth-sky") {
      setLocation("/birth-sky/welcome", { replace: true });
    }
  }, [enabled, location, setLocation]);

  const goSetup = (step: BirthSkySetupStep, replace = false) => {
    const to = `/birth-sky/setup/${step}`;
    if (replace) setLocation(to, { replace: true });
    else setLocation(to);
  };

  const handleCreate = async () => {
    if (!draft) return;
    if (generationLockRef.current || creating || isGenerating) return;
    generationLockRef.current = true;
    setCreating(true);
    setIsGenerating(true);
    setComputeFailed(false);
    setFailureReason(null);
    // Enter formation ceremony immediately so loading stays visible through retries.
    setCeremonyAllow({ formation: true, reveal: false });
    setLocation("/birth-sky/formation", { replace: true });
    try {
      const prepared: SetupDraft = {
        ...draft,
        consent: {
          ...draft.consent,
          consentVersion: draft.consent.consentVersion ?? BIRTH_SKY_CONSENT_VERSION,
          acceptedAt: draft.consent.acceptedAt ?? new Date().toISOString(),
        },
      };
      const result = await runFirstSkyPipeline({
        authFetch,
        draft: prepared,
        userId: authUser?.id ?? null,
        existingProfile: profile,
        isGuest: !authUser,
      });
      if (result.profile) setProfile(result.profile);
      setSnapshot(result.snapshot);
      // Only mark failed after pipeline exhausted retries / recovery.
      const failed = !result.ok || !result.snapshot;
      setComputeFailed(failed);
      setFailureReason(failed ? result.errorCode ?? "compute_failed" : null);
      if (result.ok && result.snapshot) {
        clearSetupDraft(draft.childId);
      }
      trackBirthSkyEvent("birth_sky.consent_accepted", {
        time_precision: draft.timePrecision ?? "unknown",
        place_provided: Boolean(draft.birthPlace),
      });
      trackBirthSkyEvent("birth_sky.setup_completed", {
        time_precision: draft.timePrecision ?? "unknown",
        place_provided: Boolean(draft.birthPlace),
        mode: result.snapshot?.mode ?? (draft.timePrecision === "unknown" ? "day_sky" : "full"),
      });
    } catch (err) {
      setComputeFailed(true);
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      setFailureReason(
        err instanceof Error &&
          (err.name === "FetchTimeoutError" || msg.includes("timed out") || msg.includes("timeout"))
          ? "timeout"
          : "network_failure",
      );
    } finally {
      setCreating(false);
      setIsGenerating(false);
      generationLockRef.current = false;
    }
  };

  // Resume / interrupted first-run: profile without snapshot → auto-regenerate once.
  useEffect(() => {
    if (resolved.land !== "formation") {
      formationResumeAttemptedRef.current = false;
      return;
    }
    if (snapshot || computeFailed || isGenerating) return;
    if (!profile) return;
    if (formationResumeAttemptedRef.current || generationLockRef.current) return;
    formationResumeAttemptedRef.current = true;
    generationLockRef.current = true;
    setIsGenerating(true);
    let cancelled = false;
    void (async () => {
      try {
        const result = await runFirstSkyPipeline({
          authFetch,
          draft: draft ?? {
            childId: profile.childId,
            currentStep: "review",
            birthDate: profile.birthDate,
            birthTime: profile.birthTime,
            timePrecision: profile.timePrecision,
            birthPlace: profile.birthPlace,
            placeSkipped: !profile.birthPlace,
            consent: {
              disclaimerAccepted: true,
              consentVersion: profile.consent.consentVersion,
              acceptedAt: profile.consent.acceptedAt,
              scopes: profile.consent.scopes,
            },
            ageSanityConfirmed: true,
            dirty: false,
            updatedAt: new Date().toISOString(),
          },
          userId: authUser?.id ?? null,
          existingProfile: profile,
          isGuest: !authUser,
          forceFresh: true,
        });
        if (cancelled) return;
        if (result.profile) setProfile(result.profile);
        setSnapshot(result.snapshot);
        const failed = !result.ok || !result.snapshot;
        setComputeFailed(failed);
        setFailureReason(failed ? result.errorCode ?? "compute_failed" : null);
        if (result.snapshot) {
          trackBirthSkyEvent("birth_sky.error_recovery", {
            cause: "formation_auto_recompute",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setComputeFailed(true);
          const msg = err instanceof Error ? err.message.toLowerCase() : "";
          setFailureReason(
            err instanceof Error &&
              (err.name === "FetchTimeoutError" ||
                msg.includes("timed out") ||
                msg.includes("timeout"))
              ? "timeout"
              : "network_failure",
          );
        }
      } finally {
        if (!cancelled) setIsGenerating(false);
        generationLockRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    resolved.land,
    profile?.profileId,
    snapshot,
    computeFailed,
    isGenerating,
    authFetch,
    draft,
    authUser?.id,
  ]);

  const handleRetryFormation = async () => {
    if (generationLockRef.current || isGenerating) return;
    generationLockRef.current = true;
    setComputeFailed(false);
    setFailureReason(null);
    setIsGenerating(true);
    setRetryToken((t) => t + 1);
    try {
      // Generate again always starts a fresh generation request.
      if (draft || profile) {
        const prepared: SetupDraft = draft
          ? {
              ...draft,
              consent: {
                ...draft.consent,
                consentVersion: draft.consent.consentVersion ?? BIRTH_SKY_CONSENT_VERSION,
                acceptedAt: draft.consent.acceptedAt ?? new Date().toISOString(),
              },
            }
          : {
              childId: profile!.childId,
              currentStep: "review",
              birthDate: profile!.birthDate,
              birthTime: profile!.birthTime,
              timePrecision: profile!.timePrecision,
              birthPlace: profile!.birthPlace,
              placeSkipped: !profile!.birthPlace,
              consent: {
                disclaimerAccepted: true,
                consentVersion: profile!.consent.consentVersion,
                acceptedAt: profile!.consent.acceptedAt,
                scopes: profile!.consent.scopes,
              },
              ageSanityConfirmed: true,
              dirty: false,
              updatedAt: new Date().toISOString(),
            };
        const result = await runFirstSkyPipeline({
          authFetch,
          draft: prepared,
          userId: authUser?.id ?? null,
          existingProfile: profile,
          isGuest: !authUser,
          forceFresh: true,
        });
        if (result.profile) setProfile(result.profile);
        setSnapshot(result.snapshot);
        const failed = !result.ok || !result.snapshot;
        setComputeFailed(failed);
        setFailureReason(failed ? result.errorCode ?? "compute_failed" : null);
        if (result.ok && result.snapshot && draft) {
          clearSetupDraft(draft.childId);
        }
        // Successful retry: formation machine sees snapshot and auto-calls onReady → reveal.
      } else {
        setComputeFailed(true);
        setFailureReason("missing_birth_data");
      }
    } catch (err) {
      setComputeFailed(true);
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      setFailureReason(
        err instanceof Error &&
          (err.name === "FetchTimeoutError" || msg.includes("timed out") || msg.includes("timeout"))
          ? "timeout"
          : "network_failure",
      );
    } finally {
      setIsGenerating(false);
      generationLockRef.current = false;
    }
  };

  if (resolved.land === "unavailable") {
    return <BirthSkyUnavailable onExit={exitToHub} reason={resolved.reason} />;
  }

  if (resolved.land === "redirect" || profileLoading) {
    return (
      <div
        className="amy-astro-root relative flex min-h-[100dvh] flex-col items-center justify-center px-6"
        data-testid="amy-astro-loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 30%, hsl(275 50% 30% / 0.35), transparent 60%), hsl(228 48% 5%)",
          }}
          aria-hidden
        />
        <AmyAstroEmblem size={88} interactive={false} />
        <p className="amy-astro-display relative mt-5 text-lg text-[hsl(42_70%_78%)]">
          Reading the stars…
        </p>
        <p className="relative mt-2 text-center text-sm text-[hsl(40_20%_96%/0.55)]">
          Amy Astro Intelligence is preparing a quiet welcome.
        </p>
      </div>
    );
  }

  if (
    (resolved.land === "settings" || resolved.land === "privacy") &&
    selectedChild &&
    profile &&
    snapshot
  ) {
    return (
      <BirthSkySettingsPage
        authFetch={authFetch}
        profile={profile}
        snapshot={snapshot}
        childName={selectedChild.name}
        initialSubpage={resolved.land === "privacy" ? "privacy" : resolved.subpage}
        online={online}
        onBack={() => setLocation("/birth-sky/app/sky", { replace: true })}
        onProfileSnapshotChange={(p, s) => {
          setProfile(p);
          setSnapshot(s);
          rememberOfflineChildProfile(p.childId, p.profileId);
          void saveOfflineBundle({
            schemaVersion: "1",
            cachedAt: new Date().toISOString(),
            profile: p,
            snapshot: s,
            preferences: loadPreferences(p.userId),
          });
        }}
        onDeleted={() => {
          clearOfflineBundle(profile.profileId);
          clearOfflineChildIndex(selectedChild.id);
          setProfile(null);
          setSnapshot(null);
          setRevealCompleted(false);
          try {
            localStorage.removeItem(revealDoneKey(selectedChild.id));
          } catch {
            /* ignore */
          }
          setLocation("/birth-sky/welcome", { replace: true });
        }}
      />
    );
  }

  if (resolved.land === "dashboard" && selectedChild && profile && snapshot) {
    return (
      <>
        {offlineRead ? (
          <div
            className="fixed left-0 right-0 top-0 z-[40] bg-amber-900/90 px-3 py-2 text-center text-xs text-amber-50"
            role="status"
            data-testid="birth-sky-offline-banner"
          >
            Showing saved sky offline — some actions need a connection.
          </div>
        ) : null}
        <BirthSkyDashboardPage
          profile={profile}
          snapshot={snapshot}
          childName={selectedChild.name}
          initialSegment={resolved.segment}
          fromRevealTransition={fromRevealTransition}
          online={online}
          onExit={exitToHub}
          onOpenSettings={() => setLocation("/birth-sky/settings")}
          onProfileSnapshotChange={(p, s) => {
            setProfile(p);
            setSnapshot(s);
            rememberOfflineChildProfile(p.childId, p.profileId);
            void saveOfflineBundle({
              schemaVersion: "1",
              cachedAt: new Date().toISOString(),
              profile: p,
              snapshot: s,
              preferences: loadPreferences(p.userId),
            });
          }}
          onSegmentPath={(segment: DashboardSegmentId) => {
            const pathFor =
              segment === "astronomy"
                ? "/birth-sky/app/astronomy"
                : segment === "tradition"
                  ? "/birth-sky/app/tradition"
                  : segment === "reflect"
                    ? "/birth-sky/app/reflect"
                    : "/birth-sky/app/sky";
            setLocation(pathFor, { replace: true });
            setFromRevealTransition(false);
          }}
        />
      </>
    );
  }

  if (resolved.land === "reveal" && profile && snapshot && selectedChild) {
    return (
      <BirthSkyRevealPage
        profile={profile}
        snapshot={snapshot}
        childName={selectedChild.name}
        onEnter={() => {
          try {
            localStorage.setItem(revealDoneKey(selectedChild.id), "1");
          } catch {
            /* ignore */
          }
          setRevealCompleted(true);
          setFromRevealTransition(true);
          setCeremonyAllow({ formation: false, reveal: false });
          setLocation("/birth-sky/app/sky", { replace: true });
        }}
      />
    );
  }

  if (resolved.land === "formation") {
    return (
      <BirthSkyFormationPage
        snapshot={snapshot}
        computeFailed={computeFailed}
        isGenerating={isGenerating || creating}
        failureReason={failureReason}
        retryToken={retryToken}
        onReady={() => {
          setCeremonyAllow({ formation: false, reveal: true });
          setLocation("/birth-sky/reveal", { replace: true });
        }}
        onRetry={handleRetryFormation}
        onBackToReview={() => {
          setCeremonyAllow({ formation: false, reveal: false });
          goSetup("review", true);
        }}
        onExit={exitToHub}
      />
    );
  }

  if (resolved.land === "setup") {
    const step = resolved.step;
    // Zero-child / missing draft: always land on child confirmation (no welcome loop).
    if (step === "child" || !selectedChild || !draft) {
      return (
        <BirthSkyChildConfirmationPage
          child={selectedChild}
          childrenList={childOptions}
          continueEnabled={Boolean(selectedChild)}
          onBack={() => setLocation("/birth-sky/welcome", { replace: true })}
          onSwitchChild={(id) => {
            setSelectedChildId(id);
            const c = childOptions.find((x) => x.id === id);
            if (c) {
              setDraft(getOrCreateSetupDraft(c.id, c.name, c.dob));
            }
          }}
          onContinue={(id) => {
            setSelectedChildId(id);
            const c = childOptions.find((x) => x.id === id) ?? selectedChild;
            if (!c) return;
            const d = getOrCreateSetupDraft(c.id, c.name, c.dob);
            persistDraft({ ...d, currentStep: "date", dirty: true });
            goSetup("date");
          }}
        />
      );
    }
    if (step === "date") {
      return (
        <BirthSkyDatePage
          draft={draft}
          onChange={persistDraft}
          onBack={() => goSetup("child", true)}
          onContinue={() => goSetup("time")}
        />
      );
    }
    if (step === "time") {
      return (
        <BirthSkyTimePage
          draft={draft}
          onChange={persistDraft}
          onBack={() => goSetup("date", true)}
          onContinue={() => goSetup("place")}
        />
      );
    }
    if (step === "place") {
      return (
        <BirthSkyPlacePage
          draft={draft}
          onChange={persistDraft}
          onBack={() => goSetup("time", true)}
          onContinue={() => goSetup("consent")}
        />
      );
    }
    if (step === "consent") {
      return (
        <BirthSkyConsentPage
          draft={draft}
          childName={selectedChild.name}
          onChange={persistDraft}
          onBack={() => goSetup("place", true)}
          onContinueToReview={() => goSetup("review")}
          onSaveForLater={exitToHub}
        />
      );
    }
    if (step === "review") {
      return (
        <BirthSkyReviewPage
          draft={draft}
          childName={selectedChild.name}
          creating={creating}
          onBack={() => goSetup("consent", true)}
          onEdit={(s) => goSetup(s)}
          onCreate={handleCreate}
        />
      );
    }
  }

  return (
    <BirthSkyWelcomePage
      childFirstName={selectedChild?.name}
      onBack={exitToHub}
      onNotNow={exitToHub}
      onBegin={() => {
        goSetup("child");
      }}
    />
  );
}

export default function BirthSkyApp() {
  return (
    <AppErrorBoundary label="BirthSky">
      <BirthSkySealProvider>
        <BirthSkyReflectionSessionProvider>
          <BirthSkyAppInner />
        </BirthSkyReflectionSessionProvider>
      </BirthSkySealProvider>
    </AppErrorBoundary>
  );
}
