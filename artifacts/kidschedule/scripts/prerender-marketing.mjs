/**
 * Post-build Playwright prerender for public marketing routes.
 * Uses domcontentloaded + h1 wait; blocks third-party requests for speed.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist/public");
const PORT = Number(process.env.PRERENDER_PORT || 4173);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const CONCURRENCY = Number(process.env.PRERENDER_CONCURRENCY || 4);

const PRERENDER_PATHS = [
  "/",
  "/get-app",
  "/guides",
  "/sign-up",
  "/sign-in",
  "/privacy",
  "/terms",
  "/support",
  "/features/infant-care",
  "/features/speech-coach",
  "/features/daily-routines",
  "/features/study-zone",
  "/features/nutrition-hub",
];

function slugMatchesFromFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return [...text.matchAll(/^\s+slug: "([^"]+)"/gm)].map((m) => m[1]);
}

function listPrerenderRoutes() {
  const guidesDir = path.join(ROOT, "src/lib/marketing");
  const guideSlugs = [
    ...new Set([
      ...slugMatchesFromFile(path.join(guidesDir, "guides-content.ts")),
      ...slugMatchesFromFile(path.join(guidesDir, "guides-content-extra.ts")),
    ]),
  ];

  return [
    ...PRERENDER_PATHS,
    ...guideSlugs.map((slug) => `/guides/${slug}`),
    ...Array.from({ length: 12 }, (_, i) => `/routine-by-age/${i + 1}`),
    ...["6-months", "8-months", "10-months", "12-months"].map((m) => `/feeding-plan/${m}`),
  ];
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", ORIGIN);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/") && pathname !== "/") pathname = pathname.slice(0, -1);

      let filePath = path.join(DIST, pathname);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(fs.readFileSync(filePath));
        return;
      }

      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(path.join(DIST, "index.html")));
    });

    server.listen(PORT, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function outputPathForRoute(routePath) {
  if (routePath === "/") return path.join(DIST, "index.html");
  return path.join(DIST, ...routePath.replace(/^\//, "").split("/"), "index.html");
}

async function prerenderOne(context, route) {
  const page = await context.newPage();
  await page.route("**/*", (request) => {
    const url = request.request().url();
    if (url.startsWith(ORIGIN) || url.startsWith("data:")) {
      request.continue();
    } else {
      request.abort();
    }
  });

  await page.goto(`${ORIGIN}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForSelector("h1, [data-on-dark]", { timeout: 12_000 }).catch(() => {});

  const html = await page.content();
  const out = outputPathForRoute(route);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, "utf8");
  await page.close();

  const flags = [
    html.includes("<title>") ? "title" : null,
    html.includes('meta name="description"') ? "desc" : null,
    html.includes("application/ld+json") ? "schema" : null,
    html.includes("<h1") ? "h1" : null,
  ]
    .filter(Boolean)
    .join("+");

  console.log(`[prerender] ✓ ${route} (${flags})`);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Executable doesn't exist")) {
      console.error(
        "[prerender] Chromium not installed. Run: pnpm --filter @workspace/kidschedule exec playwright install chromium --with-deps",
      );
    }
    throw err;
  }
}

async function prerenderRoutes() {
  if (!fs.existsSync(DIST)) {
    console.error("[prerender] dist/public missing");
    process.exit(1);
  }

  const allRoutes = listPrerenderRoutes();
  const limit = Number(process.env.PRERENDER_LIMIT || 0);
  const routes = limit > 0 ? allRoutes.slice(0, limit) : allRoutes;

  console.log(`[prerender] starting ${routes.length} routes on ${ORIGIN} (concurrency=${CONCURRENCY})`);
  const server = await startStaticServer();
  const browser = await launchBrowser();
  const context = await browser.newContext();

  try {
    for (let i = 0; i < routes.length; i += CONCURRENCY) {
      const batch = routes.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map((route) => prerenderOne(context, route)));
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`[prerender] OK — ${routes.length}/${routes.length} routes`);
}

prerenderRoutes().catch((err) => {
  console.error("[prerender] failed", err);
  process.exit(1);
});
