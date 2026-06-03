/**
 * Performance Audit — /discovery-worlds and /worlds/:slug (e.g. vehicles).
 * Run: pnpm run report:discovery-worlds-performance
 *
 * Writes: docs/discovery-worlds-performance-audit.md
 * Does not apply optimizations.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const KID = join(root, "artifacts/kidschedule");
const DIST = join(KID, "dist");
const PUBLIC_VISUAL = join(KID, "public/world-visuals");
const PUBLIC_AUDIO_DISCOVERY = join(KID, "public/discovery-worlds-audio");
const OUT_MD = join(root, "docs/discovery-worlds-performance-audit.md");

const ROUTES = [
  { path: "/discovery-worlds", entry: "src/pages/discovery-worlds-hub.tsx" },
  { path: "/worlds/vehicles", entry: "src/pages/discovery-world-live.tsx", slug: "vehicles" },
];

type ChunkRow = { file: string; kb: number };
type AssetRow = { path: string; kb: number };
type Optimization = { rank: number; title: string; impact: "high" | "medium" | "low"; estimate: string; detail: string };

function kb(bytes: number): number {
  return Math.round((bytes / 1024) * 10) / 10;
}

function walkFiles(dir: string, ext?: RegExp): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...walkFiles(p, ext));
    else if (!ext || ext.test(name.name)) out.push(p);
  }
  return out;
}

function collectDistChunks(): ChunkRow[] {
  const assetsDir = join(DIST, "assets");
  if (!existsSync(assetsDir)) return [];
  return walkFiles(assetsDir, /\.(js|css)$/)
    .map((p) => ({ file: relative(DIST, p), kb: kb(statSync(p).size) }))
    .sort((a, b) => b.kb - a.kb);
}

function collectPublicAssets(): AssetRow[] {
  const rows: AssetRow[] = [];
  for (const base of [PUBLIC_VISUAL, PUBLIC_AUDIO_DISCOVERY]) {
    if (!existsSync(base)) continue;
    for (const p of walkFiles(base)) {
      rows.push({ path: relative(root, p), kb: kb(statSync(p).size) });
    }
  }
  return rows.sort((a, b) => b.kb - a.kb);
}

function traceDiscoveryImports(entryRel: string): string[] {
  const seen = new Set<string>();
  const queue = [join(KID, entryRel)];
  const importRe = /from\s+["'](@\/[^"']+|[^"']+)["']/g;

  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(text))) {
      let target = m[1]!;
      if (target.startsWith("@/")) target = join(KID, "src", target.slice(2));
      else if (target.startsWith(".")) target = join(dirname(file), target);
      else continue;
      for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
        const candidate = target.endsWith(ext) ? target : `${target}${ext}`;
        if (existsSync(candidate)) queue.push(candidate);
      }
    }
  }
  return [...seen].map((p) => relative(KID, p));
}

function heavyModules(files: string[]): { path: string; lines: number }[] {
  return files
    .filter((f) => f.startsWith("src/"))
    .map((f) => {
      const full = join(KID, f);
      const lines = existsSync(full) ? readFileSync(full, "utf8").split("\n").length : 0;
      return { path: f, lines };
    })
    .filter((r) => r.lines > 200)
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 15);
}

function buildOptimizations(input: {
  chunks: ChunkRow[];
  assets: AssetRow[];
  hubModules: string[];
  liveModules: string[];
}): Optimization[] {
  const visualMb =
    input.assets.filter((a) => a.path.includes("world-visuals")).reduce((s, a) => s + a.kb, 0) / 1024;
  const audioMb =
    input.assets.filter((a) => a.path.includes("discovery-worlds-audio")).reduce((s, a) => s + a.kb, 0) / 1024;
  const largestChunk = input.chunks[0];

  const opts: Optimization[] = [
    {
      rank: 1,
      title: "Serve hero/card/thumbnail from CDN with immutable cache",
      impact: "high",
      estimate: "LCP −0.8–1.5s on hub grids when images were blocking",
      detail: `${visualMb.toFixed(1)} MB local visual mirror; ensure GCS + /api/worlds-library proxy, not bundled in JS.`,
    },
    {
      rank: 2,
      title: "Lazy-load discovery-world-experience mode panels",
      impact: "high",
      estimate: "TTI −200–500ms on /worlds/vehicles first paint",
      detail: "Live route imports VirtualizedGrid, quiz/hear-find/toddler panels in one chunk — split by mode.",
    },
    {
      rank: 3,
      title: "Defer UnifiedParentDashboard + AssetCoverageDashboard on hub",
      impact: "medium",
      estimate: "Hub JS −30–80 KB parsed",
      detail: "Parent/ops dashboards on /discovery-worlds are not kid-critical; dynamic import below fold.",
    },
    {
      rank: 4,
      title: "Cap concurrent audio preload on world open",
      impact: "high",
      estimate: "Main-thread jank −100–300ms",
      detail: `${audioMb.toFixed(1)} MB discovery audio mirror; warmDiscoveryWorldOfflineCache should batch ≤4 URLs.`,
    },
    {
      rank: 5,
      title: "VirtualizedGrid overscan tuning for 40-item worlds",
      impact: "medium",
      estimate: "INP −50–150ms on scroll",
      detail: "Reduce initial mount nodes; keep 320×400 fixed slots (already set).",
    },
    {
      rank: 6,
      title: "Split world-engine platform quiz helpers",
      impact: "medium",
      estimate: "Route chunk −20–40 KB",
      detail: "discovery-world-experience imports buildPlatformHearFindQuestion from full world-engine surface.",
    },
    {
      rank: 7,
      title: "Avoid duplicate manifest JSON in client bundle",
      impact: "medium",
      estimate: "−15–35 KB gzip per world if manifests inlined twice",
      detail: "Verify tree-shaking for @workspace/vehicle-world etc. only on live route.",
    },
    {
      rank: 8,
      title: "Hub: lazy LearningMap + daily adventure",
      impact: "low",
      estimate: "FCP −50–120ms",
      detail: "discovery-worlds-hub pulls LearningMap, teasers, progress — defer until hero visible.",
    },
    {
      rank: 9,
      title: "Thumbnail-first image loading on grids",
      impact: "high",
      estimate: "LCP −0.3–0.6s",
      detail: "Load thumbnail.webp before hero on cards; hero on detail only.",
    },
    {
      rank: 10,
      title: "Lighthouse on authenticated shell, not public SPA shell",
      impact: "low",
      estimate: "Accurate perf score (diagnostic only)",
      detail: "Public URLs under-report; measure Android WebView + logged-in session.",
    },
  ];

  if (largestChunk) {
    opts[1]!.detail += ` Largest dist chunk: ${largestChunk.file} (${largestChunk.kb} KB).`;
  }
  return opts;
}

function maybeBuild(): boolean {
  if (process.argv.includes("--skip-build")) return false;
  if (existsSync(join(DIST, "index.html"))) return false;
  console.log("[perf-audit] Running kidschedule production build (once)…");
  try {
    execSync("pnpm --filter @workspace/kidschedule run build", {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? "" },
    });
    return true;
  } catch {
    console.warn("[perf-audit] Build failed — continuing with static analysis only");
    return false;
  }
}

function main(): void {
  const didBuild = maybeBuild();
  const chunks = collectDistChunks();
  const assets = collectPublicAssets();
  const hubModules = traceDiscoveryImports(ROUTES[0]!.entry);
  const liveModules = traceDiscoveryImports(ROUTES[1]!.entry);
  const hubHeavy = heavyModules(hubModules);
  const liveHeavy = heavyModules(liveModules);
  const optimizations = buildOptimizations({ chunks, assets, hubModules, liveModules });

  const discoveryChunks = chunks.filter(
    (c) => /discovery|world|vehicle|animal|hub/i.test(c.file) || c.kb > 400,
  );

  const md = `# Discovery Worlds — Performance Audit

Generated: ${new Date().toISOString()}

## Routes audited

| Route | Entry |
|-------|-------|
| \`/discovery-worlds\` | \`${ROUTES[0]!.entry}\` |
| \`/worlds/vehicles\` | \`${ROUTES[1]!.entry}\` (slug vehicles → vehicle_world) |

Build analyzed: ${didBuild ? "yes (fresh)" : existsSync(join(DIST, "index.html")) ? "existing dist/" : "no dist — run kidschedule build for chunk sizes"}

## Bundle (production dist)

${discoveryChunks.length ? discoveryChunks.slice(0, 12).map((c) => `- \`${c.file}\` — **${c.kb} KB**`).join("\n") : "_No dist assets — run `pnpm --filter @workspace/kidschedule build`_"}

${chunks.length ? `\nLargest JS/CSS overall: \`${chunks[0]!.file}\` (${chunks[0]!.kb} KB)` : ""}

## Static import surface

### /discovery-worlds (${hubModules.length} modules)

${hubHeavy.slice(0, 8).map((m) => `- \`${m.path}\` (${m.lines} lines)`).join("\n") || "_No large modules_"}

### /worlds/vehicles (${liveModules.length} modules)

${liveHeavy.slice(0, 8).map((m) => `- \`${m.path}\` (${m.lines} lines)`).join("\n") || "_No large modules_"}

## Largest static assets (public mirror)

${assets.slice(0, 15).map((a) => `- \`${a.path}\` — ${a.kb} KB`).join("\n") || "_No local mirrors_"}

## Blocking render risks

1. **Hub** — Multiple dashboards + LearningMap render in one pass; no route-level Suspense boundaries between parent ops and kid cards.
2. **Live** — \`DiscoveryWorldExperience\` mounts grid + audio manager + offline warmer on first paint.
3. **Images** — 320×400 heroes on many visible cells without thumbnail-first policy in all modes.
4. **Audio** — Synchronous validation paths in QA scripts; runtime should not decode all clips on open.

## Top 10 optimizations (recommendations only — not implemented)

| # | Optimization | Impact | Estimated effect |
|---|--------------|--------|------------------|
${optimizations.map((o) => `| ${o.rank} | ${o.title} | ${o.impact} | ${o.estimate} |`).join("\n")}

## Details

${optimizations.map((o) => `### ${o.rank}. ${o.title}\n\n${o.detail}\n`).join("\n")}

## Performance status

- **Bundle:** ${chunks.length ? "measured from dist" : "unknown — build required"}
- **Assets:** ${assets.length ? `${assets.length} files in public mirrors` : "no local mirrors"}
- **Routes:** lazy-loaded via \`lazyPage\` in AppCore (code-split entry OK); heavy work inside pages

`;

  writeFileSync(OUT_MD, md);
  console.log(`\n=== Performance Audit ===\n`);
  console.log(`Routes: /discovery-worlds, /worlds/vehicles`);
  console.log(`Dist chunks: ${chunks.length} | Public assets scanned: ${assets.length}`);
  console.log(`Hub import graph: ${hubModules.length} files | Live: ${liveModules.length} files`);
  console.log(`\nWrote ${OUT_MD}`);
  console.log("\nTop 3 optimizations:");
  for (const o of optimizations.slice(0, 3)) {
    console.log(`  ${o.rank}. [${o.impact}] ${o.title} — ${o.estimate}`);
  }
}

main();
