import { useEffect } from "react";
import { Link, useParams } from "wouter";
import NotFound from "@/pages/not-found";
import { EeatByline } from "@/components/marketing/seo-components";
import {
  BreadcrumbNav,
  RelatedContentPanel,
  RelatedLinkList,
  SeoImage,
  SeoJsonLd,
  buildGuideBreadcrumbs,
} from "@/components/marketing/seo-components";
import { MarketingSiteFooter } from "@/components/marketing/marketing-site-footer";
import { StoreDownloadRow } from "@/components/marketing/store-download-buttons";
import { applySeoMeta } from "@/lib/marketing/canonical-seo";
import { trackMarketingEvent } from "@/lib/marketing/ga4-analytics";
import type { GuideSection } from "@/lib/marketing/guides-content";
import { getGuideArticle } from "@/lib/marketing/guides-content";
import {
  getFeatureAnchorText,
  getGuideAnchorText,
  getRelatedFeaturesForGuide,
  getRelatedGuides,
} from "@/lib/marketing/internal-links";
import { buildGuideArticleSchema } from "@/lib/marketing/schema-builders";

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

  const relatedGuides = getRelatedGuides(guide);
  const relatedFeatures = getRelatedFeaturesForGuide(guide);
  const breadcrumbs = buildGuideBreadcrumbs(guide.title, guide.slug);

  return (
    <div
      data-on-dark
      className="min-h-screen text-white"
      style={{ background: "linear-gradient(168deg,#05040c 0%,#0e0b1f 35%,#16122e 65%,#0a0816 100%)" }}
    >
      <SeoJsonLd data={buildGuideArticleSchema(guide)} />

      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/">
          <span className="flex cursor-pointer items-center gap-2">
            <SeoImage src={LOGO} alt="AmyNest AI logo" width={36} height={36} className="h-9 w-9 rounded-xl" priority />
            <span className="font-quicksand text-lg font-black">AmyNest AI</span>
          </span>
        </Link>
        <Link href="/guides" className="text-sm text-white/60 hover:text-white">
          ← All guides
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-12">
        <BreadcrumbNav items={breadcrumbs} className="mb-4" />
        <p className="mb-2 text-sm text-purple-300">{guide.readMinutes} min read</p>
        <h1 className="mb-4 font-quicksand text-3xl font-black leading-tight sm:text-4xl">{guide.title}</h1>
        <EeatByline authorId={guide.authorId} reviewedById={guide.reviewedById} updatedAt={guide.updatedAt} />

        {guide.sections.map((section, index) => (
          <GuideSectionBlock key={`${guide.slug}-${index}`} section={section} />
        ))}

        {guide.faqs && guide.faqs.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">Frequently asked questions</h2>
            <div className="space-y-3">
              {guide.faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <summary className="cursor-pointer font-medium text-white">{faq.question}</summary>
                  <p className="mt-2 text-sm text-white/70">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {guide.citations && guide.citations.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">References</h2>
            <ul className="space-y-2 text-sm text-white/55">
              {guide.citations.map((cite) => (
                <li key={cite.url}>
                  <a href={cite.url} target="_blank" rel="noopener noreferrer" className="hover:text-white underline">
                    {cite.title}
                  </a>
                  {cite.publisher ? ` — ${cite.publisher}` : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        {relatedFeatures.length > 0 && (
          <RelatedContentPanel title="Try this in AmyNest">
            <RelatedLinkList
              links={relatedFeatures.map((feature) => ({
                href: `/features/${feature.slug}`,
                label: getFeatureAnchorText(feature),
              }))}
            />
          </RelatedContentPanel>
        )}

        {relatedGuides.length > 0 && (
          <RelatedContentPanel title="Related guides">
            <RelatedLinkList
              links={relatedGuides.map((related) => ({
                href: `/guides/${related.slug}`,
                label: getGuideAnchorText(related),
              }))}
            />
          </RelatedContentPanel>
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
