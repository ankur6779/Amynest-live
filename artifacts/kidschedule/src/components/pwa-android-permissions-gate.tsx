import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  getAndroidPwaPermissionSnapshot,
  isAndroidInstalledPwa,
  requestAllAndroidPwaPermissions,
  snoozePwaPermissionsPrompt,
  snapshotNeedsPrompt,
  type PermissionSnapshot,
} from "@/lib/pwa-android-permissions";

const EXCLUDED_PREFIXES = [
  "/sign-in",
  "/verify-email",
  "/onboarding",
  "/notify-prompt",
  "/auth/",
];

function isExcludedPath(path: string): boolean {
  return EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(p));
}

/**
 * For signed-in Android installed PWA users who skipped the post-login screen,
 * show a lightweight bottom sheet with an explicit Allow tap (required gesture).
 */
export function PwaAndroidPermissionsGate() {
  const { t } = useTranslation();
  const [path] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  const authFetch = useAuthFetch();
  const [visible, setVisible] = useState(false);
  const [snap, setSnap] = useState<PermissionSnapshot | null>(null);
  const [working, setWorking] = useState(false);
  const checkedRef = useRef(false);

  const dismiss = useCallback(() => {
    snoozePwaPermissionsPrompt(3);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isAndroidInstalledPwa()) return;
    if (isExcludedPath(path)) {
      checkedRef.current = false;
      return;
    }
    if (checkedRef.current) return;
    checkedRef.current = true;

    let cancelled = false;
    void getAndroidPwaPermissionSnapshot().then((s) => {
      if (cancelled) return;
      setSnap(s);
      setVisible(snapshotNeedsPrompt(s));
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, path]);

  const onAllow = async () => {
    setWorking(true);
    try {
      const next = await requestAllAndroidPwaPermissions(authFetch);
      setSnap(next);
      if (!snapshotNeedsPrompt(next)) setVisible(false);
    } finally {
      setWorking(false);
    }
  };

  if (!visible || !snap) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[95] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
      role="dialog"
      aria-labelledby="pwa-perm-gate-title"
    >
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
        <p id="pwa-perm-gate-title" className="text-sm font-bold text-foreground">
          {t("screens.notify_prompt.pwa_title")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("screens.notify_prompt.pwa_subtitle")}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onAllow}
            disabled={working}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {working ? t("screens.notify_prompt.enabling") : t("screens.notify_prompt.pwa_allow_button")}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground"
          >
            {t("screens.notify_prompt.maybe_later")}
          </button>
        </div>
      </div>
    </div>
  );
}
