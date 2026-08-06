/**
 * Law of Three — composition roles (P0.6).
 * Every screen: 1 Emotional Hero · 1 Primary Action · 1 Supporting Object.
 * Everything else visually recedes.
 *
 * Opacity / ink demotion / role markers only.
 * Does not change type scales, spacing tokens, lighting, materials, or nav.
 */

/** Peer Soft Plate / secondary chapter — not the Support object. */
export const V2_HIERARCHY_PEER = "opacity-80";

/** Below-fold catalogue / tertiary exits — stronger recede. */
export const V2_HIERARCHY_RECEDE = "opacity-70";

/** Decorative eyebrow / chrome whisper. */
export const V2_HIERARCHY_WHISPER = "opacity-60";

/**
 * Role markers for audit / tests (data attributes via helpers).
 */
export type V2LawRole = "hero" | "primary" | "support" | "recede";

export function v2LawRole(role: V2LawRole): { "data-v2-law": V2LawRole } {
  return { "data-v2-law": role };
}
