/**
 * Long prepare — meaningful stages + shared calm pulse language.
 * Presentation: Amy already working · no admin “setup/processing” language.
 * Soft Plate settle on active only — no nested Soft Plate stack.
 */

import {
  V2_HIERARCHY_PEER,
  V2_HIERARCHY_WHISPER,
  V2_MEASURE,
  V2_PREPARE_COPY,
  V2_PULSE_BAR,
  V2_RADIUS,
  V2_SPACE,
  V2_SURFACE_FILL,
  V2_TYPE,
  v2LitProps,
} from "@/v2/craft";

export const COACH_PREPARE_STEPS = [
  "Understanding your child's stage",
  "Holding your parenting goal",
  "Mapping quiet next steps",
] as const;

type CoachPrepareProgressProps = {
  stepIndex: number;
};

export function CoachPrepareProgress({ stepIndex }: CoachPrepareProgressProps) {
  const active = Math.min(
    Math.max(0, stepIndex),
    COACH_PREPARE_STEPS.length - 1,
  );

  const lit = v2LitProps(
    `mx-auto flex w-full ${V2_MEASURE.shell} flex-col items-center ${V2_SPACE[3]} ${V2_SPACE.edgeX} ${V2_SPACE.py8}`,
  );

  return (
    <main
      {...lit}
      data-testid="v2-coach-discovery-preparing"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={V2_PREPARE_COPY.coachJourney}
    >
      <div className={V2_PULSE_BAR} aria-hidden />
      <header className={`${V2_SPACE.stack1} text-center`}>
        <p className={V2_TYPE.caption}>Amy Coach</p>
        <h1 className={V2_TYPE.body}>{COACH_PREPARE_STEPS[active]}</h1>
      </header>
      <ol className={`w-full ${V2_SPACE.stack1}`} aria-hidden>
        {COACH_PREPARE_STEPS.map((label, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li
              key={label}
              className={`${V2_SPACE.rowPad} ${V2_TYPE.caption} transition-[background-color,opacity] duration-[length:var(--v2-duration-ui)] ease-out ${
                current
                  ? `${V2_RADIUS.plate} ${V2_SURFACE_FILL.softPlateSelected} text-foreground`
                  : done
                    ? `${V2_HIERARCHY_PEER} text-muted-foreground`
                    : `${V2_HIERARCHY_WHISPER} text-muted-foreground`
              }`}
              data-prepare-step={i}
              data-active={current ? "true" : "false"}
            >
              {label}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
