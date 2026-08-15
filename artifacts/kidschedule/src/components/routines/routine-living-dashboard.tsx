/**
 * Living /routines dashboard room.
 * Presentation only — handlers / paywall / listing stay in pages/routines/index.
 */
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import {
  livingDashboardBuildCta,
  livingDashboardBuildSubtext,
  livingDashboardContinueCta,
  livingDashboardContinueSubtext,
  livingDashboardEmptyBody,
  livingDashboardEmptyTitle,
  livingDashboardFamilyHint,
  livingDashboardMoreHint,
  livingDashboardOpen,
  livingDashboardRebuildCta,
} from "@/lib/routine-generation/living-dashboard";
import { formatRoutineTime } from "@/lib/routine-timeline-ui";
import "@/pages/first-experience-material.css";
import "@/components/parent-hub/parent-hub-living-room.css";
import "./routine-living-room.css";

const CARE_MEMORY = ROOM_HEROES.care;

export type LivingDashboardChild = { id: number; name: string };

export type LivingDashboardFirstAction = {
  time: string;
  activity: string;
  duration?: number;
};

type Props = {
  childName: string;
  childrenList: LivingDashboardChild[];
  activeChildId: number | null;
  onSelectChild: (id: number) => void;
  childIdsWithTodayRoutine?: Set<number>;
  hasPlan: boolean;
  firstAction?: LivingDashboardFirstAction | null;
  arcPreview?: Array<{ time: string; label: string }>;
  onPrimary: () => void;
  onRebuild?: () => void;
  isLoading?: boolean;
  supporting?: ReactNode;
};

