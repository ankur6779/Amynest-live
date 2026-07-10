import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  CLASS_LABELS,
  SUBJECT_LABELS,
  deletePromptHistory,
  duplicatePromptHistory,
  groupPromptHistory,
  listPromptHistory,
  searchPromptHistory,
  togglePromptFavorite,
  type PromptHistoryEntry,
} from "@workspace/worksheet-studio";
import { Clock, Copy, Heart, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WS_SHEET, WS_CHIP_ROW } from "./worksheet-studio-theme";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (entry: PromptHistoryEntry) => void;
};

type TabId = "recent" | "favorites" | "subject" | "class";

const TABS: { id: TabId; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "favorites", label: "Favorites" },
  { id: "subject", label: "By Subject" },
  { id: "class", label: "By Class" },
];

function EntryRow({
  entry,
  onRestore,
  onRefresh,
}: {
  entry: PromptHistoryEntry;
  onRestore: (e: PromptHistoryEntry) => void;
  onRefresh: () => void;
}) {
  return (
    <li className="rounded-xl border border-[#d4cfc4]/50 bg-white/80 p-3">
      <button
        type="button"
        className="w-full text-left"
        onClick={() => onRestore(entry)}
      >
        <p className="line-clamp-2 text-sm font-medium text-[#1e3a5f]">
          {entry.enhancedPrompt?.slice(0, 80) || entry.prompt}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {entry.classLevel.toUpperCase()} · {entry.subject} · {new Date(entry.createdAt).toLocaleDateString()}
        </p>
      </button>
      <div className="mt-2 flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          aria-label={entry.favorite ? "Unfavorite" : "Favorite"}
          onClick={() => { togglePromptFavorite(entry.id); onRefresh(); }}
        >
          <Heart className={cn("h-4 w-4", entry.favorite && "fill-red-500 text-red-500")} />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2" aria-label="Duplicate" onClick={() => { duplicatePromptHistory(entry.id); onRefresh(); }}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive" aria-label="Delete" onClick={() => { deletePromptHistory(entry.id); onRefresh(); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

export function PromptHistorySheet({ open, onOpenChange, onRestore }: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabId>("recent");
  const [tick, setTick] = useState(0);

  const grouped = useMemo(() => {
    void tick;
    const all = query.trim() ? searchPromptHistory(query) : listPromptHistory();
    return groupPromptHistory(all);
  }, [query, tick]);

  const refresh = () => setTick((t) => t + 1);

  const displayEntries = useMemo(() => {
    if (query.trim()) return searchPromptHistory(query);
    if (tab === "recent") return grouped.recent;
    if (tab === "favorites") return grouped.favorites;
    return [];
  }, [query, tab, grouped]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={WS_SHEET}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <Clock className="h-5 w-5" /> Prompt history
          </SheetTitle>
        </SheetHeader>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts…"
            className="pl-9"
            aria-label="Search prompt history"
          />
        </div>
        {!query.trim() && (
          <div className={cn(WS_CHIP_ROW, "mt-3")}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold touch-manipulation",
                  tab === t.id ? "bg-[#1e3a5f] text-white" : "bg-[#1e3a5f]/8 text-[#1e3a5f]",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <ul className="mt-4 max-h-[55dvh] space-y-2 overflow-y-auto pb-6">
          {query.trim() || tab === "recent" || tab === "favorites" ? (
            <>
              {displayEntries.length === 0 && (
                <li className="py-8 text-center text-sm text-muted-foreground">No saved prompts yet</li>
              )}
              {displayEntries.map((e) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  onRestore={(entry) => { onRestore(entry); onOpenChange(false); }}
                  onRefresh={refresh}
                />
              ))}
            </>
          ) : tab === "subject" ? (
            Object.entries(grouped.bySubject).map(([subject, entries]) => (
              <li key={subject}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60">
                  {SUBJECT_LABELS[subject as keyof typeof SUBJECT_LABELS] ?? subject}
                </p>
                <ul className="space-y-2">
                  {entries.slice(0, 5).map((e) => (
                    <EntryRow
                      key={e.id}
                      entry={e}
                      onRestore={(entry) => { onRestore(entry); onOpenChange(false); }}
                      onRefresh={refresh}
                    />
                  ))}
                </ul>
              </li>
            ))
          ) : (
            Object.entries(grouped.byClass).map(([cls, entries]) => (
              <li key={cls}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60">
                  {CLASS_LABELS[cls as keyof typeof CLASS_LABELS] ?? cls}
                </p>
                <ul className="space-y-2">
                  {entries.slice(0, 5).map((e) => (
                    <EntryRow
                      key={e.id}
                      entry={e}
                      onRestore={(entry) => { onRestore(entry); onOpenChange(false); }}
                      onRefresh={refresh}
                    />
                  ))}
                </ul>
              </li>
            ))
          )}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
