/**
 * Living Room (Today) — Nest Presence translation.
 * Question: What matters today?
 * Law of Three: one hero · one Bloom (Mission) · one Amy support.
 * Coach · Ask Amy · Premium remain as whispers — never peer modules.
 */

import { Link, Redirect } from "wouter";
import { motion } from "framer-motion";
import { useAmyCoachCheckIn } from "@/hooks/use-amy-coach-check-in";
import { useCoachJourney } from "@/hooks/use-coach-journey";
import { useAuth, useUser } from "@/lib/firebase-auth-hooks";
import { getGuestSession, GuestAccountCta, shouldUseGuestAccountSheet } from "@/v2/guest";
import { isTodayV2Enabled } from "@/v2/entry/v2-shell-flags";
import { isPremiumV2Enabled } from "@/v2/premium/flags";
import {
  CoachDiscoveryCard,
  readPreparedCoachPlan,
  resolveCoachDiscoveryOffer,
  resolveGuestCoachCard,
  resolveSignedInCoachCard,
  TODAY_COACH_SECTION_ID,
} from "@/v2/coach-discovery";
import { buildAskAmyEntryCta } from "@/v2/ask-amy/entry-copy";
import {
  fadeUp,
  useReducedMotion,
  V2_HERO_LIGHT,
  V2_HIERARCHY_WHISPER,
  V2_MEASURE,
  V2_PRESS_GHOST,
  V2_SCROLL,
  V2_SCROLL_PAD,
  V2_SHELL,
  V2_SPACE,
  V2_TRANSITION,
  V2_TYPE,
  v2LawRole,
  v2LitProps,
} from "@/v2/craft";
import { buildTodayGreeting } from "./content/greeting";
import { buildTodayMessage } from "./content/message";
import { getTodayHeroSource } from "./hero-activation";
import { isMissionCompletedToday } from "./mission/completion";
import { MissionSection } from "./mission/MissionSection";
import { getTodaySpeechMission } from "./mission/speech-mission";

/** Stable semantic section ids — do not rename without migration. */
export const TODAY_SECTION_IDS = {
  shell: "v2-today-shell",
  header: "v2-today-header",
  focus: "v2-today-focus",
  greeting: "v2-today-greeting",
  message: "v2-today-message",
  mission: "v2-today-mission",
  askAmy: "v2-today-ask-amy",
  /** Sole Premium entry when premium_v2 is on (Phase 4B). */
  premium: "v2-today-premium",
  /** Earned Amy Coach discovery (worry-mapped). */
  coach: TODAY_COACH_SECTION_ID,
} as const;

export default function TodayPage() {
  if (!isTodayV2Enabled()) {
    return <Redirect to="/dashboard" />;
  }

  return <TodayShell />;
}

function TodayShell() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const isGuest = shouldUseGuestAccountSheet({ isSignedIn, user });
  const session = getGuestSession();
  const childName = session?.name?.trim() || null;
  const greeting = buildTodayGreeting(session);
  const message = buildTodayMessage(session);
  const mission = getTodaySpeechMission(session);
  const askAmyCta = buildAskAmyEntryCta(session?.worry);
  const guestId = session?.guestId ?? "anonymous";
  const completed = isMissionCompletedToday({
    guestId,
    missionId: mission.missionId,
  });
  const reduced = useReducedMotion();
  const coachOffer = resolveCoachDiscoveryOffer({
    worry: session?.worry,
    ageBand: session?.ageBand,
  });
  const preparedCoach = readPreparedCoachPlan();
  const { primarySession } = useAmyCoachCheckIn();
  const { completedGoalIds } = useCoachJourney();

  const coachPresentation =
    coachOffer == null
      ? null
      : isGuest
        ? resolveGuestCoachCard({
            offer: coachOffer,
            prepared: preparedCoach,
            childName,
          })
        : resolveSignedInCoachCard({
            offer: coachOffer,
            hasActiveOrPausedSession: Boolean(primarySession),
            resumeSessionId: primarySession?.sessionId ?? null,
            hasCompletedJourney:
              !primarySession && completedGoalIds.length > 0,
            childName,
          });

  const lit = v2LitProps(`${V2_SHELL} ${V2_SCROLL} ${V2_SCROLL_PAD}`);

  return (
    <motion.div
      id={TODAY_SECTION_IDS.shell}
      {...lit}
      data-testid="v2-today-shell"
      data-v2-room="living-room"
      aria-labelledby={TODAY_SECTION_IDS.greeting}
      initial={reduced ? false : "initial"}
      animate={reduced ? undefined : "animate"}
      variants={reduced ? undefined : fadeUp}
      transition={V2_TRANSITION.page}
    >
      <header
        id={TODAY_SECTION_IDS.header}
        className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT} ${V2_SPACE.mb4}`}
      >
        <p className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}>Today</p>
        <h1
          id={TODAY_SECTION_IDS.greeting}
          className={`${V2_TYPE.heroCompact} ${V2_MEASURE.hero}`}
          data-testid="v2-today-greeting"
          {...v2LawRole("hero")}
        >
          {greeting.headline}
        </h1>
        {greeting.subline ? (
          <p
            className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}
            data-testid="v2-today-greeting-subline"
          >
            {greeting.subline}
          </p>
        ) : null}
        <p
          id={TODAY_SECTION_IDS.message}
          className={V2_TYPE.bodyMuted}
          data-testid="v2-today-message"
          {...v2LawRole("support")}
        >
          {message}
        </p>
      </header>

      <MissionSection
        mission={mission}
        completed={completed}
        sectionId={TODAY_SECTION_IDS.mission}
        /* A9.4: source attribute only — flag OFF ⇒ legacy; no visual redesign. */
        heroSource={getTodayHeroSource()}
      />

      {/* Functional exits — whisper only. Never Soft Plate. Never peer Bloom. */}
      <nav
        className={`${V2_SPACE.mt4} ${V2_SPACE.stack2} ${V2_HIERARCHY_WHISPER}`}
        aria-label="More with Amy"
      >
        {coachOffer && coachPresentation ? (
          <CoachDiscoveryCard
            offer={coachOffer}
            presentation={coachPresentation}
          />
        ) : null}

        <div
          id={TODAY_SECTION_IDS.askAmy}
          className={V2_SPACE.pt1}
          data-testid="v2-today-ask-amy"
          {...v2LawRole("recede")}
        >
          <GuestAccountCta
            href="/ask-amy"
            variant="link"
            className={`${V2_TYPE.caption} ${V2_PRESS_GHOST} h-auto min-h-0 p-0 text-muted-foreground`}
            testId="v2-today-ask-amy-entry"
            ariaLabel={askAmyCta}
            sheetIntent="ask_amy"
          >
            {askAmyCta}
          </GuestAccountCta>
        </div>

        {isPremiumV2Enabled() ? (
          <div
            id={TODAY_SECTION_IDS.premium}
            className={V2_SPACE.pt1}
            data-testid="v2-today-premium"
            {...v2LawRole("recede")}
          >
            <Link
              href="/premium"
              data-testid="v2-today-premium-entry"
              className={`${V2_TYPE.caption} text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline`}
            >
              Save progress &amp; continue
            </Link>
          </div>
        ) : null}
      </nav>
    </motion.div>
  );
}
