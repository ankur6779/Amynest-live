/**
 * Hearing Room — Ask Amy · P3.
 * Question ONLY: Can Amy help me right now?
 *
 * Listening law: Amy listens before she answers.
 * Speech law: Amy never waits for the perfect question —
 * understands imperfect words. Parent carries only the truth.
 * Gate: edits themselves → FAIL · simply speaks → PASS.
 *
 * Frozen: Threshold · Keep · Vestibule · Living · Practice · Study ·
 * LLM · Assistant engine · routes · APIs · analytics.
 * Living Room entry CTA (`buildAskAmyEntryCta`) untouched.
 */

import { useState } from "react";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useAuth, useUser } from "@/lib/firebase-auth-hooks";
import { isAskAmyV2Enabled } from "@/v2/entry/v2-shell-flags";
/** Existing Ask Amy — black box; no AI / prompt / streaming changes. */
import AssistantBlackBox from "@/pages/assistant";
import {
  getGuestSession,
  openGuestAccountRequiredSheet,
  shouldUseGuestAccountSheet,
} from "@/v2/guest";
import {
  V2_CTA,
  V2_EXIT,
  V2_HERO_LIGHT,
  V2_HIERARCHY_WHISPER,
  V2_LAYOUT,
  V2_MEASURE,
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
import {
  buildAskAmyPageHeadline,
  buildAskAmyStartCta,
  buildAskAmySupport,
} from "./entry-copy";

export default function AskAmyPage() {
  if (!isAskAmyV2Enabled()) {
    return <Redirect to="/assistant" />;
  }

  return <AskAmyShell />;
}

function AskAmyShell() {
  const [showConversation, setShowConversation] = useState(false);
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const isGuest = shouldUseGuestAccountSheet({ isSignedIn, user });
  const session = getGuestSession();
  const headline = buildAskAmyPageHeadline(session);
  const support = buildAskAmySupport(session);
  const startCta = buildAskAmyStartCta(session?.worry);

  /** Help first — guests enter conversation; soft-save whispers after. */
  function beginConversation() {
    setShowConversation(true);
  }

  const lit = v2LitProps(`${V2_SHELL} ${V2_SCROLL} ${V2_SCROLL_PAD}`);

  if (showConversation) {
    return (
      <main
        {...lit}
        data-testid="v2-ask-amy-shell"
        data-v2-room="hearing"
        data-guest={isGuest ? "true" : "false"}
        aria-labelledby="ask-amy-heading"
      >
        <section
          className={`${V2_LAYOUT.stage} flex flex-col`}
          aria-label="Amy is listening"
          data-testid="v2-ask-amy-conversation"
        >
          <header
            className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT} ${V2_SPACE.mb3}`}
            {...v2LawRole("hero")}
          >
            <div
              className={`flex items-center justify-center ${V2_ORB_EMIT}`}
              aria-hidden
            >
              <AmyMascotLogo size={40} />
            </div>
            <p className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}>
              Just speak — Amy understands
            </p>
            <h1
              id="ask-amy-heading"
              className={`${V2_TYPE.heroCompact} ${V2_MEASURE.hero}`}
              data-testid="v2-ask-amy-heading"
            >
              {headline}
            </h1>
          </header>
          <div
            className={`flex flex-wrap items-center justify-between ${V2_SPACE[2]} ${V2_HIERARCHY_WHISPER}`}
          >
            <Link
              href="/today"
              data-testid="v2-ask-amy-leave-conversation"
              className={`${V2_TYPE.caption} text-muted-foreground hover:text-foreground`}
            >
              {V2_EXIT.backToToday}
            </Link>
            {isGuest ? (
              <button
                type="button"
                className={`${V2_TYPE.caption} text-muted-foreground hover:text-foreground`}
                data-testid="v2-ask-amy-save-whisper"
                onClick={() => openGuestAccountRequiredSheet("ask_amy")}
              >
                Save your place
              </button>
            ) : null}
          </div>
          <div
            className={`v2-hearing-engine flex-1 ${V2_LAYOUT.supportStage}`}
            {...v2LawRole("support")}
          >
            <AssistantBlackBox />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      {...lit}
      data-testid="v2-ask-amy-shell"
      data-v2-room="hearing"
      data-guest={isGuest ? "true" : "false"}
      aria-labelledby="ask-amy-heading"
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
          No perfect words needed
        </p>
        <h1
          id="ask-amy-heading"
          className={`${V2_TYPE.heroCompact} ${V2_MEASURE.hero}`}
          data-testid="v2-ask-amy-heading"
        >
          {headline}
        </h1>
        <p
          className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}
          data-testid="v2-ask-amy-support"
          {...v2LawRole("support")}
        >
          {support}
        </p>
      </header>

      <div
        className={`flex flex-col items-start ${V2_SPACE.ctaStack} ${V2_SPACE.mt4}`}
        aria-label="Help right now"
      >
        <Button
          type="button"
          className={`${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta}`}
          data-testid="v2-ask-amy-start"
          onClick={beginConversation}
          {...v2LawRole("primary")}
        >
          {startCta}
        </Button>
        <Link
          href="/today"
          data-testid="v2-ask-amy-back"
          className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-muted-foreground hover:text-foreground`}
        >
          {V2_EXIT.backToToday}
        </Link>
      </div>
    </main>
  );
}
