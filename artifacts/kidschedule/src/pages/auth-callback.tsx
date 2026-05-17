import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { parseFirebaseActionParams } from "@/lib/firebase-action-params";
import VerifyEmailActionPage from "@/pages/verify-email-action";
import ResetPasswordPage from "@/pages/reset-password";

/**
 * Handles Firebase email action links (mode + oobCode in URL).
 * Renders the full success/error UI here — no redirect (avoids flash of landing page).
 */
export default function AuthCallbackPage() {
  const { mode, oobCode } = parseFirebaseActionParams();

  if (mode === "verifyEmail" && oobCode) {
    return <VerifyEmailActionPage />;
  }

  if (mode === "resetPassword" && oobCode) {
    return <ResetPasswordPage />;
  }

  return <InvalidActionLink />;
}

function InvalidActionLink() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(175deg, #0a061a 0%, #120a2e 55%, #050010 100%)",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <p style={{ marginBottom: 16 }}>{t("screens.verify_email_action.invalid_link")}</p>
        <Link href="/sign-in" style={{ color: "hsl(var(--brand-purple-400))" }}>
          {t("screens.verify_email_action.sign_in_button")}
        </Link>
      </div>
    </div>
  );
}
