import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WORKSHEET_TEMPLATE_CATALOG, searchTemplates, type WorksheetTemplate } from "@workspace/worksheet-studio";
import { WS_CHIP, WS_GLASS_CARD, WS_SECTION_LABEL } from "./worksheet-studio-theme";
import { hapticWorksheetTap } from "./worksheet-haptics";

type Props = { onSelect: (template: WorksheetTemplate) => void };

export function WorksheetTemplates({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const templates = useMemo(() => (query ? searchTemplates(query) : WORKSHEET_TEMPLATE_CATALOG), [query]);
  const shown = templates.slice(0, 24);

  return (
    <section className={cn(WS_GLASS_CARD, "space-y-3 p-4")} aria-label="Worksheet templates">
      <div className="flex items-center justify-between gap-2">
        <p className={WS_SECTION_LABEL}>{WORKSHEET_TEMPLATE_CATALOG.length}+ templates</p>
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tracing, math, animals…"
        className="h-11 rounded-xl touch-manipulation"
        aria-label="Search templates"
      />
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!query && shown.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">No templates available</p>
        )}
        {query && shown.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">No templates match &ldquo;{query}&rdquo;</p>
        )}
        {shown.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={`Template: ${t.name}`}
            onClick={() => { void hapticWorksheetTap(); onSelect(t); }}
            className={cn(WS_CHIP, "flex h-14 min-w-[5.5rem] shrink-0 flex-col items-center justify-center gap-0.5 px-3")}
          >
            <span className="text-lg" aria-hidden>{t.emoji}</span>
            <span className="max-w-[5rem] truncate text-[11px] font-semibold">{t.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
