import type {
  DiagnosticReport,
  OperationsExportResult,
} from "../../types/operations.js";

export function exportDiagnosticReport(
  report: DiagnosticReport,
  format: "json" | "yaml" | "ops-report-v1" = "json",
): OperationsExportResult {
  switch (format) {
    case "json":
      return {
        format: "json",
        content: `${stableStringify(report)}\n`,
        contentType: "application/json",
      };
    case "yaml":
      return {
        format: "yaml",
        content: `${toYaml(report)}\n`,
        contentType: "application/yaml",
      };
    case "ops-report-v1":
      return {
        format: "ops-report-v1",
        content: `${stableStringify({
          format: "ops-report-v1",
          version: report.version,
          environment: report.environment,
          health: report.health,
          metrics: report.metrics,
          telemetry: report.telemetry,
          secretsOk: report.secrets.ok,
          generatedAt: report.generatedAt,
        })}\n`,
        contentType: "application/vnd.amynest.ops-report.v1+json",
      };
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unsupported ops export format: ${_exhaustive}`);
    }
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeys(obj[key]);
    }
    return sorted;
  }
  return value;
}

function toYaml(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          const nested = toYaml(item, indent + 1);
          return `${pad}- ${nested.replace(/^\s+/, "")}`;
        }
        return `${pad}- ${toYaml(item, 0)}`;
      })
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, nested]) => {
        if (nested && typeof nested === "object") {
          return `${pad}${key}:\n${toYaml(nested, indent + 1)}`;
        }
        return `${pad}${key}: ${toYaml(nested, 0)}`;
      })
      .join("\n");
  }
  return String(value);
}
