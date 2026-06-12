import { HEALTH_LAB_DISCLAIMER } from "../constants";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

export function HealthLabDisclaimer({ compact = false }: { compact?: boolean }) {
  const { t } = useHealthLabI18n();
  return (
    <div
      className={cn(
        "flex gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-violet-200/80",
        compact ? "p-2.5 text-[11px]" : "p-3 text-xs",
      )}
      role="note"
    >
      <Info className="h-4 w-4 shrink-0 text-violet-400/80" aria-hidden />
      <p>{t("disclaimer", HEALTH_LAB_DISCLAIMER)}</p>
    </div>
  );
}
