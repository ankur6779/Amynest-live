import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { WorksheetImproveAction } from "@workspace/worksheet-studio";
import { Loader2, Printer, Send, Sparkles, X } from "lucide-react";
import { WS_FAB, WS_SHEET } from "./worksheet-studio-theme";
import { hapticWorksheetTap } from "./worksheet-haptics";

const QUICK: { id?: WorksheetImproveAction; label: string; message?: string }[] = [
  { message: "Optimize for printing", label: "Print Optimize" },
  { message: "Replace emojis with printable black-outline illustrations", label: "Line Art" },
  { message: "Reduce spacing", label: "Tighten" },
  { message: "Make images bigger", label: "Bigger Images" },
  { id: "more_writing", label: "+ Writing" },
  { id: "handwriting_practice", label: "Handwriting" },
  { id: "translate_hindi", label: "Hindi" },
  { id: "easier", label: "Easier" },
  { id: "homework_mode", label: "Homework" },
  { id: "to_bw", label: "B&W Print" },
  { id: "low_ink", label: "Low Ink" },
  { id: "answer_key", label: "Answer Key" },
];

type Props = {
  onAction: (action: WorksheetImproveAction) => void;
  onCopilotMessage: (message: string) => Promise<void>;
  busy: boolean;
  /** Desktop: dock panel open by default beside canvas */
  docked?: boolean;
};

export function WorksheetAiAssistant({ onAction, onCopilotMessage, busy, docked = false }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const send = (text?: string) => {
    const m = (text ?? message).trim();
    if (!m) return;
    void hapticWorksheetTap();
    void onCopilotMessage(m).then(() => setMessage(""));
    if (!docked) setOpen(false);
  };

  const panel = (
    <div className={cn("flex flex-col gap-3", docked && "h-full border-l border-[#d4cfc4]/60 bg-white/95 p-4")}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-[#1e3a5f]">
          <Sparkles className="h-4 w-4 text-[#c9a227]" /> AI Edit
        </p>
        {!docked && (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setOpen(false)} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Edit with natural language — changes preview as Current → Proposed before applying.
      </p>
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder='e.g. "Replace cat with elephant"'
          className="h-11 flex-1 rounded-xl touch-manipulation"
          onKeyDown={(e) => e.key === "Enter" && send()}
          aria-label="AI edit command"
        />
        <Button className="h-11 w-11 shrink-0 rounded-xl" disabled={busy} onClick={() => send()} aria-label="Send">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK.map((item) => (
          <Button
            key={item.label}
            size="sm"
            variant="outline"
            disabled={busy}
            className="h-9 rounded-full touch-manipulation text-xs"
            onClick={() => {
              if (item.message) send(item.message);
              else if (item.id) {
                onAction(item.id);
                if (!docked) setOpen(false);
              }
            }}
          >
            {item.label === "Print Optimize" ? <Printer className="mr-1 h-3.5 w-3.5" /> : null}
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );

  if (docked) {
    return (
      <aside className="hidden w-[min(22rem,32vw)] shrink-0 lg:flex lg:flex-col" aria-label="AI Edit panel">
        {panel}
      </aside>
    );
  }

  return (
    <>
      <button type="button" aria-label="AI Edit" className={cn(WS_FAB, "lg:hidden")} onClick={() => setOpen(true)}>
        <Sparkles className="h-6 w-6" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className={cn(WS_SHEET, "rounded-t-3xl lg:hidden")}>
          <SheetHeader className="sr-only">
            <SheetTitle>AI Edit</SheetTitle>
          </SheetHeader>
          {panel}
        </SheetContent>
      </Sheet>
    </>
  );
}
