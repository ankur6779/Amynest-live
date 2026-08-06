/**
 * Child's Room — For Child · P5.
 * Question ONLY: What can my child discover next?
 *
 * Hope law: Never empty — expectant. Child already growing.
 * Amy quietly preparing. Patiently waiting — never unfinished.
 * Gate: imagines child's future = PASS · notices missing features = FAIL.
 *
 * Frozen: Threshold · Keep · Vestibule · Living · Practice · Study ·
 * Hearing · Continuity · Brain · routes · Treasury · Activities engine.
 */

import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useAuth, useUser } from "@/lib/firebase-auth-hooks";
import {
  getGuestSession,
  openGuestAccountRequiredSheet,
  shouldUseGuestAccountSheet,
} from "@/v2/guest";
import { isForChildV2Enabled } from "@/v2/entry/v2-shell-flags";
import { getTodaySpeechMission } from "@/v2/today/mission/speech-mission";
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
import {
  buildForChildDiscoverCta,
  buildForChildGuestCta,
  buildForChildHope,
} from "./for-child-copy";

export default function ForChildPage() {
  if (!isForChildV2Enabled()) {
    return <Redirect to="/parenting-hub" />;
  }

  return <ForChildShell />;
}

function ForChildShell() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const isGuest = shouldUseGuestAccountSheet({ isSignedIn, user });
  const session = getGuestSession();
  const name = session?.name?.trim() || "your child";
  const hope = buildForChildHope(session);
  const discoverCta = buildForChildDiscoverCta(session);
  const guestCta = buildForChildGuestCta(session);
  const living = getTodaySpeechMission(session);

  const lit = v2LitProps(`${V2_SHELL} ${V2_SCROLL} ${V2_SCROLL_PAD}`);

  return (
    <main
      {...lit}
      data-testid="v2-for-child-shell"
      data-v2-room="childs-room"
      data-guest={isGuest ? "true" : "false"}
      aria-labelledby="for-child-heading"
    >
      <header
        className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT}`}
        {...v2LawRole("hero")}
      >
        <div
          className={`flex items-center justify-center ${V2_ORB_EMIT}`}
          aria-hidden
        >
          <AmyMascotLogo size={56} />
        </div>
        <p className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}>
          A place waiting
        </p>
        <h1
          id="for-child-heading"
          data-testid="v2-for-child-heading"
          className={V2_TYPE.heroCompact}
        >
          For {name}
        </h1>
        <p
          className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}
          data-testid="v2-for-child-hope"
          role="status"
          {...v2LawRole("support")}
        >
          {hope}
        </p>
      </header>

      {/* One living next breath — existing practice, wonder framing */}
      <section
        className={`${V2_SPACE.mt4} ${V2_SPACE.stack3}`}
        data-testid="v2-for-child-living"
        aria-labelledby="v2-for-child-living-title"
      >
        <p className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}>
          Small discovery
        </p>
        <h2
          id="v2-for-child-living-title"
          className={`${V2_TYPE.body} ${V2_MEASURE.support}`}
        >
          {living.title}
        </h2>
        <p className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}>{living.summary}</p>
        <div className={`flex flex-col items-start ${V2_SPACE.ctaStack}`}>
          <Button
            asChild
            className={`${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta}`}
          >
            <Link
              href="/today/mission"
              data-testid="v2-for-child-discover"
              aria-label={discoverCta}
              {...v2LawRole("primary")}
            >
              {discoverCta}
            </Link>
          </Button>
          <Link
            href="/today"
            data-testid="v2-for-child-back-today"
            className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-muted-foreground hover:text-foreground`}
          >
            {V2_EXIT.backToToday}
          </Link>
        </div>
      </section>

      {isGuest ? (
        <div
          className={`${V2_SPACE.mt4} ${V2_HIERARCHY_WHISPER}`}
          data-testid="v2-for-child-guest-gate"
        >
          <button
            type="button"
            className={`${V2_TYPE.caption} text-muted-foreground hover:text-foreground`}
            data-testid="v2-for-child-save-cta"
            aria-label={guestCta}
            onClick={() => openGuestAccountRequiredSheet("for_child")}
          >
            {guestCta}
          </button>
        </div>
      ) : null}
    </main>
  );
}
