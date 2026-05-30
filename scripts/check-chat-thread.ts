/**
 * Enforce ChatThread as the sole conversational UI on chat surfaces.
 *
 *   pnpm --filter @workspace/scripts run check-chat-thread
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

const KIDSCHEDULE_SRC = join(REPO_ROOT, "artifacts/kidschedule/src");
const PAGES = join(KIDSCHEDULE_SRC, "pages");

const REQUIRED_CHAT_THREAD_PAGES = [
  "onboarding.tsx",
  "assistant.tsx",
  "amy-ai-tutor.tsx",
  "amy-learning-tutor.tsx",
] as const;

const FORBIDDEN_WIZARD_PATTERNS = [
  { pattern: /function\s+renderInput\s*\(/, label: "renderInput() wizard footer" },
  { pattern: /function\s+renderCountryFooter\s*\(/, label: "renderCountryFooter() wizard footer" },
  { pattern: /renderCountryPickerOverlay\s*\(/, label: "fullscreen country overlay" },
  { pattern: /footer=\{showChatFooter/, label: "conditional wizard footer gate" },
  { pattern: /footer=\{null\}/, label: "footer={null} — composer must stay mounted" },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

const violations: string[] = [];

for (const page of REQUIRED_CHAT_THREAD_PAGES) {
  const path = join(PAGES, page);
  const content = readFileSync(path, "utf8");
  if (!/<ChatThread\b/.test(content)) {
    violations.push(`pages/${page}: must render ChatThread`);
  }
  for (const rule of FORBIDDEN_WIZARD_PATTERNS) {
    if (rule.pattern.test(content)) {
      violations.push(`pages/${page}: forbidden ${rule.label}`);
    }
  }
}

for (const file of walk(PAGES)) {
  const rel = `pages/${relative(PAGES, file).replace(/\\/g, "/")}`;
  if (!REQUIRED_CHAT_THREAD_PAGES.some((p) => rel.endsWith(p))) continue;
  const content = readFileSync(file, "utf8");
  if (/from\s+["']@\/components\/chat-bubbles["']/.test(content)) {
    violations.push(`${rel}: import bubbles from @/components/chat-thread instead`);
  }
}

if (violations.length) {
  console.error("ChatThread enforcement check failed:\n");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("ChatThread enforcement check passed.");
