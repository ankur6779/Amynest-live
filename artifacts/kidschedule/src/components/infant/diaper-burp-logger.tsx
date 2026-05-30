import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Droplets, Wind } from "lucide-react";
import { logInfantCare, type InfantCareLogType } from "@/lib/infant-care-api";
import { trackInfantHubEvent } from "@/lib/infant-hub-analytics";
import { useToast } from "@/hooks/use-toast";

const DIAPER_TYPES: { type: InfantCareLogType; label: string; emoji: string }[] = [
  { type: "diaper_wet", label: "Wet", emoji: "💧" },
  { type: "diaper_dirty", label: "Dirty", emoji: "💩" },
  { type: "diaper_mixed", label: "Mixed", emoji: "🔄" },
];

type DiaperBurpLoggerProps = {
  childId: number;
  compact?: boolean;
};

export function DiaperBurpLogger({ childId, compact = false }: DiaperBurpLoggerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const log = useCallback(
    async (logType: InfantCareLogType) => {
      setBusy(logType);
      try {
        await logInfantCare(childId, logType);
        trackInfantHubEvent(logType.startsWith("diaper") ? "diaper_log" : "feed_log", {
          childId,
          logType,
        });
        await queryClient.invalidateQueries({ queryKey: ["infant-today", childId] });
        toast({ description: t("components.diaper_logger.logged", "Logged ✓") });
      } catch {
        toast({ description: t("components.diaper_logger.error", "Could not save — try again."), variant: "destructive" });
      } finally {
        setBusy(null);
      }
    },
    [childId, queryClient, t, toast],
  );

  return (
    <div className={compact ? "space-y-2" : "space-y-3"} data-testid="diaper-burp-logger">
      {!compact && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("components.diaper_logger.title", "Quick log — 1 tap")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {DIAPER_TYPES.map(({ type, label, emoji }) => (
          <button
            key={type}
            type="button"
            disabled={busy != null}
            onClick={() => log(type)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-bold hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
        <button
          type="button"
          disabled={busy != null}
          onClick={() => log("burp")}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-bold hover:border-primary/40 transition-colors disabled:opacity-50"
        >
          <Wind className="h-3 w-3 text-primary" />
          {t("components.diaper_logger.burp", "Burp")}
        </button>
      </div>
    </div>
  );
}
