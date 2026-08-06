/**
 * Continuity Room — Premium presentation · P4.
 * Question ONLY: Should I stay?
 *
 * Continuity law: Amy never asks for money — asks to remain present.
 * Premium is permission to continue caring — never an upgrade.
 * Plans never compared. Pricing noticed → FAIL · continuity noticed → PASS.
 *
 * Plans / restore / purchase handlers unchanged (billing frozen).
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import type { PlanCard } from "@/hooks/use-subscription";
import {
  V2_BUSY,
  V2_CTA,
  V2_MEASURE,
  V2_EXIT,
  V2_HERO_LIGHT,
  V2_ORB_EMIT,
  V2_PREPARE_COPY,
  V2_PRESS_PRIMARY,
  V2_PULSE_BAR,
  V2_SCROLL,
  V2_SCROLL_PAD,
  V2_HIERARCHY_WHISPER,
  V2_SHELL,
  V2_SPACE,
  V2_TYPE,
  v2LawRole,
  v2LitProps,
} from "@/v2/craft";
import { V2InlinePrepare } from "@/v2/shell/V2CalmPrepare";
import { getGuestSession } from "@/v2/guest";
import { FRONT_DOOR_WORRY_OPTIONS } from "@/v2/front-door/worry-options";
import {
  buildContinuityPlanPlaceLabel,
  buildPremiumJourneySupport,
  PREMIUM_ALREADY_BODY,
  PREMIUM_ALREADY_HEADLINE,
  PREMIUM_OFFLINE_GENERAL,
  PREMIUM_OFFLINE_RETRY_LABEL,
  PREMIUM_SUCCESS_BODY,
  PREMIUM_SUCCESS_HEADLINE,
} from "./copy";
import type { PremiumJourneyState, PremiumPurchasePlan } from "./types";

type PremiumJourneyProps = {
  state: PremiumJourneyState;
  plans: PlanCard[];
  selectedPlan: PremiumPurchasePlan;
  onSelectPlan: (plan: PremiumPurchasePlan) => void;
  onPurchase: () => void;
  onRestore: () => void;
  onRetry: () => void;
  onDismissCancel: () => void;
  busy?: boolean;
};

export function PremiumJourney({
  state,
  plans,
  selectedPlan,
  onSelectPlan,
  onPurchase,
  onRestore,
  onRetry,
  onDismissCancel,
  busy = false,
}: PremiumJourneyProps) {
  const phase = state.phase;
  const isBusy =
    busy || phase === "purchasing" || phase === "restoring" || phase === "loading";
  const session = getGuestSession();
  const concernLabel =
    FRONT_DOOR_WORRY_OPTIONS.find((o) => o.id === session?.worry)?.label ?? null;
  const support = buildPremiumJourneySupport(session?.name, concernLabel);

  const lit = v2LitProps(`${V2_SHELL} ${V2_SCROLL} ${V2_SCROLL_PAD}`);

  return (
    <main
      {...lit}
      data-testid="v2-premium-journey"
      data-v2-room="continuity"
      data-phase={phase}
      data-journey-id={state.journeyId}
      data-journey-version={String(state.journeyVersion)}
      aria-busy={isBusy || undefined}
      aria-labelledby="v2-premium-heading"
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
          Amy asks to remain present
        </p>
        <h1
          id="v2-premium-heading"
          data-testid="v2-premium-heading"
          className={V2_TYPE.heroCompact}
        >
          Stay with Amy
        </h1>
        <p
          className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}
          data-testid="v2-premium-support"
          {...v2LawRole("support")}
        >
          {support}
        </p>
      </header>

      {phase === "loading" ? (
        <div
          className={`flex flex-col items-start ${V2_SPACE[2]} ${V2_SPACE.py4}`}
          data-testid="v2-premium-loading"
          role="status"
          aria-busy="true"
          aria-label={V2_PREPARE_COPY.continueWays}
        >
          <div className={V2_PULSE_BAR} aria-hidden />
          <p className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}>
            {V2_PREPARE_COPY.continueWays}
          </p>
        </div>
      ) : null}

      {phase === "offline" ? (
        <div
          className={`flex flex-col items-start ${V2_SPACE.ctaStack} ${V2_SPACE.py4}`}
          data-testid="v2-premium-offline"
          data-offline-context={state.offlineContext ?? "general"}
          role="alert"
        >
          <p className={V2_TYPE.body}>You&apos;re offline</p>
          <p
            className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}
            data-testid="v2-premium-offline-message"
          >
            {state.error ?? PREMIUM_OFFLINE_GENERAL}
          </p>
          <Button
            type="button"
            variant="ghost"
            className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}
            onClick={onRetry}
            data-testid="v2-premium-retry"
          >
            {PREMIUM_OFFLINE_RETRY_LABEL}
          </Button>
        </div>
      ) : null}

      {phase === "already_premium" || phase === "success" ? (
        <div
          className={`flex flex-col items-start ${V2_SPACE.ctaStack} ${V2_SPACE.py4} ${V2_HERO_LIGHT}`}
          data-testid={
            phase === "success" ? "v2-premium-success" : "v2-premium-already"
          }
          role="status"
        >
          <h2 className={V2_TYPE.heroCompact}>
            {phase === "success"
              ? PREMIUM_SUCCESS_HEADLINE
              : PREMIUM_ALREADY_HEADLINE}
          </h2>
          <p
            className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}
            data-testid="v2-premium-success-copy"
          >
            {phase === "success" ? PREMIUM_SUCCESS_BODY : PREMIUM_ALREADY_BODY}
          </p>
          <Button
            asChild
            className={`${V2_SPACE.mt1} ${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta}`}
          >
            <Link href="/today" data-testid="v2-premium-done">
              {V2_EXIT.backToToday}
            </Link>
          </Button>
        </div>
      ) : null}

      {phase === "cancelled" ? (
        <div
          className={V2_SPACE.py4}
          data-testid="v2-premium-cancelled"
          role="status"
        >
          <p className={V2_TYPE.body}>You&apos;re still with Amy</p>
          <p className={`${V2_SPACE.mt2} ${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}>
            Your place is still here whenever you&apos;re ready.
          </p>
          <Button
            type="button"
            className={`${V2_SPACE.mt3} ${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta}`}
            onClick={onDismissCancel}
            data-testid="v2-premium-dismiss-cancel"
          >
            {V2_EXIT.chooseAgain}
          </Button>
        </div>
      ) : null}

      {phase === "failed" ? (
        <div
          className={V2_SPACE.py4}
          data-testid="v2-premium-error"
          role="alert"
        >
          <p className={V2_TYPE.body}>Something went wrong</p>
          <p className={`${V2_SPACE.mt2} ${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}>
            {state.error ?? "Please try again."}
          </p>
          <Button
            type="button"
            className={`${V2_SPACE.mt3} ${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta}`}
            onClick={onRetry}
            data-testid="v2-premium-retry"
          >
            Try again
          </Button>
        </div>
      ) : null}

      {phase === "ready" || phase === "purchasing" || phase === "restoring" ? (
        <section
          className={`${V2_SPACE.sectionStack} ${V2_SPACE.mt4} ${V2_BUSY}`}
          aria-label="Let Amy stay"
          aria-busy={isBusy || undefined}
        >
          <Button
            type="button"
            className={`${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta} w-full ${V2_MEASURE.support}`}
            disabled={isBusy || plans.length === 0}
            onClick={onPurchase}
            data-testid="v2-premium-purchase"
            {...v2LawRole("primary")}
          >
            Let Amy stay
          </Button>

          {(phase === "purchasing" || phase === "restoring") && (
            <V2InlinePrepare
              testId="v2-premium-action-loading"
              message={
                phase === "purchasing"
                  ? V2_PREPARE_COPY.continuingCare
                  : V2_PREPARE_COPY.restoreCare
              }
            />
          )}

          {/* Quiet how — SKUs kept; no prices, no comparison catalogue */}
          <ul
            className={`flex flex-col ${V2_SPACE.stack2} ${V2_HIERARCHY_WHISPER} ${V2_MEASURE.support}`}
            role="listbox"
            aria-label="How Amy stays present"
          >
            {plans.map((plan) => {
              const selected = plan.id === selectedPlan;
              return (
                <li key={plan.id}>
                  <button
                    type="button"
                    role="option"
                    disabled={isBusy}
                    onClick={() => onSelectPlan(plan.id)}
                    data-testid={`v2-premium-plan-${plan.id}`}
                    data-selected={selected ? "true" : "false"}
                    aria-selected={selected}
                    className={`w-full text-left ${V2_SPACE.py2} ${
                      selected
                        ? `${V2_TYPE.captionInk}`
                        : `${V2_TYPE.caption} text-muted-foreground`
                    }`}
                  >
                    <span className="block">
                      {buildContinuityPlanPlaceLabel(plan)}
                    </span>
                    {/* Price never on Nest surface — store sheet after permission */}
                    <span className="sr-only">
                      {plan.formattedPrice ?? `₹${plan.price}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            disabled={isBusy}
            onClick={onRestore}
            data-testid="v2-premium-restore"
            className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-muted-foreground hover:text-foreground`}
          >
            Return to your place
          </button>

          <Link
            href="/today"
            data-testid="v2-premium-leave-today"
            className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-muted-foreground hover:text-foreground`}
          >
            {V2_EXIT.notRightNow}
          </Link>
        </section>
      ) : null}
    </main>
  );
}
