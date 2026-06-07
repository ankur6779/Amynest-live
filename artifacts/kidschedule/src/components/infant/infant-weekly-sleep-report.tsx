import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Moon, Sparkles } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { Button } from "@/components/ui/button";
import { trackInfantSleepCoachPlanGenerated } from "@/lib/infant-hub-analytics";

export type WeeklySleepReportData = {
  weekKey: number;
  generatedAt: string;
  cached: boolean;
  stats: {
    totalSessions: number;
    napCount: number;
    nightCount: number;
    avgDurationMin: number;
    totalSleepMin: number;
    daysWithData: number;
  };
  summary: string;
  highlights: string[];
  nextSteps: string[];
};

type InfantWeeklySleepReportProps = {
  childId: number;
  childName: string;
  ageMonths: number;
};

export function InfantWeeklySleepReport({
  childId,
  childName,
  ageMonths,
}: InfantWeeklySleepReportProps) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const { entitlements } = useSubscription();
  const { openPaywall } = usePaywall();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<WeeklySleepReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadReport() {
    if (!entitlements?.isPremium) {
      openPaywall("infant_sleep_coach");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(getApiUrl("/api/infant-sleep/weekly-report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      });
      if (res.status === 402) {
        openPaywall("infant_sleep_coach");
        return;
      }
      if (!res.ok) {
        throw new Error(`report_${res.status}`);
      }
      const json = (await res.json()) as { report: WeeklySleepReportData };
      setReport(json.report);
      trackInfantSleepCoachPlanGenerated(childId, ageMonths, {
        cached: json.report.cached,
      });
    } catch {
      setError(
        t(
          "components.infant_weekly_sleep_report.error",
          "Could not generate this week's sleep report. Try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 p-4 space-y-3"
      data-testid="infant-weekly-sleep-report"
    >
      <div className="flex items-center gap-2">
        <Moon className="h-4 w-4 text-indigo-400" />
        <p className="text-sm font-bold">
          {t("components.infant_weekly_sleep_report.title", "Weekly Sleep Coaching Report")}
        </p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {t(
          "components.infant_weekly_sleep_report.lead",
          "Premium: AI summary of {{name}}'s last 7 days of sleep logs with personalized next steps.",
          { name: childName },
        )}
      </p>

      {!report ? (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void loadReport()}
          className="rounded-full"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1.5" />
          )}
          {t("components.infant_weekly_sleep_report.cta", "Generate this week's report")}
        </Button>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="leading-snug">{report.summary}</p>
          {report.highlights.length > 0 && (
            <ul className="text-[12px] text-muted-foreground list-disc pl-4 space-y-0.5">
              {report.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
          {report.nextSteps.length > 0 && (
            <div className="rounded-xl bg-white/[0.04] border border-border/40 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {t("components.infant_weekly_sleep_report.next", "Try this week")}
              </p>
              <ul className="text-[12px] list-disc pl-4 space-y-0.5">
                {report.nextSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => void loadReport()} disabled={busy}>
            {t("components.infant_weekly_sleep_report.refresh", "Refresh report")}
          </Button>
        </div>
      )}

      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
