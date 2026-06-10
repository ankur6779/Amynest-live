import { useState, useMemo, useCallback, useEffect } from "react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { enqueueBehaviorWarmup } from "@/lib/behavior-audio-warmup";
import {
  createParentHubAudioIdentity,
  PARENT_HUB_SECTIONS,
} from "@/lib/parent-hub-audio-identity";
import { ALL_DAILY_STORIES, buildDailyStorySpeakText, type DailyStory } from "@workspace/parent-hub-speak";

// ─── Types ────────────────────────────────────────────────────────────────────
import { useTranslation } from "react-i18next";
type StoryCategory = "moral" | "fun" | "animal" | "learning";
type Story = DailyStory;
const ALL_STORIES = ALL_DAILY_STORIES;

// ─── Category config ──────────────────────────────────────────────────────────

const CAT: Record<StoryCategory, {
  label: string;
  color: string;
  bg: string;
  dot: string;
}> = {
  moral: {
    label: "Moral",
    color: "hsl(var(--brand-purple-500))",
    bg: "rgba(168,85,247,0.12)",
    dot: "hsl(var(--brand-purple-500))"
  },
  fun: {
    label: "Fun",
    color: "hsl(var(--brand-amber-500))",
    bg: "rgba(245,158,11,0.12)",
    dot: "hsl(var(--brand-amber-500))"
  },
  animal: {
    label: "Animal",
    color: "hsl(var(--brand-emerald-500))",
    bg: "rgba(16,185,129,0.12)",
    dot: "hsl(var(--brand-emerald-500))"
  },
  learning: {
    label: "Learning",
    color: "hsl(var(--brand-blue-500))",
    bg: "rgba(59,130,246,0.12)",
    dot: "hsl(var(--brand-blue-500))"
  }
};

// ─── Date-seeded shuffle ──────────────────────────────────────────────────────

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = (seed ^ 0xdeadbeef) >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    s = Math.imul(s ^ s >>> 16, 0x45d9f3b);
    s = Math.imul(s ^ s >>> 16, 0x45d9f3b);
    s = (s ^ s >>> 16) >>> 0;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

// ─── Story pool for child's age & today's date ────────────────────────────────

function getDailyPool(ageMonths: number): Story[] {
  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const eligible = ALL_STORIES.filter(s => ageMonths >= s.ageMin && ageMonths <= s.ageMax);

  // Ensure category diversity — one of each per day if possible
  const cats: StoryCategory[] = ["moral", "fun", "animal", "learning"];
  const byCategory: Record<StoryCategory, Story[]> = {
    moral: seededShuffle(eligible.filter(s => s.category === "moral"), dateSeed),
    fun: seededShuffle(eligible.filter(s => s.category === "fun"), dateSeed + 1),
    animal: seededShuffle(eligible.filter(s => s.category === "animal"), dateSeed + 2),
    learning: seededShuffle(eligible.filter(s => s.category === "learning"), dateSeed + 3)
  };

  // Interleave: take 1 from each category, then extras
  const selected: Story[] = [];
  let catIdx = 0;
  const used = new Set<string>();
  const take = (pool: Story[]) => {
    for (const s of pool) {
      if (!used.has(s.id)) {
        selected.push(s);
        used.add(s.id);
        return;
      }
    }
  };
  // First round: 1 per category
  for (const c of cats) take(byCategory[c]);
  // Rest: top-up from the full pool
  const fullShuffled = seededShuffle(eligible, dateSeed + 99);
  for (const s of fullShuffled) {
    if (!used.has(s.id)) {
      selected.push(s);
      used.add(s.id);
    }
  }
  void catIdx;
  return selected;
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CatBadge({
  category
}: {
  category: StoryCategory;
}) {
  const c = CAT[category];
  return <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full" style={{
    background: c.bg,
    color: c.color
  }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{
      background: c.dot
    }} />
      {c.label}
    </span>;
}

// ─── Story card (featured) ────────────────────────────────────────────────────

