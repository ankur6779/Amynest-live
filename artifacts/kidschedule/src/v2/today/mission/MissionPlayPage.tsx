/**
 * Practice Room — Mission play + success (P1).
 * Question ONLY: What do I do right now?
 *
 * Moment begins before the tap · continues after the screen.
 * Family owns the moment. Amy never owns it — Amy only protects it.
 * Interface quieter as the moment deepens.
 * Success = relationship continued — not task finished.
 *
 * Logic · analytics · routing frozen — presentation only.
 */

import { useEffect, useState } from "react";
import { Link, Redirect } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  emitV2MissionCompleted,
  emitV2MissionStarted,
} from "@/lib/analytics/v2-product";
import { getGuestSession } from "@/v2/guest";
import { isTodayV2Enabled } from "@/v2/entry/v2-shell-flags";
import { resolveCoachDiscoveryOffer } from "@/v2/coach-discovery";
import {
  fadeIn,
  fadeUp,
  useReducedMotion,
  v2HapticSuccess,
  V2_CTA,
  V2_EXIT,
  V2_HERO_LIGHT,
  V2_MEASURE,
  V2_PRESS_PRIMARY,
  V2_HIERARCHY_RECEDE,
  V2_HIERARCHY_WHISPER,
  V2_SCROLL,
  V2_SCROLL_PAD,
  V2_SHELL,
  V2_SPACE,
  V2_TRANSITION,
  V2_TYPE,
  v2LawRole,
  v2LitProps,
} from "@/v2/craft";
import {
  isMissionCompletedToday,
  localDateKey,
  markMissionCompleted,
} from "./completion";
import { MissionSuccess } from "./MissionSuccess";
import { getTodaySpeechMission } from "./speech-mission";

type Phase = "play" | "success";

function resolveGuestId(): string {
  return getGuestSession()?.guestId ?? "anonymous";
}

export default function MissionPlayPage() {
  if (!isTodayV2Enabled()) {
    return <Redirect to="/dashboard" />;
  }

  return <MissionPlayShell />;
}

function MissionPlayShell() {
  const session = getGuestSession();
  const childName = session?.name?.trim() || null;
  const mission = getTodaySpeechMission(session);
  const coachOffer = resolveCoachDiscoveryOffer({
    worry: session?.worry,
    ageBand: session?.ageBand,
  });
  const guestId = resolveGuestId();
  const alreadyDone = isMissionCompletedToday({
    guestId,
    missionId: mission.missionId,
  });
  const [phase, setPhase] = useState<Phase>(alreadyDone ? "success" : "play");
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!alreadyDone) {
      emitV2MissionStarted({
        missionId: mission.missionId,
        dateKey: localDateKey(),
        ageBand: mission.ageBand,
        worryId: mission.worry,
        duration: mission.duration,
        difficulty: mission.difficulty,
        estimatedMinutes: mission.estimatedMinutes,
      });
    }
  }, [
    alreadyDone,
    mission.missionId,
    mission.ageBand,
    mission.worry,
    mission.duration,
    mission.difficulty,
    mission.estimatedMinutes,
  ]);

  function handleComplete() {
    markMissionCompleted({ guestId, missionId: mission.missionId });
    emitV2MissionCompleted({
      missionId: mission.missionId,
      dateKey: localDateKey(),
      ageBand: mission.ageBand,
      worryId: mission.worry,
      evaluateNorthStars: true,
    });
    v2HapticSuccess(reduced);
    setPhase("success");
  }

  const who = childName || "your child";

  return (
    <AnimatePresence mode="sync">
      {phase === "success" ? (
        <motion.div
          key="success"
          variants={reduced ? fadeUp : fadeIn}
          initial={reduced ? false : "initial"}
          animate="animate"
          transition={reduced ? { duration: 0 } : V2_TRANSITION.card}
        >
          <MissionSuccess
            childName={childName}
            coachChallengeLabel={coachOffer?.challengeLabel ?? null}
            coachHref={coachOffer ? "/today/coach-plan" : null}
          />
        </motion.div>
      ) : (
        <motion.div
          key="play"
          {...v2LitProps(`${V2_SHELL} ${V2_SCROLL} ${V2_SCROLL_PAD}`)}
          data-testid="v2-today-mission-play"
          data-v2-room="practice-room"
          aria-labelledby="v2-mission-play-title"
          variants={reduced ? fadeUp : fadeIn}
          initial={reduced ? false : "initial"}
          animate="animate"
          exit={reduced ? undefined : "exit"}
          transition={reduced ? { duration: 0 } : V2_TRANSITION.card}
        >
          <header className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT}`}>
            <Link
              href="/today"
              aria-label={V2_EXIT.backToToday}
              data-testid="v2-today-mission-back"
              className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-muted-foreground hover:text-foreground`}
            >
              {V2_EXIT.backToToday}
            </Link>
            <p className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}>
              This moment is already yours.
            </p>
            <h1
              id="v2-mission-play-title"
              className={`${V2_TYPE.heroCompact} ${V2_MEASURE.hero}`}
              {...v2LawRole("hero")}
            >
              Be with {who}.
            </h1>
            <p
              className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}
              {...v2LawRole("support")}
            >
              {mission.summary}
            </p>
            <p
              className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}
              data-testid="v2-today-mission-title-whisper"
            >
              {mission.title}
            </p>
          </header>

          {/* Softest guidance — UI quiets as the family moment deepens */}
          <div
            className={`${V2_SPACE.mt4} ${V2_SPACE.stack2} ${V2_HIERARCHY_RECEDE}`}
            data-testid="v2-today-mission-steps"
          >
            {mission.steps.map((step) => (
              <p
                key={step}
                className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} ${V2_MEASURE.support}`}
              >
                {step}
              </p>
            ))}
          </div>

          <div className={`${V2_SPACE.mt4} ${V2_SPACE.actionPause}`}>
            <Button
              type="button"
              className={`${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta}`}
              data-testid="v2-today-mission-mark-complete"
              onClick={handleComplete}
              {...v2LawRole("primary")}
            >
              We&apos;re still together
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
