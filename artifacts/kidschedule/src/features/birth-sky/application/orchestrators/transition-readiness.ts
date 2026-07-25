/**
 * Pack 3 Addendum A — transition_completed readiness.
 * Fire only when Hero rendered ∧ Sky interactive ∧ first frame stable.
 */

export type TransitionReadinessFlags = {
  heroRendered: boolean;
  skyInteractive: boolean;
  firstFrameStable: boolean;
  /** Shared-element / full-screen overlay still active */
  transitionOverlayActive: boolean;
  /** Arriving from Reveal CTA path (not cold open) */
  fromRevealTransition: boolean;
};

export type TransitionReadinessState = {
  flags: TransitionReadinessFlags;
  completed: boolean;
};

export function createTransitionReadiness(
  fromRevealTransition: boolean,
): TransitionReadinessState {
  return {
    flags: {
      heroRendered: false,
      skyInteractive: false,
      firstFrameStable: false,
      transitionOverlayActive: fromRevealTransition,
      fromRevealTransition,
    },
    completed: false,
  };
}

export function isTransitionReady(flags: TransitionReadinessFlags): boolean {
  if (!flags.fromRevealTransition) return false;
  if (flags.transitionOverlayActive) return false;
  return flags.heroRendered && flags.skyInteractive && flags.firstFrameStable;
}

export function withReadinessPatch(
  state: TransitionReadinessState,
  patch: Partial<TransitionReadinessFlags>,
): TransitionReadinessState {
  if (state.completed) return state;
  const flags = { ...state.flags, ...patch };
  const ready = isTransitionReady(flags);
  return {
    flags,
    completed: ready,
  };
}
