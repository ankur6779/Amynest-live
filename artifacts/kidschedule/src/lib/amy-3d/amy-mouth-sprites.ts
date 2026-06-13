// 2D mouth sprite assets for AmyPortrait lip-sync (Speech Coach + Talking Amy).
// Frames match the viseme names used by the 3D morph-target system (visemes.ts).

import type { Viseme, VisemeOrRest } from "@/components/amy-3d/avatar/visemes";

export const AMY_MOUTH_SPRITE_SHEET_SRC = "/amy-3d/amy-mouth-spritesheet.png";

/** Per-viseme portrait frames (1024×1024, transparent PNG). */
export const AMY_MOUTH_FRAME_SRC: Record<VisemeOrRest, string> = {
  REST: "/amy-3d/amy-mouth-frames/amy-mouth-rest.png",
  AA: "/amy-3d/amy-mouth-frames/amy-mouth-aa.png",
  EE: "/amy-3d/amy-mouth-frames/amy-mouth-ee.png",
  IH: "/amy-3d/amy-mouth-frames/amy-mouth-ih.png",
  OH: "/amy-3d/amy-mouth-frames/amy-mouth-oh.png",
  OU: "/amy-3d/amy-mouth-frames/amy-mouth-ou.png",
};

/** Sprite-sheet grid layout (2 rows × 3 columns, 1024 px per cell). */
export const AMY_MOUTH_SHEET = {
  cols: 3,
  rows: 2,
  framePx: 1024,
  /** Frame index in row-major order: REST, AA, EE, IH, OH, OU. */
  index: {
    REST: 0,
    AA: 1,
    EE: 2,
    IH: 3,
    OH: 4,
    OU: 5,
  } satisfies Record<VisemeOrRest, number>,
} as const;

export function mouthFrameSrc(viseme: VisemeOrRest): string {
  return AMY_MOUTH_FRAME_SRC[viseme];
}

/** Procedural lip-flap cycle — mirrors useLipSync PROC_CYCLE. */
export const PORTRAIT_LIP_CYCLE: Viseme[] = ["AA", "OH", "EE", "IH", "OU"];
