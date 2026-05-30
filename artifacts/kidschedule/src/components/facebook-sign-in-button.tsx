import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { handleFacebookLogin } from "@/lib/facebook-auth";
import { prettyAuthError, logFirebaseAuthError } from "@/lib/auth-errors";
import { shouldShowFacebookSignIn } from "@/lib/auth-feature-flags";
import { navigateAfterAuth } from "@/lib/auth-navigation";
import { AUTH_OAUTH_BTN_STYLE } from "@/lib/auth-screen-layout";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";
import { bootstrapPendingFacebookSignIn } from "@/lib/facebook-auth";

type Props = {
  onError?: (message: string) => void;
  className?: string;
};

function FacebookMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="#FFFFFF">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function FacebookSignInButton({ onError, className }: Props) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState(false);
  // On Android, the native Facebook app / Custom Tab runs outside the WebView.
  // When the user returns, we show "Completing sign-in…" until the token arrives.
  const [awaitingReturn, setAwaitingReturn] = useState(false);

  // Resume a pending Facebook auth that completed in the native dialog / Custom Tab
  // and injected a token while the page was re-loading (amynest-facebook-auth-pending).
  useEffect(() => {
    if (!isNativeAmyNestAndroidWrapper()) return;
    const onResume = () => {
      void bootstrapPendingFacebookSignIn().then((handled) => {
        if (handled) setAwaitingReturn(false);
      });
    };
    window.addEventListener("amynest-oauth-resume", onResume);
    window.addEventListener("amynest-facebook-auth-pending", onResume);
    // Attempt on mount in case the token was injected before this component mounted.
    void bootstrapPendingFacebookSignIn().then((handled) => {
      if (handled) setAwaitingReturn(false);
    });
    return () => {
      window.removeEventListener("amynest-oauth-resume", onResume);
      window.removeEventListener("amynest-facebook-auth-pending", onResume);
    };
  }, []);

  if (!shouldShowFacebookSignIn()) return null;

  const onClick = async () => {
    if (busy || awaitingReturn) return;
    setBusy(true);
    try {
      const destination = await handleFacebookLogin();
      if (typeof destination === "string" && destination) {
        setLocation(destination);
        navigateAfterAuth(destination);
      }
    } catch (err: unknown) {
      logFirebaseAuthError("facebook:sign-in", err);
      const code = (err as { code?: string })?.code ?? "";
      // On Android, NATIVE_WITH_FALLBACK transitions to Facebook app / Custom Tab.
      // The component will receive amynest-oauth-resume when the user returns.
      if (isNativeAmyNestAndroidWrapper() && code !== "auth/popup-closed-by-user" &&
          code !== "app/facebook-bridge-unavailable") {
        setAwaitingReturn(true);
        setBusy(false);
        return;
      }
      const message = prettyAuthError(err);
      if (message) {
        onError?.(message);
      } else if (code !== "auth/popup-closed-by-user") {
        onError?.(
          t("auth.facebook_sign_in_failed", {
            defaultValue:
              "Facebook sign-in did not complete. Finish login in the browser tab, then return to the app.",
          }),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const isLoading = busy || awaitingReturn;
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={isLoading}
      className={className ?? "si-facebook-btn"}
      data-testid="button-facebook-sign-in"
      aria-busy={isLoading}
      style={{
        ...AUTH_OAUTH_BTN_STYLE,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        background: isLoading ? "rgba(24,119,242,0.55)" : "#1877F2",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#FFFFFF",
        cursor: isLoading ? "not-allowed" : "pointer",
        boxShadow: isLoading
          ? "none"
          : "0 2px 12px rgba(24,119,242,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
    >
      <FacebookMark />
      {awaitingReturn
        ? t("auth.completing_sign_in", { defaultValue: "Completing sign-in…" })
        : isLoading
        ? t("auth.connecting")
        : t("auth.continue_with_facebook")}
    </button>
  );
}
