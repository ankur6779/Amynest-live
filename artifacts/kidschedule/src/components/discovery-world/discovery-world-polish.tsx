import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { EmptyStateCard } from "@/components/learning-progress/premium-polish";
import { SKELETON_BASE } from "@/lib/experience-system";
import { cn } from "@/lib/utils";

/** Warm, parent-friendly copy — single source for empty / error / loading surfaces. */
export const DISCOVERY_COPY = {
  loadingWorld: "Loading your world",
  emptyExplore: {
    emoji: "🌍",
    title: "Start exploring",
    message: "Tap any card to hear real sounds and fun facts. Your sticker book fills up as you listen.",
  },
  emptyCategory: {
    emoji: "🔎",
    title: "No items in this group",
    message: "Try another category chip above, or tap All to see everything.",
  },
  emptyQuiz: {
    emoji: "🎧",
    title: "Quiz needs more sounds",
    message: "Explore a few more items first — then come back to play the listening quiz.",
  },
  emptyHearFind: {
    emoji: "👂",
    title: "Hear & Find needs more sounds",
    message: "Listen to a few favorites in Explore, then try matching sounds again.",
  },
  emptyDiscovery: {
    emoji: "✨",
    title: "Nothing to discover here",
    message: "Pick a different category or open Explore to unlock the slideshow.",
  },
  emptyStickers: {
    emoji: "📒",
    title: "Your sticker book is waiting",
    message: "Play sounds on different items — each one unlocks a sticker you can collect.",
  },
  emptyAchievements: {
    emoji: "⭐",
    title: "Stars are on the way",
    message: "Keep listening and playing quizzes. Achievements light up as your child explores.",
  },
  noChild: {
    emoji: "👶",
    title: "Add a child to begin",
    message: "Discovery Worlds saves progress per child so you can see what they love in Parent insights.",
  },
  noChildHub: {
    emoji: "👨‍👩‍👧",
    title: "Choose a child profile",
    message: "Select your child in Parent Hub to see their learning map, daily adventure, and insights.",
  },
  emptyParentActivity: {
    emoji: "📊",
    title: "Activity will show up here",
    message: "After your child listens and plays quizzes, you'll see favorites, accuracy, and weekly minutes.",
  },
  emptyParentFavorites: {
    emoji: "💛",
    title: "Favorites appear after play",
    message: "When your child tries different worlds, we highlight what they return to most.",
  },
  worldNotFound: {
    emoji: "🗺️",
    title: "This world is not ready yet",
    message: "Head back to Discovery Worlds and pick a world from the list.",
  },
  audioFailed: {
    emoji: "🔇",
    title: "Sound could not play",
    message: "Check your volume or connection, then tap again. Offline sounds replay from cache when available.",
  },
  hubLocked: {
    emoji: "🔒",
    title: "Unlock in Parent Hub",
    message: "This world opens when your plan includes it. Parents can manage access from the hub.",
  },
} as const;

export type DiscoveryEmptyVariant = {
  [K in keyof typeof DISCOVERY_COPY]: (typeof DISCOVERY_COPY)[K] extends {
    emoji: string;
    title: string;
    message: string;
  }
    ? K
    : never;
}[keyof typeof DISCOVERY_COPY];

export function DiscoveryEmptyState({
  variant,
  className,
  testId,
}: {
  variant: DiscoveryEmptyVariant;
  className?: string;
  testId?: string;
}) {
  const copy = DISCOVERY_COPY[variant];
  return (
    <EmptyStateCard
      emoji={copy.emoji}
      title={copy.title}
      message={copy.message}
      className={className}
      testId={testId}
    />
  );
}

export function DiscoveryErrorState({
  variant = "worldNotFound",
  action,
  className,
}: {
  variant?: "worldNotFound" | "audioFailed";
  action?: ReactNode;
  className?: string;
}) {
  const copy = DISCOVERY_COPY[variant];
  return (
    <div
      role="alert"
      className={cn(
        "mx-auto flex max-w-md flex-col items-center gap-4 rounded-[28px] border border-amber-500/25 bg-amber-500/10 px-6 py-8 text-center",
        className,
      )}
    >
      <AlertCircle className="h-8 w-8 text-amber-300" aria-hidden />
      <p className="text-4xl" aria-hidden>
        {copy.emoji}
      </p>
      <div>
        <p className="text-lg font-bold text-foreground">{copy.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.message}</p>
      </div>
      {action}
    </div>
  );
}

export function DiscoveryPageLoading({ label }: { label?: string }) {
  const text = label ?? DISCOVERY_COPY.loadingWorld;
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">{text}…</p>
      <span className="sr-only">{text}</span>
    </div>
  );
}

export function DiscoveryHeroFallback({
  emoji,
  alt,
  className,
}: {
  emoji: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "flex aspect-square items-center justify-center rounded-[24px]",
        "bg-gradient-to-br from-indigo-500/25 via-violet-500/15 to-amber-400/20",
        "ring-1 ring-inset ring-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      <span className="text-7xl drop-shadow-md" aria-hidden>
        {emoji}
      </span>
    </div>
  );
}

export function DiscoveryProgressDots({
  activeIndex,
  total,
  label = "Slideshow progress",
}: {
  activeIndex: number;
  total: number;
  label?: string;
}) {
  if (total <= 1) return null;
  return (
    <div
      className="flex justify-center gap-1.5"
      role="tablist"
      aria-label={label}
    >
      {Array.from({ length: Math.min(total, 12) }).map((_, i) => (
        <span
          key={i}
          role="presentation"
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === activeIndex % total ? "w-5 bg-primary" : "w-1.5 bg-white/20",
          )}
        />
      ))}
    </div>
  );
}
