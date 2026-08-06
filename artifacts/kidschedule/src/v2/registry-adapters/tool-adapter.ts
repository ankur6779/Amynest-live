/**
 * ToolRegistryAdapter — read-only translation.
 * Tool Registry catalog is not owned here (S0-T04 pending).
 * Default catalog is empty; inject entries for tests / future bind.
 */

import { freezeDeep } from "./freeze";
import {
  countIgnoredFields,
  KNOWN_TOOL_FIELDS,
  provenanceFor,
} from "./provenance";
import {
  AMY_REGISTRY_ADAPTER_VERSION,
  TOOL_REGISTRY_VERSION,
  type AdaptedTool,
  type ToolRegistrySnapshot,
  type ToolRegistrySourceEntry,
} from "./types";

/** Empty default — Tool Registry not shipped; adapters stay one-way ready. */
export const EMPTY_TOOL_REGISTRY_CATALOG: readonly ToolRegistrySourceEntry[] =
  Object.freeze([]);

const SUPPORTED_TOOL_VERSION_PREFIX = "tool.";

export type AdaptToolEntryResult = Readonly<{
  tool: AdaptedTool;
  ignoredFields: number;
}>;

/**
 * Adapt a single tool source entry.
 * Unknown fields ignored. Version mismatch → toolVersion "unknown" (still adapted).
 */
export function adaptToolEntry(
  raw: unknown,
  adaptedAt: string = new Date().toISOString(),
): AdaptToolEntryResult | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as ToolRegistrySourceEntry;
  if (typeof entry.id !== "string" || !entry.id) return null;

  const ignoredFields = countIgnoredFields(entry, KNOWN_TOOL_FIELDS);
  const toolVersion =
    typeof entry.toolVersion === "string" && entry.toolVersion.length > 0
      ? entry.toolVersion
      : "unknown";

  const capabilities = Array.isArray(entry.capabilities)
    ? entry.capabilities.filter((c): c is string => typeof c === "string")
    : [];
  if (
    toolVersion !== "unknown" &&
    !toolVersion.startsWith(SUPPORTED_TOOL_VERSION_PREFIX) &&
    !toolVersion.startsWith("amy_tool.")
  ) {
    capabilities.push("version_mismatch");
  }

  const requirements = Array.isArray(entry.requirements)
    ? entry.requirements.filter((c): c is string => typeof c === "string")
    : [];

  const provenance = provenanceFor("tool", adaptedAt);

  const tool = freezeDeep({
    toolId: entry.id,
    capabilities: Object.freeze([...capabilities]),
    canRun: typeof entry.canRun === "boolean" ? entry.canRun : false,
    requirements: Object.freeze([...requirements]),
    toolVersion,
    ...provenance,
    sourceRegistry: "tool" as const,
    registryVersion: TOOL_REGISTRY_VERSION,
  }) as AdaptedTool;

  return Object.freeze({ tool, ignoredFields });
}

export type AdaptToolRegistryOptions = Readonly<{
  now?: Date;
  /** Injectable catalog — defaults to empty (no Tool Registry ownership). */
  entries?: ReadonlyArray<unknown>;
}>;

/**
 * Adapt Tool Registry source → Brain-compatible snapshot.
 */
export function adaptToolRegistry(
  options: AdaptToolRegistryOptions = {},
): ToolRegistrySnapshot {
  const now = options.now ?? new Date();
  const adaptedAt = now.toISOString();
  const usingEmptyCatalog = options.entries == null;
  const source = options.entries ?? EMPTY_TOOL_REGISTRY_CATALOG;
  const tools: AdaptedTool[] = [];
  let ignoredFields = 0;

  for (const raw of source) {
    const result = adaptToolEntry(raw, adaptedAt);
    if (!result) continue;
    tools.push(result.tool);
    ignoredFields += result.ignoredFields;
  }

  return freezeDeep({
    adapterVersion: AMY_REGISTRY_ADAPTER_VERSION,
    registryVersion: TOOL_REGISTRY_VERSION,
    generatedAt: adaptedAt,
    tools: Object.freeze(tools),
    usingEmptyCatalog,
    ignoredFields,
  });
}
