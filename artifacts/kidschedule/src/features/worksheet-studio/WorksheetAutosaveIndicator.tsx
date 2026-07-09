import { formatDistanceToNow } from "date-fns";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "offline";

type Props = {
  state: SaveState;
  savedAt: string | null;
  onHistory?: () => void;
};

export function WorksheetAutosaveIndicator({ state, savedAt, onHistory }: Props) {
  const label =
    state === "saving" ? "Saving…"
    : state === "offline" ? "Offline — saved locally"
    : savedAt ? `Saved ${formatDistanceToNow(new Date(savedAt), { addSuffix: true })}`
    : "Auto-save on";

  const Icon = state === "saving" ? Loader2 : state === "offline" ? CloudOff : Cloud;

  return (
    <button
      type="button"
      onClick={onHistory}
      className={cn(
        "flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium",
        "text-muted-foreground transition-all duration-300 hover:bg-muted/60 touch-manipulation",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/40",
        state === "saved" && "text-emerald-700 animate-in fade-in duration-300",
        state === "saving" && "opacity-80",
      )}
      aria-label={label}
    >
      <Icon className={cn("h-3.5 w-3.5", state === "saving" && "animate-spin")} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
