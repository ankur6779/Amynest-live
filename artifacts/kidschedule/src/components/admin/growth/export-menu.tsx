import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GrowthDashboardData } from "./types";
import { KPI_LABELS } from "./types";

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildExportRows(data: GrowthDashboardData): string[][] {
  const rows: string[][] = [
    ["AmyNest Growth Intelligence Export"],
    ["Generated", data.generatedAt],
    ["Window", data.timeRange.label],
    [],
    ["KPI", "Value", "Previous", "Change %"],
  ];
  for (const [key, label] of Object.entries(KPI_LABELS)) {
    const k = data.kpis[key];
    if (!k) continue;
    rows.push([
      label,
      k.value != null ? String(k.value) : "",
      k.previous != null ? String(k.previous) : "",
      k.changePct != null ? String(k.changePct) : "",
    ]);
  }
  rows.push([], ["Funnel", "Users", "Conversion %", "Drop %"]);
  for (const stage of data.funnel) {
    rows.push([
      stage.label,
      String(stage.users),
      stage.conversionPct != null ? String(stage.conversionPct) : "",
      stage.dropPct != null ? String(stage.dropPct) : "",
    ]);
  }
  return rows;
}

export function ExportMenu({ data }: { data: GrowthDashboardData }) {
  const stamp = new Date().toISOString().slice(0, 10);

  const exportCsv = () => {
    const csv = "\uFEFF" + toCsv(buildExportRows(data));
    downloadBlob(csv, `amynest-growth-${stamp}.csv`, "text/csv;charset=utf-8");
  };

  const exportExcel = () => {
    const csv = "\uFEFF" + toCsv(buildExportRows(data));
    downloadBlob(
      csv,
      `amynest-growth-${stamp}.xls`,
      "application/vnd.ms-excel;charset=utf-8",
    );
  };

  const exportPdf = () => {
    window.print();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCsv} className="gap-2">
          <FileText className="h-4 w-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPdf} className="gap-2">
          <FileText className="h-4 w-4" /> PDF (Print)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
