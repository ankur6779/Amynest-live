import { Link } from "wouter";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applySeoMeta } from "@/lib/marketing/canonical-seo";
import { SeoJsonLd } from "@/components/marketing/seo-components";
import { buildOrganizationSchema } from "@/lib/marketing/schema-builders";
import {
  ABOUT_AMYWORLD_BODY,
  ABOUT_AMYWORLD_TITLE,
  LEGAL_ORGANIZATION_NAME,
  OWNERSHIP_OPERATED_LINE,
  OWNERSHIP_PRODUCT_LINE,
  PRODUCT_BRAND_NAME,
  PUBLIC_WEBSITE_URL,
} from "@/lib/marketing/legal-entity";

export default function AboutPage() {
  const { t } = useTranslation();

  useEffect(() => {
    applySeoMeta({
      path: "/about",
      title: "About AmyWorld & AmyNest AI",
      description:
        "AmyWorld is the organization behind AmyNest AI — an AI-powered parenting platform for children's growth, learning, health, and development.",
    });
  }, []);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationSchema()],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoJsonLd data={organizationSchema} />
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/">
            <span className="flex cursor-pointer items-center gap-2">
              <img
                src="/amynest-logo.png"
                alt={PRODUCT_BRAND_NAME}
                className="h-8 w-8 rounded-full"
              />
              <span
                className="font-quicksand text-lg font-black"
                style={{
                  background:
                    "linear-gradient(90deg,hsl(var(--brand-purple-500)),hsl(var(--brand-pink-500)),hsl(var(--brand-cyan-500)))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {PRODUCT_BRAND_NAME}
              </span>
            </span>
          </Link>
          <Link href="/">
            <span className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              ← {t("screens.common.home_link")}
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <article data-testid="about-page-content">
          <h1 className="mb-2 text-3xl font-black text-foreground">About {PRODUCT_BRAND_NAME}</h1>
          <p className="mb-8 leading-relaxed text-foreground">
            {PRODUCT_BRAND_NAME} is an AI-powered parenting platform that helps families with
            routines, learning, health, and development. It is the flagship product of{" "}
            {LEGAL_ORGANIZATION_NAME}.
          </p>

          <section className="mb-10" data-testid="about-amyworld-section">
            <h2 className="mb-3 mt-8 text-xl font-bold text-foreground">{ABOUT_AMYWORLD_TITLE}</h2>
            <p className="leading-relaxed text-foreground">{ABOUT_AMYWORLD_BODY}</p>
          </section>

          <section className="mb-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 text-lg font-semibold">Organization details</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Organization</dt>
                <dd className="text-foreground">{LEGAL_ORGANIZATION_NAME}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Brand / Product</dt>
                <dd className="text-foreground">{PRODUCT_BRAND_NAME}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Website</dt>
                <dd>
                  <a
                    href={PUBLIC_WEBSITE_URL}
                    className="text-primary underline hover:text-primary/80"
                  >
                    {PUBLIC_WEBSITE_URL}
                  </a>
                </dd>
              </div>
            </dl>
          </section>
        </article>
      </main>

      <footer className="border-t border-border bg-card py-6">
        <div className="space-y-1 text-center text-xs text-muted-foreground">
          <p>{OWNERSHIP_PRODUCT_LINE}</p>
          <p>{OWNERSHIP_OPERATED_LINE}</p>
          <p>{t("screens.common.copyright")}</p>
        </div>
      </footer>
    </div>
  );
}
