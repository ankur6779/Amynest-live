import { useEffect } from "react";
import { CANONICAL_PRODUCTION_ORIGIN } from "@/lib/canonical-domain";

export const SEO_ORIGIN = CANONICAL_PRODUCTION_ORIGIN;

export type SeoMetaInput = {
  path: string;
  title: string;
  description: string;
  ogType?: "website" | "article";
  ogImage?: string;
  keywords?: string;
  noindex?: boolean;
  hreflang?: boolean;
};

export function buildCanonicalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SEO_ORIGIN}${normalized}`;
}

function upsertHeadTag(selector: string, attr: "content" | "href", value: string): void {
  if (typeof document === "undefined") return;
  const existing = document.querySelector(selector);
  if (existing) {
    existing.setAttribute(attr, value);
    return;
  }
  if (selector.includes("canonical")) {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", value);
    document.head.appendChild(link);
    return;
  }
  const tag = document.createElement("meta");
  const propertyMatch = selector.match(/property="([^"]+)"/);
  const nameMatch = selector.match(/name="([^"]+)"/);
  if (propertyMatch) tag.setAttribute("property", propertyMatch[1]);
  if (nameMatch) tag.setAttribute("name", nameMatch[1]);
  tag.setAttribute("content", value);
  document.head.appendChild(tag);
}

/** Apply document title + canonical/OG/Twitter tags for public marketing pages. */
export function applySeoMeta(input: SeoMetaInput): void {
  if (typeof document === "undefined") return;
  const canonical = buildCanonicalUrl(input.path);
  const ogImage = input.ogImage ?? `${SEO_ORIGIN}/opengraph.jpg`;

  document.title = input.title;
  upsertHeadTag('meta[name="description"]', "content", input.description);
  if (input.keywords) {
    upsertHeadTag('meta[name="keywords"]', "content", input.keywords);
  }

  const robots = input.noindex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large";
  upsertHeadTag('meta[name="robots"]', "content", robots);

  upsertHeadTag('link[rel="canonical"]', "href", canonical);
  upsertHeadTag('meta[property="og:title"]', "content", input.title);
  upsertHeadTag('meta[property="og:description"]', "content", input.description);
  upsertHeadTag('meta[property="og:image"]', "content", ogImage);
  upsertHeadTag('meta[property="og:image:width"]', "content", "1200");
  upsertHeadTag('meta[property="og:image:height"]', "content", "630");
  upsertHeadTag('meta[property="og:type"]', "content", input.ogType ?? "website");
  upsertHeadTag('meta[property="og:url"]', "content", canonical);
  upsertHeadTag('meta[property="og:site_name"]', "content", "AmyNest AI");
  upsertHeadTag('meta[property="og:locale"]', "content", "en_IN");
  upsertHeadTag('meta[name="twitter:card"]', "content", "summary_large_image");
  upsertHeadTag('meta[name="twitter:site"]', "content", "@AmyNestAI");
  upsertHeadTag('meta[name="twitter:creator"]', "content", "@AmyNestAI");
  upsertHeadTag('meta[name="twitter:title"]', "content", input.title);
  upsertHeadTag('meta[name="twitter:description"]', "content", input.description);
  upsertHeadTag('meta[name="twitter:image"]', "content", ogImage);

  if (input.hreflang !== false) {
    import("@/lib/marketing/hindi-seo").then(({ applyHreflangTags }) => applyHreflangTags(input.path));
  }
}

export function useSeoMeta(input: SeoMetaInput | null): void {
  useEffect(() => {
    if (!input) return;
    applySeoMeta(input);
  }, [input?.path, input?.title, input?.description, input?.keywords, input?.ogImage, input?.ogType]);
}

/** Serialize meta tags for prerender HTML injection. */
export function serializeSeoHead(input: SeoMetaInput): string {
  const canonical = buildCanonicalUrl(input.path);
  const ogImage = input.ogImage ?? `${SEO_ORIGIN}/opengraph.jpg`;
  const tags = [
    `<title>${escapeHtml(input.title)}</title>`,
    `<meta name="description" content="${escapeAttr(input.description)}" />`,
    input.keywords ? `<meta name="keywords" content="${escapeAttr(input.keywords)}" />` : "",
    `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<link rel="alternate" hreflang="en-IN" href="${canonical}" />`,
    `<link rel="alternate" hreflang="hi-IN" href="${buildCanonicalUrl(input.path === "/" ? "/hi" : `/hi${input.path}`)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${canonical}" />`,
    `<meta property="og:title" content="${escapeAttr(input.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(input.description)}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:type" content="${input.ogType ?? "website"}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:site_name" content="AmyNest AI" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@AmyNestAI" />`,
    `<meta name="twitter:title" content="${escapeAttr(input.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(input.description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
  ];
  return tags.filter(Boolean).join("\n    ");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(value: string): string {
  return escapeAttr(value);
}
