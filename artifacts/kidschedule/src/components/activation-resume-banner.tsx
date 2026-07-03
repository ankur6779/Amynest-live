import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, PlayCircle } from "lucide-react";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_TINTS } from "@/lib/dashboard-premium";
import {
  clearActivationResume,
  readActivationResume,
  type ActivationResumeState,
} from "@/lib/activation-resume";
import { getAnalyticsService } from "@/lib/analytics/analytics-service";

export function ActivationResumeBanner() {
  const { t } = useTranslation();
  const [resume, setResume] = useState<ActivationResumeState | null>(() =>
    readActivationResume(),
  );

  useEffect(() => {
    setResume(readActivationResume());
  }, []);

  if (!resume) return null;

  const pct =
    resume.total > 0
      ? Math.min(100, Math.round((resume.done / resume.total) * 100))
      : 0;

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.timeline}>
      <div className="flex items-start gap-3 p-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <PlayCircle className="h-5 w-5 text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-quicksand font-bold text-sm text-white">
            {t("dashboard.resume_routine_title", "Pick up where you left off")}
          </p>
          <p className="text-xs text-white/70 mt-0.5 leading-snug truncate">
            {resume.childName
              ? t("dashboard.resume_routine_child", {
                  name: resume.childName,
                  title: resume.title ?? t("dashboard.todays_routine", "today's routine"),
                  done: resume.done,
                  total: resume.total,
                  defaultValue: `${resume.childName}'s ${resume.title ?? "routine"} — ${resume.done}/${resume.total} done`,
                })
              : t("dashboard.resume_routine_progress", {
                  done: resume.done,
                  total: resume.total,
                  defaultValue: `${resume.done} of ${resume.total} activities done`,
                })}
          </p>
          <div className="w-full h-1 rounded-full bg-white/15 mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <Link
            href={resume.href}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200"
            data-testid="activation-resume-cta"
            onClick={() => {
              getAnalyticsService().track("navigation", {
                from_route: "/dashboard",
                to_route: resume.href,
                trigger: "programmatic",
                feature: "activation_resume",
              });
            }}
          >
            {t("dashboard.resume_routine_cta", "Continue routine")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <button
          type="button"
          className="text-xs text-white/45 hover:text-white/75 shrink-0"
          aria-label={t("common.dismiss", "Dismiss")}
          onClick={() => {
            clearActivationResume(resume.routineId);
            setResume(null);
          }}
        >
          {t("common.dismiss", "Dismiss")}
        </button>
      </div>
    </DashboardGlassCard>
  );
}
