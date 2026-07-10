import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CLASS_LABELS, SUBJECT_LABELS, type ReferenceAnalysis } from "@workspace/worksheet-studio";
import { Brain, Loader2, Sparkles, X } from "lucide-react";
import { WS_GLASS_CARD, WS_SECTION_LABEL, WS_MUTED_TEXT, WS_CAPTION } from "./worksheet-studio-theme";

type Props = {
  merged: Partial<ReferenceAnalysis>;
  analyzing: boolean;
  onAnalyze: () => void;
  onUseTemplate: () => void;
  onIgnore: () => void;
  visible: boolean;
};

export function ReferenceAnalysisCard({ merged, analyzing, onAnalyze, onUseTemplate, onIgnore, visible }: Props) {
  if (!visible) return null;

  const hasData = Boolean(merged.topic || merged.classLevel || merged.subject);

  return (
    <div className={cn(WS_GLASS_CARD, "w-full min-w-0 space-y-3 p-4 animate-in slide-in-from-top-2 duration-200")}>
      <div className="flex items-center justify-between">
        <p className={cn(WS_SECTION_LABEL, "flex items-center gap-1.5")}>
          <Brain className="h-4 w-4" /> Reference Analysis
        </p>
        {merged.confidence ? (
          <span className={WS_CAPTION}>{merged.confidence}% confidence</span>
        ) : null}
      </div>

      {!hasData && !analyzing && (
        <Button type="button" variant="outline" className="w-full rounded-xl" onClick={onAnalyze}>
          <Sparkles className="mr-2 h-4 w-4" /> Analyze Reference
        </Button>
      )}

      {analyzing && (
        <div className={cn("flex items-center justify-center gap-2 py-4 text-sm", WS_MUTED_TEXT)}>
          <Loader2 className="h-4 w-4 animate-spin" /> Analyzing layout & style…
        </div>
      )}

      {hasData && !analyzing && (
        <>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            {merged.classLevel && <><dt className={WS_CAPTION}>Class</dt><dd className="font-medium text-[#1e3a5f]">{CLASS_LABELS[merged.classLevel]}</dd></>}
            {merged.subject && <><dt className={WS_CAPTION}>Subject</dt><dd className="font-medium text-[#1e3a5f]">{SUBJECT_LABELS[merged.subject]}</dd></>}
            {merged.topic && <><dt className={WS_CAPTION}>Topic</dt><dd className="font-medium text-[#1e3a5f]">{merged.topic}</dd></>}
            {merged.difficulty && <><dt className={WS_CAPTION}>Difficulty</dt><dd className="font-medium capitalize text-[#1e3a5f]">{merged.difficulty}</dd></>}
            {merged.pageCount ? <><dt className={WS_CAPTION}>Pages</dt><dd className="font-medium text-[#1e3a5f]">{merged.pageCount}</dd></> : null}
            {merged.illustrationDensity && <><dt className={WS_CAPTION}>Illustrations</dt><dd className="font-medium capitalize text-[#1e3a5f]">{merged.illustrationDensity}</dd></>}
            {merged.brandingDetected && <><dt className={WS_CAPTION}>Branding</dt><dd className="font-medium text-[#1e3a5f]">{merged.brandingDetected}</dd></>}
          </dl>
          {merged.questionTypes?.length ? (
            <p className={WS_CAPTION}>
              Activities: {merged.questionTypes.join(", ")}
            </p>
          ) : null}
          {merged.layoutFeatures?.length ? (
            <p className={WS_CAPTION}>
              Layout: {merged.layoutFeatures.slice(0, 4).join(" · ")}
            </p>
          ) : null}
          <div className="flex gap-2 pt-1">
            <Button type="button" className="flex-1 rounded-xl bg-[#1e3a5f]" onClick={onUseTemplate}>
              Use As Template
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={onIgnore}>
              <X className="mr-1 h-4 w-4" /> Ignore
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
