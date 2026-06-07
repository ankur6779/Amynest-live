// Capability detection for the live 3D Amy avatar.
//
// We only ever mount a live WebGL canvas on hero spots, and only when the
// device can actually handle it. Everywhere else (and on failure) we fall back
// to the 2D Amy. These checks are cheap and cached.

let cachedWebGL: boolean | null = null;

/** True if the browser can create a WebGL context. Result is cached. */
export function supportsWebGL(): boolean {
  if (cachedWebGL !== null) return cachedWebGL;
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    cachedWebGL = !!gl;
    // Release the probe context immediately.
    const loseCtx = (gl as WebGLRenderingContext | null)?.getExtension(
      "WEBGL_lose_context",
    );
    loseCtx?.loseContext();
  } catch {
    cachedWebGL = false;
  }
  return cachedWebGL;
}

/** True if the user has requested reduced motion (OS-level accessibility). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Should we attempt the live 3D hero at all? False when WebGL is unavailable.
 * Reduced motion does NOT disable 3D — instead the stage renders a calm, static
 * pose (handled inside the stage) so accessibility users still see 3D Amy.
 */
export function canRenderLive3D(): boolean {
  return supportsWebGL();
}
