/**
 * Routine Generation R3 — living result surface.
 * WHAT / WHY / WHEN / HOW from existing GeneratedRoutine + verified context.
 * Presentation only — engine / save contracts untouched.
 */
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import { RoutinePremiumCta } from "@/components/routines/routine-premium-cta";
import { RoutineAdaptationsCard } from "@/components/intelligence/routine-adaptations-card";
import {
  formatRoutineDurationShort,
  formatRoutineTime,
} from "@/lib/routine-timeline-ui";
import {
  buildLivingDayArc,
  buildLivingWhyProof,
  livingResultBeginCta,
  livingResultBeginSubtext,
  livingResultEmptyBody,
  livingResultEmptyTitle,
  livingResultFallbackNote,
  livingResultOpen,
  livingResultPartialNote,
  livingResultRebuildConfirm,
  livingResultRebuildCta,
  livingResultSoftEditNote,
  livingResultWhatLine,
  pickLivingFirstAction,
  type LivingResultItem,
} from "@/lib/routine-generation/living-result";
import "@/pages/first-experience-material.css";
import "./routine-living-room.css";

const CARE_MEMORY = ROOM_HEROES.care;

type Props = {
  childName: string;
  dateIso: string;
  title?: string | null;
  items: LivingResultItem[];
  adaptations?: readonly string[] | null;
  hasSchool?: boolean | null;
  mood?: string | null;
  weatherOutdoor?: "yes" | "no" | "limited" | null;
  caregiver?: string | null;
  goals?: string | null;
  fixedHonored?: boolean;
  isFallback?: boolean;
  isSaving?: boolean;
  isRebuilding?: boolean;
  onBegin: () => void;
  onRebuild: () => void;
  /** Fixed-activities review or other truthful secondary panels */
  children?: React.ReactNode;
};

