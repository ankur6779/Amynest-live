/**
 * Birth Sky Settings (Pack 7 §1) — Preferences · Birth Details · Privacy · Export · About.
 */

import { useEffect, useRef, useState } from "react";
import { BirthSkyModuleShell } from "../../components/birth-sky-module-shell";
import { useFocusTrap } from "../../lib/focus-trap";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import type { AuthFetchFn } from "../../infrastructure/api/birth-sky-api";
import {
  activateSnapshot,
  acceptPrivacyPolicy,
  deleteBirthSkyProfile,
  exportBirthSky,
  fetchPreferences,
  listSnapshots,
  putPreferences,
  type SnapshotHistoryItem,
} from "../../infrastructure/api/birth-sky-lifecycle-api";
import {
  loadPreferences,
  patchPreferencesLocal,
  savePreferences,
  type BirthSkyPreferences,
} from "../../infrastructure/repositories/settings-store";
import {
  clearOfflineBundle,
  loadOfflineBundle,
  saveOfflineBundle,
} from "../../infrastructure/repositories/offline-cache-store";
import {
  clearReflectionStore,
  loadReflectionStore,
} from "../../infrastructure/repositories/reflection-store";
import {
  BIRTH_SKY_EXPORT_MANIFEST_VERSION,
  BIRTH_SKY_PRIVACY_POLICY_VERSION,
  type BirthSkyExportType,
} from "../../constants/lifecycle";
import { TRADITIONAL_CONTENT_VERSION } from "../../constants/traditional-content";
import { BIRTH_SKY_CONTEXT_SCHEMA_VERSION } from "../../constants/ai-context";
import { BIRTH_SKY_CONSENT_VERSION } from "../../constants/consent";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { Button } from "@/components/ui/button";
import { BirthSkyEditBirthDetailsPage } from "./edit-birth-details-page";
import { editBirthDetailsAndRegenerate } from "../../application/orchestrators/edit-and-regenerate";
import { openPremiumKeepsakePrint } from "../../lib/premium-keepsake";
import { buildRevealViewModel } from "../../application/view-models/reveal-vm";
import { buildCosmicPortrait } from "../../lib/signature-insight";
import { useUser } from "@/lib/firebase-auth-hooks";
import { BirthSkyRegenerateOverlay } from "./regenerate-overlay";

type Subpage =
  | "root"
  | "preferences"
  | "birth_details"
  | "privacy"
  | "export"
  | "about"
  | "snapshots";

