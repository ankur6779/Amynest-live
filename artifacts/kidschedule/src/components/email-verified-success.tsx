import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { firebaseAuth } from "@/lib/firebase";
import { resolvePostVerifyDestination } from "@/lib/post-verify-destination";
import {
  buildOpenAmyNestAppUrl,
  isEmailLinkOpenedInExternalBrowser,
  tryReturnToInbox,
} from "@/lib/verification-browser-ux";
import { isNativeAmyNestShell } from "@/lib/native-shell";

const PRIMARY_BUTTON: React.CSSProperties = {
  display: "inline-block",
  width: "100%",
  padding: "14px 32px",
  borderRadius: 999,
  background: "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
  color: "#fff",
  fontSize: "16px",
  fontWeight: 700,
  textDecoration: "none",
  boxShadow: "0 0 24px rgba(236,72,153,0.45)",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const SECONDARY_BUTTON: React.CSSProperties = {
  display: "inline-block",
  width: "100%",
  marginTop: 12,
  padding: "12px 24px",
  borderRadius: 999,
  background: "transparent",
  color: "rgba(200,180,255,0.85)",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  border: "1px solid rgba(168,85,247,0.35)",
  cursor: "pointer",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

type Props = {
  onNavigate: (path: string) => void;
};

/**
 * Shown after Firebase applyActionCode succeeds.
 * External browser: stay on a minimal screen + open app / back to inbox.
 * Native WebView: auto-continue to onboarding or dashboard when signed in.
 */
export function EmailVerifiedSuccess({ onNavigate }: Props) {
  const { t } = useTranslation();
  const inBrowser = isEmailLinkOpenedInExternalBrowser();
  const inApp = isNativeAmyNestShell();
  const hasSession = Boolean(firebaseAuth.currentUser?.emailVerified);

  const [destination, setDestination] = useState<string | null>(null);
  const [openAppUrl, setOpenAppUrl] = useState(`${buildOpenAmyNestAppUrl("/onboarding")}`);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      const path = hasSession
        ? await resolvePostVerifyDestination()
        : "/sign-in";
      if (cancelled) return;

      setDestination(path);
      setOpenAppUrl(buildOpenAmyNestAppUrl(path));

      if (inApp && hasSession) {
        timer = setTimeout(() => {
          if (!cancelled) onNavigate(path);
        }, 1600);
      }
    })();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [hasSession, inApp, onNavigate]);

  if (inBrowser) {
    return (
      <>
        <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 800, color: "#fff" }}>
          {t("screens.auth_action.email_verified_title")}
        </h2>
        <p
          style={{
            margin: "0 0 20px",
            fontSize: 15,
            color: "rgba(134,239,172,0.95)",
            lineHeight: 1.55,
          }}
        >
          {t("screens.verify_email_action.browser_success_message")}
        </p>
        <a href={openAppUrl} style={PRIMARY_BUTTON}>
          {t("screens.verify_email_action.open_amynest_app")}
        </a>
        <button type="button" style={SECONDARY_BUTTON} onClick={() => tryReturnToInbox()}>
          {t("screens.verify_email_action.back_to_inbox")}
        </button>
        <p
          style={{
            margin: "16px 0 0",
            fontSize: 12,
            color: "rgba(200,180,255,0.45)",
            lineHeight: 1.5,
          }}
        >
          {t("screens.verify_email_action.close_this_tab")}
        </p>
      </>
    );
  }

  return (
    <>
      <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 800, color: "#fff" }}>
        {t("screens.auth_action.email_verified_title")}
      </h2>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          color: "rgba(134,239,172,0.95)",
          lineHeight: 1.55,
        }}
      >
        {hasSession
          ? t("screens.verify_email_action.in_app_success_message")
          : t("screens.verify_email_action.success_message")}
      </p>
      {hasSession && destination ? (
        <>
          <Link href={destination} style={PRIMARY_BUTTON}>
            {t("screens.verify_email_action.continue_to_app")}
          </Link>
          {inApp && (
            <p
              style={{
                margin: "16px 0 0",
                fontSize: 12,
                color: "rgba(200,180,255,0.45)",
              }}
            >
              {t("screens.verify_email_action.auto_continue_hint")}
            </p>
          )}
        </>
      ) : (
        <Link href="/sign-in" style={PRIMARY_BUTTON}>
          {t("screens.verify_email_action.go_to_login")}
        </Link>
      )}
    </>
  );
}
