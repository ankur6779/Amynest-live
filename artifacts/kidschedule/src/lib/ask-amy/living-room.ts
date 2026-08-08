/**
 * Ask Amy Phase 2 — Help companionship living helpers.
 * Presentation only. AI / prompts / memory / APIs untouched.
 *
 * Emotional target: companionship — never chatbot, never support desk.
 * Covers Ask Amy + Emotional Support as one Help spine.
 */

import { resolvePortfolioLivingFlag } from "@/lib/amynest-living-universe";

export type AskAmyPathId = "ask" | "feelings";

export type AskAmyRecommend = {
  id: "here";
  pathId: AskAmyPathId;
  /** Legacy Hub tile for deepen / analytics continuity */
  tileId: string;
  label: string;
  title: string;
  purpose: string;
};

export type AskAmyQuietPath = {
  id: AskAmyPathId;
  /** Destination id in Parent Hub */
  destinationId: "ask-amy" | "emotional";
  tileId: string;
  title: string;
  purpose: string;
};

/** Quiet companionship ways — not product shelves. */
export const ASK_AMY_QUIET_PATHS: readonly AskAmyQuietPath[] = [
  {
    id: "ask",
    destinationId: "ask-amy",
    tileId: "amy-ai",
    title: "Ask now",
    purpose: "One calm question — Amy is with you",
  },
  {
    id: "feelings",
    destinationId: "emotional",
    tileId: "emotional",
    title: "When feelings are heavy",
    purpose: "Soft space when the day is hard",
  },
] as const;

/** One recommended Help companionship act. */
export function recommendAskAmyAction(
  childName = "your child",
): AskAmyRecommend {
  return {
    id: "here",
    pathId: "ask",
    tileId: "amy-ai",
    label: "Start here",
    title: `Amy is here for ${childName}`,
    purpose: "One calm question — never alone",
  };
}

export function askAmyPathForTile(tileId: string): AskAmyPathId | null {
  if (tileId === "amy-ai") return "ask";
  if (tileId === "emotional") return "feelings";
  return null;
}

export function askAmyPathForDestination(
  destinationId: string,
): AskAmyPathId | null {
  if (destinationId === "ask-amy") return "ask";
  if (destinationId === "emotional") return "feelings";
  return null;
}

export function tileIdForAskAmyPath(pathId: AskAmyPathId): string {
  return pathId === "feelings" ? "emotional" : "amy-ai";
}

export function destinationIdForAskAmyPath(
  pathId: AskAmyPathId,
): "ask-amy" | "emotional" {
  return pathId === "feelings" ? "emotional" : "ask-amy";
}

/** Flag — Ask Amy + Emotional companionship manufacturing. Default ON. */
export function isAskAmyLivingV1Enabled(): boolean {
  return resolvePortfolioLivingFlag(import.meta.env.VITE_FF_ASK_AMY_LIVING_V1);
}

/** Synthetic quiet-module tile id for Help companionship surface. */
export const ASK_AMY_STREAM_TILE_ID = "__ask_amy_stream__" as const;

/** Soft-enter query for assistant companionship chrome (presentation only). */
export const ASK_AMY_COMPANION_QUERY = "companion=1" as const;

export function assistantCompanionshipHref(prompt?: string): string {
  const params = new URLSearchParams();
  params.set("companion", "1");
  if (prompt?.trim()) params.set("q", prompt.trim());
  return `/assistant?${params.toString()}`;
}
