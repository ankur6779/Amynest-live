import { cn } from "@/lib/utils";
import { scoreLivePrompt, starsLabel, type LivePromptQuality, type PromptQualityInput } from "@workspace/worksheet-studio";
import { Check, Sparkles } from "lucide-react";
import { WS_GLASS_CARD, WS_SECTION_LABEL, WS_MUTED_TEXT } from "./worksheet-studio-theme";

type Props = {
  input: PromptQualityInput;
};

export function PromptQualityMeter({ input }: Props) {
  const quality: LivePromptQuality = scoreLivePrompt(input);

  return (
    <div className={cn(WS_GLASS_CARD, "w-full min-w-0 space-y-3 p-4")}>
      <div className="flex items-center justify-between gap-2">
        <p className={WS_SECTION_LABEL}>Prompt Quality</p>
        <span className="text-sm font-bold text-[#c9a227]">{quality.scorePercent}% est.</span>
      </div>
      <p className="text-lg font-semibold text-[#1e3a5f]">
        <span className="text-[#c9a227]">{starsLabel(quality.stars)}</span>{" "}
        {quality.label}
      </p>
      <div className="flex flex-wrap gap-2">
        {quality.included.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded-full bg-[#1e3a5f]/8 px-2.5 py-1 text-xs font-medium text-[#1e3a5f]">
            <Check className="h-3 w-3 text-emerald-600" /> {item}
          </span>
        ))}
      </div>
      {quality.suggestions.length > 0 && (
        <div className="space-y-1.5 border-t border-[#d4cfc4]/40 pt-3">
          <p className={cn("text-xs font-semibold", WS_MUTED_TEXT)}>Suggestions</p>
          {quality.suggestions.map((s) => (
            <p key={s} className="flex items-center gap-1.5 text-xs text-[#1e3a5f]">
              <Sparkles className="h-3 w-3 shrink-0 text-[#c9a227]" /> {s}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
