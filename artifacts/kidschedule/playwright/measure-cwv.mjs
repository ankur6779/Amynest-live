import { chromium, devices } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const browser = await chromium.launch();
const page = await (await browser.newContext({ ...devices["Pixel 5"] })).newPage();
await page.addInitScript(() => {
  window.__cwv = { lcp: null, cls: 0 };
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      window.__cwv.lcp = last?.startTime ?? null;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) window.__cwv.cls += e.value ?? 0;
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch { /* */ }
});

const results = [];
for (const path of ["/dashboard", "/parenting-hub"]) {
  await page.goto(`https://www.amynest.in${path}`, { waitUntil: "networkidle", timeout: 120000 }).catch(async () => {
    await page.goto(`https://www.amynest.in${path}`, { waitUntil: "load", timeout: 120000 });
  });
  await page.waitForTimeout(5000);
  await page.locator("button,a").first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const m = await page.evaluate(() => {
    const cwv = window.__cwv ?? {};
    const nav = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint");
    const events = performance.getEntriesByType("event").map((e) => e.duration ?? 0).filter((d) => d > 0);
    return {
      lcpMs: cwv.lcp != null ? Math.round(cwv.lcp) : null,
      cls: Number((cwv.cls ?? 0).toFixed(4)),
      fcpMs: fcp ? Math.round(fcp.startTime) : null,
      ttfbMs: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
      inpMs: events.length ? Math.round(Math.max(...events)) : null,
    };
  });
  results.push({ path, ...m });
}
writeFileSync(join(process.cwd(), "..", "..", "audit", "cwv-measurement.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await browser.close();
