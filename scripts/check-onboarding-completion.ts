/**
 * CI gate: onboarding completion + auth flow must not regress.
 *
 *   pnpm --filter @workspace/scripts run check-onboarding-completion
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

const KIDSCHEDULE_SRC = join(REPO_ROOT, "artifacts/kidschedule/src");
const ONBOARDING_PAGE = join(KIDSCHEDULE_SRC, "pages/onboarding.tsx");
const API_ONBOARDING_ROUTES = join(REPO_ROOT, "artifacts/api-server/src/routes/onboarding.ts");
const API_PARENT_PROFILE = join(REPO_ROOT, "artifacts/api-server/src/routes/parent-profile.ts");
const API_CHILDREN = join(REPO_ROOT, "artifacts/api-server/src/routes/children.ts");

const REQUIRED_ONBOARDING_API_PATHS = [
  '"/onboarding"',
  '"/onboarding/complete"',
  '"/parent-profile"',
  '"/children"',
];

const BOUNDARY_FILES = [
  join(KIDSCHEDULE_SRC, "components/app-error-boundary.tsx"),
  join(KIDSCHEDULE_SRC, "components/react-instance-recovery.tsx"),
  join(KIDSCHEDULE_SRC, "components/ErrorBoundary.tsx"),
];

/** React #300: hooks must not appear after step early-return branches. */
function checkOnboardingHooksOrder(content: string): string[] {
  const violations: string[] = [];
  const lines = content.split("\n");

  let firstEarlyReturn = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/if\s*\(\s*step\s*===\s*"(?:notifications|saving|done)/.test(line)) {
      firstEarlyReturn = i;
      break;
    }
  }
  if (firstEarlyReturn < 0) return violations;

  const hookRe = /\b(use(?:Memo|Effect|LayoutEffect|Callback|State|Ref|SyncExternalStore|ImperativeHandle|Context))\s*\(/;
  for (let i = firstEarlyReturn; i < lines.length; i++) {
    if (hookRe.test(lines[i] ?? "")) {
      violations.push(
        `onboarding.tsx:${i + 1}: React hook after step early-return — causes React error #300 on Finish Setup`,
      );
    }
  }
  return violations;
}

function checkErrorBoundariesNeverThrow(): string[] {
  const violations: string[] = [];
  for (const file of BOUNDARY_FILES) {
    const rel = file.replace(`${REPO_ROOT}/`, "");
    const content = readFileSync(file, "utf8");
    if (!content.includes("safeInvokeBoundaryHandler") && !content.includes("safeReportBoundaryCrash")) {
      violations.push(`${rel}: componentDidCatch must use safe-error-boundary-catch helpers`);
    }
    if (/logClientError\s*\(/.test(content) && !content.includes('from "@/lib/log-client-error"') && !content.includes("safeLogClientError")) {
      violations.push(`${rel}: logClientError must be imported or wrapped with safeLogClientError`);
    }
    if (/componentDidCatch[\s\S]*?throw /.test(content)) {
      violations.push(`${rel}: componentDidCatch must not rethrow`);
    }
  }
  return violations;
}

function checkApiOnboardingRoutes(): string[] {
  const violations: string[] = [];
  const sources = [
    { file: "onboarding.ts", content: readFileSync(API_ONBOARDING_ROUTES, "utf8") },
    { file: "parent-profile.ts", content: readFileSync(API_PARENT_PROFILE, "utf8") },
    { file: "children.ts", content: readFileSync(API_CHILDREN, "utf8") },
  ];
  const combined = sources.map((s) => s.content).join("\n");
  for (const path of REQUIRED_ONBOARDING_API_PATHS) {
    if (!combined.includes(path)) {
      violations.push(`api-server routes missing ${path}`);
    }
  }
  return violations;
}

function checkProductionSourceMaps(): string[] {
  const violations: string[] = [];
  const viteConfig = readFileSync(
    join(REPO_ROOT, "artifacts/kidschedule/vite.config.ts"),
    "utf8",
  );
  if (!/sourcemap\s*:\s*["']hidden["']/.test(viteConfig)) {
    violations.push("vite.config.ts: production build must set sourcemap: 'hidden'");
  }
  return violations;
}

function main(): void {
  const violations: string[] = [];

  const onboarding = readFileSync(ONBOARDING_PAGE, "utf8");
  violations.push(...checkOnboardingHooksOrder(onboarding));
  violations.push(...checkErrorBoundariesNeverThrow());
  violations.push(...checkApiOnboardingRoutes());
  violations.push(...checkProductionSourceMaps());

  if (violations.length > 0) {
    console.error("Onboarding completion gate FAILED:\n");
    for (const v of violations) console.error(`  • ${v}`);
    process.exit(1);
  }

  console.log("Onboarding completion gate passed.");
}

main();
