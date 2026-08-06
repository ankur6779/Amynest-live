import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";
import type { AsOLandingPageConfig } from "@/lib/marketing/aso-landing-pages";
import { applySeoMeta, buildCanonicalUrl } from "@/lib/marketing/canonical-seo";
import { trackMarketingEvent } from "@/lib/marketing/ga4-analytics";
import {
  detectStoreTarget,
  StoreDownloadButton,
  StoreDownloadRow,
} from "@/components/marketing/store-download-buttons";
import {
  BreadcrumbNav,
  SeoImage,
  SeoJsonLd,
} from "@/components/marketing/seo-components";
import { MarketingSiteFooter } from "@/components/marketing/marketing-site-footer";
import { buildAsOLandingPageSchema } from "@/lib/marketing/schema-builders";

const LOGO = "/amynest-logo-new.png";

type AsOSeoLandingProps = {
  page: AsOLandingPageConfig;
};

export function AsOSeoLanding({ page }: AsOSeoLandingProps) {
  const target = detectStoreTarget();

  useEffect(() => {
    applySeoMeta({
      path: page.path,
      title: page.title,
      description: page.metaDescription,
      keywords: page.keywords,
      ogImage: buildCanonicalUrl(page.heroImage),
    });
    trackMarketingEvent("landing_page_view", {
      page: page.slug,
      path: page.path,
      keyword: page.primaryKeyword,
    });
  }, [page]);

  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: page.primaryKeyword, path: page.path },
  ];

  const schema = buildAsOLandingPageSchema({
    path: page.path,
    metaDescription: page.metaDescription,
    heroImage: page.heroImage,
    headlineAccent: page.headlineAccent,
    primaryKeyword: page.primaryKeyword,
    faqs: page.faqs,
  });

  return (
    <div
      data-on-dark
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "linear-gradient(168deg,#05040c 0%,#0e0b1f 35%,#16122e 65%,#0a0816 100%)" }}
    >
      <SeoJsonLd data={schema} />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/">
          <span className="flex cursor-pointer items-center gap-2">
            <SeoImage src={LOGO} alt="AmyNest AI logo" width={36} height={36} className="h-9 w-9 rounded-xl" priority />
            <span className="font-quicksand text-lg font-black text-white">AmyNest AI</span>
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-5 text-sm text-white/70">
          <Link href="/get-app" className="hover:text-white">
            Get the app
          </Link>
          <Link href="/sign-up" className="hover:text-white">
            Sign up free
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16">
        <BreadcrumbNav items={breadcrumbs} className="mb-6" />

        <section className="grid gap-10 lg:grid-cols-2 lg:items-center py-8 lg:py-14">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-purple-300">
              {page.primaryKeyword}
            </p>
            <h1 className="mb-5 font-quicksand text-4xl font-black leading-tight sm:text-5xl">
              {page.headline}{" "}
              <span
                style={{
                  background: "linear-gradient(92deg,#a855f7 0%,#ec4899 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {page.headlineAccent}
              </span>
            </h1>
            <p className="mb-8 text-lg text-white/75 leading-relaxed">{page.subheadline}</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <StoreDownloadButton target={target} location="hero_primary" page={`aso_${page.slug}`} size="large" />
              <Link href="/sign-up">
                <span
                  className="inline-flex items-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold text-white transition hover:bg-white/10"
                  style={{ border: "1px solid rgba(255,255,255,0.25)" }}
                >
                  Start free on web
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
          <div className="relative">
            <div
              className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <SeoImage
                src={page.heroImage}
                alt={page.heroImageAlt}
                width={800}
                height={600}
                className="w-full object-cover"
                priority
              />
              <p className="px-5 py-4 text-sm text-white/60 text-center">{page.screenshotHeadline}</p>
            </div>
          </div>
        </section>

        <section className="py-10">
          <h2 className="mb-8 font-quicksand text-2xl font-bold">Why parents choose AmyNest</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {page.benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="mb-2 flex items-center gap-2 text-purple-300">
                  <Check className="h-4 w-4" />
                  <h3 className="font-semibold text-white">{benefit.title}</h3>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{benefit.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10">
          <h2 className="mb-6 font-quicksand text-2xl font-bold">Frequently asked questions</h2>
          <div className="space-y-4">
            {page.faqs.map((faq) => (
              <details
                key={faq.question}
                className="rounded-2xl p-5 group"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <summary className="cursor-pointer font-semibold text-white list-none flex justify-between items-center">
                  {faq.question}
                  <span className="text-white/40 group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="mt-3 text-sm text-white/70 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          className="mt-6 rounded-3xl p-8 text-center"
          style={{
            background: "linear-gradient(135deg,rgba(168,85,247,0.15),rgba(236,72,153,0.1))",
            border: "1px solid rgba(168,85,247,0.25)",
          }}
        >
          <h2 className="mb-3 font-quicksand text-2xl font-bold">Download free on Google Play</h2>
          <p className="mb-6 text-white/70">Join thousands of parents worldwide using AmyNest AI daily.</p>
          <StoreDownloadRow location="footer_cta" page={`aso_${page.slug}`} />
        </section>
      </main>

      <MarketingSiteFooter />
    </div>
  );
}
