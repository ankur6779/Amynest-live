import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { WorksheetDocument } from "@workspace/worksheet-studio";
import {
  listLibrary,
  searchLibrary,
  toggleFavorite,
  moveToTrash,
  restoreFromTrash,
  renameLibraryEntry,
  duplicateLibraryEntry,
  bulkDeleteLibrary,
  listFolders,
  type LibraryEntry,
  type LibraryFilter,
  type LibrarySort,
} from "@workspace/worksheet-studio/client";
import {
  Archive,
  Copy,
  FolderOpen,
  Heart,
  Pencil,
  Search,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDocument: (doc: WorksheetDocument) => void;
  onBulkExport?: (entries: LibraryEntry[]) => void;
  onOpenBranding?: () => void;
};

const FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recent" },
  { id: "archived", label: "Archive" },
  { id: "trash", label: "Trash" },
];

export function WorksheetLibrarySheet({ open, onOpenChange, onOpenDocument, onBulkExport, onOpenBranding }: Props) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [sort, setSort] = useState<LibrarySort>("updated");
  const [folder, setFolder] = useState<string | undefined>();
  const [folders, setFolders] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = query.trim()
        ? await searchLibrary(query)
        : await listLibrary({ filter, sort, folder });
      setEntries(rows);
      setFolders(await listFolders());
    } finally {
      setLoading(false);
    }
  }, [query, filter, sort, folder]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedEntries = useMemo(
    () => entries.filter((e) => selected.has(e.id)),
    [entries, selected],
  );

  const handleRename = async (entry: LibraryEntry) => {
    const title = window.prompt("Rename worksheet", entry.title);
    if (!title?.trim()) return;
    await renameLibraryEntry(entry.id, title.trim());
    void refresh();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] rounded-t-3xl pb-[max(env(safe-area-inset-bottom),1rem)]">
        <SheetHeader className="flex-row items-center justify-between gap-2">
          <SheetTitle className="text-left text-lg font-bold text-[#1e3a5f]">My Library</SheetTitle>
          {onOpenBranding && (
            <Button variant="ghost" size="sm" className="h-9 shrink-0 touch-manipulation" onClick={onOpenBranding}>
              <Settings2 className="mr-1 h-4 w-4" /> Branding
            </Button>
          )}
        </SheetHeader>

        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search worksheets…"
              className="h-11 rounded-xl pl-9 touch-manipulation"
            />
          </div>
          <select
            className="h-11 rounded-xl border bg-white px-2 text-sm touch-manipulation"
            value={sort}
            onChange={(e) => setSort(e.target.value as LibrarySort)}
            aria-label="Sort"
          >
            <option value="updated">Recent</option>
            <option value="title">Title</option>
            <option value="topic">Topic</option>
          </select>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium touch-manipulation",
                filter === f.id ? "bg-[#1e3a5f] text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {folders.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setFolder(undefined)} className={cn("rounded-full px-2.5 py-1 text-xs", !folder && "bg-[#c9a227]/20")}>All folders</button>
            {folders.map((f) => (
              <button key={f} type="button" onClick={() => setFolder(f)} className={cn("rounded-full px-2.5 py-1 text-xs touch-manipulation", folder === f && "bg-[#c9a227]/20")}>
                <FolderOpen className="mr-1 inline h-3 w-3" />{f}
              </button>
            ))}
          </div>
        )}

        {selected.size > 0 && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="touch-manipulation" onClick={() => void bulkDeleteLibrary([...selected]).then(() => { setSelected(new Set()); void refresh(); })}>
              Delete ({selected.size})
            </Button>
            {onBulkExport && (
              <Button size="sm" className="touch-manipulation" onClick={() => onBulkExport(selectedEntries)}>
                Export ({selected.size})
              </Button>
            )}
          </div>
        )}

        <div className="mt-4 max-h-[50dvh] space-y-2 overflow-y-auto">
          {loading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
          {!loading && entries.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No worksheets yet. Generate one to get started!</p>
          )}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-start gap-2 rounded-xl border bg-white/90 p-3 touch-manipulation",
                selected.has(entry.id) && "ring-2 ring-[#1e3a5f]",
              )}
            >
              <input
                type="checkbox"
                checked={selected.has(entry.id)}
                onChange={() => toggleSelect(entry.id)}
                className="mt-1 h-5 w-5 shrink-0"
                aria-label={`Select ${entry.title}`}
              />
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => { onOpenDocument(entry.document); onOpenChange(false); }}
              >
                <p className="truncate font-semibold text-[#1e3a5f]">{entry.title}</p>
                <p className="truncate text-xs text-muted-foreground">{entry.topic} · {entry.folder}</p>
              </button>
              <div className="flex shrink-0 gap-0.5">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => void toggleFavorite(entry.id).then(refresh)} aria-label="Favorite">
                  {entry.favorite ? <Heart className="h-4 w-4 fill-red-500 text-red-500" /> : <Star className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => void duplicateLibraryEntry(entry.id).then(refresh)} aria-label="Duplicate">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => void handleRename(entry)} aria-label="Rename">
                  <Pencil className="h-4 w-4" />
                </Button>
                {filter === "trash" ? (
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => void restoreFromTrash(entry.id).then(refresh)} aria-label="Restore">
                    <Archive className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => void moveToTrash(entry.id).then(refresh)} aria-label="Trash">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
