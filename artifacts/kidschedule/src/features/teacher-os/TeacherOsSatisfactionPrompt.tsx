import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Star, X } from "lucide-react";
import {
  markSatisfactionPromptShown,
  recordSatisfaction,
  shouldShowSatisfactionPrompt,
} from "@workspace/teacher-os";
import { WS_GLASS_CARD, WS_MUTED_TEXT } from "@/features/worksheet-studio/worksheet-studio-theme";

type Props = {
  context: string;
  onDismiss: () => void;
};

export function TeacherOsSatisfactionPrompt({ context, onDismiss }: Props) {
  const [stars, setStars] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [comment, setComment] = useState("");

  if (!shouldShowSatisfactionPrompt(context)) return null;

  const submit = () => {
    if (stars < 1) return;
    recordSatisfaction(stars as 1 | 2 | 3 | 4 | 5, context, comment);
    markSatisfactionPromptShown();
    onDismiss();
  };

  return (
    <div className="fixed bottom-24 left-3 right-3 z-40 mx-auto max-w-lg">
      <div className={cn(WS_GLASS_CARD, "relative p-4 shadow-lg")}>
        <button type="button" aria-label="Dismiss" className="absolute right-2 top-2 p-1 text-[#1e3a5f]/40" onClick={() => { markSatisfactionPromptShown(); onDismiss(); }}>
          <X className="h-4 w-4" />
        </button>
        <p className="pr-6 text-sm font-medium text-[#1e3a5f]">Was this worksheet useful?</p>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setStars(n as 1 | 2 | 3 | 4 | 5)}>
              <Star className={cn("h-7 w-7", n <= stars ? "fill-[#c9a227] text-[#c9a227]" : "text-[#1e3a5f]/20")} />
            </button>
          ))}
        </div>
        {stars > 0 && (
          <>
            <input
              className="mt-2 w-full rounded-lg border px-2 py-1.5 text-xs"
              placeholder="Optional comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button size="sm" className="mt-2 w-full" onClick={submit}>Submit</Button>
          </>
        )}
        <p className={cn("mt-1 text-[10px]", WS_MUTED_TEXT)}>Helps us improve for your classroom</p>
      </div>
    </div>
  );
}
