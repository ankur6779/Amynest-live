import { CANONICAL_PRODUCTION_ORIGIN } from "@/lib/canonical-domain";

export const SEO_ORIGIN = CANONICAL_PRODUCTION_ORIGIN;

export type SeoMetaInput = {
  path: string;
  title: string;
  description: string;
  ogType?: "website" | "article";
  ogImage?: string;
  keywords?: string;
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
  upsertHeadTag('link[rel="canonical"]', "href", canonical);
  upsertHeadTag('meta[property="og:title"]', "content", input.title);
  upsertHeadTag('meta[property="og:description"]', "content", input.description);
  upsertHeadTag('meta[property="og:image"]', "content", ogImage);
  upsertHeadTag('meta[property="og:type"]', "content", input.ogType ?? "website");
  upsertHeadTag('meta[property="og:url"]', "content", canonical);
  upsertHeadTag('meta[name="twitter:card"]', "content", "summary_large_image");
  upsertHeadTag('meta[name="twitter:title"]', "content", input.title);
  upsertHeadTag('meta[name="twitter:description"]', "content", input.description);
  upsertHeadTag('meta[name="twitter:image"]', "content", ogImage);
}
