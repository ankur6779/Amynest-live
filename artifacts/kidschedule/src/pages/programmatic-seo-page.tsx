import { useEffect } from "react";
import { Link, useParams } from "wouter";
import NotFound from "@/pages/not-found";
import {
  BreadcrumbNav,
  RelatedContentPanel,
  RelatedLinkList,
  SeoImage,
  SeoJsonLd,
} from "@/components/marketing/seo-components";
import { MarketingSiteFooter } from "@/components/marketing/marketing-site-footer";
import { StoreDownloadRow } from "@/components/marketing/store-download-buttons";
import { applySeoMeta } from "@/lib/marketing/canonical-seo";
import { getFeaturePage } from "@/lib/marketing/feature-pages";
import type { GuideSection } from "@/lib/marketing/guides-content";
import { getGuideArticle } from "@/lib/marketing/guides-content";
import {
  getFeatureAnchorText,
  getGuideAnchorText,
} from "@/lib/marketing/internal-links";
import {
  getFeedingPlanPage,
  getRoutineByAgePage,
  type ProgrammaticPageConfig,
} from "@/lib/marketing/programmatic-pages";
import { buildProgrammaticPageSchema } from "@/lib/marketing/schema-builders";
import { trackMarketingEvent } from "@/lib/marketing/ga4-analytics";

const LOGO = "/amynest-logo-new.png";

function SectionBlock({ section }: { section: GuideSection }) {
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

function ProgrammaticPageView({ page, eventPrefix }: { page: ProgrammaticPageConfig; eventPrefix: string }) {
  useEffect(() => {
    applySeoMeta({
      path: page.path,
      title: page.title,
      description: page.metaDescription,
      keywords: page.keywords,
    });
    trackMarketingEvent("feature_page_view", { feature: eventPrefix, path: page.path });
  }, [page, eventPrefix]);

  const relatedFeature = page.relatedFeatureSlug ? getFeaturePage(page.relatedFeatureSlug) : undefined;

  return (
    <div
      data-on-dark
      className="min-h-screen text-white"
      style={{ background: "linear-gradient(168deg,#05040c 0%,#0e0b1f 35%,#16122e 65%,#0a0816 100%)" }}
    >
      <SeoJsonLd data={buildProgrammaticPageSchema(page)} />

      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/">
          <span className="flex cursor-pointer items-center gap-2">
            <SeoImage src={LOGO} alt="AmyNest AI logo" width={36} height={36} className="h-9 w-9 rounded-xl" priority />
            <span className="font-quicksand text-lg font-black">AmyNest AI</span>
          </span>
        </Link>
        <Link href="/guides" className="text-sm text-white/60 hover:text-white">
          Guides
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-12">
        <BreadcrumbNav items={page.breadcrumbs} className="mb-6" />
        <h1 className="mb-4 font-quicksand text-3xl font-black leading-tight sm:text-4xl">{page.h1}</h1>
        <p className="mb-8 text-lg text-white/70">{page.subheadline}</p>

        {page.sections.map((section, index) => (
          <SectionBlock key={`${page.slug}-${index}`} section={section} />
        ))}

        {page.faqs.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">Frequently asked questions</h2>
            <div className="space-y-3">
              {page.faqs.map((faq) => (
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

        {relatedFeature && (
          <RelatedContentPanel title="Explore in AmyNest">
            <p className="mb-3 text-white/70">{relatedFeature.subheadline}</p>
            <RelatedLinkList
              links={[{ href: `/features/${relatedFeature.slug}`, label: getFeatureAnchorText(relatedFeature) }]}
            />
          </RelatedContentPanel>
        )}

        {page.relatedGuideSlugs.length > 0 && (
          <RelatedContentPanel title="Related parenting guides">
            <RelatedLinkList
              links={page.relatedGuideSlugs
                .map((slug) => {
                  const guide = getGuideArticle(slug);
                  return guide ? { href: `/guides/${slug}`, label: getGuideAnchorText(guide) } : null;
                })
                .filter((item): item is { href: string; label: string } => item !== null)}
            />
          </RelatedContentPanel>
        )}

        <section className="mt-10 rounded-3xl p-8 text-center" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 className="mb-2 text-xl font-bold">Get personalized routines free</h2>
          <StoreDownloadRow location="programmatic_footer" page={eventPrefix} />
        </section>
      </article>

      <MarketingSiteFooter />
    </div>
  );
}

export function RoutineByAgePage() {
  const params = useParams<{ age: string }>();
  const page = getRoutineByAgePage(params.age ?? "");
  if (!page) return <NotFound />;
  return <ProgrammaticPageView page={page} eventPrefix={`routine_age_${page.slug}`} />;
}

export function FeedingPlanPage() {
  const params = useParams<{ months: string }>();
  const page = getFeedingPlanPage(params.months ?? "");
  if (!page) return <NotFound />;
  return <ProgrammaticPageView page={page} eventPrefix={`feeding_${page.slug}`} />;
}
