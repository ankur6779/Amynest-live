import { buildCanonicalUrl, SEO_ORIGIN } from "@/lib/marketing/canonical-seo";
import type { FeaturePageConfig } from "@/lib/marketing/feature-pages";
import type { GuideArticle } from "@/lib/marketing/guides-content";
import type { ProgrammaticPageConfig } from "@/lib/marketing/programmatic-pages";
import { getEeatAuthor, getEeatReviewer } from "@/lib/marketing/eeat-authors";

const ORG_ID = `${SEO_ORIGIN}/#organization`;
const BRAND_ID = `${SEO_ORIGIN}/#brand`;
const DEFAULT_OG = `${SEO_ORIGIN}/opengraph.jpg`;

export function buildOrganizationSchema() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "AmyNest AI",
    alternateName: "AmyNest",
    url: SEO_ORIGIN,
    logo: {
      "@type": "ImageObject",
      url: buildCanonicalUrl("/pwa-icon-512.png"),
      width: 512,
      height: 512,
    },
    brand: {
      "@type": "Brand",
      "@id": BRAND_ID,
      name: "AmyNest AI",
      logo: buildCanonicalUrl("/pwa-icon-512.png"),
    },
    sameAs: [
      "https://twitter.com/AmyNestAI",
      "https://www.linkedin.com/company/amynest",
    ],
    areaServed: { "@type": "Country", name: "India" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@amynest.in",
      url: buildCanonicalUrl("/support"),
      availableLanguage: ["English", "Hindi"],
    },
  };
}

export function buildWebApplicationSchema() {
  return {
    "@type": "WebApplication",
    "@id": `${SEO_ORIGIN}/#webapp`,
    name: "AmyNest AI",
    alternateName: "AmyNest",
    url: SEO_ORIGIN,
    description:
      "AI-powered parenting coach with adaptive scheduling technology. Personalized daily routines, meal plans, speech coaching, and child-development intelligence for parents in India.",
    applicationCategory: "LifestyleApplication",
    applicationSubCategory: "Parenting",
    operatingSystem: "Web, Android, iOS",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    inLanguage: ["en", "hi"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      description: "Free with optional premium subscription",
    },
    author: { "@id": ORG_ID },
    screenshot: {
      "@type": "ImageObject",
      url: DEFAULT_OG,
      width: 1200,
      height: 630,
    },
    image: DEFAULT_OG,
  };
}

export function buildBreadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildCanonicalUrl(item.path),
    })),
  };
}

export function buildFaqSchema(faqs: { question: string; answer: string }[]) {
  if (faqs.length === 0) return null;
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function buildHomepageSchema(faqs: { question: string; answer: string }[]) {
  const graph = [
    buildWebApplicationSchema(),
    buildOrganizationSchema(),
    buildBreadcrumbSchema([{ name: "Home", path: "/" }]),
    buildFaqSchema(faqs),
  ].filter(Boolean);

  return { "@context": "https://schema.org", "@graph": graph };
}

export function buildFeaturePageSchema(page: FeaturePageConfig) {
  const path = `/features/${page.slug}`;
  const graph = [
    {
      "@type": "SoftwareApplication",
      name: "AmyNest AI",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Android, iOS, Web",
      description: page.metaDescription,
      url: buildCanonicalUrl(path),
      image: buildCanonicalUrl(page.heroImage),
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    },
    buildFaqSchema(page.faqs),
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Features", path: "/get-app" },
      { name: page.headlineAccent, path },
    ]),
  ].filter(Boolean);

  return { "@context": "https://schema.org", "@graph": graph };
}

export function buildGuideArticleSchema(guide: GuideArticle) {
  const path = `/guides/${guide.slug}`;
  const author = guide.authorId ? getEeatAuthor(guide.authorId) : undefined;
  const reviewer = guide.reviewedById ? getEeatReviewer(guide.reviewedById) : undefined;
  const image = guide.heroImage ? buildCanonicalUrl(guide.heroImage) : DEFAULT_OG;

  const article = {
    "@type": "Article",
    headline: guide.title,
    description: guide.metaDescription,
    image: {
      "@type": "ImageObject",
      url: image,
      width: 1200,
      height: 630,
    },
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt ?? guide.publishedAt,
    author: author
      ? { "@type": "Person", name: author.name, url: author.profileUrl }
      : { "@type": "Organization", name: "AmyNest AI", url: SEO_ORIGIN },
    publisher: {
      "@type": "Organization",
      name: "AmyNest AI",
      logo: { "@type": "ImageObject", url: buildCanonicalUrl("/pwa-icon-512.png") },
    },
    mainEntityOfPage: buildCanonicalUrl(path),
    ...(reviewer
      ? {
          reviewedBy: {
            "@type": "Person",
            name: reviewer.name,
            jobTitle: reviewer.credentials,
          },
        }
      : {}),
  };

  const graph = [
    article,
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
      { name: guide.title, path },
    ]),
    guide.faqs?.length ? buildFaqSchema(guide.faqs) : null,
  ].filter(Boolean);

  return { "@context": "https://schema.org", "@graph": graph };
}

export function buildProgrammaticPageSchema(page: ProgrammaticPageConfig) {
  const graph = [
    {
      "@type": "WebPage",
      name: page.title,
      description: page.metaDescription,
      url: buildCanonicalUrl(page.path),
    },
    buildFaqSchema(page.faqs),
    buildBreadcrumbSchema(page.breadcrumbs),
  ].filter(Boolean);

  return { "@context": "https://schema.org", "@graph": graph };
}

export function buildArticleSchemaFromMeta(input: {
  path: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: input.title,
        description: input.description,
        datePublished: input.publishedAt,
        dateModified: input.updatedAt ?? input.publishedAt,
        image: input.image ?? DEFAULT_OG,
        author: { "@type": "Organization", name: "AmyNest AI" },
        publisher: {
          "@type": "Organization",
          name: "AmyNest AI",
          logo: { "@type": "ImageObject", url: buildCanonicalUrl("/pwa-icon-512.png") },
        },
        mainEntityOfPage: buildCanonicalUrl(input.path),
      },
      buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: input.title, path: input.path },
      ]),
    ],
  };
}
