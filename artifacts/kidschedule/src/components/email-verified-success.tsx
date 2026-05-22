import { useTranslation } from "react-i18next";
import { tryReturnToInbox } from "@/lib/verification-browser-ux";

const INBOX_BUTTON: React.CSSProperties = {
  display: "inline-block",
  width: "100%",
  padding: "14px 32px",
  borderRadius: 999,
  background: "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
  color: "#fff",
  fontSize: "16px",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  boxSizing: "border-box",
  boxShadow: "0 0 24px rgba(236,72,153,0.45)",
};

/**
 * Shown after Firebase applyActionCode succeeds (email link in Gmail/Chrome).
 * No in-browser navigation — user returns to inbox and signs in from the app.
 */
export function EmailVerifiedSuccess() {
  const { t } = useTranslation();

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
        {t("screens.verify_email_action.manual_sign_in_message")}
      </p>
      <button type="button" style={INBOX_BUTTON} onClick={() => tryReturnToInbox()}>
        {t("screens.verify_email_action.back_to_inbox")}
      </button>
    </>
  );
}
