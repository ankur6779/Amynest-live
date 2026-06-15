/**
 * Post-build static SEO HTML for marketing routes (no Playwright).
 * Clones dist/public/index.html per route with injected meta + crawler-visible content.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist/public");
const ORIGIN = "https://www.amynest.in";
const OG_IMAGE = `${ORIGIN}/opengraph.jpg`;

const FEATURE_SLUGS = [
  "infant-care",
  "speech-coach",
  "daily-routines",
  "study-zone",
  "nutrition-hub",
];

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeHtml(value) {
  return escapeAttr(value);
}

function buildCanonicalUrl(routePath) {
  const normalized = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return `${ORIGIN}${normalized}`;
}

function serializeSeoHead(input) {
  const canonical = buildCanonicalUrl(input.path);
  const ogImage = input.ogImage ?? OG_IMAGE;
  const hiPath = input.path === "/" ? "/hi" : `/hi${input.path}`;
  const tags = [
    `<title>${escapeHtml(input.title)}</title>`,
    `<meta name="description" content="${escapeAttr(input.description)}" />`,
    input.keywords ? `<meta name="keywords" content="${escapeAttr(input.keywords)}" />` : "",
    `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<link rel="alternate" hreflang="en-IN" href="${canonical}" />`,
    `<link rel="alternate" hreflang="hi-IN" href="${buildCanonicalUrl(hiPath)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${canonical}" />`,
    `<meta property="og:title" content="${escapeAttr(input.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(input.description)}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:type" content="${input.ogType ?? "website"}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:site_name" content="AmyNest AI" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@AmyNestAI" />`,
    `<meta name="twitter:creator" content="@AmyNestAI" />`,
    `<meta name="twitter:title" content="${escapeAttr(input.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(input.description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
  ];
  return tags.filter(Boolean).join("\n    ");
}

function parseQuotedField(block, field) {
  const re = new RegExp(`${field}:\\s*\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m");
  const match = block.match(re);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function parseGuideArticles(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const articles = [];
  const slugRe = /^    slug: "([^"]+)"/gm;
  const slugHits = [...text.matchAll(slugRe)];
  for (let i = 0; i < slugHits.length; i++) {
    const slug = slugHits[i][1];
    const start = slugHits[i].index;
    const end = i + 1 < slugHits.length ? slugHits[i + 1].index : text.length;
    const block = text.slice(start, end);
    articles.push({
      slug,
      title: parseQuotedField(block, "title"),
      metaDescription: parseQuotedField(block, "metaDescription"),
      keywords: parseQuotedField(block, "keywords"),
      excerpt: parseQuotedField(block, "excerpt"),
    });
  }
  return articles;
}

function parseFeaturePages() {
  const text = fs.readFileSync(path.join(ROOT, "src/lib/marketing/feature-pages.ts"), "utf8");
  const pages = [];
  const slugRe = /^    slug: "([^"]+)"/gm;
  const slugHits = [...text.matchAll(slugRe)];
  for (let i = 0; i < slugHits.length; i++) {
    const slug = slugHits[i][1];
    if (!FEATURE_SLUGS.includes(slug)) continue;
    const start = slugHits[i].index;
    const end = i + 1 < slugHits.length ? slugHits[i + 1].index : text.length;
    const block = text.slice(start, end);
    pages.push({
      slug,
      path: `/features/${slug}`,
      title: parseQuotedField(block, "title"),
      description: parseQuotedField(block, "metaDescription"),
      keywords: parseQuotedField(block, "keywords"),
      h1: `${parseQuotedField(block, "headline")} ${parseQuotedField(block, "headlineAccent")}`.trim(),
      subheadline: parseQuotedField(block, "subheadline"),
    });
  }
  return pages;
}

function buildRoutineMeta(age) {
  const wakeWindow =
    age <= 1 ? "45–75 minutes" : age <= 2 ? "2–3 hours" : age <= 4 ? "3–5 hours" : "5–7 hours";
  return {
    path: `/routine-by-age/${age}`,
    title: `Daily Routine for ${age}-Year-Old Child | AmyNest AI`,
    description: `A practical daily routine template for ${age}-year-olds — wake windows (${wakeWindow}), meals, play, learning blocks, and bedtime targets parents can actually follow.`,
    keywords: `${age} year old daily routine, toddler schedule, child routine template, parenting routine planner`,
    h1: `Daily Routine Template for a ${age}-Year-Old`,
    subheadline: "Age-appropriate wake windows, meal timing, and calm transitions — built for real Indian households.",
  };
}

function buildFeedingMeta(months) {
  const slug = `${months}-months`;
  const texture =
    months <= 6
      ? "smooth purees and breast/formula as primary"
      : months <= 8
        ? "mashed textures + soft finger foods"
        : "family foods cut safely + self-feeding practice";
  return {
    path: `/feeding-plan/${slug}`,
    title: `Feeding Plan for ${months}-Month-Old Baby | AmyNest AI`,
    description: `Sample feeding plan for ${months}-month-olds — meal frequency, texture (${texture}), iron-rich foods, and hydration cues for Indian families.`,
    keywords: `${months} month baby feeding schedule, infant meal plan India, baby food by age, complementary feeding`,
    h1: `Feeding Plan for ${months}-Month-Olds`,
    subheadline:
      "Practical meal timing and food ideas — not medical prescriptions. Confirm allergies and portions with your pediatrician.",
  };
}

const STATIC_PAGES = [
  {
    path: "/",
    title: "AmyNest AI — Where Smart Parenting Begins",
    description:
      "AI-powered parenting coach with patent-pending adaptive scheduling technology. Personalized routines, meal plans, and contextual child-development intelligence for your child.",
    keywords:
      "parenting app, AI parenting, child routine planner, baby schedule, toddler activities, smart parenting India",
    h1: "AmyNest AI — Where Smart Parenting Begins",
    subheadline: "Personalized routines, meal plans, and parenting intelligence for your child.",
  },
  {
    path: "/get-app",
    title: "Turn Parenting Chaos Into Calm Daily Wins — AmyNest",
    description:
      "AmyNest helps you turn chaotic days into calm wins. Meet AMY for routines, infant care, nutrition, speech and learning from birth through age 10+. Free on Android & iOS.",
    keywords: "AmyNest app download, parenting app Android iOS, AI parenting coach India",
    h1: "Turn Parenting Chaos Into Calm Daily Wins",
    subheadline: "Meet AMY — free on Google Play and the App Store.",
  },
  {
    path: "/guides",
    title: "Parenting Guides — Sleep, Routines, Speech & Nutrition | AmyNest AI",
    description:
      "Practical parenting guides on baby sleep, toddler routines, speech development, picky eating, and school mornings — from the AmyNest team.",
    keywords:
      "parenting guides, baby sleep tips, toddler routine, speech development, picky eater help, school morning routine",
    h1: "Parenting Guides",
    subheadline: "Practical advice on sleep, routines, speech, nutrition, and school mornings.",
  },
  {
    path: "/sign-up",
    title: "Sign Up — AmyNest AI",
    description: "Create your free AmyNest AI account and start personalized parenting routines today.",
    keywords: "AmyNest sign up, create parenting account",
    h1: "Sign Up for AmyNest AI",
    subheadline: "Free account with personalized routines and parenting guidance.",
    noindex: true,
  },
  {
    path: "/sign-in",
    title: "Sign In — AmyNest AI",
    description: "Sign in to your AmyNest AI account to access your family dashboard and routines.",
    keywords: "AmyNest sign in, parenting app login",
    h1: "Sign In to AmyNest AI",
    subheadline: "Access your family dashboard and daily routines.",
    noindex: true,
  },
  {
    path: "/privacy",
    title: "Privacy Policy | AmyNest AI",
    description:
      "How AmyNest AI collects, uses, and protects your family data. Privacy-first parenting app with no ads shown to children.",
    keywords: "AmyNest privacy policy, parenting app privacy, child data protection",
    h1: "Privacy Policy",
    subheadline: "How AmyNest AI protects your family's data.",
  },
  {
    path: "/terms",
    title: "Terms of Service | AmyNest AI",
    description: "Terms of service for AmyNest AI — the AI-powered parenting app for Indian families.",
    keywords: "AmyNest terms of service, parenting app terms",
    h1: "Terms of Service",
    subheadline: "Terms governing use of AmyNest AI.",
  },
  {
    path: "/support",
    title: "Support — AmyNest AI",
    description: "Get help with AmyNest AI — contact support, FAQs, and troubleshooting for the parenting app.",
    keywords: "AmyNest support, parenting app help, contact AmyNest",
    h1: "AmyNest Support",
    subheadline: "We're here to help with your AmyNest account and app.",
  },
];

function buildJsonLd(page) {
  const canonical = buildCanonicalUrl(page.path);
  const graph = [
    {
      "@type": "Organization",
      "@id": `${ORIGIN}/#organization`,
      name: "AmyNest AI",
      url: ORIGIN,
    },
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: page.title,
      description: page.description,
      isPartOf: { "@id": `${ORIGIN}/#webapp` },
      inLanguage: "en-IN",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: buildBreadcrumbs(page).map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: buildCanonicalUrl(crumb.path),
      })),
    },
  ];

  if (page.path.startsWith("/guides/") && page.slug) {
    graph.push({
      "@type": "Article",
      headline: page.h1 || page.title,
      description: page.description,
      author: { "@type": "Organization", name: "AmyNest AI" },
      publisher: { "@type": "Organization", name: "AmyNest AI" },
      mainEntityOfPage: { "@id": `${canonical}#webpage` },
      inLanguage: "en-IN",
    });
  }

  return `<script type="application/ld+json">\n${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2)}\n    </script>`;
}

function buildBreadcrumbs(page) {
  if (page.path === "/") return [{ name: "Home", path: "/" }];
  if (page.path.startsWith("/features/")) {
    return [
      { name: "Home", path: "/" },
      { name: "Features", path: "/get-app" },
      { name: page.h1 || page.title, path: page.path },
    ];
  }
  if (page.path.startsWith("/guides/")) {
    return [
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
      { name: page.h1 || page.title, path: page.path },
    ];
  }
  if (page.path.startsWith("/routine-by-age/")) {
    return [
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
      { name: page.h1 || page.title, path: page.path },
    ];
  }
  if (page.path.startsWith("/feeding-plan/")) {
    return [
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
      { name: page.h1 || page.title, path: page.path },
    ];
  }
  return [
    { name: "Home", path: "/" },
    { name: page.h1 || page.title, path: page.path },
  ];
}

function buildFallbackBody(page) {
  const h1 = page.h1 || page.title;
  const sub = page.subheadline || page.description;
  return `<main id="seo-static-fallback" style="max-width:720px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;color:#f5f5f5;background:#0b0b0b">
      <h1>${escapeHtml(h1)}</h1>
      <p>${escapeHtml(sub)}</p>
    </main>`;
}

function injectSeoIntoHtml(baseHtml, page) {
  const seoInput = {
    path: page.path,
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    ogType: page.path.startsWith("/guides/") ? "article" : "website",
    noindex: page.noindex,
  };

  let html = baseHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/, serializeSeoHead(seoInput));

  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    buildJsonLd(page),
  );

  html = html.replace(
    /<div id="root"><\/div>/,
    `<div id="root">${buildFallbackBody(page)}</div>`,
  );

  return html;
}

function writeRouteHtml(baseHtml, page) {
  const html = injectSeoIntoHtml(baseHtml, page);
  const outPath =
    page.path === "/"
      ? path.join(DIST, "index.html")
      : path.join(DIST, page.path.slice(1), "index.html");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
}

function collectPages() {
  const guidesDir = path.join(ROOT, "src/lib/marketing");
  const guides = [
    ...parseGuideArticles(path.join(guidesDir, "guides-content.ts")),
    ...parseGuideArticles(path.join(guidesDir, "guides-content-extra.ts")),
  ];

  const guidePages = [...new Map(
    guides.map((guide) => [
      guide.slug,
      {
        path: `/guides/${guide.slug}`,
        slug: guide.slug,
        title: guide.title,
        description: guide.metaDescription,
        keywords: guide.keywords,
        h1: guide.title,
        subheadline: guide.excerpt || guide.metaDescription,
      },
    ]),
  ).values()];

  const featurePages = parseFeaturePages();
  const routinePages = Array.from({ length: 12 }, (_, i) => buildRoutineMeta(i + 1));
  const feedingPages = [6, 8, 10, 12].map(buildFeedingMeta);

  return [...STATIC_PAGES, ...featurePages, ...guidePages, ...routinePages, ...feedingPages];
}

if (!fs.existsSync(DIST)) {
  console.error("[generate-static-seo-html] dist/public missing — run vite build first");
  process.exit(1);
}

const baseHtml = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const pages = collectPages();

for (const page of pages) {
  writeRouteHtml(baseHtml, page);
}

console.log(`[generate-static-seo-html] OK — ${pages.length} routes`);
