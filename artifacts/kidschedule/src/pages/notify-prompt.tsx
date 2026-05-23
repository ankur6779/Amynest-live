import { useEffect, useState } from "react";
import { Redirect, useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { RouteLoadingShell } from "@/components/route-loading-shell";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  isAmyNestWrapper,
  getNativePushBridge,
  requestNativePushPermission,
  registerNativePushToken,
} from "@/lib/native-push-bridge";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import {
  getAndroidPwaPermissionSnapshot,
  isAndroidInstalledPwa,
  needsAndroidPwaPermissionsSetup,
  requestAllAndroidPwaPermissions,
  snoozePwaPermissionsPrompt,
  snapshotNeedsPrompt,
  type PermissionSnapshot,
} from "@/lib/pwa-android-permissions";

const GRAD = "linear-gradient(135deg,hsl(var(--brand-indigo-500)),hsl(var(--brand-purple-500)))";
const BG   = "linear-gradient(160deg,hsl(var(--brand-indigo-100)) 0%,hsl(var(--brand-violet-50)) 55%,hsl(var(--brand-pink-50)) 100%)";

/** Only allow same-origin relative paths (blocks open redirects). */
function sanitizeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function permLabel(
  snap: PermissionSnapshot,
  kind: keyof PermissionSnapshot,
  t: (key: string) => string,
): string {
  const state = snap[kind];
  if (state === "granted") return t("screens.notify_prompt.perm_granted");
  if (state === "denied") return t("screens.notify_prompt.perm_denied");
  return t("screens.notify_prompt.perm_needed");
}

export default function NotifyPromptPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const search          = useSearch();
  const next            = sanitizeNext(new URLSearchParams(search).get("next"));
  const { isSignedIn, isLoaded } = useAuth();
  const authFetch = useAuthFetch();
  const [loading, setLoading]    = useState(false);
  const [pwaMode, setPwaMode]    = useState<boolean | null>(null);
  const [permSnap, setPermSnap]  = useState<PermissionSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const androidPwa = isAndroidInstalledPwa();
      if (cancelled) return;
      setPwaMode(androidPwa);
      if (androidPwa) {
        const snap = await getAndroidPwaPermissionSnapshot();
        if (!cancelled) setPermSnap(snap);
        if (!snapshotNeedsPrompt(snap)) {
          setLocation(next);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [next, setLocation]);

  if (!isLoaded) return <RouteLoadingShell />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;

  const wrapper = isAmyNestWrapper();
  if (!wrapper && pwaMode === null) return <RouteLoadingShell />;

  const native = wrapper ? getNativePushBridge() : null;
  const nativePerm = native?.getPermissionStatus();
  if (native && (nativePerm === "granted" || nativePerm === "denied")) {
    return <Redirect to={next} />;
  }

  if (pwaMode === false && !native) {
    return <Redirect to={next} />;
  }

  if (pwaMode === true && permSnap && !snapshotNeedsPrompt(permSnap)) {
    return <Redirect to={next} />;
  }

  const handleAllowNative = async () => {
    setLoading(true);
    try {
      const bridge = getNativePushBridge();
      if (bridge) {
        const perm = await requestNativePushPermission(bridge);
        if (perm === "granted") {
          await registerNativePushToken(authFetch, getApiUrl("/api/push/register"));
        }
      }
    } catch {
      /* best-effort */
    }
    setLocation(next);
  };

  const handleAllowPwa = async () => {
    setLoading(true);
    try {
      const snap = await requestAllAndroidPwaPermissions(authFetch);
      setPermSnap(snap);
    } catch {
      /* best-effort */
    } finally {
      setLoading(false);
    }
    const stillNeeded = await needsAndroidPwaPermissionsSetup();
    if (!stillNeeded) setLocation(next);
  };

  const handleSkip = () => {
    if (pwaMode) snoozePwaPermissionsPrompt(3);
    setLocation(next);
  };

  const isPwa = pwaMode === true;

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-10"
      style={{ background: BG }}
    >
      <div style={{ marginBottom: 20 }}>
        <AmyMascotLogo size={72} />
      </div>

      <div
        className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg mb-5"
        style={{ background: GRAD }}
      >
        <span style={{ fontSize: 36 }}>{isPwa ? "🔐" : "🔔"}</span>
      </div>

      <h1
        className="text-2xl font-extrabold text-center mb-3"
        style={{ color: "hsl(var(--brand-indigo-950))" }}
      >
        {isPwa
          ? t("screens.notify_prompt.pwa_title")
          : t("screens.notify_prompt.title")}
      </h1>

      <p
        className="text-sm text-center mb-8 leading-relaxed"
        style={{ color: "hsl(var(--brand-indigo-500))", maxWidth: 320 }}
      >
        {isPwa
          ? t("screens.notify_prompt.pwa_subtitle")
          : t("screens.notify_prompt.subtitle")}
      </p>

      <div className="flex flex-col gap-3 w-full" style={{ maxWidth: 320 }}>
        <div
          className="rounded-2xl p-4 mb-2"
          style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(99,102,241,0.15)" }}
        >
          {isPwa ? (
            [
              { emoji: "🔔", text: t("screens.notify_prompt.pwa_benefit_notifications") },
              { emoji: "📍", text: t("screens.notify_prompt.pwa_benefit_location") },
              { emoji: "🎤", text: t("screens.notify_prompt.pwa_benefit_microphone") },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3 py-2">
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <p className="text-sm font-medium" style={{ color: "hsl(var(--brand-indigo-950))" }}>{text}</p>
              </div>
            ))
          ) : (
            [
              { emoji: "⏰", text: t("screens.notify_prompt.benefit_routines") },
              { emoji: "🌙", text: t("screens.notify_prompt.benefit_bedtime") },
              { emoji: "🍎", text: t("screens.notify_prompt.benefit_meals") },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3 py-2">
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <p className="text-sm font-medium" style={{ color: "hsl(var(--brand-indigo-950))" }}>{text}</p>
              </div>
            ))
          )}
        </div>

        {isPwa && permSnap && (
          <div
            className="rounded-xl px-3 py-2 mb-1 text-xs space-y-1"
            style={{ background: "rgba(99,102,241,0.08)", color: "hsl(var(--brand-indigo-700))" }}
          >
            <p>🔔 {t("screens.notify_prompt.perm_notifications")}: {permLabel(permSnap, "notifications", t)}</p>
            <p>📍 {t("screens.notify_prompt.perm_location")}: {permLabel(permSnap, "location", t)}</p>
            <p>🎤 {t("screens.notify_prompt.perm_microphone")}: {permLabel(permSnap, "microphone", t)}</p>
          </div>
        )}

        <button
          onClick={isPwa ? handleAllowPwa : handleAllowNative}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-primary-foreground font-bold text-base active:scale-95 transition-all"
          style={{
            background: GRAD,
            boxShadow: "0 6px 24px rgba(99,102,241,0.4)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? t("screens.notify_prompt.enabling")
            : isPwa
              ? t("screens.notify_prompt.pwa_allow_button")
              : t("screens.notify_prompt.allow_button")}
        </button>

        <button
          onClick={handleSkip}
          className="w-full py-3 text-sm font-semibold"
          style={{ color: "hsl(var(--brand-indigo-500))", background: "none", border: "none", cursor: "pointer" }}
        >
          {t("screens.notify_prompt.maybe_later")}
        </button>
      </div>
    </div>
  );
}
