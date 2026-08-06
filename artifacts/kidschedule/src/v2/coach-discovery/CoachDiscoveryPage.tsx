/**
 * Study — Amy Coach (guest discovery) · P2.
 * Question ONLY: Am I truly being understood?
 *
 * Reassurance law: Amy never impresses — Amy reassures.
 * Understanding law: Coach never demonstrates intelligence — only understanding.
 * Care law: Plans are never outputs — care already taking shape.
 * Gate: parent notices AI → FAIL · parent feels understood → PASS.
 *
 * Brain · routes · soft-save · Keep handoff frozen — presentation only.
 */

import { useMemo, useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { getGuestSession } from "@/v2/guest";
import { setPostAuthReturnPath } from "@/v2/guest/soft-save";
import { isTodayV2Enabled } from "@/v2/entry/v2-shell-flags";
import {
  V2_CTA,
  V2_MEASURE,
  V2_EXIT,
  V2_HERO_LIGHT,
  V2_HIERARCHY_WHISPER,
  V2_ORB_EMIT,
  V2_PRESS_PRIMARY,
  V2_SCROLL,
  V2_SCROLL_PAD,
  V2_SHELL,
  V2_SPACE,
  V2_TYPE,
  v2LawRole,
  v2LitProps,
} from "@/v2/craft";
import { buildCoachReadyGate } from "./coach-card-state";
import {
  markPreparedCoachPlanGateDismissed,
  readPreparedCoachPlan,
  savePreparedCoachPlan,
  stashCoachDiscoverGoal,
} from "./prepared-plan";
import { resolveCoachDiscoveryOffer } from "./worry-map";

type Phase = "confirm" | "ready";

export default function CoachDiscoveryPage() {
  if (!isTodayV2Enabled()) {
    return <Redirect to="/dashboard" />;
  }
  return <CoachDiscoveryShell />;
}

function CoachDiscoveryShell() {
  const [, setLocation] = useLocation();
  const session = getGuestSession();
  const childName = session?.name?.trim() || null;
  const offer = useMemo(
    () =>
      resolveCoachDiscoveryOffer({
        worry: session?.worry,
        ageBand: session?.ageBand,
      }),
    [session?.worry, session?.ageBand],
  );

  const existing = readPreparedCoachPlan();
  const [phase, setPhase] = useState<Phase>(() =>
    existing && existing.goalId === offer?.goalId ? "ready" : "confirm",
  );

  if (!offer) {
    return <Redirect to="/today" />;
  }

  function enterReady() {
    savePreparedCoachPlan({
      goalId: offer!.goalId,
      goalTitle: offer!.goalTitle,
      categoryId: offer!.categoryId,
      worryId: offer!.worryId,
      challengeLabel: offer!.challengeLabel,
      gateDismissed: false,
    });
    setPhase("ready");
  }

  if (phase === "ready") {
    const readyGate = buildCoachReadyGate(offer.challengeLabel, childName);
    const litReady = v2LitProps(`${V2_SHELL} ${V2_SCROLL} ${V2_SCROLL_PAD}`);
    return (
      <main
        {...litReady}
        data-testid="v2-coach-discovery-ready"
        data-v2-room="study"
        aria-labelledby="v2-coach-plan-ready-title"
      >
        <header
          className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT}`}
          {...v2LawRole("hero")}
        >
          <div
            className={`flex items-center justify-center ${V2_ORB_EMIT}`}
            aria-hidden
          >
            <AmyMascotLogo size={48} />
          </div>
          <p className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}>
            Care taking shape
          </p>
          <h1
            id="v2-coach-plan-ready-title"
            className={V2_TYPE.heroCompact}
          >
            {readyGate.headline}
          </h1>
          <p
            className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}
            {...v2LawRole("support")}
          >
            {readyGate.body}
          </p>
        </header>
        <div
          className={`flex flex-col items-start ${V2_SPACE.ctaStack} ${V2_SPACE.mt4}`}
        >
          <Button
            type="button"
            className={`${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta} w-full ${V2_MEASURE.support}`}
            data-testid="v2-coach-discovery-continue"
            onClick={() => {
              stashCoachDiscoverGoal(offer.goalId);
              setPostAuthReturnPath("/amy-coach");
              setLocation("/sign-up");
            }}
            {...v2LawRole("primary")}
          >
            Stay with Amy
          </Button>
          <p
            className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} ${V2_MEASURE.support}`}
          >
            {readyGate.accountWhisper}
          </p>
          <button
            type="button"
            className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-muted-foreground hover:text-foreground`}
            data-testid="v2-coach-discovery-not-now"
            onClick={() => {
              markPreparedCoachPlanGateDismissed();
              setLocation("/today");
            }}
          >
            {V2_EXIT.notRightNow}
          </button>
        </div>
      </main>
    );
  }

  const litConfirm = v2LitProps(`${V2_SHELL} ${V2_SCROLL} ${V2_SCROLL_PAD}`);
  const who = childName || "your family";
  return (
    <main
      {...litConfirm}
      data-testid="v2-coach-discovery-confirm"
      data-v2-room="study"
      aria-labelledby="v2-coach-confirm-title"
    >
      <header
        className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT}`}
        {...v2LawRole("hero")}
      >
        <div
          className={`flex items-center justify-center ${V2_ORB_EMIT}`}
          aria-hidden
        >
          <AmyMascotLogo size={48} />
        </div>
        <p className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}>
          You're not alone in this
        </p>
        <h1 id="v2-coach-confirm-title" className={V2_TYPE.heroCompact}>
          Amy already understands {who}.
        </h1>
        <p
          className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}
          {...v2LawRole("support")}
        >
          About{" "}
          <span className="text-foreground">{offer.challengeLabel}</span>
          {childName ? (
            <>
              {" "}
              for <span className="text-foreground">{childName}</span>
            </>
          ) : null}
          . A little care is already taking shape — quietly, for your family.
        </p>
      </header>
      <div className={`flex flex-col items-start ${V2_SPACE.ctaStack} ${V2_SPACE.mt4}`}>
        <Button
          type="button"
          className={`${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta}`}
          data-testid="v2-coach-discovery-confirm-cta"
          onClick={enterReady}
          {...v2LawRole("primary")}
        >
          Continue gently
        </Button>
        <Link
          href="/today"
          data-testid="v2-coach-discovery-back-today"
          className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-muted-foreground hover:text-foreground`}
        >
          {V2_EXIT.backToToday}
        </Link>
      </div>
    </main>
  );
}
