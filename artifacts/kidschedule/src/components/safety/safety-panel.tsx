// ─────────────────────────────────────────────────────────────────────────────
// Module 4 — AI Safety Layer — SafetyPanel (Web)
//
// Renders a safety-score gauge + violations + suggested adjustments for the
// most recent routine of the active child. Calls /api/safety/validate.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useListRoutines, useListChildren } from "@workspace/api-client-react";
import type { SafetyValidationResponse } from "@workspace/api-zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, Info, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";

type AgeBand = "infant" | "toddler" | "preschool" | "school" | "tween";

function classifyBand(months: number): AgeBand {
  if (months < 18) return "infant";
  if (months < 36) return "toddler";
  if (months < 60) return "preschool";
  if (months < 132) return "school";
  return "tween";
}

function ageMonthsFromDob(dob?: string | null): number {
  if (!dob) return 84;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 84;
  const now = new Date();
  return (
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth())
  );
}

// audit-block-ignore-start
// Brand semantic colours for safety severity tiers — Tailwind status palette
// is the canonical surface here (matches forecast/household severity badges).
function severityClass(sev: "info" | "warning" | "critical"): string {
  switch (sev) {
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-300/50";
    case "warning":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300/50";
    default:
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200 border-sky-300/50";
  }
}
// audit-block-ignore-end

function severityIcon(sev: "info" | "warning" | "critical") {
  if (sev === "critical") return <ShieldAlert className="h-4 w-4" />;
  if (sev === "warning") return <AlertTriangle className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

// audit-block-ignore-start
// Gauge colour reflects safety score tier — Tailwind status palette canonical.
function scoreClass(score: number): string {
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
// audit-block-ignore-end

function ScoreGauge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`text-5xl font-bold ${scoreClass(score)}`}>{score}</div>
      <div className="text-sm text-muted-foreground">
        / 100
        <div className="text-xs">{/* i18n-ok: brand label, intentionally English */}Safety Score</div>
      </div>
    </div>
  );
}

export function SafetyPanel() {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const { data: children = [] } = useListChildren();
  const { data: routines = [] } = useListRoutines();
  const [result, setResult] = useState<SafetyValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestRoutine = useMemo(() => {
    if (!routines.length) return null;
    return [...routines].sort((a, b) =>
      (b.date ?? "").localeCompare(a.date ?? ""),
    )[0];
  }, [routines]);

  async function runValidation() {
    if (!latestRoutine) {
      setError(t("safety.no_routine", { defaultValue: "Generate a routine first to run a safety check." }));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const child = children.find((c) => c.id === latestRoutine.childId);
      const ageMonths = ageMonthsFromDob((child as { dob?: string | null } | undefined)?.dob);
      const ageBand = classifyBand(ageMonths);

      const items = (latestRoutine.items ?? []) as Array<{
        time?: string;
        activity?: string;
        duration?: number;
        category?: string;
      }>;

      let totalSleep = 0;
      let totalScreen = 0;
      let totalOutdoor = 0;
      const activities = items.map((it, i) => {
        const cat = (it.category ?? "general").toLowerCase();
        const title = it.activity ?? "Activity";
        const dur = it.duration ?? 30;
        if (/sleep|nap|bed/.test(cat) || /sleep|nap|bed/i.test(title)) totalSleep += dur;
        if (/screen|tv|tablet|video/.test(cat) || /screen|tv|tablet|video/i.test(title)) totalScreen += dur;
        if (/outdoor|park|play|sport/.test(cat) || /outdoor|park/i.test(title)) totalOutdoor += dur;
        const intensity =
          /sport|run|active|gym/i.test(title) ? "high"
            : /play|walk|chore/i.test(title) ? "moderate"
            : "low";
        const startMinutes = (() => {
          const m = /(\d{1,2}):(\d{2})/.exec(it.time ?? "");
          if (!m) return i * 30;
          return Number(m[1]) * 60 + Number(m[2]);
        })();
        return {
          id: `slot-${i}`,
          title,
          startMinutes,
          durationMinutes: dur,
          category: cat,
          intensity,
        };
      });

      const res = await authFetch("/api/safety/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageBand,
          ageMonths,
          activities,
          totalScreenMinutes: totalScreen,
          totalSleepMinutes: totalSleep,
          totalOutdoorMinutes: totalOutdoor,
          caregiverPresent: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SafetyValidationResponse = await res.json();
      setResult(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("safety.error_generic", { defaultValue: "Could not run safety check." }),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("safety.title", { defaultValue: "AI Safety Layer" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("safety.intro", {
              defaultValue:
                "Validates the most recent routine against age-appropriate sleep, screen-time, supervision, and intensity rules.",
            })}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runValidation} disabled={loading || !latestRoutine}>
              {loading
                ? t("safety.checking", { defaultValue: "Checking…" })
                : t("safety.run_check", { defaultValue: "Run Safety Check" })}
            </Button>
            {!latestRoutine && (
              <span className="text-xs text-muted-foreground">
                {t("safety.no_routine", {
                  defaultValue: "Generate a routine first to run a safety check.",
                })}
              </span>
            )}
          </div>
          {error && (
            // audit-block-ignore-start
            <div className="rounded-xl bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-200 border border-red-200/60">
              {error}
            </div>
            // audit-block-ignore-end
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-lg">
              <span>{t("safety.result", { defaultValue: "Safety Result" })}</span>
              {/* audit-block-ignore-start */}
              {result.isValid ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300/50">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {t("safety.passed", { defaultValue: "Passed" })}
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-300/50">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  {t("safety.needs_attention", { defaultValue: "Needs Attention" })}
                </Badge>
              )}
              {/* audit-block-ignore-end */}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ScoreGauge score={result.safetyScore} />

            {result.violations.length === 0 ? (
              // audit-block-ignore-start
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200">
                {t("safety.all_clear", {
                  defaultValue: "No safety concerns detected — well-balanced routine!",
                })}
              </div>
              // audit-block-ignore-end
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold text-foreground">
                  {t("safety.violations", { defaultValue: "Concerns" })} ({result.violations.length})
                </div>
                {result.violations.map((v) => (
                  <div
                    key={v.ruleId}
                    className={`rounded-xl border px-3 py-2 text-sm flex items-start gap-2 ${severityClass(v.severity)}`}
                  >
                    <span className="mt-0.5">{severityIcon(v.severity)}</span>
                    <span className="flex-1">{v.message}</span>
                  </div>
                ))}
              </div>
            )}

            {result.adjustments.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold text-foreground">
                  {t("safety.adjustments", { defaultValue: "Suggested Adjustments" })}
                </div>
                {result.adjustments.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-muted/40 px-3 py-2 text-sm border border-border/40"
                  >
                    <div className="font-semibold text-foreground">{a.suggestion}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SafetyPanel;