function FeaturedCard({
  story,
  isPlaying,
  onPlay,
  onPrimePlay,
  expanded,
  onToggleExpand
}: {
  story: Story;
  isPlaying: boolean;
  onPlay(): void;
  onPrimePlay(): void;
  expanded: boolean;
  onToggleExpand(): void;
}) {
  const {
    t
  } = useTranslation();
  const c = CAT[story.category];
  return <div className="rounded-3xl border overflow-hidden mb-3" style={{
    borderColor: c.color + "30",
    background: `linear-gradient(135deg,${c.bg} 0%,transparent 100%)`
  }}>
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-muted dark:bg-muted text-primary dark:text-muted-foreground">
              {t("components.daily_story_section.featured")}
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-muted dark:bg-muted text-primary dark:text-muted-foreground">
              {t("components.daily_story_section.new_today")}
            </span>
          </div>
          <CatBadge category={story.category} />
        </div>

        <div className="flex gap-3 mb-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-4xl border" style={{
          background: c.bg,
          borderColor: c.color + "30"
        }}>
            {story.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand font-black text-lg text-foreground leading-snug mb-1">
              {story.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {story.preview}
            </p>
          </div>
        </div>
      </div>

      {/* Full story (expandable) */}
      {expanded && <div className="px-4 pb-3">
          <div className="rounded-2xl p-4 border" style={{
        background: "rgba(255,255,255,0.5)",
        borderColor: c.color + "20"
      }}>
            <p className="text-sm text-foreground leading-relaxed italic mb-3">
              "{story.story}"
            </p>
            <div className="rounded-xl p-3" style={{
          background: c.bg
        }}>
              <p className="text-[11px] font-black mb-0.5" style={{
            color: c.color
          }}>
                {t("components.daily_story_section.moral_of_the_story")}
              </p>
              <p className="text-sm font-semibold text-foreground">{story.moral}</p>
            </div>
          </div>
        </div>}

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4">
        <button onPointerDown={onPrimePlay} onClick={onPlay} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95" style={{
        background: isPlaying ? c.bg : "transparent",
        borderColor: c.color + "40",
        color: c.color
      }}>
          {isPlaying ? "⏸ Stop" : "🔊 Read Aloud"}
        </button>
        <button onClick={onToggleExpand} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 text-white" style={{
        background: c.color
      }}>
          {expanded ? "✕ Close" : "📖 Read Story"}
        </button>
      </div>
    </div>;
}

// ─── Story card (compact) ─────────────────────────────────────────────────────

function StoryCard({
  story,
  isPlaying,
  onPlay,
  onPrimePlay,
  expanded,
  onToggleExpand
}: {
  story: Story;
  isPlaying: boolean;
  onPlay(): void;
  onPrimePlay(): void;
  expanded: boolean;
  onToggleExpand(): void;
}) {
  const {
    t
  } = useTranslation();
  const c = CAT[story.category];
  return <div className="rounded-2xl border p-3 mb-2 transition-all" style={{
    borderColor: expanded ? c.color + "40" : "var(--border)",
    background: expanded ? c.bg : "transparent"
  }}>
      <div className="flex gap-3 items-start">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl border" style={{
        background: c.bg,
        borderColor: c.color + "25"
      }}>
          {story.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-sm text-foreground truncate">{story.title}</span>
            <CatBadge category={story.category} />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {story.preview}
          </p>
        </div>
      </div>

      {/* Expanded story */}
      {expanded && <div className="mt-3 rounded-xl p-3 border" style={{
      borderColor: c.color + "20",
      background: "rgba(255,255,255,0.4)"
    }}>
          <p className="text-xs text-foreground leading-relaxed italic mb-2">"{story.story}"</p>
          <div className="rounded-lg p-2.5" style={{
        background: c.bg
      }}>
            <p className="text-[10px] font-black mb-0.5" style={{
          color: c.color
        }}>{t("components.daily_story_section.moral")}</p>
            <p className="text-xs font-semibold text-foreground">{story.moral}</p>
          </div>
        </div>}

      {/* Buttons */}
      <div className="flex gap-2 mt-2.5">
        <button onPointerDown={onPrimePlay} onClick={onPlay} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95" style={{
        borderColor: c.color + "30",
        color: c.color,
        background: isPlaying ? c.bg : "transparent"
      }}>
          {isPlaying ? "⏸ Stop" : "🔊 Aloud"}
        </button>
        <button onClick={onToggleExpand} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95 text-white" style={{
        background: c.color
      }}>
          {expanded ? "✕ Close" : "📖 Read"}
        </button>
      </div>
    </div>;
}

