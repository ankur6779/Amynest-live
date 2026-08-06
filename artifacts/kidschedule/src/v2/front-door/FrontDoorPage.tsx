/**
 * Vestibule — Front Door (P0.2).
 * Question ONLY: Am I welcome here?
 *
 * Welcome law: never software / onboarding.
 * Conversation law: questions invisible · understanding visible.
 * Pace law: never "how many steps left?" · only "what is Amy understanding?"
 * Progress is Amy's — never expose process. Expose understanding.
 *
 * State machine · guest memory · routing frozen — presentation only.
 */

import { useEffect, useId, useState } from "react";
import { Link, Redirect } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import {
  ensureProductAnalyticsReady,
  markFrontDoorStarted,
} from "@/lib/analytics/v2-product";
import {
  advanceFrontDoorFromBreath,
  ensureGuestSession,
  setGuestAgeBand,
  setGuestChildName,
  setGuestWorry,
  type V2GuestSession,
} from "@/v2/guest";
import { shouldLandGuestOnToday } from "@/v2/entry/guest-access";
import { isTodayV2Enabled } from "@/v2/entry/v2-shell-flags";
import { shouldEnterFrontDoor } from "@/v2/entry/should-enter-front-door";
import {
  fadeIn,
  useReducedMotion,
  v2HapticLight,
  v2LitProps,
  V2_ATMOSPHERE,
  V2_BLOOM_LIGHT,
  V2_CTA,
  V2_FIELD,
  V2_HERO_LIGHT,
  V2_HIERARCHY_WHISPER,
  V2_INPUT,
  V2_LAYOUT,
  V2_MEASURE,
  V2_ORB_EMIT,
  V2_PRESS_PRIMARY,
  V2_SCROLL,
  V2_SCROLL_PAD,
  V2_SHELL,
  V2_SPACE,
  V2_TRANSITION,
  V2_TYPE,
  v2LawRole,
} from "@/v2/craft";
import { FRONT_DOOR_AGE_OPTIONS } from "./age-options";
import {
  FrontDoorState,
  resumeFrontDoorState,
  type FrontDoorStateId,
} from "./state-machine";
import type { FrontDoorAgeBand, FrontDoorWorryId } from "./types";
import { FRONT_DOOR_WORRY_OPTIONS } from "./worry-options";

const WELCOME_BLOOM = `${V2_CTA} ${V2_BLOOM_LIGHT} bg-primary text-primary-foreground hover:bg-primary/90 ${V2_PRESS_PRIMARY} ${V2_TYPE.cta}`;

/** Quiet reply — never Soft Plate survey rows. */
const CONVERSATION_REPLY = `${V2_TYPE.bodyMuted} w-full ${V2_SPACE.py2} text-left transition-colors hover:text-foreground bg-transparent border-0 cursor-pointer ${V2_HIERARCHY_WHISPER}`;

/** What Amy understands now — never step/process language. */
const UNDERSTANDING: Record<FrontDoorStateId, string> = {
  [FrontDoorState.BREATH]: "Amy is with you.",
  [FrontDoorState.AGE]: "Amy is beginning to picture your child.",
  [FrontDoorState.NAME]: "Amy is learning who they are.",
  [FrontDoorState.WORRY]: "Amy is slowly understanding.",
  [FrontDoorState.COMPLETE]: "Amy already understands.",
};

export default function FrontDoorPage() {
  if (!shouldEnterFrontDoor()) {
    return <Redirect to="/" />;
  }
  if (shouldLandGuestOnToday()) {
    return <Redirect to="/today" />;
  }

  return <FrontDoorFlow />;
}

