/**
 * AmyCharacterEngine — presentation-layer character animation for the official
 * full-body Amy mascot. Centralizes mouth frames, halo, shadow, eye tracking,
 * blink scheduling and waveform motion.
 */
export type { AmyCharacterState } from "./amy-character-state";
export {
  amy3dToCharacterState,
  characterStateToAssetKey,
  isListeningState,
  isTalkingState,
  stageToCharacterState,
} from "./amy-character-state";
export {
  AMY_BLINK_CLOSE_MS,
  AMY_HALO,
  AMY_PUPIL_MAX_PX,
  AMY_SHADOW,
  AMY_STAGE_HEIGHT_MAX,
  AMY_STAGE_HEIGHT_MIN,
  AMY_STAGE_VH_RATIO,
  AMY_WAVEFORM_BAR_COUNT,
} from "./amy-character-constants";
export { blinkSchedule, shouldSuppressBlinkForMouth } from "./amy-blink-schedule";
export { haloColors, haloMotion } from "./amy-halo-config";
export type { AmyHaloColors, AmyHaloMotion } from "./amy-halo-config";
export {
  computeAmyPupilOffset,
  pointerToPupilTarget,
} from "./amy-eye-tracking";
export type { AmyEyePointerTarget, AmyPupilOffset } from "./amy-eye-tracking";
export {
  floatPhase,
  resolveAmyMouthFrame,
  stageWaveHeight,
  timerFallbackMouthFrame,
  volumeFromLevel,
} from "./amy-character-motion";
export { useAmyBlink } from "./use-amy-blink";
export { useAmyCharacterEngine } from "./use-amy-character-engine";
export type {
  AmyCharacterEngineInput,
  AmyCharacterEngineRefs,
} from "./use-amy-character-engine";
export { subscribeAmyAnimationClock, amyAnimationClockSubscriberCount } from "./amy-animation-clock";
export type { AmyAnimationTick } from "./amy-animation-clock";
export {
  motionPresetForState,
  lerpPresetToward,
} from "./amy-character-presets";
export type { AmyMotionPreset } from "./amy-character-presets";
export {
  preloadAmyMouthFrames,
  preloadAmyCelebrationAssets,
  scheduleAmyAssetPreload,
  isAmyMouthFramesPreloaded,
} from "./amy-asset-preload";