// ─── Main exported component ──────────────────────────────────────────────────

interface DailyStorySectionProps {
  ageMonths: number;
  childName: string;
}
export function DailyStorySection({
  ageMonths,
  childName
}: DailyStorySectionProps) {
  const {
    t
  } = useTranslation();
  const authFetch = useAuthFetch();
  const pool = useMemo(() => getDailyPool(ageMonths), [ageMonths]);
  const PAGE = 5;

  useEffect(() => {
    enqueueBehaviorWarmup(authFetch, "stories", {
      storyIds: pool.slice(0, 5).map((s) => s.id),
      ageMonths,
    });
    enqueueBehaviorWarmup(authFetch, "parent_hub", { ageMonths });
  }, [authFetch, ageMonths, pool]);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const {
    speak,
    pause,
    primeSpeakGesture
  } = useAmyVoice();
  const storySpeech = useCallback((story: Story) => buildDailyStorySpeakText(story), []);
  const visible = useMemo(() => pool.slice(0, (page + 1) * PAGE), [pool, page]);
  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const handlePlay = useCallback((story: Story) => {
    if (playingId === story.id) {
      pause();
      setPlayingId(null);
      return;
    }
    pause();
    setPlayingId(story.id);
    const text = storySpeech(story);
    const identity = createParentHubAudioIdentity({
      sectionId: PARENT_HUB_SECTIONS.DAILY_STORIES,
      itemId: story.id,
      text,
    });
    void speak(identity.text, {
      parentHub: true,
      audioIdentity: identity,
      waitUntilEnd: true,
      narration: true,
    }).then((res) => {
      if (!res?.success) console.warn("TTS failed, skipping audio flow:", res?.error);
      setPlayingId(null);
    });
  }, [playingId, speak, pause]);
  const hasMore = visible.length < pool.length;
  if (pool.length === 0) return null;
  const [featured, ...rest] = visible as [Story, ...Story[]];
  return <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-primary dark:text-muted-foreground font-semibold">
            {t("components.daily_story_section.daily_stories_for")} {childName} · {visible.length} {t("components.daily_story_section.shown")}
          </p>
        </div>
        <div className="flex gap-1">
          {(["moral", "fun", "animal", "learning"] as StoryCategory[]).map(c => <span key={c} className="w-2 h-2 rounded-full" style={{
          background: CAT[c].dot
        }} title={CAT[c].label} />)}
        </div>
      </div>

      {/* Featured story */}
      <FeaturedCard story={featured} isPlaying={playingId === featured.id} onPrimePlay={() => primeSpeakGesture(storySpeech(featured))} onPlay={() => handlePlay(featured)} expanded={expanded.has(featured.id)} onToggleExpand={() => toggleExpand(featured.id)} />

      {/* Remaining stories */}
      {rest.map(story => <StoryCard key={story.id} story={story} isPlaying={playingId === story.id} onPrimePlay={() => primeSpeakGesture(storySpeech(story))} onPlay={() => handlePlay(story)} expanded={expanded.has(story.id)} onToggleExpand={() => toggleExpand(story.id)} />)}

      {/* Load More */}
      {hasMore && <button onClick={() => setPage(p => p + 1)} className="w-full mt-3 py-3 rounded-2xl border-2 border-dashed text-sm font-bold text-primary dark:text-muted-foreground border-border dark:border-border hover:bg-muted dark:hover:bg-muted transition-all active:scale-[0.98]">
          {t("components.daily_story_section.load_5_more_stories")}
        </button>}

      {/* No more stories */}
      {!hasMore && pool.length > 0 && <p className="text-center text-xs text-muted-foreground mt-3">
          {t("components.daily_story_section.you_ve_seen_all_stories_for_today_check_back_tomorrow_for_ne")}
        </p>}

      <p className="text-[10px] text-muted-foreground mt-3 text-center">
        {t("components.daily_story_section.read_these_stories_to")} {childName} {t("components.daily_story_section.at_bedtime_for_a_meaningful_connection_moment")}
      </p>
    </div>;
}