export function RoutineLivingResult({
  childName,
  dateIso,
  title,
  items,
  adaptations,
  hasSchool,
  mood,
  weatherOutdoor,
  caregiver,
  goals,
  fixedHonored,
  isFallback,
  isSaving,
  isRebuilding,
  onBegin,
  onRebuild,
  children,
}: Props) {
  const { t } = useTranslation();
  const [arcOpen, setArcOpen] = useState(false);
  const [rebuildArmed, setRebuildArmed] = useState(false);

  const open = livingResultOpen(childName);
  const first = useMemo(() => pickLivingFirstAction(items), [items]);
  const arc = useMemo(() => buildLivingDayArc(items), [items]);
  const isWeekendDay = useMemo(() => {
    const d = new Date(`${dateIso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return false;
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  }, [dateIso]);

  const dateLabel = useMemo(() => {
    const d = new Date(`${dateIso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateIso;
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [dateIso]);

  const whyProofs = useMemo(
    () =>
      buildLivingWhyProof({
        adaptations,
        childName,
        hasSchool,
        isWeekendDay,
        mood,
        weatherOutdoor,
        caregiver,
        goals,
        fixedHonored,
        max: 4,
      }),
    [
      adaptations,
      childName,
      hasSchool,
      isWeekendDay,
      mood,
      weatherOutdoor,
      caregiver,
      goals,
      fixedHonored,
    ],
  );

  const empty = items.length === 0;
  const whatLine = livingResultWhatLine(childName, items.length, dateLabel);

  return (
    <div
      className="rg-living-surface rg-result-surface"
      data-testid="routine-living-result"
    >
      <header className="rg-today-hero" data-testid="routine-living-result-hero">
        <div
          className="fe-memory-mount rg-today-memory"
          data-fe-shot={CARE_MEMORY.shot}
        >
          <div className="fe-memory-spill" aria-hidden="true" />
          <div className="fe-memory">
            <img
              src={CARE_MEMORY.src}
              alt=""
              draggable={false}
              decoding="async"
              fetchPriority="low"
            />
            <div className="fe-memory-veil" aria-hidden="true" />
            <div className="fe-memory-glass" aria-hidden="true" />
            <div className="fe-memory-grain" aria-hidden="true" />
            <div className="rg-today-readability" aria-hidden="true" />
            <div className="rg-today-copy">
              <p className="rg-today-eyebrow">
                {t("routines.living.result.eyebrow", {
                  defaultValue: open.eyebrow,
                })}
              </p>
              <p className="rg-result-arrival">
                {t("routines.living.result.arrival", {
                  defaultValue: open.arrival,
                })}
              </p>
              <h2 className="rg-today-title">
                {t("routines.living.result.title", {
                  name: childName,
                  defaultValue: open.title,
                })}
              </h2>
              <p className="rg-today-purpose">
                {t("routines.living.result.companionship", {
                  name: childName,
                  defaultValue: open.companionship,
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="rg-result-body">
        {/* WHAT */}
        <section
          className="rg-result-block"
          aria-labelledby="rg-result-what"
          data-testid="routine-living-result-what"
        >
          <p className="rg-result-kicker" id="rg-result-what">
            {t("routines.living.result.what_kicker", { defaultValue: "What" })}
          </p>
          <h3 className="rg-result-what-title">{whatLine}</h3>
          {title?.trim() ? (
            <p className="rg-result-what-sub">{title.trim()}</p>
          ) : null}
          {isFallback ? (
            <p className="rg-result-note" data-testid="routine-living-result-fallback">
              {t("routines.living.result.fallback", {
                defaultValue: livingResultFallbackNote(),
              })}
            </p>
          ) : null}
          {empty ? (
            <div className="rg-result-empty" role="status">
              <p className="rg-result-empty-title">
                {t("routines.living.result.empty_title", {
                  defaultValue: livingResultEmptyTitle(),
                })}
              </p>
              <p className="rg-result-empty-body">
                {t("routines.living.result.empty_body", {
                  defaultValue: livingResultEmptyBody(),
                })}
              </p>
            </div>
          ) : items.length < 4 ? (
            <p className="rg-result-note">
              {t("routines.living.result.partial", {
                count: items.length,
                defaultValue: livingResultPartialNote(items.length),
              })}
            </p>
          ) : null}
        </section>

        {/* HOW — first action (hero) */}
        {first ? (
          <section
            className="rg-result-hero-action"
            aria-labelledby="rg-result-how"
            data-testid="routine-living-result-how"
          >
            <p className="rg-result-kicker" id="rg-result-how">
              {t("routines.living.result.how_kicker", {
                defaultValue: "Start here",
              })}
            </p>
            <div className="rg-result-hero-card">
              <div className="rg-result-hero-time">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span>{formatRoutineTime(first.time)}</span>
                {first.duration ? (
                  <span className="rg-result-hero-dur">
                    {formatRoutineDurationShort({ duration: first.duration })}
                  </span>
                ) : null}
              </div>
              <p className="rg-result-hero-activity">{first.activity}</p>
              <p className="rg-result-hero-hint">
                {t("routines.living.result.how_hint", {
                  defaultValue: "The first meaningful step of the day.",
                })}
              </p>
            </div>
          </section>
        ) : null}

        {/* WHY */}
        <section
          className="rg-result-block"
          aria-labelledby="rg-result-why"
          data-testid="routine-living-result-why"
        >
          <p className="rg-result-kicker" id="rg-result-why">
            {t("routines.living.result.why_kicker", {
              defaultValue: "Why this fits today",
            })}
          </p>
          {whyProofs.length > 0 ? (
            <ul className="rg-result-why-list" role="list">
              {whyProofs.map((p) => (
                <li key={p.id} className="rg-result-why-item">
                  <span>{p.statement}</span>
                  <span className="sr-only">
                    {`Source: ${p.source}. Field: ${p.field}.`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rg-result-note">
              {t("routines.living.result.why_fallback", {
                defaultValue:
                  "Shaped from your child's profile and what you shared for today.",
              })}
            </p>
          )}
          {(adaptations?.length ?? 0) > 0 ? (
            <div className="rg-result-adaptations">
              <RoutineAdaptationsCard
                adaptations={adaptations}
                mood={mood ?? undefined}
                isWeekendDay={isWeekendDay}
                hasSchool={hasSchool ?? undefined}
                compact
              />
            </div>
          ) : null}
        </section>

        {/* WHEN — day arc */}
        {!empty ? (
          <section
            className="rg-result-block"
            aria-labelledby="rg-result-when"
            data-testid="routine-living-result-when"
          >
            <button
              type="button"
              className="rg-result-arc-trigger"
              aria-expanded={arcOpen}
              id="rg-result-when"
              data-testid="routine-living-result-arc-toggle"
              onClick={() => setArcOpen((o) => !o)}
            >
              <div>
                <p className="rg-result-kicker">
                  {t("routines.living.result.when_kicker", {
                    defaultValue: "When",
                  })}
                </p>
                <p className="rg-result-arc-title">
                  {t("routines.living.result.arc_title", {
                    defaultValue: "Rest of today's arc",
                  })}
                </p>
                <p className="rg-result-arc-hint">
                  {t("routines.living.result.arc_hint", {
                    defaultValue: "Morning → day → evening — open when you're ready",
                  })}
                </p>
              </div>
              {arcOpen ? (
                <ChevronUp className="h-5 w-5 shrink-0 opacity-70" aria-hidden />
              ) : (
                <ChevronDown className="h-5 w-5 shrink-0 opacity-70" aria-hidden />
              )}
            </button>

            {arcOpen ? (
              <div className="rg-result-arc" data-testid="routine-living-result-arc">
                {arc.map((section) => (
                  <div key={section.id} className="rg-result-arc-section">
                    <p className="rg-result-arc-section-label">{section.label}</p>
                    <ul className="rg-result-arc-items" role="list">
                      {section.items.map((it, idx) => {
                        const isHero =
                          first &&
                          it.activity === first.activity &&
                          it.time === first.time;
                        return (
                          <li
                            key={`${section.id}-${idx}-${it.time}`}
                            className={
                              isHero
                                ? "rg-result-arc-item rg-result-arc-item--hero"
                                : "rg-result-arc-item"
                            }
                          >
                            <span className="rg-result-arc-time">
                              {formatRoutineTime(it.time)}
                            </span>
                            <span className="rg-result-arc-activity">
                              {it.activity}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {children ? (
          <div
            className="rg-result-secondary"
            data-testid="routine-living-result-secondary"
          >
            {children}
          </div>
        ) : null}

        <p className="rg-result-soft-note">
          {t("routines.living.result.soft_edit", {
            defaultValue: livingResultSoftEditNote(),
          })}
        </p>

        <div className="rg-result-actions">
          {!empty ? (
            <RoutinePremiumCta
              variant={isSaving ? "loading" : "view"}
              onClick={onBegin}
              disabled={!!isSaving || !!isRebuilding}
              testId="routine-living-result-begin"
              title={t("routines.living.result.begin_cta", {
                defaultValue: livingResultBeginCta(),
              })}
              subtext={t("routines.living.result.begin_subtext", {
                defaultValue: livingResultBeginSubtext(),
              })}
            />
          ) : null}

          {!rebuildArmed ? (
            <button
              type="button"
              className="rg-result-rebuild"
              data-testid="routine-living-result-rebuild"
              disabled={!!isSaving || !!isRebuilding}
              onClick={() => setRebuildArmed(true)}
            >
              {t("routines.living.result.rebuild_cta", {
                defaultValue: livingResultRebuildCta(),
              })}
            </button>
          ) : (
            <div
              className="rg-result-rebuild-confirm"
              role="alertdialog"
              aria-label={t("routines.living.result.rebuild_confirm_aria", {
                defaultValue: "Confirm rebuild",
              })}
              data-testid="routine-living-result-rebuild-confirm"
            >
              <p>
                {t("routines.living.result.rebuild_confirm", {
                  defaultValue: livingResultRebuildConfirm(),
                })}
              </p>
              <div className="rg-result-rebuild-actions">
                <button
                  type="button"
                  className="rg-result-rebuild-yes"
                  disabled={!!isRebuilding}
                  onClick={() => {
                    setRebuildArmed(false);
                    onRebuild();
                  }}
                >
                  {t("routines.living.result.rebuild_yes", {
                    defaultValue: "Yes, rebuild",
                  })}
                </button>
                <button
                  type="button"
                  className="rg-result-rebuild-no"
                  onClick={() => setRebuildArmed(false)}
                >
                  {t("routines.living.result.rebuild_no", {
                    defaultValue: "Keep this plan",
                  })}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
