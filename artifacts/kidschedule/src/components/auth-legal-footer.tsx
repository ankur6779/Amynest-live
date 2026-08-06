import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { V2_HIERARCHY_WHISPER, V2_SPACE, V2_TYPE } from "@/v2/craft";

/** Privacy + Terms links on auth screens (App Store 3.1.2 / account creation). */
export function AuthLegalFooter({ nest = false }: { nest?: boolean }) {
  const { t } = useTranslation();

  if (nest) {
    return (
      <p
        className={`amynest-auth-legal ${V2_SPACE.mt2} ${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-center text-muted-foreground`}
        data-testid="auth-legal-footer"
      >
        {t("auth.legal_notice")}{" "}
        <Link
          href="/terms"
          className="text-foreground/80 underline-offset-4 hover:underline"
        >
          {t("auth.terms_link")}
        </Link>{" "}
        {t("auth.legal_and")}{" "}
        <Link
          href="/privacy"
          className="text-foreground/80 underline-offset-4 hover:underline"
        >
          {t("auth.privacy_link")}
        </Link>
      </p>
    );
  }

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
