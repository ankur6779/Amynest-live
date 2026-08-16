import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmyNestLeaveContinuity } from "@/components/amy-nest-leave-continuity";
import {
  type AmyAiConversation,
  searchConversations,
} from "@/lib/ask-amy/conversation-sessions";
import { groupConversationsByDay } from "@/lib/ask-amy/conversation-title";
import { cn } from "@/lib/utils";

export function AmyAiHistoryPanel({
  conversations,
  activeId,
  onNewChat,
  onSelect,
  onDelete,
  onRename,
  onClose,
}: {
  conversations: AmyAiConversation[];
  activeId: string | null;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onClose?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(
    () => searchConversations(conversations, query),
    [conversations, query],
  );
  const groups = useMemo(() => groupConversationsByDay(filtered), [filtered]);

  return (
    <div className="amy-ai-history flex h-full min-h-0 flex-col" data-testid="amy-ai-history">
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <p className="text-sm font-semibold text-foreground">Chats</p>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label="Close history"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="space-y-2 px-3 py-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-start gap-2 rounded-xl border-[rgba(232,212,184,0.28)] bg-transparent"
          onClick={onNewChat}
          data-testid="amy-ai-new-chat"
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="h-11 rounded-xl pl-9"
            data-testid="amy-ai-history-search"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Conversations you start will live here.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="mb-3">
              <h2 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h2>
              <ul className="space-y-0.5">
                {group.items.map((c) => (
                  <li key={c.id}>
                    {renameId === c.id ? (
                      <form
                        className="flex items-center gap-1 px-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          onRename(c.id, renameDraft);
                          setRenameId(null);
                        }}
                      >
                        <Input
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          aria-label="Conversation title"
                          className="h-10"
                          autoFocus
                        />
                        <Button type="submit" size="icon" variant="ghost" className="h-10 w-10" aria-label="Save title">
                          <Check className="h-4 w-4" />
                        </Button>
                      </form>
                    ) : confirmId === c.id ? (
                      <div className="flex items-center gap-1 rounded-xl bg-muted/60 px-2 py-1.5">
                        <p className="min-w-0 flex-1 truncate text-xs">Delete this chat?</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="h-9"
                          onClick={() => {
                            onDelete(c.id);
                            setConfirmId(null);
                          }}
                        >
                          Delete
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-9" onClick={() => setConfirmId(null)}>
                          Keep
                        </Button>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "group flex items-center gap-1 rounded-xl px-1",
                          activeId === c.id && "bg-muted/70",
                        )}
                      >
                        <button
                          type="button"
                          className="min-h-11 min-w-0 flex-1 truncate px-2 py-2 text-left text-sm"
                          onClick={() => onSelect(c.id)}
                          data-testid={`amy-ai-history-item-${c.id}`}
                        >
                          {c.title}
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 opacity-70 group-hover:opacity-100"
                          aria-label="Rename conversation"
                          onClick={() => {
                            setRenameId(c.id);
                            setRenameDraft(c.title);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 opacity-70 group-hover:opacity-100"
                          aria-label="Delete conversation"
                          onClick={() => setConfirmId(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
      <div className="border-t border-border/50 p-3">
        <AmyNestLeaveContinuity />
      </div>
    </div>
  );
}
