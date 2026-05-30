/**
 * Enforce ChatPlatform as the sole owner of conversational keyboard layout.
 *
 *   pnpm --filter @workspace/scripts run check-chat-platform
 *
 * Any PR adding forbidden patterns below must fail CI — extend ChatPlatform instead.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

const KIDSCHEDULE_SRC = join(REPO_ROOT, "artifacts/kidschedule/src");
const PAGES = join(KIDSCHEDULE_SRC, "pages");
const COMPONENTS = join(KIDSCHEDULE_SRC, "components");

const CHAT_PLATFORM_INTERNAL = new Set([
  "components/chat-platform.tsx",
  "hooks/use-keyboard-chat-layout.ts",
  "lib/chat-platform/viewport.ts",
  "lib/chat-platform/visibility.ts",
  "lib/chat-platform/telemetry.ts",
  "lib/chat-platform/index.ts",
  "lib/android-chat-keyboard.ts",
]);

const REQUIRED_CHAT_PLATFORM_PAGES = [
  "onboarding.tsx",
  "assistant.tsx",
  "amy-ai-tutor.tsx",
  "amy-learning-tutor.tsx",
] as const;

function pageUsesChatPlatformShell(content: string): boolean {
  return /<ChatPlatform\b/.test(content) || /<ChatThread\b/.test(content);
}

/** Patterns that must never appear outside ChatPlatform internals. */
const FORBIDDEN_OUTSIDE_PLATFORM = [
  { pattern: /useKeyboardChatLayout\s*\(/, label: "useKeyboardChatLayout()" },
  { pattern: /ensureChatPromptVisible\s*\(/, label: "ensureChatPromptVisible()" },
  { pattern: /scheduleSelfHealingVisibility\s*\(/, label: "scheduleSelfHealingVisibility()" },
  { pattern: /validateActivePromptVisibility\s*\(/, label: "validateActivePromptVisibility()" },
  { pattern: /estimateAndroidKeyboardInset/, label: "estimateAndroidKeyboardInset" },
  { pattern: /applyAndroidKeyboardFallback/, label: "applyAndroidKeyboardFallback" },
  { pattern: /keyboardHeight|keyboardInset|keyboard-inset|keyboard_inset/i, label: "keyboard height/inset calculation" },
  { pattern: /innerHeight\s*-\s*keyboard/i, label: "viewport shrink via innerHeight - keyboard" },
  { pattern: /100vh\s*-\s*keyboard|100dvh\s*-\s*keyboard/i, label: "viewport shrink via vh - keyboard" },
  { pattern: /--vv-height|--auth-keyboard-inset/, label: "keyboard CSS var override" },
  { pattern: /\.chat-thread-messages.*scrollTo|messagesRef\.current\.scroll/i, label: "direct chat thread scroll manipulation" },
  { pattern: /innerHeight\s*\*\s*0\.42/, label: "guessed keyboard height (42%)" },
  { pattern: /window\.innerHeight\s*\*\s*0\.\d+/, label: "guessed keyboard height ratio" },
  { pattern: /paddingBottom.*keyboard|keyboard.*paddingBottom/i, label: "keyboard padding hack" },
  { pattern: /KeyboardResize|keyboardDidShow|keyboardDidHide/, label: "Capacitor keyboard listener outside platform" },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

function relKidschedule(abs: string): string {
  return relative(KIDSCHEDULE_SRC, abs).replace(/\\/g, "/");
}

function scanForbidden(content: string, rel: string, violations: string[]) {
  for (const rule of FORBIDDEN_OUTSIDE_PLATFORM) {
    if (rule.pattern.test(content)) {
      violations.push(`${rel}: forbidden ${rule.label} — use ChatPlatform`);
    }
  }
  if (/from\s+["']@\/hooks\/use-keyboard-chat-layout["']/.test(content)) {
    violations.push(`${rel}: must not import use-keyboard-chat-layout — use ChatPlatform`);
  }
  if (/from\s+["']@\/lib\/chat-platform/.test(content) && !rel.startsWith("lib/chat-platform")) {
    if (/ensureChatPromptVisible|scheduleSelfHealingVisibility|validateActivePromptVisibility/.test(content)) {
      violations.push(`${rel}: must not import chat-platform visibility APIs — use ChatPlatform component`);
    }
  }
}

const violations: string[] = [];

for (const file of walk(PAGES)) {
  const rel = `pages/${relative(PAGES, file).replace(/\\/g, "/")}`;
  scanForbidden(readFileSync(file, "utf8"), rel, violations);
}

for (const file of walk(COMPONENTS)) {
  const rel = relKidschedule(file);
  if (rel === "components/chat-platform.tsx") continue;
  scanForbidden(readFileSync(file, "utf8"), rel, violations);
}

for (const file of walk(KIDSCHEDULE_SRC)) {
  const rel = relKidschedule(file);
  if (!rel.startsWith("lib/chat-platform") && rel !== "lib/android-chat-keyboard.ts") continue;
  const content = readFileSync(file, "utf8");
  if (/innerHeight\s*\*\s*0\.42/.test(content) || /estimateAndroidKeyboardInset/.test(content)) {
    violations.push(`${rel}: guessed keyboard height forbidden in ChatPlatform`);
  }
}

for (const page of REQUIRED_CHAT_PLATFORM_PAGES) {
  const path = join(PAGES, page);
  const content = readFileSync(path, "utf8");
  if (!pageUsesChatPlatformShell(content)) {
    violations.push(`pages/${page}: must render ChatPlatform or ChatThread`);
  }
  if (/from\s+["']@\/components\/chat-thread-shell["']/.test(content)) {
    violations.push(`pages/${page}: import ChatPlatform instead of deprecated chat-thread-shell`);
  }
}

const voiceFirstSurfaces = ["speech-coach", "ai-coach.tsx"];
for (const file of walk(PAGES)) {
  const rel = relative(PAGES, file).replace(/\\/g, "/");
  if (!voiceFirstSurfaces.some((s) => rel.includes(s))) continue;
  const content = readFileSync(file, "utf8");
  if (/use-keyboard-chat-layout|useKeyboardChatLayout|ensureChatPromptVisible/.test(content)) {
    violations.push(
      `pages/${rel}: voice-first surface must not import chat keyboard logic — adopt ChatPlatform when adding text chat`,
    );
  }
}

if (violations.length) {
  console.error("ChatPlatform enforcement check failed:\n");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("ChatPlatform enforcement check passed.");
