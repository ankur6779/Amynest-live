/**
 * Developer debug panel for current worksheet editor state.
 * Shown when ?layoutDebug=1 or ?editorSyncAudit=1 (or layoutDebug toggle).
 */
import { useEffect, useMemo } from "react";
import {
  fingerprintDocument,
  WORKSHEET_GENERATOR_VERSION,
  WORKSHEET_LAYOUT_VERSION,
  WORKSHEET_SCHEMA_VERSION,
  type WorksheetDocument,
} from "@workspace/worksheet-studio";
import { getEditorSyncAudit } from "./editor-state-sync-audit";

export type WorksheetOrigin = "ai" | "local" | "unknown";

const ORIGIN_KEY = "amynest_worksheet_last_origin";

export function setWorksheetDebugOrigin(origin: WorksheetOrigin) {
  try {
    sessionStorage.setItem(ORIGIN_KEY, origin);
  } catch { /* */ }
}

export function getWorksheetDebugOrigin(): WorksheetOrigin {
  try {
    const v = sessionStorage.getItem(ORIGIN_KEY);
    if (v === "ai" || v === "local") return v;
  } catch { /* */ }
  return "unknown";
}

type Props = {
  document: WorksheetDocument;
  pageIndex: number;
  zoom: number;
  viewportWidth: number;
  isDraft: boolean;
  visible: boolean;
};

type Row = { label: string; value: string };

export function WorksheetDebugPanel({
  document,
  pageIndex,
  zoom,
  viewportWidth,
  isDraft,
  visible,
}: Props) {
  const rows = useMemo((): Row[] => {
    const fp = fingerprintDocument(document);
    const audit = getEditorSyncAudit();
    const origin = getWorksheetDebugOrigin();
    const q = document.pages.reduce(
      (n, p) => n + p.elements.filter((e) => e.type === "question_block").length,
      0,
    );
    return [
      { label: "Document ID", value: document.id },
      { label: "Schema Version", value: String(WORKSHEET_SCHEMA_VERSION) },
      { label: "Generator Version", value: WORKSHEET_GENERATOR_VERSION },
      { label: "Layout Version", value: String(WORKSHEET_LAYOUT_VERSION) },
      { label: "Draft?", value: isDraft ? "YES" : "NO" },
      { label: "AI / Local", value: origin === "unknown" ? "—" : origin.toUpperCase() },
      { label: "Questions", value: String(q) },
      { label: "Pages", value: String(document.pages.length) },
      { label: "Geometry Hash", value: fp.geometryHash },
      {
        label: "Render Count",
        value: String(audit?.canvasRenderCount ?? "—"),
      },
      { label: "Current Page", value: `${pageIndex + 1} / ${document.pages.length}` },
      { label: "Zoom", value: `${Math.round(zoom * 100)}%` },
      { label: "Viewport", value: `${Math.round(viewportWidth)}px` },
    ];
  }, [document, pageIndex, zoom, viewportWidth, isDraft]);

  useEffect(() => {
    if (!visible) return;
    console.groupCollapsed(
      `%c[WorksheetDebug]%c Current Worksheet · ${document.meta.topic || document.id}`,
      "color:#1e3a5f;font-weight:bold",
      "color:inherit;font-weight:normal",
    );
    console.table(
      Object.fromEntries(rows.map((r) => [r.label, r.value])),
    );
    console.groupEnd();
  }, [visible, rows, document.id, document.meta.topic, document.version, pageIndex, zoom]);

  if (!visible) return null;

  return (
    <aside
      className="pointer-events-auto absolute right-2 top-2 z-30 w-[min(100%-1rem,16.5rem)] rounded-lg border border-slate-700/80 bg-black/85 p-2.5 shadow-lg backdrop-blur-sm"
      aria-label="Worksheet debug panel"
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
        Current Worksheet
      </p>
      <dl className="space-y-1 font-mono text-[10px] leading-snug text-white">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2">
            <dt className="w-[7.25rem] shrink-0 text-slate-400">{r.label}</dt>
            <dd className="min-w-0 break-all text-right text-slate-100">{r.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
