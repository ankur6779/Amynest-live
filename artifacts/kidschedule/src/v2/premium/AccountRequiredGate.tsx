/**
 * Continuity Room — guest gate · P4.
 * Letter to stay — never boxed upsell · never checkout door.
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import {
  fadeIn,
  useReducedMotion,
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
  V2_TRANSITION,
  V2_TYPE,
  v2LawRole,
  v2LitProps,
} from "@/v2/craft";
import { getGuestSession } from "@/v2/guest";
import {
  buildPremiumAccountRequiredMessage,
  setPostAuthReturnPath,
} from "@/v2/guest/soft-save";
import { FRONT_DOOR_WORRY_OPTIONS } from "@/v2/front-door/worry-options";

function stashPremiumReturn() {
  setPostAuthReturnPath("/premium");
}

export function AccountRequiredGate() {
  const reduced = useReducedMotion();
  const session = getGuestSession();
  const name = session?.name?.trim() || null;
  const concern =
    FRONT_DOOR_WORRY_OPTIONS.find((o) => o.id === session?.worry)?.label ?? null;
  const message = buildPremiumAccountRequiredMessage(session);
  const headline =
    name && concern
      ? `Stay with ${name}'s ${concern}`
      : concern
        ? `Stay with your ${concern}`
        : "Stay with Amy";

  const lit = v2LitProps(`${V2_SHELL} ${V2_SCROLL} ${V2_SCROLL_PAD}`);

  return (
    <main
      {...lit}
      data-testid="v2-premium-account-required"
      data-v2-room="continuity"
      aria-labelledby="v2-premium-account-heading"
    >
      <motion.div
        className={`${V2_SPACE.sectionStack} ${V2_HERO_LIGHT}`}
        variants={reduced ? undefined : fadeIn}
        initial={reduced ? false : "initial"}
        animate={reduced ? undefined : "animate"}
        transition={reduced ? { duration: 0 } : V2_TRANSITION.card}
      >
        <header className={V2_SPACE.heroStack} {...v2LawRole("hero")}>
          <div
            className={`flex items-center justify-center ${V2_ORB_EMIT}`}
            aria-hidden
          >
            <AmyMascotLogo size={48} />
          </div>
          <p className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}>
            Amy asks to remain present
          </p>
          <h1 id="v2-premium-account-heading" className={V2_TYPE.heroCompact}>
            {headline}
          </h1>
          <p
            className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}
            data-testid="v2-premium-account-required-message"
            {...v2LawRole("support")}
          >
            {message}
          </p>
        </header>

        <div
          className={`flex flex-col items-start ${V2_SPACE.ctaStack} ${V2_SPACE.pt2}`}
        >
          <Button
            asChild
            className={`${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta} w-full ${V2_MEASURE.support}`}
          >
            <Link
              href="/sign-up"
              data-testid="v2-premium-create-account"
              onClick={stashPremiumReturn}
              {...v2LawRole("primary")}
            >
              Let Amy stay
            </Link>
          </Button>
          <Link
            href="/sign-in"
            data-testid="v2-premium-sign-in"
            onClick={stashPremiumReturn}
            className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-muted-foreground hover:text-foreground`}
          >
            Return to your place
          </Link>
          <Link
            href="/today"
            data-testid="v2-premium-back-today"
            className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-muted-foreground hover:text-foreground`}
          >
            {V2_EXIT.backToToday}
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
