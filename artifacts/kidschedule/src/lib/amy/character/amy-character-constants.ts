/** Maximum pupil travel from eye centre (px). */
export const AMY_PUPIL_MAX_PX = 4;

/** State transition duration (ms). */
export const AMY_STATE_TRANSITION_MS = 220;

/** Gentle head settle after state change (ms). */
export const AMY_HEAD_SETTLE_MS = 240;

/** Error visual recovery before idle motion (ms). */
export const AMY_ERROR_RECOVERY_MS = 3500;

/** Waveform bar count beneath the stage avatar. */
export const AMY_WAVEFORM_BAR_COUNT = 9;

/** Blink duration (ms). */
export const AMY_BLINK_CLOSE_MS = 105;
export const AMY_BLINK_DOUBLE_GAP_MS = 220;
export const AMY_BLINK_DOUBLE_CLOSE_MS = 92;

/** Default blink interval range (ms). */
export const AMY_BLINK_INTERVAL_MIN_MS = 3000;
export const AMY_BLINK_INTERVAL_MAX_MS = 7000;

/** Responsive height bounds (px). */
export const AMY_STAGE_HEIGHT_MIN = 220;
export const AMY_STAGE_HEIGHT_MAX = 420;
export const AMY_STAGE_VH_RATIO = 0.58;

/** Halo geometry as fractions of body width/height. */
export const AMY_HALO = {
  top: 0.57,
  size: 0.72,
} as const;

/** Shadow geometry as fractions of body width/height. */
export const AMY_SHADOW = {
  feetY: 0.935,
  width: 0.42,
  height: 0.05,
} as const;
