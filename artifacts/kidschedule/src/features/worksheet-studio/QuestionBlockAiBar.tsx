import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  questionNumber: number | null;
  busy: boolean;
  onAction: (message: string) => void;
  onClose: () => void;
};

const ACTIONS: { label: string; message: (n: number) => string }[] = [
  { label: "Improve", message: (n) => `Improve Question ${n}` },
  { label: "Simplify", message: (n) => `Make Question ${n} easier` },
  { label: "Translate", message: (n) => `Translate Question ${n} to Hindi` },
  { label: "Duplicate", message: (n) => `Add 1 more questions like Question ${n}` },
  { label: "Convert", message: (n) => `Convert Question ${n} to tracing` },
  { label: "Replace Image", message: () => "Replace emojis with printable black-outline illustrations" },
  { label: "Delete", message: (n) => `Remove Question ${n}` },
];

export function QuestionBlockAiBar({ questionNumber, busy, onAction, onClose }: Props) {
  if (questionNumber == null) return null;
  return (
    <div
      className={cn(
        "absolute left-1/2 top-2 z-20 flex max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-1",
        "rounded-2xl border border-[#d4cfc4]/70 bg-white/95 px-2 py-1.5 shadow-md",
      )}
      role="toolbar"
      aria-label={`AI actions for Question ${questionNumber}`}
    >
      <span className="px-1 text-[10px] font-bold uppercase tracking-wide text-[#1e3a5f]">Q{questionNumber}</span>
      {ACTIONS.map((a) => (
        <Button
          key={a.label}
          size="sm"
          variant="ghost"
          disabled={busy}
          className="h-8 rounded-full px-2 text-xs touch-manipulation"
          onClick={() => onAction(a.message(questionNumber))}
        >
          {a.label}
        </Button>
      ))}
      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={onClose} aria-label="Dismiss">
        ✕
      </Button>
    </div>
  );
}
