/**
 * Practice Room — last light.
 * Success = the relationship continued — not that a task finished.
 * Family owns the moment. Amy only protected it.
 * Screen may leave; the moment continues.
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import {V2_MEASURE,

  fadeIn,
  fadeUp,
  useReducedMotion,
  V2_EXIT,
  V2_HERO_LIGHT,
  V2_HIERARCHY_WHISPER,
  v2LawRole,
  v2LitProps,
  V2_SCROLL_PAD,
  V2_SHELL,
  V2_SPACE,
  V2_TRANSITION,
  V2_TYPE,
} from "@/v2/craft";

type MissionSuccessProps = {
  childName?: string | null;
  /** Existing concern label when Coach is earned (e.g. Sleep). */
  coachChallengeLabel?: string | null;
  /** Existing Coach discovery href — presentation bridge only. */
  coachHref?: string | null;
};

export function MissionSuccess({
  childName = null,
  coachChallengeLabel = null,
  coachHref = null,
}: MissionSuccessProps) {
  const reduced = useReducedMotion();
  const showCoachBridge = Boolean(coachHref && coachChallengeLabel);
  const who = childName?.trim() || "your child";

  const lit = v2LitProps(`${V2_SHELL} ${V2_SCROLL_PAD}`);

  return (
    <div
      {...lit}
      data-testid="v2-today-mission-success"
      data-v2-room="practice-room"
      aria-labelledby="v2-mission-success-title"
    >
      <motion.div
        className={`relative ${V2_HERO_LIGHT} ${V2_SPACE.py4}`}
        data-testid="v2-today-mission-success-panel"
        variants={reduced ? fadeUp : fadeIn}
        initial={reduced ? false : "initial"}
        animate="animate"
        transition={V2_TRANSITION.card}
      >
        <span
          className="sr-only"
          data-testid="v2-today-mission-success-presence"
        >
          Relationship continued
        </span>

        <h1
          id="v2-mission-success-title"
          className={`${V2_TYPE.heroCompact} ${V2_MEASURE.hero}`}
          {...v2LawRole("hero")}
        >
          You&apos;re still with {who}.
        </h1>
        <p
          className={`${V2_SPACE.mt3} ${V2_MEASURE.support} ${V2_TYPE.bodyMuted}`}
          aria-live="polite"
          {...v2LawRole("support")}
        >
          This was always yours. Amy only kept it safe — the moment continues
          when the screen is gone.
        </p>
      </motion.div>

      <motion.div
        className={`flex flex-col items-start ${V2_SPACE.stack2} ${V2_SPACE.mt4} ${V2_HIERARCHY_WHISPER}`}
        variants={reduced ? undefined : fadeUp}
        initial={reduced ? false : "initial"}
        animate={reduced ? undefined : "animate"}
        transition={{ ...V2_TRANSITION.card, delay: reduced ? 0 : 0.06 }}
      >
        <Link
          href="/today"
          data-testid="v2-today-mission-back-to-today"
          className={`${V2_TYPE.caption} text-muted-foreground hover:text-foreground underline-offset-4 hover:underline`}
          {...v2LawRole("primary")}
        >
          {V2_EXIT.backToToday}
        </Link>

        {showCoachBridge && coachHref ? (
          <Link
            href={coachHref}
            data-testid="v2-today-mission-success-coach"
            className={`${V2_TYPE.caption} text-muted-foreground hover:text-foreground underline-offset-4 hover:underline`}
          >
            Amy can keep walking with you about {coachChallengeLabel}
          </Link>
        ) : null}
      </motion.div>
    </div>
  );
}