function FrontDoorFlow() {
  const [session, setSession] = useState<V2GuestSession | null>(null);
  const [state, setState] = useState<FrontDoorStateId>(FrontDoorState.BREATH);
  const [nameDraft, setNameDraft] = useState("");
  const titleId = useId();
  const reduced = useReducedMotion();

  useEffect(() => {
    const ensured = ensureGuestSession();
    setSession(ensured);
    setState(
      resumeFrontDoorState({
        state: ensured?.state,
        ageBand: ensured?.ageBand,
        worry: ensured?.worry,
      }),
    );
    setNameDraft(ensured?.name ?? "");
    ensureProductAnalyticsReady({ guestId: ensured?.guestId ?? null });
    markFrontDoorStarted();
  }, []);

  const lit = v2LitProps(
    `${V2_SHELL} ${V2_SCROLL} ${V2_SCROLL_PAD} ${V2_ATMOSPHERE} text-foreground ${V2_LAYOUT.viewport}`,
  );

  return (
    <main
      {...lit}
      aria-labelledby={titleId}
      data-front-door-state={state}
      data-v2-room="vestibule"
      data-testid="v2-vestibule-shell"
    >
      <p
        className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}
        data-testid="v2-vestibule-understanding"
        aria-live="polite"
      >
        {UNDERSTANDING[state]}
      </p>

      <div className={`${V2_SPACE.mt3} flex flex-1 flex-col`}>
        <AnimatePresence mode="sync">
          <motion.div
            key={state}
            className="flex flex-1 flex-col"
            variants={fadeIn}
            initial={reduced ? false : "initial"}
            animate="animate"
            exit={reduced ? undefined : "exit"}
            transition={
              reduced
                ? { duration: 0 }
                : V2_TRANSITION.card
            }
          >
            {state === FrontDoorState.BREATH && (
              <BreathStep
                titleId={titleId}
                onContinue={() => {
                  v2HapticLight(reduced);
                  const next = advanceFrontDoorFromBreath();
                  setSession(next);
                  setState(next?.state ?? FrontDoorState.AGE);
                }}
              />
            )}
            {state === FrontDoorState.AGE && (
              <AgeStep
                titleId={titleId}
                selected={session?.ageBand ?? null}
                onSelect={(ageBand) => {
                  v2HapticLight(reduced);
                  const next = setGuestAgeBand(ageBand);
                  setSession(next);
                  setState(next?.state ?? FrontDoorState.NAME);
                }}
              />
            )}
            {state === FrontDoorState.NAME && (
              <NameStep
                titleId={titleId}
                value={nameDraft}
                onChange={setNameDraft}
                onSkip={() => {
                  v2HapticLight(reduced);
                  const next = setGuestChildName(null);
                  setSession(next);
                  setState(next?.state ?? FrontDoorState.WORRY);
                }}
                onContinue={() => {
                  v2HapticLight(reduced);
                  const next = setGuestChildName(nameDraft);
                  setSession(next);
                  setState(next?.state ?? FrontDoorState.WORRY);
                }}
              />
            )}
            {state === FrontDoorState.WORRY && (
              <WorryStep
                titleId={titleId}
                childName={session?.name}
                onSelect={(worryId) => {
                  v2HapticLight(reduced);
                  const next = setGuestWorry(worryId);
                  setSession(next);
                  setState(next?.state ?? FrontDoorState.COMPLETE);
                }}
              />
            )}
            {state === FrontDoorState.COMPLETE && (
              <FoundationCompleteStep titleId={titleId} session={session} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

function BreathStep({
  titleId,
  onContinue,
}: {
  titleId: string;
  onContinue: () => void;
}) {
  return (
    <section className={`flex flex-1 flex-col ${V2_SPACE[4]}`}>
      <div className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT}`}>
        <div
          className={`mx-auto flex items-center justify-center ${V2_ORB_EMIT}`}
          aria-hidden
        >
          <AmyMascotLogo size={56} />
        </div>
        <h1
          id={titleId}
          className={`${V2_TYPE.heroCompact} text-foreground`}
          {...v2LawRole("hero")}
        >
          You&apos;re welcome here.
        </h1>
        <p
          className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}
          {...v2LawRole("support")}
        >
          Amy is making a little room for you — no rush.
        </p>
      </div>
      <Button
        type="button"
        className={WELCOME_BLOOM}
        onClick={onContinue}
        {...v2LawRole("primary")}
      >
        I&apos;m here
      </Button>
    </section>
  );
}

function AgeStep({
  titleId,
  selected,
  onSelect,
}: {
  titleId: string;
  selected: FrontDoorAgeBand | null;
  onSelect: (id: FrontDoorAgeBand) => void;
}) {
  return (
    <section className={`flex flex-1 flex-col ${V2_SPACE[4]}`}>
      <div className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT}`}>
        <h1 id={titleId} className={V2_TYPE.heroCompact}>
          Amy is beginning to picture your child.
        </h1>
        <p className={V2_TYPE.bodyMuted}>Something like this…</p>
      </div>
      <ul className={`flex flex-col ${V2_SPACE.stack1}`} role="list">
        {FRONT_DOOR_AGE_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`${option.hint}. ${option.label}`}
                className={`${CONVERSATION_REPLY} ${
                  isSelected ? "text-foreground" : ""
                }`}
                onClick={() => onSelect(option.id)}
              >
                {option.hint}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NameStep({
  titleId,
  value,
  onChange,
  onSkip,
  onContinue,
}: {
  titleId: string;
  value: string;
  onChange: (v: string) => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const inputId = useId();
  return (
    <section className={`flex flex-1 flex-col ${V2_SPACE[4]}`}>
      <div className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT}`}>
        <h1 id={titleId} className={V2_TYPE.heroCompact}>
          Amy is learning who they are.
        </h1>
        <p className={V2_TYPE.bodyMuted}>
          A name, if it wants to be spoken — quiet is welcome too.
        </p>
        <label htmlFor={inputId} className="sr-only">
          Child&apos;s name
        </label>
        <input
          id={inputId}
          type="text"
          autoComplete="nickname"
          maxLength={40}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Their name"
          className={`w-full ${V2_FIELD} ${V2_SPACE.rowPad} ${V2_TYPE.body} text-foreground ${V2_INPUT}`}
        />
      </div>
      <div className={`flex flex-col ${V2_SPACE.ctaStack}`}>
        <Button
          type="button"
          className={WELCOME_BLOOM}
          onClick={onContinue}
          {...v2LawRole("primary")}
        >
          Stay with this
        </Button>
        <button
          type="button"
          className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-muted-foreground hover:text-foreground self-start`}
          onClick={onSkip}
        >
          Prefer not to say
        </button>
      </div>
    </section>
  );
}

function WorryStep({
  titleId,
  childName,
  onSelect,
}: {
  titleId: string;
  childName: string | null | undefined;
  onSelect: (id: FrontDoorWorryId) => void;
}) {
  const who = childName?.trim() ? childName.trim() : "your child";
  return (
    <section className={`flex flex-1 flex-col ${V2_SPACE[4]}`}>
      <div className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT}`}>
        <h1 id={titleId} className={V2_TYPE.heroCompact}>
          Amy is slowly understanding {who}.
        </h1>
        <p className={V2_TYPE.bodyMuted}>If this feels close…</p>
      </div>
      <ul className={`flex flex-col ${V2_SPACE.stack1}`} role="list">
        {FRONT_DOOR_WORRY_OPTIONS.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className={CONVERSATION_REPLY}
              onClick={() => onSelect(option.id)}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FoundationCompleteStep({
  titleId,
  session,
}: {
  titleId: string;
  session: V2GuestSession | null;
}) {
  const who = session?.name?.trim() || "your child";
  const worryLabel =
    FRONT_DOOR_WORRY_OPTIONS.find((o) => o.id === session?.worry)?.label ??
    null;
  const todayOn = isTodayV2Enabled();
  return (
    <section className={`flex flex-1 flex-col ${V2_SPACE[4]}`}>
      <div className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT}`}>
        <div
          className={`mx-auto flex items-center justify-center ${V2_ORB_EMIT}`}
          aria-hidden
        >
          <AmyMascotLogo size={48} />
        </div>
        <h1 id={titleId} className={V2_TYPE.heroCompact}>
          Amy already understands.
        </h1>
        <p className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}>
          {worryLabel
            ? `About ${worryLabel} for ${who} — you're not alone in this.`
            : `What you shared for ${who} stays held.`}
        </p>
      </div>
      {todayOn ? (
        <Button
          asChild
          className={WELCOME_BLOOM}
          {...v2LawRole("primary")}
        >
          <Link href="/today" data-testid="v2-front-door-continue-today">
            Come into Today
          </Link>
        </Button>
      ) : (
        <p className={`${V2_TYPE.caption} text-muted-foreground`}>
          Today will open when it is enabled for your build.
        </p>
      )}
    </section>
  );
}
