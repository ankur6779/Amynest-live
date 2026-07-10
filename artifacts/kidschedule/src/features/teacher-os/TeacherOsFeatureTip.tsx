import { cn } from "@/lib/utils";
import { Lightbulb, X } from "lucide-react";
import { getActiveFeatureTip, dismissFeatureTip, recordFeatureTipClick } from "@workspace/teacher-os";
import { useEffect, useState } from "react";
import type { FeatureDiscoveryTip } from "@workspace/teacher-os";
import type { TeacherOsModuleId } from "@workspace/teacher-os";

type Props = {
  onNavigate: (module: TeacherOsModuleId) => void;
};

export function TeacherOsFeatureTip({ onNavigate }: Props) {
  const [tip, setTip] = useState<FeatureDiscoveryTip | null>(null);

  useEffect(() => {
    const t = getActiveFeatureTip();
    setTip(t);
  }, []);

  if (!tip) return null;

  return (
    <div
      className={cn(
        "fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[32] mx-auto max-w-lg",
        "flex items-start gap-2 rounded-xl border border-[#c9a227]/30 bg-[#fffef8] px-3 py-2.5 shadow-sm",
      )}
      role="status"
    >
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a227]" aria-hidden />
      <button
        type="button"
        className="min-w-0 flex-1 text-left text-xs text-[#1e3a5f]"
        onClick={() => {
          recordFeatureTipClick(tip.id);
          dismissFeatureTip(tip.id);
          setTip(null);
          onNavigate(tip.module);
        }}
      >
        {tip.message}
      </button>
      <button
        type="button"
        aria-label="Dismiss tip"
        className="shrink-0 rounded p-2 min-h-11 min-w-11 text-[#1e3a5f]/50 hover:bg-[#1e3a5f]/5 touch-manipulation"
        onClick={() => { dismissFeatureTip(tip.id); setTip(null); }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