export function RoutineLivingDashboard({
  childName,
  childrenList,
  activeChildId,
  onSelectChild,
  childIdsWithTodayRoutine,
  hasPlan,
  firstAction,
  arcPreview,
  onPrimary,
  onRebuild,
  isLoading,
  supporting,
}: Props) {
  const { t } = useTranslation();
  const open = livingDashboardOpen(childName);
  const name = childName || "your child";

  return (
    <div
      className="routine-living-page routine-living-shell"
      data-testid="routine-living-dashboard"
    >
      <div className="rg-living-surface rg-dash-surface">
        <header className="rg-today-hero" data-testid="routine-living-dashboard-hero">
          <div
            className="fe-memory-mount rg-today-memory"
            data-testid="routine-dashboard-memory"
            data-fe-shot={CARE_MEMORY.shot}
          >
            <div className="fe-memory-spill" aria-hidden="true" />
            <div className="fe-memory">
              <img
                src={CARE_MEMORY.src}
                alt={CARE_MEMORY.alt}
                draggable={false}
                decoding="async"
                fetchPriority="high"
              />
              <div className="fe-memory-veil" aria-hidden="true" />
              <div className="fe-memory-glass" aria-hidden="true" />
              <div className="fe-memory-grain" aria-hidden="true" />
              <div className="rg-today-readability" aria-hidden="true" />
              <div className="rg-today-copy">
                <p className="rg-today-eyebrow">
                  {t("routines.living.eyebrow", { defaultValue: open.eyebrow })}
                </p>
                <h1 className="rg-today-title">
                  {t("routines.living.dashboard_title", {
                    name,
                    defaultValue: open.title,
                  })}
                </h1>
                <p className="rg-today-purpose">
                  {t("routines.living.dashboard_purpose", {
                    defaultValue:
                      "Amy helps turn what she understands about this child into a living plan for today.",
                  })}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="rg-dash-body">
          {childrenList.length > 1 ? (
            <div className="ph-quiet-child-identity" data-testid="routine-living-child-context">
              <p className="rg-context-label">
                {t("routines.living.family_hint", {
                  defaultValue: livingDashboardFamilyHint(),
                })}
              </p>
              {childrenList.map((child) => {
                const on = child.id === activeChildId;
                const has = childIdsWithTodayRoutine?.has(child.id) ?? false;
                return (
                  <button
                    key={child.id}
                    type="button"
                    className="ph-quiet-child-chip"
                    data-active={on ? "true" : "false"}
                    aria-pressed={on}
                    onClick={() => onSelectChild(child.id)}
                  >
                    {child.name}
                    {has ? (
                      <span className="sr-only">
                        {t("routines.living.has_plan_today", {
                          defaultValue: "has a plan today",
                        })}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {isLoading ? (
            <p className="rg-ready-line" data-testid="routine-living-dashboard-loading">
              {t("routines.living.dashboard_loading", {
                defaultValue: "Looking at today…",
              })}
            </p>
          ) : hasPlan ? (
            <section className="rg-dash-today" data-testid="routine-living-dashboard-plan">
              <p className="rg-result-kicker">
                {t("routines.living.dashboard_today_kicker", {
                  defaultValue: "Today",
                })}
              </p>
              <p className="rg-result-what-title">
                {t("routines.living.dashboard_child_plan", {
                  name,
                  defaultValue: `${name}'s plan is ready.`,
                })}
              </p>
              {firstAction ? (
                <div className="rg-result-hero-card">
                  <p className="rg-result-kicker">
                    {t("routines.living.result.how_kicker", {
                      defaultValue: "Start here",
                    })}
                  </p>
                  <p className="rg-result-hero-time">
                    <span>{formatRoutineTime(firstAction.time)}</span>
                  </p>
                  <p className="rg-result-hero-activity">{firstAction.activity}</p>
                </div>
              ) : null}
              {arcPreview && arcPreview.length > 1 ? (
                <ul className="rg-dash-arc-quiet" aria-label="Today's arc">
                  {arcPreview.slice(0, 4).map((row, i) => (
                    <li key={`${row.time}-${i}`}>
                      <span>{row.time}</span>
                      <span>{row.label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : (
            <section className="rg-dash-empty" data-testid="routine-living-dashboard-empty">
              <p className="rg-result-what-title">
                {t("routines.living.dashboard_empty_title", {
                  defaultValue: livingDashboardEmptyTitle(),
                })}
              </p>
              <p className="rg-ready-line">
                {t("routines.living.dashboard_empty_body", {
                  name,
                  defaultValue: livingDashboardEmptyBody(name),
                })}
              </p>
            </section>
          )}

          <div className="rg-dash-actions">
            <button
              type="button"
              className="rg-dash-cta"
              data-testid="routines-primary-cta"
              onClick={onPrimary}
            >
              <span className="rg-dash-cta-title">
                {hasPlan
                  ? t("routines.living.result.begin_cta", {
                      defaultValue: livingDashboardContinueCta(),
                    })
                  : t("routines.living.build_cta", {
                      defaultValue: livingDashboardBuildCta(),
                    })}
              </span>
              <span className="rg-dash-cta-sub">
                {hasPlan
                  ? t("routines.living.dashboard_continue_sub", {
                      name,
                      defaultValue: livingDashboardContinueSubtext(name),
                    })
                  : t("routines.living.build_subtext", {
                      name,
                      defaultValue: livingDashboardBuildSubtext(name),
                    })}
              </span>
            </button>
            {hasPlan && onRebuild ? (
              <button
                type="button"
                className="rg-result-rebuild"
                data-testid="routines-living-rebuild"
                onClick={onRebuild}
              >
                {t("routines.living.rebuild_cta", {
                  defaultValue: livingDashboardRebuildCta(),
                })}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {supporting ? (
        <details className="rg-dash-more">
          <summary>
            {t("routines.living.dashboard_more", {
              defaultValue: "If you need more",
            })}
          </summary>
          <p className="rg-dash-more-hint">
            {t("routines.living.dashboard_more_hint", {
              defaultValue: livingDashboardMoreHint(),
            })}
          </p>
          <div className="rg-dash-more-body">{supporting}</div>
        </details>
      ) : null}
    </div>
  );
}