type Props = {
  authFetch: AuthFetchFn;
  profile: BirthProfile;
  snapshot: SkySnapshot;
  childName: string;
  initialSubpage?: Subpage;
  online: boolean;
  onBack: () => void;
  onProfileSnapshotChange: (profile: BirthProfile, snapshot: SkySnapshot) => void;
  onDeleted: () => void;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BirthSkySettingsPage({
  authFetch,
  profile,
  snapshot,
  childName,
  initialSubpage = "root",
  online,
  onBack,
  onProfileSnapshotChange,
  onDeleted,
}: Props) {
  const [sub, setSub] = useState<Subpage>(initialSubpage);
  const [prefs, setPrefs] = useState<BirthSkyPreferences>(() =>
    loadPreferences(profile.userId),
  );
  const [requiredPrivacy, setRequiredPrivacy] = useState<string>(
    BIRTH_SKY_PRIVACY_POLICY_VERSION,
  );
  const [snapshots, setSnapshots] = useState<SnapshotHistoryItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const { user: authUser } = useUser();
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteDialogRef, deleteStep > 0, () => setDeleteStep(0));
  const [deleting, setDeleting] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenFailed, setRegenFailed] = useState(false);
  const [offlineCachedVersion, setOfflineCachedVersion] = useState<string | null>(null);
  const [pendingRegen, setPendingRegen] = useState<Parameters<
    typeof editBirthDetailsAndRegenerate
  >[0]["next"] | null>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    trackBirthSkyEvent("birth_sky.settings_opened", { offline: !online });
    if (!online) return;
    void fetchPreferences(authFetch)
      .then((r) => {
        setPrefs(r.preferences);
        savePreferences(profile.userId, r.preferences);
        setRequiredPrivacy(r.requiredPrivacyPolicyVersion);
      })
      .catch(() => {
        /* local prefs remain */
      });
  }, [authFetch, online, profile.userId]);

  useEffect(() => {
    if (sub !== "snapshots" || !online) return;
    void listSnapshots(authFetch, profile.profileId)
      .then(setSnapshots)
      .catch(() => setSnapshots([]));
  }, [sub, online, authFetch, profile.profileId]);

  useEffect(() => {
    if (sub !== "snapshots") return;
    void loadOfflineBundle(profile.profileId).then((b) =>
      setOfflineCachedVersion(b?.snapshot.snapshotVersion ?? null),
    );
  }, [sub, profile.profileId, snapshot.snapshotVersion]);

  const toggle = (key: "showTradition" | "skySounds" | "monthlyNotesOptIn") => {
    const next = patchPreferencesLocal(profile.userId, { [key]: !prefs[key] });
    setPrefs(next);
    if (!online) {
      setToast("Saved on this device — will sync when online.");
      return;
    }
    void putPreferences(authFetch, next)
      .then((server) => {
        setPrefs(server);
        savePreferences(profile.userId, server);
      })
      .catch(() => {
        setToast("Saved on this device — will sync when online.");
      });
  };

  const runExport = async (type: BirthSkyExportType) => {
    if (!online) {
      setToast("Export needs a connection (or use a cached summary from Settings when available).");
      return;
    }
    setExportBusy(true);
    trackBirthSkyEvent("birth_sky.export_started", {
      export_type: type,
      exportManifestVersion: BIRTH_SKY_EXPORT_MANIFEST_VERSION,
    });
    try {
      const bundle = await exportBirthSky(authFetch, profile.profileId, type);
      if (type === "reflections") {
        const local = loadReflectionStore(profile.profileId);
        const payload = (bundle.payload as Record<string, unknown>) ?? {};
        bundle.payload = {
          ...payload,
          reflections: local.entries.map((e) => ({
            reflectionId: e.reflectionId,
            promptId: e.promptId,
            body: e.body,
            createdAt: e.createdAt,
          })),
        };
      }
      const manifest = bundle.manifest as { exportManifestVersion?: string } | undefined;
      if (
        manifest?.exportManifestVersion &&
        manifest.exportManifestVersion !== BIRTH_SKY_EXPORT_MANIFEST_VERSION
      ) {
        setToast("This export format isn’t supported.");
        return;
      }
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `birth-sky-${type}-${profile.profileId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      trackBirthSkyEvent("birth_sky.export_completed", {
        export_type: type,
        exportManifestVersion: BIRTH_SKY_EXPORT_MANIFEST_VERSION,
      });
      setToast("Export ready.");
    } catch {
      setToast("Export failed. Try again when online.");
    } finally {
      setExportBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!online) {
      setToast("Deleting Amy Astro Intelligence requires a connection.");
      return;
    }
    setDeleting(true);
    trackBirthSkyEvent("birth_sky.delete_started", { delete_scope: "birth_sky" });
    try {
      await deleteBirthSkyProfile(authFetch, profile.profileId);
      clearReflectionStore(profile.profileId);
      clearOfflineBundle(profile.profileId);
      trackBirthSkyEvent("birth_sky.delete_completed", { delete_scope: "birth_sky" });
      onDeleted();
    } catch {
      setToast("Couldn’t delete. Amy Astro Intelligence is unchanged.");
      setDeleteStep(0);
    } finally {
      setDeleting(false);
    }
  };

  const privacyBehind =
    (profile.privacyPolicyVersion ?? "") !== requiredPrivacy &&
    requiredPrivacy.length > 0;

  if (sub === "birth_details") {
    return (
      <>
        <BirthSkyEditBirthDetailsPage
          profile={profile}
          online={online}
          onCancel={() => setSub("root")}
          onSaveAndRegenerate={async (next) => {
            setPendingRegen(next);
            setRegenBusy(true);
            setRegenFailed(false);
            try {
              const result = await editBirthDetailsAndRegenerate({
                authFetch,
                profile,
                next,
              });
              onProfileSnapshotChange(result.profile, result.snapshot);
              setToast("Sky updated");
              setSub("root");
              setRegenBusy(false);
              setPendingRegen(null);
            } catch {
              setRegenFailed(true);
            }
          }}
        />
        <BirthSkyRegenerateOverlay
          visible={regenBusy || regenFailed}
          failed={regenFailed}
          onRetry={() => {
            if (!pendingRegen) return;
            setRegenFailed(false);
            setRegenBusy(true);
            void editBirthDetailsAndRegenerate({
              authFetch,
              profile,
              next: pendingRegen,
            })
              .then((result) => {
                onProfileSnapshotChange(result.profile, result.snapshot);
                setToast("Sky updated");
                setSub("root");
                setRegenBusy(false);
                setPendingRegen(null);
              })
              .catch(() => setRegenFailed(true));
          }}
          onDismiss={() => {
            setRegenBusy(false);
            setRegenFailed(false);
            setPendingRegen(null);
          }}
        />
      </>
    );
  }

  const title =
    sub === "privacy"
      ? "Privacy"
      : sub === "export"
        ? "Export"
        : sub === "about"
          ? "About Amy Astro Intelligence"
          : sub === "snapshots"
            ? "Sky history"
            : sub === "preferences"
              ? "Preferences"
              : "Settings";

  return (
    <BirthSkyModuleShell
      title={title}
      onBack={() => {
        if (sub === "root") onBack();
        else setSub("root");
      }}
      testId="birth-sky-settings"
    >
      {toast ? (
        <p role="status" className="mb-3 text-sm text-[hsl(150_40%_70%)]" data-testid="birth-sky-settings-toast">
          {toast}
        </p>
      ) : null}

      {sub === "root" ? (
        <nav aria-label="Amy Astro Intelligence settings" className="space-y-2">
          <SettingsRow
            label="Preferences"
            onClick={() => setSub("preferences")}
            testId="birth-sky-settings-preferences"
          />
          <SettingsRow
            label="Birth details"
            onClick={() => setSub("birth_details")}
            testId="birth-sky-settings-birth-details"
          />
          <SettingsRow
            label="Privacy"
            onClick={() => {
              trackBirthSkyEvent("birth_sky.privacy_settings_opened", {});
              setSub("privacy");
            }}
            testId="birth-sky-settings-privacy"
          />
          <SettingsRow
            label="Export"
            onClick={() => setSub("export")}
            testId="birth-sky-settings-export"
          />
          <SettingsRow
            label="Sky history"
            onClick={() => setSub("snapshots")}
            testId="birth-sky-settings-snapshots"
          />
          <SettingsRow
            label="About Amy Astro Intelligence"
            onClick={() => setSub("about")}
            testId="birth-sky-settings-about"
          />
        </nav>
      ) : null}

      {sub === "preferences" ? (
        <div className="space-y-4" role="list">
          <ToggleRow
            label="Show Traditional Lens"
            checked={prefs.showTradition}
            onChange={() => toggle("showTradition")}
            testId="birth-sky-pref-tradition"
          />
          <ToggleRow
            label="Sky sounds"
            checked={prefs.skySounds}
            onChange={() => toggle("skySounds")}
            hint="Off by default"
            testId="birth-sky-pref-sounds"
          />
          <ToggleRow
            label="Monthly notes (optional)"
            checked={prefs.monthlyNotesOptIn}
            onChange={() => toggle("monthlyNotesOptIn")}
            testId="birth-sky-pref-monthly"
          />
          <div
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            role="status"
            data-testid="birth-sky-pref-reduced-motion"
          >
            <p className="text-sm font-semibold">Reduced motion</p>
            <p className="mt-1 text-xs text-[hsl(40_20%_96%/0.65)]">
              {reduced
                ? "Using system Reduced Motion"
                : "Following system setting (Reduced Motion off)"}
            </p>
          </div>
        </div>
      ) : null}

      {sub === "privacy" ? (
        <div className="space-y-4" data-testid="birth-sky-privacy">
          <p className="text-sm text-[hsl(40_20%_96%/0.75)]">
            Amy Astro Intelligence is parent-only. Birth details are never used for ads. Reflective and
            optional — not a scientific prediction.
          </p>
          <p className="text-xs text-[hsl(40_20%_96%/0.55)]">
            Consent version: {profile.consent.consentVersion || BIRTH_SKY_CONSENT_VERSION}
            <br />
            Privacy policy: {profile.privacyPolicyVersion ?? "not recorded"}
            <br />
            Required: {requiredPrivacy}
          </p>
          {privacyBehind ? (
            <Button
              type="button"
              className="min-h-12 w-full rounded-xl"
              disabled={!online}
              onClick={() => {
                void acceptPrivacyPolicy(authFetch, profile.profileId, requiredPrivacy).then(
                  (p) => {
                    onProfileSnapshotChange(p, snapshot);
                    setToast("Privacy policy accepted.");
                  },
                );
              }}
              data-testid="birth-sky-privacy-accept"
            >
              Accept updated privacy policy
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full rounded-xl"
            onClick={() => setSub("export")}
          >
            Export data
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full rounded-xl text-red-200"
            onClick={() => {
              clearReflectionStore(profile.profileId);
              trackBirthSkyEvent("birth_sky.delete_started", {
                delete_scope: "reflections",
              });
              trackBirthSkyEvent("birth_sky.delete_completed", {
                delete_scope: "reflections",
              });
              setToast("Reflections cleared on this device.");
            }}
            data-testid="birth-sky-delete-reflections"
          >
            Delete all reflections
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full rounded-xl text-red-200"
            onClick={() => setDeleteStep(1)}
            data-testid="birth-sky-delete-entry"
          >
            Delete Amy Astro Intelligence
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full rounded-xl"
            onClick={() => {
              clearOfflineBundle(profile.profileId);
              setToast("Offline cache cleared. Next online visit will rehydrate.");
            }}
            data-testid="birth-sky-clear-offline"
          >
            Clear offline cache only
          </Button>
        </div>
      ) : null}

      {sub === "export" ? (
        <div className="space-y-3" data-testid="birth-sky-export">
          <p className="text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">
            Preserve their sky as a keepsake — or download structured data. Location stays
            private by default; every file carries a gentle disclaimer.
          </p>
          <Button
            type="button"
            className="min-h-12 w-full rounded-xl bg-gradient-to-r from-[hsl(275_50%_38%)] to-[hsl(42_55%_38%)] font-semibold"
            onClick={() => {
              const reveal = buildRevealViewModel(profile, snapshot, childName);
              const portrait = buildCosmicPortrait({
                childName,
                sunSign: snapshot.astronomy.sunSign,
                moonSign: snapshot.astronomy.moonSign,
                moonPhaseLabel: snapshot.astronomy.moonPhaseLabel,
                risingSign: snapshot.astronomy.risingSign ?? null,
                daySky: snapshot.mode === "day_sky",
              });
              const parentName =
                authUser?.firstName?.trim() ||
                authUser?.fullName?.trim()?.split(/\s+/)[0] ||
                "Parent";
              const result = openPremiumKeepsakePrint({
                parentName,
                childName,
                birthDate: profile.birthDate,
                sunSign: snapshot.astronomy.sunSign,
                moonSign: snapshot.astronomy.moonSign,
                moonPhaseLabel: snapshot.astronomy.moonPhaseLabel,
                risingSign: snapshot.astronomy.risingSign ?? null,
                essenceLine: reveal.essenceLine,
                daySky: snapshot.mode === "day_sky",
                signatureParagraph: portrait.signatureParagraph,
                signatureSentence: portrait.signatureSentence,
                qualities: [...portrait.qualities],
                parentingReminders: [...portrait.parentingReminders],
                amyReflection: portrait.amyReflection,
              });
              if (result === "printed") {
                setToast("Keepsake opened for printing.");
              } else if (result === "downloaded") {
                setToast(
                  "Popup blocked — keepsake downloaded as HTML. Open the file to print.",
                );
              } else {
                setToast("Couldn’t prepare the keepsake. Try again or allow popups.");
              }
            }}
            data-testid="amy-astro-premium-keepsake"
          >
            Print Amy Astro Keepsake
          </Button>
          {(
            [
              ["summary", "Amy Astro Intelligence summary"],
              ["astronomy", "Astronomy data"],
              ["reflections", "Reflections"],
              ["conversations", "Conversations"],
            ] as const
          ).map(([type, label]) => (
            <Button
              key={type}
              type="button"
              variant="secondary"
              className="min-h-12 w-full rounded-xl"
              disabled={exportBusy || !online}
              onClick={() => void runExport(type)}
              data-testid={`birth-sky-export-${type}`}
            >
              {label}
            </Button>
          ))}
          <p className="text-xs text-[hsl(40_20%_96%/0.5)]">
            Format {BIRTH_SKY_EXPORT_MANIFEST_VERSION}
          </p>
        </div>
      ) : null}

      {sub === "about" ? (
        <div className="space-y-3 text-sm" data-testid="birth-sky-about">
          <p className="font-quicksand text-lg font-bold">Amy Astro Intelligence</p>
          <p className="text-[hsl(40_20%_96%/0.75)]">
            A gentle, reflective lens on the sky at birth — educational and optional, never a
            prediction of a child’s future.
          </p>
          <dl className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs">
            <AboutRow k="Child" v={childName} />
            <AboutRow k="snapshotVersion" v={snapshot.snapshotVersion} />
            <AboutRow k="engineVersion" v={snapshot.engineVersion} />
            <AboutRow k="traditionalContentVersion" v={TRADITIONAL_CONTENT_VERSION} />
            <AboutRow k="contextSchemaVersion" v={BIRTH_SKY_CONTEXT_SCHEMA_VERSION} />
            <AboutRow k="modelVersion" v="Recorded per AI conversation" />
            <AboutRow k="privacyPolicyVersion" v={BIRTH_SKY_PRIVACY_POLICY_VERSION} />
            <AboutRow k="exportManifestVersion" v={BIRTH_SKY_EXPORT_MANIFEST_VERSION} />
            <AboutRow k="mode" v={snapshot.mode} />
            <AboutRow
              k="AI insights used"
              v={String(profile.aiInsightsUsedCount ?? 0)}
            />
          </dl>
        </div>
      ) : null}

      {sub === "snapshots" ? (
        <div className="space-y-3" data-testid="birth-sky-snapshot-history">
          <p className="text-sm text-[hsl(40_20%_96%/0.72)]">
            Historical snapshots are immutable. Activating one only moves the active pointer.
          </p>
          {!online ? (
            <p className="text-sm text-amber-200/90">
              History needs a connection. Offline cache holds the current sky only.
              {offlineCachedVersion ? ` Cached ${offlineCachedVersion}.` : ""}
            </p>
          ) : null}
          <ul className="space-y-2">
            {snapshots.map((s) => (
              <li
                key={s.snapshotId}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
              >
                <p className="text-xs font-semibold">
                  {s.snapshotVersion}
                  {s.isCurrent ? " · Active" : ""}
                </p>
                <p className="mt-1 text-[11px] text-[hsl(40_20%_96%/0.55)]">
                  {s.engineVersion} · {s.mode} · {s.computedAt}
                </p>
                {!s.isCurrent ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2 min-h-10 w-full rounded-lg text-xs"
                    disabled={!online}
                    onClick={() => {
                      void activateSnapshot(authFetch, profile.profileId, s.snapshotId).then(
                        async (active) => {
                          onProfileSnapshotChange(profile, active);
                          await saveOfflineBundle({
                            schemaVersion: "1",
                            cachedAt: new Date().toISOString(),
                            profile,
                            snapshot: active,
                            preferences: prefs,
                          });
                          setOfflineCachedVersion(active.snapshotVersion);
                          setToast("Active sky updated.");
                          void listSnapshots(authFetch, profile.profileId).then(setSnapshots);
                        },
                      );
                    }}
                    data-testid={`birth-sky-activate-${s.snapshotId}`}
                  >
                    Make active
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {deleteStep > 0 ? (
        <div
          ref={deleteDialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete Amy Astro Intelligence"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          data-testid="birth-sky-delete-dialog"
          tabIndex={-1}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[hsl(220_28%_12%)] p-5">
            <h3 className="text-lg font-semibold">
              {deleteStep === 1 ? "Delete Amy Astro Intelligence?" : "This cannot be undone"}
            </h3>
            <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.75)]">
              {deleteStep === 1
                ? "This removes the birth profile, snapshots, conversations, and AI usage for this child."
                : "There is no undelete. You’ll return to Welcome."}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                type="button"
                className="min-h-11 rounded-xl bg-red-700/80"
                disabled={deleting}
                onClick={() => {
                  if (deleteStep === 1) setDeleteStep(2);
                  else void confirmDelete();
                }}
                data-testid="birth-sky-delete-confirm"
              >
                {deleting ? "Deleting…" : deleteStep === 1 ? "Continue" : "Delete permanently"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 rounded-xl"
                onClick={() => setDeleteStep(0)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </BirthSkyModuleShell>
  );
}

function SettingsRow({
  label,
  onClick,
  testId,
}: {
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="listitem"
      className="flex min-h-14 w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 text-left text-sm font-semibold"
      onClick={onClick}
      data-testid={testId}
    >
      {label}
      <span aria-hidden className="text-[hsl(40_20%_96%/0.45)]">
        ›
      </span>
    </button>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  hint,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  hint?: string;
  testId: string;
}) {
  return (
    <div
      className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4"
      role="listitem"
    >
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {hint ? <p className="text-[11px] text-[hsl(40_20%_96%/0.5)]">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`relative h-8 w-14 rounded-full transition-colors ${
          checked ? "bg-[hsl(160_35%_40%)]" : "bg-white/15"
        }`}
        onClick={onChange}
        data-testid={testId}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function AboutRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[hsl(40_20%_96%/0.5)]">{k}</dt>
      <dd className="truncate text-right font-mono text-[hsl(40_20%_96%/0.85)]">{v}</dd>
    </div>
  );
}
