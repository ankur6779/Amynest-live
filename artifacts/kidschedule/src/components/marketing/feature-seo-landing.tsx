import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";
import type { FeaturePageConfig } from "@/lib/marketing/feature-pages";
import { applySeoMeta, buildCanonicalUrl } from "@/lib/marketing/canonical-seo";
import { trackMarketingEvent } from "@/lib/marketing/ga4-analytics";
import { getGuideArticle } from "@/lib/marketing/guides-content";
import { PLAY_STORE_URL } from "@/lib/geo";
import {
  detectStoreTarget,
  StoreDownloadButton,
  StoreDownloadRow,
} from "@/components/marketing/store-download-buttons";
import { MarketingSiteFooter } from "@/components/marketing/marketing-site-footer";

const LOGO = "/amynest-logo-new.png";

type FeatureSeoLandingProps = {
  page: FeaturePageConfig;
};

export function FeatureSeoLanding({ page }: FeatureSeoLandingProps) {
  const target = detectStoreTarget();

  useEffect(() => {
    const path = `/features/${page.slug}`;
    applySeoMeta({
      path,
      title: page.title,
      description: page.metaDescription,
      keywords: page.keywords,
      ogImage: buildCanonicalUrl(page.heroImage),
    });
    trackMarketingEvent("feature_page_view", { feature: page.slug, path });
  }, [page]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "AmyNest AI",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Android, iOS, Web",
        description: page.metaDescription,
        url: buildCanonicalUrl(`/features/${page.slug}`),
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        downloadUrl: PLAY_STORE_URL,
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  return (
    <div
      data-on-dark
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "linear-gradient(168deg,#05040c 0%,#0e0b1f 35%,#16122e 65%,#0a0816 100%)" }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/">
          <span className="flex cursor-pointer items-center gap-2">
            <img src={LOGO} alt="AmyNest AI" className="h-9 w-9 rounded-xl" />
            <span className="font-quicksand text-lg font-black text-white">AmyNest AI</span>
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-5 text-sm text-white/70">
          <Link href="/guides" className="hover:text-white">
            Guides
          </Link>
          <Link href="/get-app" className="hover:text-white">
            Get the app
          </Link>
          <Link href="/sign-up" className="hover:text-white">
            Sign up free
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center py-8 lg:py-14">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-purple-300">
              AmyNest Feature
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
              <StoreDownloadButton target={target} location="hero_primary" page={`feature_${page.slug}`} size="large" />
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
              <img
                src={page.heroImage}
                alt={page.heroImageAlt}
                className="w-full object-cover"
                loading="eager"
              />
            </div>
          </div>
        </section>

        <section className="py-10">
          <h2 className="mb-8 font-quicksand text-2xl font-bold">Why parents use this</h2>
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
          <h2 className="mb-6 font-quicksand text-2xl font-bold">Common questions</h2>
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

        {page.relatedGuideSlugs.length > 0 && (
          <section className="py-10">
            <h2 className="mb-4 font-quicksand text-2xl font-bold">Related guides</h2>
            <ul className="space-y-2">
              {page.relatedGuideSlugs.map((slug) => {
                const guide = getGuideArticle(slug);
                if (!guide) return null;
                return (
                  <li key={slug}>
                    <Link href={`/guides/${slug}`}>
                      <span className="text-purple-300 hover:text-purple-200 underline-offset-2 hover:underline">
                        {guide.title}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section
          className="mt-6 rounded-3xl p-8 text-center"
          style={{
            background: "linear-gradient(135deg,rgba(168,85,247,0.15),rgba(236,72,153,0.1))",
            border: "1px solid rgba(168,85,247,0.25)",
          }}
        >
          <h2 className="mb-3 font-quicksand text-2xl font-bold">Try AmyNest free</h2>
          <p className="mb-6 text-white/70 max-w-xl mx-auto">
            Download on your phone or start on the web — your personalized parenting plan is ready in minutes.
          </p>
          <div className="flex justify-center">
            <StoreDownloadRow location="feature_footer" page={`feature_${page.slug}`} />
          </div>
        </section>
      </main>

      <MarketingSiteFooter />
    </div>
  );
}
