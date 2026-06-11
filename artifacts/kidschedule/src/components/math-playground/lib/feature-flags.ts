/** Phase 4 feature gates — off by default in production. */

export function isMpAmyAvatarEnabled(): boolean {
  return import.meta.env.VITE_MP_AMY_AVATAR === "1";
}

export function isMpLivingObjectsEnabled(): boolean {
  return (
    import.meta.env.VITE_MP_AMY_AVATAR === "1" || import.meta.env.VITE_MP_PHASE4 === "1"
  );
}

export function isMpPhase4Enabled(): boolean {
  return import.meta.env.VITE_MP_PHASE4 === "1";
}

export function isMpMiniGamesEnabled(): boolean {
  return import.meta.env.VITE_MP_MINI_GAMES === "1";
}

export function isMpVoiceModeEnabled(): boolean {
  return import.meta.env.VITE_MP_VOICE_MODE === "1";
}

export function isMpPhase6Enabled(): boolean {
  return import.meta.env.VITE_MP_PHASE6 === "1" || import.meta.env.VITE_MP_INTELLIGENCE === "1";
}
