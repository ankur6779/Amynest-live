import { useState } from "react";
import { useTranslation } from "react-i18next";
import { handleGoogleLogin } from "@/lib/google-auth";
import { prettyAuthError, logFirebaseAuthError } from "@/lib/auth-errors";

type Props = {
  onError?: (message: string) => void;
  className?: string;
};

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 29.082 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 29.082 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.006 8-11.303 8-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44c11.045 0 20-8.955 20-20 0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export function GoogleSignInButton({ onError, className }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await handleGoogleLogin();
    } catch (err: unknown) {
      logFirebaseAuthError("google:sign-in", err);
      const message = prettyAuthError(err);
      if (message) onError?.(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={busy}
      className={className ?? "si-google-btn"}
      data-testid="button-google-sign-in"
      style={{
        width: "100%",
        height: "50px",
        borderRadius: "999px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        background: busy ? "rgba(40,35,60,0.85)" : "rgba(255,255,255,0.96)",
        border: "1px solid rgba(168,85,247,0.22)",
        color: "#1f1f1f",
        fontSize: "15px",
        fontWeight: 600,
        cursor: busy ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        boxShadow: busy
          ? "none"
          : "0 2px 12px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.06) inset",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
    >
      <GoogleMark />
      {busy
        ? t("auth.connecting")
        : t("auth.continue_with_google")}
    </button>
  );
}
