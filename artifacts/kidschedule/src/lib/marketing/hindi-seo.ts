import { buildCanonicalUrl } from "@/lib/marketing/canonical-seo";

export type HindiSeoMeta = {
  title: string;
  description: string;
  keywords?: string;
};

/** Hindi SEO metadata framework — content can be filled incrementally. */
export const HINDI_SEO_BY_PATH: Record<string, HindiSeoMeta> = {
  "/": {
    title: "AmyNest AI — स्मार्ट पेरेंटिंग की शुरुआत",
    description:
      "AI से चलने वाला पेरेंटिंग ऐप — बच्चों के लिए दिनचर्या, भोजन योजना, स्पीच कोच और सीखने की गतिविधियाँ।",
    keywords: "पेरेंटिंग ऐप, AI parenting, बच्चों की दिनचर्या, global parenting app",
  },
  "/get-app": {
    title: "AmyNest ऐप डाउनलोड करें — Android और iOS",
    description: "AmyNest मुफ्त में डाउनलोड करें — AI दिनचर्या, शिशु देखभाल, पोषण और स्पीच कोच।",
  },
  "/guides": {
    title: "पेरेंटिंग गाइड — AmyNest AI",
    description: "नींद, पोषण, भाषा विकास और स्कूल रूटीन पर व्यावहारिक गाइड।",
  },
};

export function getHindiSeoMeta(path: string): HindiSeoMeta | undefined {
  return HINDI_SEO_BY_PATH[path];
}

export function applyHreflangTags(path: string): void {
  if (typeof document === "undefined") return;
  const canonical = buildCanonicalUrl(path);
  const hindiPath = path.startsWith("/hi") ? path : `/hi${path === "/" ? "" : path}`;

  upsertLink("link[rel='alternate'][hreflang='en']", canonical);
  upsertLink("link[rel='alternate'][hreflang='hi']", buildCanonicalUrl(hindiPath));
  upsertLink("link[rel='alternate'][hreflang='x-default']", canonical);
}

function upsertLink(selector: string, href: string): void {
  const existing = document.querySelector(selector);
  if (existing) {
    existing.setAttribute("href", href);
    return;
  }
  const link = document.createElement("link");
  link.setAttribute("rel", "alternate");
  const hreflang = selector.match(/hreflang='([^']+)'/)?.[1];
  if (hreflang) link.setAttribute("hreflang", hreflang);
  link.setAttribute("href", href);
  document.head.appendChild(link);
}
