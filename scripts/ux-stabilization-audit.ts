/**
 * Regression audit for UX Stabilization Release.
 *
 *   pnpm --filter @workspace/scripts run ux-stabilization-audit
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

type Check = { name: string; pass: boolean; detail: string };

const checks: Check[] = [];

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

function add(name: string, pass: boolean, detail: string) {
  checks.push({ name, pass, detail });
}

// 1. Android safe-area bridge
const mainActivity = read("android/app/src/main/kotlin/com/amynest/app/MainActivity.kt");
add(
  "Android injects --sab/--sat",
  /--sab/.test(mainActivity) && /--sat/.test(mainActivity),
  "MainActivity.kt must inject CSS inset variables",
);
add(
  "Android keeps edge-to-edge",
  /setDecorFitsSystemWindows\(window,\s*false\)/.test(mainActivity),
  "Must not revert to decorFitsSystemWindows(true)",
);
add(
  "Android keeps immersive mode",
  /hide\(WindowInsetsCompat\.Type\.systemBars\(\)\)/.test(mainActivity),
  "Immersive system bars must stay enabled",
);

// 2. Persistent tab bar
const layout = read("artifacts/kidschedule/src/components/layout.tsx");
add(
  "Tab bar uses isTabRootRoute",
  /isTabRootRoute\(location\)/.test(layout) && /visible=\{showTabBar\}/.test(layout),
  "layout.tsx must show tab bar on all tab roots",
);

// 3. Button 44px
const button = read("artifacts/kidschedule/src/components/ui/button.tsx");
add(
  "Button icon size >= 44px",
  /icon:\s*"h-11 w-11"/.test(button) && /min-h-11/.test(button),
  "button.tsx touch targets",
);

// 4. Safe area CSS utilities
const css = read("artifacts/kidschedule/src/index.css");
add(
  "CSS tabbar total height token",
  /--tabbar-total-height/.test(css) && /--tabbar-visual-height/.test(css),
  "index.css layout tokens",
);
add(
  "Scroll reserves FAB overhang",
  /body\.has-tabbar[\s\S]*--fab-overhang/.test(css),
  "has-tabbar scroll includes fab-overhang",
);
add(
  "Android header uses --sat",
  /amynest-android-shell \.app-header[\s\S]*--sat/.test(css),
  "Android header top inset",
);
add(
  "Footer owns single --sab padding",
  /\.app-footer[\s\S]*padding-bottom:\s*var\(--sab/.test(css),
  ".app-footer is sole bottom inset owner",
);
add(
  "Footer nav fixed visual height",
  /\.app-footer__nav[\s\S]*--tabbar-visual-height/.test(css),
  "Tab row height capped at visual 72px",
);

// 5. No double safe-area on tab bar inner row
const tabBar = read("artifacts/kidschedule/src/components/mobile-tab-bar.tsx");
add(
  "Tab bar inner row has no safe-area-bottom",
  !/safe-area-bottom/.test(tabBar),
  "mobile-tab-bar.tsx must not duplicate --sab",
);
add(
  "Tab bar nav aria-label",
  /nav\.main_navigation|Main navigation/.test(tabBar),
  "mobile-tab-bar.tsx",
);

// 6. ChatPlatform message padding
const chat = read("artifacts/kidschedule/src/components/chat-platform.tsx");
add(
  "Chat messages include --sab",
  /var\(--sab/.test(chat),
  "chat-platform.tsx messages padding",
);

// 7. Composer accessibility
const composer = read("artifacts/kidschedule/src/components/chat-thread/persistent-composer.tsx");
add(
  "Composer send labeled",
  /aria-label="Send message"/.test(composer),
  "persistent-composer.tsx",
);

// 8. Dashboard no redundant pageBottom
const dashboard = read("artifacts/kidschedule/src/pages/dashboard.tsx");
add(
  "Dashboard omits SCREEN_SPACING.pageBottom",
  !/SCREEN_SPACING\.pageBottom/.test(dashboard) && !/pageBottom/.test(dashboard),
  "dashboard.tsx scroll clearance via .app-scroll only",
);

// 9. FAB fallback uses tabbar-total-height
add(
  "FAB fallback uses tabbar-total-height",
  /#amy-fab-floating:not\(\.amy-fab-in-footer\)[\s\S]*--tabbar-total-height/.test(css),
  "index.css non-embedded FAB offset",
);

const failed = checks.filter((c) => !c.pass);
for (const c of checks) {
  console.log(`${c.pass ? "✓" : "✗"} ${c.name}: ${c.detail}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} UX stabilization check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} UX stabilization checks passed.`);
