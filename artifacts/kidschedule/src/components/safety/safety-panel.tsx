// Safety tab — automatic routine validation with parent-friendly guidance

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useListRoutines, useListChildren } from "@workspace/api-client-react";
import type { SafetyValidationResponse } from "@workspace/api-zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ThumbsUp,
  Lightbulb,
} from "lucide-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  ageMonthsFromDob,
  buildSafetyReport,
  buildSafetyValidationPayload,
  classifyAgeBand,
  getCachedSafetyForRoutine,
  type SafetyReport,
  type SafetyStatus,
  validateRoutineSafety,
} from "@/lib/safety-routine-validation";
import { ViewDetailsCollapsible } from "@/components/schedule/view-details-collapsible";

function StatusBanner({ report }: { report: SafetyReport }) {
  const { t } = useTranslation();

  const config: Record<
    SafetyStatus,
    { icon: React.ReactNode; badge: string; className: string }
  > = {
    safe: {
      icon: <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />,
      badge: t("safety.status.safe", { defaultValue: "Safe" }),
      className:
        "border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/30 dark:border-emerald-800",
    },
    mostly_safe: {
      icon: <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0" />,
      badge: t("safety.status.mostly_safe", { defaultValue: "Mostly Safe" }),
      className:
        "border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800",
    },
    needs_attention: {
      icon: <XCircle className="h-8 w-8 text-red-600 shrink-0" />,
      badge: t("safety.status.needs_attention", { defaultValue: "Needs Attention" }),
      className: "border-red-200 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800",
    },
  };

  const c = config[report.status];

  return (
    <Card className={`border-2 shadow-sm ${c.className}`}>
      <CardContent className="p-5 flex items-center gap-4">
        {c.icon}
        <div>
          <p className="text-2xl font-bold text-foreground">{c.badge}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("safety.status_hint", {
              defaultValue: "Based on your child's latest routine",
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailedAnalysis({ report }: { report: SafetyReport }) {
  const { t } = useTranslation();
  const { raw } = report;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">
            {t("safety.score_label", { defaultValue: "Safety score" })}
          </p>
          <p className="text-3xl font-bold text-foreground">{report.score}</p>
          <p className="text-xs text-muted-foreground">/ 100</p>
        </CardContent>
      </Card>

      {raw.violations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("safety.technical_violations", { defaultValue: "Rule details" })}
          </p>
          {raw.violations.map((v) => (
            <div
              key={v.ruleId}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
            >
              <span className="font-semibold text-foreground">{v.ruleId}</span>
              <span className="mx-1">·</span>
              {v.message}
            </div>
          ))}
        </div>
      )}

      {raw.appliedRuleIds.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {t("safety.rules_checked", {
            defaultValue: "{{count}} age-based rules checked",
            count: raw.appliedRuleIds.length,
          })}
        </p>
      )}
    </div>
  );
}

export function SafetyPanel() {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const { data: children = [] } = useListChildren();
  const { data: routines = [] } = useListRoutines();
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const latestRoutine = useMemo(() => {
    if (!routines.length) return null;
    return [...routines].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
  }, [routines]);

  const runCheck = useCallback(async () => {
    if (!latestRoutine) {
      setReport(null);
      setLoading(false);
      setError(
        t("safety.no_routine", {
          defaultValue: "Generate a routine first — Amy will review it here automatically.",
        }),
      );
      return;
    }

    setLoading(true);
    setError(null);

    const items = (latestRoutine.items ?? []) as Array<{
      time?: string;
      activity?: string;
      duration?: number;
      category?: string;
    }>;

    try {
      const child = children.find((c) => c.id === latestRoutine.childId) as
        | { dob?: string | null }
        | undefined;

      let result: SafetyValidationResponse =
        getCachedSafetyForRoutine(latestRoutine.id) ??
        (await validateRoutineSafety(authFetch, items, child));

      const ageMonths = ageMonthsFromDob(child?.dob);
      const payload = buildSafetyValidationPayload(
        items,
        classifyAgeBand(ageMonths),
        ageMonths,
      );

      setReport(buildSafetyReport(result, payload));
    } catch (e) {
      setReport(null);
      setError(
        e instanceof Error
          ? e.message
          : t("safety.error_generic", { defaultValue: "Could not complete safety review." }),
      );
    } finally {
      setLoading(false);
    }
  }, [latestRoutine, children, authFetch, t]);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {t("safety.title", { defaultValue: "Routine safety" })}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("safety.intro", {
            defaultValue:
              "Amy checks sleep, screen time, activity intensity, and evening timing — automatically after each routine.",
          })}
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      )}

      {!loading && error && !latestRoutine && (
        <Card className="border-dashed">
          <CardContent className="p-5 text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      )}

      {!loading && error && latestRoutine && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 text-sm text-red-800 dark:text-red-200">{error}</CardContent>
        </Card>
      )}

      {!loading && report && (
        <>
          <StatusBanner report={report} />

          {report.issues.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  {t("safety.issues_heading", { defaultValue: "Things to improve" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.issues.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/60 bg-card p-3 space-y-1.5"
                  >
                    <p className="text-sm font-semibold text-foreground flex items-start gap-2">
                      {item.severity === "critical" ? (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      {item.issue}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-start gap-2 pl-6">
                      <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      {item.suggestion}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report.positives.length > 0 && (
            <Card className="border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-emerald-600" />
                  {t("safety.positives_heading", { defaultValue: "What's working well" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.positives.map((msg, i) => (
                  <p key={i} className="text-sm text-foreground flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    {msg}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {report.issues.length === 0 && report.status === "safe" && (
            <Card className="border-emerald-200/60">
              <CardContent className="p-4 text-sm text-emerald-800 dark:text-emerald-200">
                {t("safety.all_clear", {
                  defaultValue:
                    "No concerns detected — sleep, screen time, and activity balance look good.",
                })}
              </CardContent>
            </Card>
          )}

          <ViewDetailsCollapsible
            label={t("safety.view_detailed", {
              defaultValue: "View detailed safety analysis",
            })}
          >
            <DetailedAnalysis report={report} />
          </ViewDetailsCollapsible>

          {latestRoutine && (
            <p className="text-xs text-center text-muted-foreground">
              {t("safety.checked_routine", {
                defaultValue: "Reviewing: {{title}}",
                title: latestRoutine.title ?? latestRoutine.date,
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default SafetyPanel;
