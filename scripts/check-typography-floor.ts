/**
 * Enforce 12px minimum typography in app chrome (navigation, headers, CTAs).
 *
 *   pnpm --filter @workspace/scripts run check-typography-floor
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

const SRC = join(REPO_ROOT, "artifacts/kidschedule/src");

/** UI chrome files where sub-12px text is never allowed. */
const CHROME_GLOBS = [
  "components/layout.tsx",
  "components/mobile-tab-bar.tsx",
  "components/ui/button.tsx",
  "components/chat-thread/persistent-composer.tsx",
  "components/amy-fab.tsx",
  "components/hub-module-page-shell.tsx",
  "pages/dashboard.tsx",
  "pages/parenting-hub.tsx",
];

const MICRO_TEXT = /text-\[(8|9|10|11)px\]/g;

function scanFile(relPath: string): string[] {
  const content = readFileSync(join(SRC, relPath), "utf8");
  const hits: string[] = [];
  for (const match of content.matchAll(MICRO_TEXT)) {
    hits.push(`${relPath}: ${match[0]}`);
  }
  return hits;
}

const violations = CHROME_GLOBS.flatMap((file) => scanFile(file));

if (violations.length > 0) {
  console.error("Typography floor violations (minimum 12px / text-xs in chrome):\n");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`Typography floor OK (${CHROME_GLOBS.length} chrome files).`);
