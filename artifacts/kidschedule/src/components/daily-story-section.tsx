import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useRecordLearningActivity } from "@/hooks/use-record-learning-activity";
import { enqueueBehaviorWarmup } from "@/lib/behavior-audio-warmup";
import { reportRetentionGoal } from "@/lib/retention/retention-goal-bridge";
import {
  beginStorySession,
  endStorySession,
  recordStoryChapterCompleted,
  recordStoryChapterStarted,
} from "@/lib/story-world-learning-adapter";
import { ConfettiBurst, XpPopup } from "@/components/study-engagement";
import { cn } from "@/lib/utils";
import {
  createParentHubAudioIdentity,
  PARENT_HUB_SECTIONS,
} from "@/lib/parent-hub-audio-identity";
import { ALL_DAILY_STORIES, buildDailyStorySpeakText, type DailyStory } from "@workspace/parent-hub-speak";
import { BookOpen, Flame, Headphones, Heart, Laugh, Sparkles, Star, Trophy, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
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

type StoryReaction = "loved" | "funny" | "surprising";

type StoryStudioProgress = {
  completed: Record<string, boolean>;
  reactions: Record<string, StoryReaction>;
  quizAnswers: Record<string, string>;
};

const STORY_XP = 30;

function AmyStoryHero({
  story,
  childName,
  ageMonths,
  isPlaying,
  isOpen,
  completed,
  reaction,
  selectedAnswer,
  onRead,
  onListen,
  onPrimeListen,
  onReact,
  onAnswer,
}: {
  story: Story;
  childName: string;
  ageMonths: number;
  isPlaying: boolean;
  isOpen: boolean;
  completed: boolean;
  reaction?: StoryReaction;
  selectedAnswer?: string;
  onRead(): void;
  onListen(): void;
  onPrimeListen(): void;
  onReact(reaction: StoryReaction): void;
  onAnswer(answer: string): void;
}) {
  const c = CAT[story.category];
  const answers = buildStoryAnswers(story);
  return (
    <section
      className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,85,247,0.36),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.90))] p-4 text-white shadow-[0_26px_80px_-34px_rgba(59,130,246,0.85)]"
      style={{ boxShadow: `0 24px 72px -36px ${c.color}` }}
    >
      <div className="absolute -right-10 top-10 h-36 w-36 rounded-full blur-3xl" style={{ background: c.color + "55" }} />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/25 bg-amber-200/15 px-3 py-1 text-xs font-black text-amber-100">
            <Star className="h-3.5 w-3.5 fill-amber-200 text-amber-200" />
            Story of the Day
          </span>
          {completed ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-300/15 px-2.5 py-1 text-[11px] font-black text-emerald-100">
              <Trophy className="h-3.5 w-3.5" />
              Badge unlocked
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div
            className="relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/25 text-7xl shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_18px_42px_-22px_rgba(0,0,0,0.9)]"
            style={{
              background: `linear-gradient(145deg,${c.color}40,rgba(255,255,255,0.10)), radial-gradient(circle at 35% 20%, rgba(255,255,255,0.42), transparent 28%)`,
            }}
          >
            <div className="absolute inset-x-5 top-5 h-1 rounded-full bg-white/30" />
            <span className="drop-shadow-[0_12px_22px_rgba(0,0,0,0.55)] transition-transform duration-500 hover:scale-110">
              {story.emoji}
            </span>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StoryStudioBadge>{readingTime(story.story)} read</StoryStudioBadge>
              <StoryStudioBadge>{ageBadge(ageMonths)}</StoryStudioBadge>
              <StoryStudioBadge>{CAT[story.category].label}</StoryStudioBadge>
              <StoryStudioBadge>💡 Moral</StoryStudioBadge>
              <StoryStudioBadge>🎧 Audio</StoryStudioBadge>
            </div>
            <h3 className="font-quicksand text-3xl font-black leading-tight text-white">
              {story.title}
            </h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-white/62">
              Recommended because {childName} is learning Creativity this week
            </p>
            <p className="mt-3 text-base leading-relaxed text-white/78 line-clamp-3">
              {story.preview}
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onRead}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-500 px-4 py-3 text-sm font-black text-white shadow-[0_14px_34px_-18px_rgba(168,85,247,0.95)] transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <BookOpen className="h-4 w-4" />
                Read Story
              </button>
              <button
                type="button"
                onPointerDown={onPrimeListen}
                onClick={onListen}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[0.08] px-4 py-3 text-sm font-black text-white/90 backdrop-blur-xl transition-all hover:bg-white/[0.13] active:scale-[0.98]"
              >
                <Headphones className="h-4 w-4" />
                {isPlaying ? "Stop Amy" : "Listen With Amy"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-3xl border border-white/12 bg-black/18 p-3 backdrop-blur-xl sm:grid-cols-2">
          <StoryRewardMetric icon={Zap} label="Completion Reward" value={`+${STORY_XP} XP`} />
          <StoryRewardMetric icon={Flame} label="Daily Reading Streak" value={completed ? "Active today" : "Start today"} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ReactionButton active={reaction === "loved"} onClick={() => onReact("loved")} icon={Heart} label="Loved It" />
          <ReactionButton active={reaction === "funny"} onClick={() => onReact("funny")} icon={Laugh} label="Funny" />
          <ReactionButton active={reaction === "surprising"} onClick={() => onReact("surprising")} icon={Sparkles} label="Surprising" />
        </div>

        {isOpen ? (
          <div className="mt-4 space-y-4 rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-xl">
            <p className="text-base leading-8 text-white/84">&ldquo;{story.story}&rdquo;</p>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">Moral</p>
              <p className="mt-1 text-sm font-bold text-white/82">{story.moral}</p>
            </div>
            <div>
              <p className="mb-2 font-quicksand text-lg font-black text-white">What did you learn?</p>
              <div className="grid gap-2">
                {answers.map((answer) => {
                  const selected = selectedAnswer === answer;
                  return (
                    <button
                      key={answer}
                      type="button"
                      onClick={() => onAnswer(answer)}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-left text-sm font-bold transition-all active:scale-[0.99]",
                        selected
                          ? "border-emerald-300/40 bg-emerald-300/16 text-emerald-50"
                          : "border-white/10 bg-black/16 text-white/72 hover:bg-white/10",
                      )}
                    >
                      {answer}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StoryCarouselCard({
  story,
  active,
  completed,
  onSelect,
}: {
  story: Story;
  active: boolean;
  completed: boolean;
  onSelect(): void;
}) {
  const c = CAT[story.category];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-[168px] shrink-0 rounded-3xl border p-3 text-left transition-all duration-300 active:scale-[0.98]",
        active
          ? "border-white/45 bg-white/[0.14] shadow-[0_18px_44px_-28px_rgba(255,255,255,0.9)]"
          : "border-white/12 bg-white/[0.07] hover:bg-white/[0.11]",
      )}
    >
      <div
        className="mb-3 flex h-28 items-center justify-center rounded-2xl border border-white/14 text-5xl transition-transform duration-300 group-hover:-translate-y-1"
        style={{ background: `linear-gradient(145deg,${c.color}38,rgba(255,255,255,0.08))` }}
      >
        {story.emoji}
      </div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <CatBadge category={story.category} />
        {completed ? <Trophy className="h-3.5 w-3.5 text-amber-200" /> : null}
      </div>
      <p className="line-clamp-2 font-quicksand text-sm font-black leading-tight text-white">{story.title}</p>
      <p className="mt-1 text-[11px] font-semibold text-white/46">{readingTime(story.story)} read</p>
    </button>
  );
}

function StoryStudioBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/12 bg-black/22 px-2.5 py-1 text-[11px] font-black text-white/72 backdrop-blur-xl">
      {children}
    </span>
  );
}

function StoryRewardMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2">
      <Icon className="h-4 w-4 text-amber-200" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wide text-white/38">{label}</p>
        <p className="text-sm font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function ReactionButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick(): void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition-all active:scale-[0.98]",
        active
          ? "border-pink-300/35 bg-pink-300/18 text-pink-50 shadow-[0_0_24px_rgba(244,114,182,0.18)]"
          : "border-white/10 bg-black/16 text-white/62 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", active && "fill-current")} />
      {label}
    </button>
  );
}

function readingTime(story: string): string {
  const words = story.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 120))} min`;
}

function ageBadge(ageMonths: number): string {
  const years = Math.max(1, Math.floor(ageMonths / 12));
  return `${years}+ yrs`;
}

function buildStoryAnswers(story: Story): string[] {
  return [
    story.moral,
    "Being fast matters more than being kind.",
    "You should never ask for help.",
  ];
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStoryStreak(streakKey: string): number {
  try {
    const dates: string[] = JSON.parse(localStorage.getItem(streakKey) ?? "[]");
    return consecutiveDayCount(dates);
  } catch {
    return 0;
  }
}

function markStoryReadToday(streakKey: string): number {
  const today = todayKey();
  try {
    const dates = new Set<string>(JSON.parse(localStorage.getItem(streakKey) ?? "[]"));
    dates.add(today);
    const sorted = [...dates].sort().slice(-60);
    localStorage.setItem(streakKey, JSON.stringify(sorted));
    return consecutiveDayCount(sorted);
  } catch {
    return 1;
  }
}

function consecutiveDayCount(dates: string[]): number {
  const dateSet = new Set(dates);
  let count = 0;
  const cursor = new Date();
  for (let i = 0; i < 60; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dateSet.has(key)) break;
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

// ─── Main exported component ──────────────────────────────────────────────────

interface DailyStorySectionProps {
  ageMonths: number;
  childName: string;
  childId?: number;
}
export function DailyStorySection({
  ageMonths,
  childName,
  childId,
}: DailyStorySectionProps) {
  const authFetch = useAuthFetch();
  const { recordActivity } = useRecordLearningActivity(childId ?? 0);
  const storySessionRef = useRef<string | null>(null);
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
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [openStoryId, setOpenStoryId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const progressKey = `amynest:story-studio:${childName}:${new Date().toISOString().slice(0, 10)}`;
  const streakKey = `amynest:story-studio:streak:${childName}`;
  const [progress, setProgress] = useState<StoryStudioProgress>(() => {
    try {
      return JSON.parse(localStorage.getItem(progressKey) ?? '{"completed":{},"reactions":{},"quizAnswers":{}}');
    } catch {
      return { completed: {}, reactions: {}, quizAnswers: {} };
    }
  });
  const [streak, setStreak] = useState(() => readStoryStreak(streakKey));
  const [celebration, setCelebration] = useState({ trigger: 0, amount: 0 });
  const {
    speak,
    pause,
    primeSpeakGesture
  } = useAmyVoice();
  const storySpeech = useCallback((story: Story) => buildDailyStorySpeakText(story), []);
  const visible = useMemo(() => pool.slice(0, (page + 1) * PAGE), [pool, page]);
  const handlePlay = useCallback((story: Story) => {
    if (playingId === story.id) {
      pause();
      setPlayingId(null);
      return;
    }
    pause();
    setPlayingId(story.id);
    if (childId) {
      if (!storySessionRef.current) {
        const began = beginStorySession({
          childId,
          catalog: pool.map((s) => ({
            id: s.id,
            title: s.title,
            category: s.category,
          })),
        });
        storySessionRef.current = began.sessionId;
      }
      recordStoryChapterStarted({
        childId,
        sessionId: storySessionRef.current ?? undefined,
        chapter: {
          storyId: story.id,
          title: story.title,
          category: story.category,
        },
      });
    }
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
  }, [childId, pause, playingId, pool, speak, storySpeech]);
  const hasMore = visible.length < pool.length;
  if (pool.length === 0) return null;
  const featured = visible.find((story) => story.id === activeStoryId) ?? visible[0]!;
  const carouselStories = visible.filter((story) => story.id !== featured.id);
  const completedCount = Object.values(progress.completed).filter(Boolean).length;
  const totalXp = completedCount * STORY_XP;

  const persistProgress = (next: StoryStudioProgress) => {
    try {
      localStorage.setItem(progressKey, JSON.stringify(next));
    } catch {
      // Story rewards still work in-memory if localStorage is unavailable.
    }
  };

  const updateProgress = (updater: (prev: StoryStudioProgress) => StoryStudioProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      persistProgress(next);
      return next;
    });
  };

  const completeStory = (story: Story, answer: string) => {
    const wasCompleted = !!progress.completed[story.id];
    updateProgress((prev) => ({
      completed: { ...prev.completed, [story.id]: true },
      reactions: prev.reactions,
      quizAnswers: { ...prev.quizAnswers, [story.id]: answer },
    }));
    if (!wasCompleted) {
      const nextStreak = markStoryReadToday(streakKey);
      setStreak(nextStreak);
      setCelebration((prev) => ({ trigger: prev.trigger + 1, amount: STORY_XP }));
      void reportRetentionGoal(authFetch, "story");
      if (childId) {
        if (!storySessionRef.current) {
          const began = beginStorySession({ childId });
          storySessionRef.current = began.sessionId;
        }
        const g = recordStoryChapterCompleted({
          childId,
          sessionId: storySessionRef.current ?? undefined,
          chapter: {
            storyId: story.id,
            title: story.title,
            category: story.category,
            concepts: story.moral ? [story.moral] : undefined,
          },
        });
        endStorySession({
          childId,
          sessionId: storySessionRef.current ?? undefined,
          storiesCompleted: 1,
        });
        storySessionRef.current = null;
        void recordActivity({
          activityId: `daily_story_${story.id}`,
          section: "stories",
          correct: true,
          analyticsEvent: "story_completion",
          metadata: {
            title: story.title,
            category: story.category,
            runtimeRuleId: g.ruleId,
            surface: "daily_story_studio",
          },
        });
      }
    }
  };

  return (
    <div className="relative space-y-4">
      <ConfettiBurst trigger={celebration.trigger} />
      <XpPopup amount={celebration.amount} trigger={celebration.trigger} />

      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(168,85,247,0.12),rgba(251,191,36,0.08))] p-3 text-white shadow-[0_18px_60px_-34px_rgba(59,130,246,0.8)] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.08] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              Amy Story Studio
            </p>
            <p className="mt-1 text-xs font-semibold text-white/48">
              Netflix Kids + Kindle Kids inspired daily reading world
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-right">
            <div className="rounded-2xl border border-white/10 bg-black/16 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/40">XP</p>
              <p className="font-quicksand text-sm font-black text-white">{totalXp}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/16 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/40">Streak</p>
              <p className="font-quicksand text-sm font-black text-white">{streak}d</p>
            </div>
          </div>
        </div>

        <AmyStoryHero
          story={featured}
          childName={childName}
          ageMonths={ageMonths}
          isPlaying={playingId === featured.id}
          isOpen={openStoryId === featured.id}
          completed={!!progress.completed[featured.id]}
          reaction={progress.reactions[featured.id]}
          selectedAnswer={progress.quizAnswers[featured.id]}
          onRead={() => setOpenStoryId((current) => current === featured.id ? null : featured.id)}
          onPrimeListen={() => primeSpeakGesture(storySpeech(featured))}
          onListen={() => handlePlay(featured)}
          onReact={(reaction) => updateProgress((prev) => ({
            completed: prev.completed,
            reactions: { ...prev.reactions, [featured.id]: reaction },
            quizAnswers: prev.quizAnswers,
          }))}
          onAnswer={(answer) => completeStory(featured, answer)}
        />

        {carouselStories.length > 0 ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="font-quicksand text-sm font-black text-white">More from Amy&apos;s shelf</p>
              <p className="text-[11px] font-semibold text-white/45">{visible.length} stories today</p>
            </div>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
              {carouselStories.map((story) => (
                <StoryCarouselCard
                  key={story.id}
                  story={story}
                  active={story.id === featured.id}
                  completed={!!progress.completed[story.id]}
                  onSelect={() => {
                    setActiveStoryId(story.id);
                    setOpenStoryId(null);
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {hasMore ? (
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="mt-3 w-full rounded-2xl border border-dashed border-white/18 bg-white/[0.06] py-3 text-sm font-black text-white/76 transition-all hover:bg-white/[0.10] active:scale-[0.98]"
          >
            Load 5 more studio stories
          </button>
        ) : null}
      </div>
    </div>
  );
}