import { useEffect, useRef, useState } from "react";
import type { GameCategory } from "@/lib/games";
import { GameEmojiBadge } from "@/components/games/GameEmojiBadge";
import { useReducedMotion } from "@/lib/reduced-motion";
import { usePageVisible } from "@/hooks/use-page-visible";

const PREVIEW_FRAMES: Record<string, string[]> = {
  "pattern-match": ["🟥", "🟦", "🟩", "❓"],
  "odd-one-out": ["🍎", "🍌", "🍇", "🚗"],
  "card-flip": ["✦", "🐶", "✦", "🐱"],
  sequence: ["🔴", "🔵", "🟢", "🟡"],
  "color-memory": ["🎨", "🔴", "🔵", "🟢"],
  "speed-math": ["2️⃣", "5️⃣", "9️⃣", "✓"],
  "number-match": ["3️⃣", "4️⃣", "5️⃣", "6️⃣"],
  "find-mistake": ["🐶", "🐶", "🐱", "🐶"],
  "target-tap": ["🎯", "💫", "🎯", "⭐"],
  "what-should-you-do": ["💛", "🤝", "💭", "✨"],
  "spot-difference": ["🌳", "🌲", "🌳", "👀"],
  "hidden-objects": ["🔭", "🌸", "🐛", "🦋"],
  "color-fill": ["🖍️", "🟥", "🟦", "🖼️"],
  "shape-match": ["🔷", "⭕", "🔺", "⭐"],
  "maze-escape": ["🚀", "🟣", "➡️", "🏁"],
};

interface GamePreviewTileProps {
  gameId: string;
  emoji: string;
  category?: GameCategory | string;
  active?: boolean;
  muted?: boolean;
}

/** Premium identity preview — animates only when on-screen + tab visible. */
export function GamePreviewTile({
  gameId,
  emoji,
  category = "brain",
  active = true,
  muted = false,
}: GamePreviewTileProps) {
  const reduced = useReducedMotion();
  const pageVisible = usePageVisible();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const frames = PREVIEW_FRAMES[gameId] ?? [emoji, "✨", emoji, "🎮"];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(!!entry?.isIntersecting),
      { rootMargin: "48px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const shouldAnimate = active && !reduced && inView && pageVisible;

  useEffect(() => {
    if (!shouldAnimate) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 1100);
    return () => window.clearInterval(id);
  }, [shouldAnimate, frames.length]);

  return (
    <span ref={wrapRef} className="inline-flex">
      <GameEmojiBadge
        emoji={shouldAnimate ? frames[frame]! : emoji}
        category={category}
        size="md"
        muted={muted}
      />
    </span>
  );
}
