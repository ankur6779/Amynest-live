import { useState } from "react";
import { useTranslation } from "react-i18next";
import { handleAppleLogin, isAppleSignInAvailable } from "@/lib/apple-auth";
import { prettyAuthError, logFirebaseAuthError } from "@/lib/auth-errors";

type Props = {
  onError?: (message: string) => void;
  className?: string;
};

function AppleMark() {
  return (
    <svg width="18" height="22" viewBox="0 0 814 1000" aria-hidden fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-109.3-38.5-155.5-115C31.5 711.6.5 486.6 68.5 347.5c33.8-67.6 93.7-110.5 158.9-111.5 62.3-1.1 121.1 41.7 159.5 41.7 37.1 0 106.2-51.4 179-44 30.4 1.3 115.8 12.3 170.7 92.7-4.4 2.7-102 59.6-101.5 177.5zM650.3 71.5C682.7 32.7 704.7 0 704.7 0s-56.1 2.7-119.5 35.3C526.7 55.9 490 79.5 464 110c-30.4 37.5-45.8 84.5-42.4 133.5 44.9 3.4 90.6-22.9 128.7-62.2z" />
    </svg>
  );
}

export function AppleSignInButton({ onError, className }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  if (!isAppleSignInAvailable()) {
    return null;
  }

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await handleAppleLogin();
    } catch (err: unknown) {
      logFirebaseAuthError("apple:sign-in", err);
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
      className={className ?? "si-apple-btn"}
      data-testid="button-apple-sign-in"
      style={{
        width: "100%",
        height: "50px",
        borderRadius: "999px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        background: busy ? "rgba(30,30,30,0.75)" : "#000000",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#FFFFFF",
        fontSize: "15px",
        fontWeight: 600,
        cursor: busy ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        boxShadow: busy ? "none" : "0 2px 12px rgba(0,0,0,0.35)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        marginTop: "10px",
      }}
    >
      <AppleMark />
      {busy ? t("auth.connecting") : t("auth.continue_with_apple")}
    </button>
  );
}
