import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WORKSHEET_TEMPLATE_CATALOG, searchTemplates, type WorksheetTemplate } from "@workspace/worksheet-studio";
import { WS_CHIP_GRID, WS_GLASS_CARD, WS_SECTION_LABEL, WS_MUTED_TEXT, WS_TOUCH } from "./worksheet-studio-theme";
import { hapticWorksheetTap } from "./worksheet-haptics";

type Props = { onSelect: (template: WorksheetTemplate) => void };

export function WorksheetTemplates({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const templates = useMemo(() => (query ? searchTemplates(query) : WORKSHEET_TEMPLATE_CATALOG), [query]);
  const shown = templates.slice(0, 24);

  return (
    <section className={cn(WS_GLASS_CARD, "w-full min-w-0 space-y-3 p-4")} aria-label="Worksheet templates">
      <div className="flex items-center justify-between gap-2">
        <p className={WS_SECTION_LABEL}>{WORKSHEET_TEMPLATE_CATALOG.length}+ templates</p>
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tracing, math, animals…"
        className="h-11 rounded-xl border-[#d4cfc4]/60 bg-white text-[#1e3a5f] placeholder:text-[#3d5a73]/75 touch-manipulation"
        aria-label="Search templates"
      />
      <div className={WS_CHIP_GRID}>
        {!query && shown.length === 0 && (
          <p className={cn("col-span-full py-4 text-sm", WS_MUTED_TEXT)}>No templates available</p>
        )}
        {query && shown.length === 0 && (
          <p className={cn("col-span-full py-4 text-sm", WS_MUTED_TEXT)}>No templates match &ldquo;{query}&rdquo;</p>
        )}
        {shown.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={`Template: ${t.name}`}
            onClick={() => { void hapticWorksheetTap(); onSelect(t); }}
            className={cn("flex h-14 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-[#d4cfc4]/80 bg-white px-2 text-sm font-semibold text-[#1e3a5f] shadow-sm touch-manipulation active:scale-[0.97]", WS_TOUCH)}
          >
            <span className="text-lg" aria-hidden>{t.emoji}</span>
            <span className="w-full truncate text-center text-[11px] font-semibold">{t.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
