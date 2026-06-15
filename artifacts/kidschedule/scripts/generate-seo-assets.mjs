/**
 * Generates sitemap index, URL sitemap, image sitemap, and robots.txt.
 * Pure ESM — no TypeScript import required at build time.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "dist/public");
const ORIGIN = "https://www.amynest.in";
const LASTMOD = new Date().toISOString().slice(0, 10);

const FEATURE_SLUGS = [
  "infant-care",
  "speech-coach",
  "daily-routines",
  "study-zone",
  "nutrition-hub",
];

function extractGuideSlugsFromSource(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return [...text.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
}

function listAllRoutes() {
  const baseGuides = extractGuideSlugsFromSource(
    path.join(ROOT, "src/lib/marketing/guides-content.ts"),
  );
  const extraGuides = extractGuideSlugsFromSource(
    path.join(ROOT, "src/lib/marketing/guides-content-extra.ts"),
  );
  const guideSlugs = [...new Set([...baseGuides, ...extraGuides])];

  const staticRoutes = [
    { path: "/", changefreq: "weekly", priority: 1.0 },
    { path: "/get-app", changefreq: "weekly", priority: 0.95 },
    { path: "/guides", changefreq: "weekly", priority: 0.8 },
    { path: "/sign-up", changefreq: "monthly", priority: 0.8 },
    { path: "/sign-in", changefreq: "monthly", priority: 0.5 },
    { path: "/privacy", changefreq: "yearly", priority: 0.4 },
    { path: "/terms", changefreq: "yearly", priority: 0.4 },
    { path: "/support", changefreq: "monthly", priority: 0.5 },
  ];

  const featureRoutes = FEATURE_SLUGS.map((slug) => ({
    path: `/features/${slug}`,
    changefreq: "monthly",
    priority: 0.85,
  }));

  const guideRoutes = guideSlugs.map((slug) => ({
    path: `/guides/${slug}`,
    changefreq: "monthly",
    priority: 0.75,
  }));

  const routineRoutes = Array.from({ length: 12 }, (_, i) => ({
    path: `/routine-by-age/${i + 1}`,
    changefreq: "monthly",
    priority: 0.7,
  }));

  const feedingRoutes = ["6-months", "8-months", "10-months", "12-months"].map((slug) => ({
    path: `/feeding-plan/${slug}`,
    changefreq: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...featureRoutes, ...guideRoutes, ...routineRoutes, ...feedingRoutes];
}

function xmlEscape(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function writeSitemapUrls(routes) {
  const urls = routes
    .map(
      (route) => `  <url>
    <loc>${ORIGIN}${route.path === "/" ? "/" : route.path}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(2)}</priority>
  </url>`,
    )
    .join("\n");

  fs.writeFileSync(
    path.join(PUBLIC_DIR, "sitemap-pages.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    "utf8",
  );
}

function writeImageSitemap() {
  const images = [
    { loc: `${ORIGIN}/`, image: `${ORIGIN}/opengraph.jpg`, title: "AmyNest AI — Where Smart Parenting Begins" },
    { loc: `${ORIGIN}/get-app`, image: `${ORIGIN}/opengraph.jpg`, title: "AmyNest AI App Download" },
  ];

  const body = images
    .map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <image:image>
      <image:loc>${entry.image}</image:loc>
      <image:title>${xmlEscape(entry.title)}</image:title>
    </image:image>
  </url>`,
    )
    .join("\n");

  fs.writeFileSync(
    path.join(PUBLIC_DIR, "sitemap-images.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>
`,
    "utf8",
  );
}

function writeSitemapIndex() {
  fs.writeFileSync(
    path.join(PUBLIC_DIR, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${ORIGIN}/sitemap-pages.xml</loc>
    <lastmod>${LASTMOD}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${ORIGIN}/sitemap-images.xml</loc>
    <lastmod>${LASTMOD}</lastmod>
  </sitemap>
</sitemapindex>
`,
    "utf8",
  );
}

function writeRobots() {
  const robots = `# AmyNest AI — robots.txt
User-agent: *
Allow: /
Allow: /get-app
Allow: /features/
Allow: /guides/
Allow: /routine-by-age/
Allow: /feeding-plan/
Allow: /privacy
Allow: /terms
Allow: /support
Allow: /llms.txt
Allow: /humans.txt
Disallow: /dashboard
Disallow: /parenting-hub
Disallow: /api/

User-agent: GPTBot
Allow: /guides/
Allow: /features/
Disallow: /dashboard

Sitemap: ${ORIGIN}/sitemap.xml
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, "robots.txt"), robots, "utf8");
  fs.copyFileSync(path.join(PUBLIC_DIR, "robots.txt"), path.join(ROOT, "public/robots.txt"));
}

function copyStaticSeoFiles() {
  for (const file of ["llms.txt", "humans.txt"]) {
    const src = path.join(ROOT, "public", file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(PUBLIC_DIR, file));
  }
}

if (!fs.existsSync(PUBLIC_DIR)) {
  console.error("[generate-seo-assets] dist/public missing");
  process.exit(1);
}

const routes = listAllRoutes();
writeSitemapUrls(routes);
writeImageSitemap();
writeSitemapIndex();
writeRobots();
copyStaticSeoFiles();
console.log(`[generate-seo-assets] OK — ${routes.length} routes`);
