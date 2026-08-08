/**
 * Routine Generation R2 — living entry opening.
 * Care FE photography + verified context + ready-to-build moment.
 * Presentation only — engine / APIs / entitlements untouched.
 */
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import {
  routineLivingOpen,
  routineReadyMoment,
  type RoutineContextChip,
} from "@/lib/routine-generation/living-entry";
import "@/pages/first-experience-material.css";
import "./routine-living-room.css";

const CARE_MEMORY = ROOM_HEROES.care;

type Props = {
  childName: string;
  chips: RoutineContextChip[];
};

export function RoutineLivingOpening({ childName, chips }: Props) {
  const { t } = useTranslation();
  const open = routineLivingOpen(childName);
  const ready = routineReadyMoment(childName);

  return (
    <div className="rg-living-surface" data-testid="routine-living-surface">
      <header className="rg-today-hero" data-testid="routine-living-hero">
        <div
          className="fe-memory-mount rg-today-memory"
          data-testid="routine-visual-memory"
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
                {t("routines.living.title", {
                  name: childName,
                  defaultValue: open.title,
                })}
              </h1>
              <p className="rg-today-purpose">
                {t("routines.living.companionship", {
                  name: childName,
                  defaultValue: open.companionship,
                })}
              </p>
              <p className="rg-today-purpose rg-today-purpose-soft">
                {t("routines.living.purpose", { defaultValue: open.purpose })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section
        className="rg-context-band"
        aria-label={t("routines.living.context_aria", {
          defaultValue: "What Amy already understands",
        })}
        data-testid="routine-living-context"
      >
        <p className="rg-context-label">
          {t("routines.living.context_label", {
            defaultValue: "What Amy already understands",
          })}
        </p>

        {chips.length > 0 ? (
          <ul className="rg-context-chips" role="list">
            {chips.map((chip) => (
              <li
                key={chip.id}
                className="rg-context-chip"
                data-testid={`routine-context-chip-${chip.id}`}
                title={chip.statement}
              >
                <span className="rg-context-chip-cat">{chip.category}</span>
                <span className="rg-context-chip-label">{chip.label}</span>
                <span className="sr-only">{chip.statement}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rg-ready-line">
            {t("routines.living.context_fallback", {
              defaultValue:
                "Amy will use your child's profile and today's date — add anything different below if needed.",
            })}
          </p>
        )}

        <div
          className="rg-ready-moment"
          data-testid="routine-ready-moment"
          aria-label={t("routines.living.ready_aria", {
            defaultValue: "Ready to build today's plan",
          })}
        >
          <p className="rg-ready-line">
            <strong>
              {t("routines.living.ready_why_label", { defaultValue: "Why now" })}
            </strong>
            {" — "}
            {t("routines.living.ready_why", {
              name: childName,
              defaultValue: ready.why,
            })}
          </p>
          <p className="rg-ready-line">
            <strong>
              {t("routines.living.ready_next_label", { defaultValue: "What happens next" })}
            </strong>
            {" — "}
            {t("routines.living.ready_next", { defaultValue: ready.next })}
          </p>
          <p className="rg-ready-line">
            <strong>
              {t("routines.living.ready_do_label", { defaultValue: "What you need to do" })}
            </strong>
            {" — "}
            {t("routines.living.ready_do", { defaultValue: ready.doNext })}
          </p>
        </div>
      </section>
    </div>
  );
}
