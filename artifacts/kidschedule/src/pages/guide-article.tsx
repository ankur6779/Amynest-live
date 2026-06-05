import { useEffect } from "react";
import { Link, useParams } from "wouter";
import NotFound from "@/pages/not-found";
import { applySeoMeta, buildCanonicalUrl } from "@/lib/marketing/canonical-seo";
import { trackMarketingEvent } from "@/lib/marketing/ga4-analytics";
import { getFeaturePage } from "@/lib/marketing/feature-pages";
import type { GuideSection } from "@/lib/marketing/guides-content";
import { getGuideArticle } from "@/lib/marketing/guides-content";
import { MarketingSiteFooter } from "@/components/marketing/marketing-site-footer";
import { StoreDownloadRow } from "@/components/marketing/store-download-buttons";

const LOGO = "/amynest-logo-new.png";

function GuideSectionBlock({ section }: { section: GuideSection }) {
  if (section.type === "heading") {
    return <h2 className="mt-8 mb-3 text-xl font-semibold text-white">{section.text}</h2>;
  }
  if (section.type === "list") {
    return (
      <ul className="my-4 list-disc space-y-2 pl-6 text-white/75 leading-relaxed">
        {section.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return <p className="my-4 text-white/75 leading-relaxed">{section.text}</p>;
}

export default function GuideArticlePage() {
  const params = useParams<{ slug: string }>();
  const guide = getGuideArticle(params.slug ?? "");

  useEffect(() => {
    if (!guide) return;
    applySeoMeta({
      path: `/guides/${guide.slug}`,
      title: `${guide.title} | AmyNest AI`,
      description: guide.metaDescription,
      keywords: guide.keywords,
      ogType: "article",
    });
    trackMarketingEvent("guide_page_view", { guide: guide.slug, path: `/guides/${guide.slug}` });
  }, [guide]);

  if (!guide) {
    return <NotFound />;
  }

  const relatedFeature = guide.relatedFeatureSlug
    ? getFeaturePage(guide.relatedFeatureSlug)
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.metaDescription,
    datePublished: guide.publishedAt,
    dateModified: guide.publishedAt,
    author: { "@type": "Organization", name: "AmyNest AI" },
    publisher: {
      "@type": "Organization",
      name: "AmyNest AI",
      logo: { "@type": "ImageObject", url: buildCanonicalUrl("/pwa-icon-512.png") },
    },
    mainEntityOfPage: buildCanonicalUrl(`/guides/${guide.slug}`),
  };

  return (
    <div
      data-on-dark
      className="min-h-screen text-white"
      style={{ background: "linear-gradient(168deg,#05040c 0%,#0e0b1f 35%,#16122e 65%,#0a0816 100%)" }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/">
          <span className="flex cursor-pointer items-center gap-2">
            <img src={LOGO} alt="AmyNest AI" className="h-9 w-9 rounded-xl" />
            <span className="font-quicksand text-lg font-black">AmyNest AI</span>
          </span>
        </Link>
        <Link href="/guides" className="text-sm text-white/60 hover:text-white">
          ← All guides
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-12">
        <p className="mb-2 text-sm text-purple-300">{guide.readMinutes} min read</p>
        <h1 className="mb-6 font-quicksand text-3xl font-black leading-tight sm:text-4xl">{guide.title}</h1>

        {guide.sections.map((section, index) => (
          <GuideSectionBlock key={`${guide.slug}-${index}`} section={section} />
        ))}

        {relatedFeature && (
          <section
            className="mt-10 rounded-2xl p-6"
            style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }}
          >
            <h2 className="mb-2 text-lg font-semibold">Try this in AmyNest</h2>
            <p className="mb-4 text-white/70">{relatedFeature.subheadline}</p>
            <Link href={`/features/${relatedFeature.slug}`}>
              <span
                className="inline-flex cursor-pointer items-center rounded-xl px-5 py-3 text-sm font-semibold text-white"
                style={{ background: "rgba(168,85,247,0.35)" }}
                onClick={() =>
                  trackMarketingEvent("guide_cta_click", {
                    guide: guide.slug,
                    target: `feature_${relatedFeature.slug}`,
                  })
                }
              >
                Explore {relatedFeature.headlineAccent}
              </span>
            </Link>
          </section>
        )}

        <section className="mt-10 rounded-3xl p-8 text-center" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 className="mb-2 text-xl font-bold">Ready to build better habits?</h2>
          <p className="mb-6 text-white/65">Free on Android, iOS, and web.</p>
          <StoreDownloadRow location="guide_footer" page={`guide_${guide.slug}`} />
        </section>
      </article>

      <MarketingSiteFooter />
    </div>
  );
}
