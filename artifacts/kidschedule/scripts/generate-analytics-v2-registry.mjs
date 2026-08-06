#!/usr/bin/env node
/**
 * Machine SoT: docs/v2/ANALYTICS_EVENT_REGISTRY.json
 * Generates: src/lib/analytics/v2-core/registry/events.ts
 *
 * Usage:
 *   node scripts/generate-analytics-v2-registry.mjs           # write
 *   node scripts/generate-analytics-v2-registry.mjs --check   # fail on drift
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const kidscheduleRoot = resolve(__dirname, "..");
const repoRoot = resolve(kidscheduleRoot, "../..");
const jsonPath = join(repoRoot, "docs/v2/ANALYTICS_EVENT_REGISTRY.json");
const mdPath = join(repoRoot, "docs/v2/ANALYTICS_EVENT_REGISTRY.md");
const outPath = join(
  kidscheduleRoot,
  "src/lib/analytics/v2-core/registry/events.ts",
);

const checkOnly = process.argv.includes("--check");

function fail(msg) {
  console.error(`[analytics-v2-registry] ${msg}`);
  process.exit(1);
}

function loadRegistry() {
  let raw;
  try {
    raw = readFileSync(jsonPath, "utf8");
  } catch {
    fail(`missing machine SoT: ${jsonPath}`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    fail(`invalid JSON: ${e.message}`);
  }
  if (!Array.isArray(data.events) || data.events.length === 0) {
    fail("events[] must be a non-empty array");
  }
  const names = new Set();
  let optimizeCount = 0;
  for (const e of data.events) {
    if (!e.eventName || typeof e.eventName !== "string") {
      fail("every event needs eventName");
    }
    if (names.has(e.eventName)) fail(`duplicate eventName: ${e.eventName}`);
    names.add(e.eventName);
    if (e.canOptimize) optimizeCount += 1;
    if (!e.onceKeyTemplate) fail(`${e.eventName}: onceKeyTemplate required`);
    if (!e.owner) fail(`${e.eventName}: owner required`);
    if (!e.layer) fail(`${e.eventName}: layer required`);
  }
  if (optimizeCount !== 1) {
    fail(`exactly one canOptimize:true required (found ${optimizeCount})`);
  }
  const opt = data.events.find((e) => e.canOptimize);
  if (opt?.eventName !== "ads_purchase") {
    fail(`sole optimize event must be ads_purchase (found ${opt?.eventName})`);
  }
  return data;
}

/** Registry index table in the human MD — names must match JSON order. */
function assertMarkdownIndexMatches(eventNames) {
  let md;
  try {
    md = readFileSync(mdPath, "utf8");
  } catch {
    fail(`missing human registry: ${mdPath}`);
  }
  const marker = "## 1.4 Registry index";
  const start = md.indexOf(marker);
  if (start < 0) fail("MD missing ## 1.4 Registry index");
  const rest = md.slice(start);
  const nextHeading = rest.search(/\n## /);
  const section = nextHeading > 0 ? rest.slice(0, nextHeading) : rest;
  const mdNames = [];
  for (const line of section.split("\n")) {
    const m = line.match(/^\|\s*`([a-z][a-z0-9_]{0,39})`\s*\|/);
    if (m) mdNames.push(m[1]);
  }
  if (mdNames.length === 0) fail("MD registry index has no event names");
  const a = JSON.stringify(mdNames);
  const b = JSON.stringify(eventNames);
  if (a !== b) {
    fail(
      `MD §1.4 index names drift vs JSON.\n  MD:   ${a}\n  JSON: ${b}\nUpdate both, or update JSON then align the MD index table.`,
    );
  }
}

function tsString(s) {
  return JSON.stringify(s);
}

function renderEventsTs(data) {
  const defs = data.events
    .map((e) => {
      const keys = e.requiredPayloadKeys
        .map((k) => tsString(k))
        .join(", ");
      return `  def({
    eventName: ${tsString(e.eventName)},
    description:
      ${tsString(e.description)},
    owner: ${tsString(e.owner)},
    layer: ${tsString(e.layer)},
    status: ${tsString(e.status)},
    eventVersion: ${e.eventVersion},
    onceKeyTemplate: ${tsString(e.onceKeyTemplate)},
    requiredPayloadKeys: [${keys}],
    firebase: ${e.firebase},
    googleAds: ${e.googleAds},
    internal: ${e.internal},
    canOptimize: ${e.canOptimize},
  }),`;
    })
    .join("\n");

  return `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Machine source of truth:
 *   docs/v2/ANALYTICS_EVENT_REGISTRY.json
 *
 * Regenerate:
 *   pnpm --filter @workspace/kidschedule generate:analytics-v2-registry
 *
 * Check drift:
 *   pnpm --filter @workspace/kidschedule check:analytics-v2-registry
 */

import type { V2RegistryEventDefinition } from "../types";

function def(
  partial: V2RegistryEventDefinition,
): V2RegistryEventDefinition {
  return partial;
}

/** Active (+ allowed) registry events — unknown names FAIL. */
export const V2_ANALYTICS_REGISTRY: readonly V2RegistryEventDefinition[] = [
${defs}
] as const;

const BY_NAME = new Map(
  V2_ANALYTICS_REGISTRY.map((e) => [e.eventName, e] as const),
);

export function getRegistryEvent(
  eventName: string,
): V2RegistryEventDefinition | undefined {
  return BY_NAME.get(eventName);
}

export function listRegistryEventNames(): readonly string[] {
  return V2_ANALYTICS_REGISTRY.map((e) => e.eventName);
}

/** Exactly one event may be Ads-optimizable. */
export function assertOptimizeCardinality(): void {
  const opts = V2_ANALYTICS_REGISTRY.filter((e) => e.canOptimize);
  if (opts.length !== 1 || opts[0]?.eventName !== "ads_purchase") {
    throw new Error(
      \`Registry optimize cardinality invalid: \${opts.map((e) => e.eventName).join(",")}\`,
    );
  }
}
`;
}

const data = loadRegistry();
const eventNames = data.events.map((e) => e.eventName);
assertMarkdownIndexMatches(eventNames);
const next = renderEventsTs(data);

if (checkOnly) {
  let current = "";
  try {
    current = readFileSync(outPath, "utf8");
  } catch {
    fail(`generated file missing: ${outPath} (run generate:analytics-v2-registry)`);
  }
  if (current !== next) {
    fail(
      "events.ts is out of date vs ANALYTICS_EVENT_REGISTRY.json — run generate:analytics-v2-registry",
    );
  }
  console.log(
    `[analytics-v2-registry] OK — ${eventNames.length} events; JSON ↔ events.ts ↔ MD index`,
  );
  process.exit(0);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, next, "utf8");
console.log(
  `[analytics-v2-registry] wrote ${outPath} (${eventNames.length} events)`,
);
