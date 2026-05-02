import type { ArticleCategory } from "./articles";

/**
 * Per-category visual hero spec used for both the article card and modal
 * header. Renders as a CSS / RN linear gradient with a large background
 * emoji watermark — gives every article a distinctive "image" without any
 * external image hosting or AI generation.
 *
 * `gradient` values are plain hex strings so they're safe to consume from
 * both Tailwind-classed web (kidschedule) and the React Native colors
 * palette / brand tokens (amynest-mobile). Both ends still get to map them
 * onto their own color system at render time if they want — these are just
 * pleasant defaults.
 */
export interface ArticleHero {
  /** Two-stop gradient (top-left → bottom-right). */
  gradient: readonly [string, string];
  /** Background watermark emoji (large, low-opacity). */
  bgEmoji: string;
  /** Soft accent color for the emoji glow / read-aloud highlight. */
  accent: string;
}

const HEROES: Record<ArticleCategory, ArticleHero> = {
  Sleep:         { gradient: ["#1e1b4b", "#4338ca"], bgEmoji: "🌙", accent: "#818cf8" },
  Behavior:      { gradient: ["#9f1239", "#f43f5e"], bgEmoji: "💛", accent: "#fb7185" },
  Nutrition:     { gradient: ["#064e3b", "#10b981"], bgEmoji: "🥦", accent: "#34d399" },
  Development:   { gradient: ["#4c1d95", "#8b5cf6"], bgEmoji: "🎒", accent: "#a78bfa" },
  Emotional:     { gradient: ["#92400e", "#f59e0b"], bgEmoji: "💗", accent: "#fbbf24" },
  "Screen Time": { gradient: ["#075985", "#0ea5e9"], bgEmoji: "📱", accent: "#38bdf8" },
  Bonding:       { gradient: ["#9d174d", "#ec4899"], bgEmoji: "🤗", accent: "#f472b6" },
};

export function getArticleHero(category: ArticleCategory): ArticleHero {
  return HEROES[category];
}
