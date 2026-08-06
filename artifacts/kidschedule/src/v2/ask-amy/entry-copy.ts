/**
 * Hearing Room presentation copy — listener, never chatbot.
 * Living Room CTA (`buildAskAmyEntryCta`) FROZEN — do not change.
 * Wave D: Coach distinction removed from Hearing sheet (one question only).
 */

import type { V2GuestSession } from "@/v2/guest";
import type { FrontDoorWorryId } from "@/v2/front-door/types";
import { FRONT_DOOR_WORRY_OPTIONS } from "@/v2/front-door/worry-options";

function worryLabel(worry: FrontDoorWorryId | null | undefined): string | null {
  if (!worry) return null;
  return FRONT_DOOR_WORRY_OPTIONS.find((o) => o.id === worry)?.label ?? null;
}

/**
 * Living Room whisper CTA — FROZEN (Living Room composition held).
 * Do not retune for Hearing Room dialect.
 */
export function buildAskAmyEntryCta(
  worry: FrontDoorWorryId | null | undefined,
): string {
  switch (worry) {
    case "sleep":
      return "Ask about bedtime";
    case "speech_talking":
      return "Ask about today's speech practice";
    case "behavior":
      return "Ask about today's behaviour";
    case "learning_school":
      return "Ask about today's learning";
    case "mornings":
      return "Ask about this morning";
    case "feeding":
      return "Ask about today's feeding";
    case "something_else":
      return "Ask about what's on your mind today";
    default:
      return "Ask about today's step";
  }
}

/**
 * Unused on Living Nest path today — keep non-chatbot; Hearing page uses
 * `buildAskAmyPageHeadline` instead.
 */
export function buildAskAmySectionTitle(
  worry: FrontDoorWorryId | null | undefined,
): string {
  const label = worryLabel(worry);
  if (label === "Sleep") return "Help · bedtime";
  if (label === "Speech & talking") return "Help · talking";
  if (label === "Behavior") return "Help · behaviour";
  if (label === "Learning / school") return "Help · learning";
  if (label) return `Help · ${label.toLowerCase()}`;
  return "Help · right now";
}

/**
 * Hearing Room support — imperfect speech welcome.
 * Amy carries understanding; parent carries only the truth.
 */
export function buildAskAmySupport(
  session:
    | Pick<V2GuestSession, "name" | "worry">
    | null
    | undefined,
): string {
  const name = session?.name?.trim() || null;
  const concern = worryLabel(session?.worry ?? null);
  if (name && concern) {
    return `About ${concern} for ${name}. Messy, brief, or long — Amy carries the understanding. You bring only the truth.`;
  }
  if (concern) {
    return `About ${concern}. Messy, brief, or long — Amy carries the understanding. You bring only the truth.`;
  }
  if (name) {
    return `For ${name}. Messy, brief, or long — Amy carries the understanding. You bring only the truth.`;
  }
  return "Messy, brief, or long — Amy carries the understanding. You bring only the truth.";
}

/** Guest sheet title — care/trust, never the CTA button string. */
export function buildAskAmySheetTitle(
  session:
    | Pick<V2GuestSession, "name" | "worry">
    | null
    | undefined,
): string {
  const name = session?.name?.trim() || null;
  if (name) return `Keep ${name}'s place with Amy`;
  return "Keep today's place with Amy";
}

/** Guest sheet body — soft-save only; no Coach / second-room pitch. */
export function buildAskAmySheetBody(
  session:
    | Pick<V2GuestSession, "name" | "worry">
    | null
    | undefined,
): string {
  const name = session?.name?.trim() || null;
  const concern = worryLabel(session?.worry ?? null);
  const know =
    name && concern
      ? `Amy already holds ${name} and today's ${concern}.`
      : concern
        ? `Amy already holds today's ${concern}.`
        : name
          ? `Amy already holds ${name}.`
          : "Amy already holds what matters today.";
  return `${know} Save your place when you're ready.`;
}

/**
 * Hearing Room hero — answers “Can Amy help me right now?”
 * Listening / relief — never chatbot brand, never “Quick help” product.
 */
export function buildAskAmyPageHeadline(
  session:
    | Pick<V2GuestSession, "name" | "worry">
    | null
    | undefined,
): string {
  const label = worryLabel(session?.worry ?? null);
  if (label === "Sleep") return "Amy can help with bedtime right now.";
  if (label === "Speech & talking") return "Amy can help with talking right now.";
  if (label === "Behavior") return "Amy can help with behaviour right now.";
  if (label === "Learning / school") return "Amy can help with learning right now.";
  if (label === "Mornings") return "Amy can help with mornings right now.";
  if (label === "Feeding") return "Amy can help with feeding right now.";
  return "Amy can help right now.";
}

/**
 * One invitation — speak as you are.
 * Never implies crafting a perfect question.
 */
export function buildAskAmyStartCta(
  worry: FrontDoorWorryId | null | undefined,
): string {
  switch (worry) {
    case "sleep":
      return "Speak about bedtime";
    case "speech_talking":
      return "Speak about talking";
    case "behavior":
      return "Speak about behaviour";
    case "learning_school":
      return "Speak about learning";
    case "mornings":
      return "Speak about this morning";
    case "feeding":
      return "Speak about feeding";
    default:
      return "Speak to Amy";
  }
}
