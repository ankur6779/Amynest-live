import type {
  AnalyticsExportFormat,
  AnalyticsExportResult,
  AnalyticsReport,
} from "../../types/analytics.js";

export function exportAnalyticsReport(
  report: AnalyticsReport,
  format: AnalyticsExportFormat = "json",
): AnalyticsExportResult {
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
    case "analytics-report-v1":
      return {
        format: "analytics-report-v1",
        content: `${stableStringify({
          format: "analytics-report-v1",
          id: report.id,
          version: report.version,
          schedule: report.schedule,
          channelSummary: report.channelSummary,
          topicScores: report.topicScores,
          recommendations: report.recommendations,
          telemetry: report.telemetry,
        })}\n`,
        contentType: "application/vnd.amynest.analytics-report.v1+json",
      };
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unsupported analytics export format: ${_exhaustive}`);
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

export function toYaml(value: unknown): string {
  return emit(sortKeys(value), 0);
}

function emit(value: unknown, indent: number): string {
  const pad = "  ".repeat(indent);
  if (value === null || value === undefined) return `${pad}null`;
  if (typeof value === "string") return `${pad}${yamlString(value)}`;
  if (typeof value === "number" || typeof value === "boolean") {
    return `${pad}${String(value)}`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          const body = emit(item, indent + 1);
          const lines = body.split("\n");
          const first = lines[0]!.replace(/^\s+/, "");
          const rest = lines.slice(1).join("\n");
          return rest ? `${pad}- ${first}\n${rest}` : `${pad}- ${first}`;
        }
        return `${pad}- ${formatInline(item)}`;
      })
      .join("\n");
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return `${pad}{}`;
  return keys
    .map((key) => {
      const child = obj[key];
      if (child && typeof child === "object") {
        const nested = emit(child, indent + 1);
        if (nested.trim() === "[]" || nested.trim() === "{}") {
          return `${pad}${key}: ${nested.trim()}`;
        }
        return `${pad}${key}:\n${nested}`;
      }
      return `${pad}${key}: ${formatInline(child)}`;
    })
    .join("\n");
}

function formatInline(value: unknown): string {
  if (typeof value === "string") return yamlString(value);
  if (value === null || value === undefined) return "null";
  return String(value);
}

function yamlString(value: string): string {
  if (value === "") return '""';
  if (/[:#\n\r\t]|^\s|\s$|^(true|false|null)$/i.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}
