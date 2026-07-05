/** Production full-body Amy mascot assets (public/amy/full/). */

export const AMY_FULL_ASPECT = 720 / 900;

export const AMY_STAGE_ASSETS = {
  idle: "/amy/full/amy-idle.webp",
  listening: "/amy/full/amy-listening.webp",
  thinking: "/amy/full/amy-thinking.webp",
  happy: "/amy/full/amy-happy.webp",
  talk: [
    "/amy/full/amy-talk-0.webp",
    "/amy/full/amy-talk-1.webp",
    "/amy/full/amy-talk-2.webp",
  ] as const,
} as const;

/** Small icon derived from the same full-body render (never face-only crop). */
export const AMY_ICON_SRC = AMY_STAGE_ASSETS.idle;
