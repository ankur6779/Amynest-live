/**
 * Validates SEO artifacts in dist/public after build + prerender.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist/public");
const ORIGIN = "https://www.amynest.in";

const REQUIRED_FILES = [
  "robots.txt",
  "sitemap.xml",
  "sitemap-pages.xml",
  "sitemap-images.xml",
  "llms.txt",
  "humans.txt",
  "index.html",
];

const SAMPLE_ROUTES = [
  "index.html",
  "get-app/index.html",
  "guides/index.html",
  "features/infant-care/index.html",
  "guides/baby-sleep-schedule-by-age/index.html",
  "routine-by-age/3/index.html",
  "feeding-plan/6-months/index.html",
];

function fail(msg) {
  console.error(`[validate-seo] FAIL: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(DIST)) fail("dist/public missing");

for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(DIST, file))) fail(`missing ${file}`);
}

const robots = fs.readFileSync(path.join(DIST, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) fail("robots.txt missing sitemap");

const sitemapIndex = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
if (!sitemapIndex.includes("sitemap-pages.xml")) fail("sitemap index missing pages sitemap");

for (const rel of SAMPLE_ROUTES) {
  const filePath = path.join(DIST, rel);
  if (!fs.existsSync(filePath)) fail(`missing prerender ${rel}`);
  const html = fs.readFileSync(filePath, "utf8");
  if (!html.includes("<title>")) fail(`${rel} missing title`);
  if (!html.includes('rel="canonical"') && !html.includes("rel='canonical'")) {
    fail(`${rel} missing canonical`);
  }
  if (!html.includes("og:title")) fail(`${rel} missing og:title`);
  if (!html.includes("twitter:card")) fail(`${rel} missing twitter:card`);
}

console.log("[validate-seo] OK — metadata, sitemaps, robots, prerender samples validated");
