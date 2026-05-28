import { Link } from "wouter";
import { useTranslation } from "react-i18next";

/** Privacy + Terms links on auth screens (App Store 3.1.2 / account creation). */
export function AuthLegalFooter() {
  const { t } = useTranslation();

  const linkStyle: React.CSSProperties = {
    color: "hsl(var(--brand-purple-500))",
    fontWeight: 600,
    textDecoration: "none",
  };

  return (
    <p
      className="amynest-auth-legal"
      data-testid="auth-legal-footer"
      style={{
        marginTop: "12px",
        fontSize: "11px",
        lineHeight: 1.5,
        color: "rgba(200,180,255,0.45)",
        textAlign: "center",
      }}
    >
      {t("auth.legal_notice")}{" "}
      <Link href="/terms" style={linkStyle}>
        {t("auth.terms_link")}
      </Link>{" "}
      {t("auth.legal_and")}{" "}
      <Link href="/privacy" style={linkStyle}>
        {t("auth.privacy_link")}
      </Link>
    </p>
  );
}
