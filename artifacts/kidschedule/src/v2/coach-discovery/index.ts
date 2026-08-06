export { CoachDiscoveryCard, TODAY_COACH_SECTION_ID } from "./CoachDiscoveryCard";
export { default as CoachDiscoveryPage } from "./CoachDiscoveryPage";
export { CoachPrepareProgress, COACH_PREPARE_STEPS } from "./CoachPrepareProgress";
export {
  buildCoachReadyGate,
  COACH_READY_GATE,
  resolveGuestCoachCard,
  resolveSignedInCoachCard,
  type CoachCardMode,
  type CoachCardPresentation,
} from "./coach-card-state";
export {
  clearCoachDiscoveryForTests,
  clearPreparedCoachPlan,
  consumeCoachDiscoverGoal,
  markPreparedCoachPlanGateDismissed,
  peekCoachDiscoverGoal,
  readPreparedCoachPlan,
  savePreparedCoachPlan,
  stashCoachDiscoverGoal,
  V2_COACH_DISCOVER_GOAL_KEY,
  V2_COACH_PREPARED_PLAN_KEY,
} from "./prepared-plan";
export {
  isCoachDiscoveryEligible,
  resolveCoachDiscoveryOffer,
  type CoachDiscoveryOffer,
} from "./worry-map";
