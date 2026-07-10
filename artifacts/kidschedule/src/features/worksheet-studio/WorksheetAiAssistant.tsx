import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { WorksheetImproveAction } from "@workspace/worksheet-studio";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { WS_FAB, WS_SHEET } from "./worksheet-studio-theme";
import { hapticWorksheetTap } from "./worksheet-haptics";

const QUICK: { id: WorksheetImproveAction; label: string }[] = [
  { id: "easier", label: "Easier" },
  { id: "more_writing", label: "+ Writing" },
  { id: "homework_mode", label: "Homework" },
  { id: "assessment_mode", label: "Assessment" },
  { id: "low_ink", label: "Low Ink" },
  { id: "answer_key", label: "Answer Key" },
];

type Props = {
  onAction: (action: WorksheetImproveAction) => void;
  onCopilotMessage: (message: string) => Promise<void>;
  busy: boolean;
};

export function WorksheetAiAssistant({ onAction, onCopilotMessage, busy }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const send = () => {
    const m = message.trim();
    if (!m) return;
    void hapticWorksheetTap();
    void onCopilotMessage(m).then(() => setMessage(""));
    setOpen(false);
  };

  return (
    <>
      <button type="button" aria-label="AI copilot" className={WS_FAB} onClick={() => setOpen(true)}>
        <Sparkles className="h-6 w-6" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className={cn(WS_SHEET, "rounded-t-3xl")}>
          <SheetHeader className="flex-row items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-left">
              <Sparkles className="h-5 w-5 text-[#c9a227]" /> AI Copilot
            </SheetTitle>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>
          <div className="mt-3 flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='e.g. "Add writing practice" or "Make for homework"'
              className="h-12 flex-1 rounded-xl touch-manipulation"
              onKeyDown={(e) => e.key === "Enter" && send()}
              aria-label="Copilot command"
            />
            <Button className="h-12 w-12 shrink-0 rounded-xl" disabled={busy} onClick={send} aria-label="Send">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK.map(({ id, label }) => (
              <Button key={id} size="sm" variant="outline" disabled={busy} className="h-10 rounded-full touch-manipulation" onClick={() => { onAction(id); setOpen(false); }}>
                {label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
