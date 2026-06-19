import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpenCheck, Brain, Flame, Heart, RefreshCw, Send, Sparkles, Star, Trophy, Volume2, VolumeX, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { ConfettiBurst, XpPopup } from "@/components/study-engagement";
import { cn } from "@/lib/utils";
import {
  createParentHubAudioIdentity,
  PARENT_HUB_SECTIONS,
} from "@/lib/parent-hub-audio-identity";
import type { AgeGroup } from "@/lib/age-groups";
import { ALL_HUB_FACTS, buildFactSpeakText, type HubFact } from "@workspace/parent-hub-speak";

// ─── Types ─────────────────────────────────────────────────────────────────────
type FactCategory = "animal" | "science" | "gk";
type Fact = HubFact;
const ALL_FACTS = ALL_HUB_FACTS;

// ─── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<FactCategory, string> = {
  animal: "Animal",
  science: "Science",
  gk: "G.K."
};
const CATEGORY_STYLE: Record<FactCategory, { from: string; to: string; text: string; chip: string; glow: string }> = {
  animal: {
    from: "from-emerald-400",
    to: "to-lime-400",
    text: "text-emerald-100",
    chip: "border-emerald-200/25 bg-emerald-200/14 text-emerald-50",
    glow: "rgba(52,211,153,0.36)",
  },
  science: {
    from: "from-cyan-400",
    to: "to-blue-500",
    text: "text-cyan-100",
    chip: "border-cyan-200/25 bg-cyan-200/14 text-cyan-50",
    glow: "rgba(34,211,238,0.36)",
  },
  gk: {
    from: "from-amber-300",
    to: "to-orange-500",
    text: "text-amber-100",
    chip: "border-amber-200/25 bg-amber-200/14 text-amber-50",
    glow: "rgba(251,191,36,0.36)",
  },
};
function lsKey(childName: string) {
  return `amynest_facts_${childName.replace(/\s+/g, "_").toLowerCase()}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// seeded shuffle — deterministic for a given seed
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = s * 1664525 + 1013904223 & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
function pickFacts(ageGroup: AgeGroup, seed: number, count = 10): Fact[] {
  const pool = ALL_FACTS.filter(f => f.ageGroups.includes(ageGroup));
  if (pool.length === 0) return [];
  const shuffled = seededShuffle(pool, seed);
  // Ensure category mix: prioritise animal + science + gk variety
  const byCategory: Record<FactCategory, Fact[]> = {
    animal: [],
    science: [],
    gk: []
  };
  shuffled.forEach(f => byCategory[f.category].push(f));
  const result: Fact[] = [];
  const cats: FactCategory[] = ["animal", "science", "gk"];
  let ci = 0;
  while (result.length < count) {
    const cat = cats[ci % 3]!;
    const next = byCategory[cat].shift();
    if (next) result.push(next);
    ci++;
    if (cats.every(c => byCategory[c].length === 0)) break;
  }
  return result;
}
function factDisplayText(fact: Fact, lang: string): string {
  const useHi = lang === "hi" || lang.startsWith("hi-");
  return useHi && fact.textHi.trim() ? fact.textHi : fact.text;
}

function factChallengeAnswer(fact: Fact, lang: string): string {
  const text = factDisplayText(fact, lang);
  const cleaned = text
    .replace(/^Did you know\??\s*/i, "")
    .replace(/^A\s+/i, "")
    .replace(/^An\s+/i, "")
    .replace(/^The\s+/i, "")
    .trim();
  const subject = cleaned.split(/\s+(?:have|has|is|are|can|were|was|live|takes|drink|make|cover|existed|recognise|start|taste|float|turn|opens|moves|contains|spans)\b/i)[0]?.trim();
  const words = (subject || cleaned).split(/\s+/).slice(0, 3).join(" ");
  return words.replace(/[—,.!?:;]+$/g, "") || CATEGORY_LABEL[fact.category];
}

function quizDistractors(fact: Fact, pool: Fact[], lang: string): string[] {
  const defaults: Record<FactCategory, string[]> = {
    animal: ["Tiger", "Elephant", "Dolphin", "Penguin"],
    science: ["Gravity", "Sunlight", "Magnets", "Water"],
    gk: ["Moon", "Earth", "Oceans", "Rainbow"],
  };
  const fromPool = pool
    .filter((candidate) => candidate.id !== fact.id)
    .map((candidate) => factChallengeAnswer(candidate, lang))
    .filter((answer) => answer && answer !== factChallengeAnswer(fact, lang));
  return [...new Set([...fromPool, ...defaults[fact.category]])].slice(0, 2);
}

function buildFactQuiz(
  fact: Fact,
  pool: Fact[],
  lang: string,
): { question: string; options: string[]; correct: string } {
  const seed = dateSeed(fact.id, todayStr());
  const correct = factChallengeAnswer(fact, lang);
  const distractors = quizDistractors(fact, pool, lang);
  const options = seededShuffle([correct, ...distractors].slice(0, 3), seed + 13);
  return {
    question: fact.category === "animal"
      ? "Which animal is this discovery about?"
      : "Which discovery topic did this fact teach?",
    options,
    correct,
  };
}

function dateSeed(date: string, childName: string): number {
  const s = date + childName;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ─── Component ──────────────────────────────────────────────────────────────────

interface AmazingFactsProps {
  childName: string;
  ageGroup: AgeGroup;
}
type QuizState = {
  factId: string;
  selected: string;
  correct?: boolean;
};

function DiscoveryStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "cyan" | "amber" | "emerald";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-200/20 bg-cyan-200/10 text-cyan-100"
      : tone === "amber"
        ? "border-amber-200/20 bg-amber-200/10 text-amber-100"
        : "border-emerald-200/20 bg-emerald-200/10 text-emerald-100";
  return (
    <div className={cn("rounded-2xl border p-3 backdrop-blur-xl", toneClass)}>
      <Icon className="mb-2 h-4 w-4" />
      <p className="text-[9px] font-black uppercase tracking-wide text-white/42">{label}</p>
      <p className="mt-1 font-quicksand text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MiniDiscoveryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-white/38">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-white/82">{value}</p>
    </div>
  );
}

export function AmazingFacts({
  childName,
  ageGroup,
}: AmazingFactsProps) {
  const lang = "en";
  const [likes, setLikes] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(`${lsKey(childName)}_likes`) || "[]"));
    } catch {
      return new Set();
    }
  });
  const [facts, setFacts] = useState<Fact[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [xpTrigger, setXpTrigger] = useState({ trigger: 0, amount: 0 });
  const discoveryKey = `${lsKey(childName)}_discoveries`;
  const [discoveries, setDiscoveries] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(discoveryKey) || "{}");
    } catch {
      return {};
    }
  });
  const { speak, pause, primeSpeakGesture, speaking, loading } = useAmyVoice();
  useEffect(() => {
    const seed = dateSeed(todayStr() + refreshCount, childName);
    setFacts(pickFacts(ageGroup, seed));
  }, [ageGroup, childName, refreshCount]);
  const toggleLike = useCallback((id: string) => {
    setLikes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(`${lsKey(childName)}_likes`, JSON.stringify([...next]));
      } catch (e) { console.error("REAL ERROR:", e); }
      return next;
    });
  }, [childName]);
  const saveDiscoveries = useCallback((next: Record<string, string>) => {
    try {
      localStorage.setItem(discoveryKey, JSON.stringify(next));
    } catch {
      // Discovery rewards still work in-memory if storage is unavailable.
    }
  }, [discoveryKey]);
  const refreshFacts = () => {
    pause();
    setPlayingId(null);
    setQuiz(null);
    setRefreshCount(c => c + 1);
  };
  const handleListen = useCallback((fact: Fact) => {
    if (playingId === fact.id) {
      pause();
      setPlayingId(null);
      return;
    }
    pause();
    setQuiz(null);
    setPlayingId(fact.id);
    // Audio uses English static corpus; UI may show Hindi (displayText).
    const speakText = buildFactSpeakText(fact);
    const identity = createParentHubAudioIdentity({
      sectionId: PARENT_HUB_SECTIONS.FACTS,
      itemId: fact.id,
      text: speakText,
    });
    void speak(identity.text, {
      parentHub: true,
      audioIdentity: identity,
      waitUntilEnd: true,
    }).then(() => {
      setPlayingId(null);
    });
  }, [playingId, speak, pause]);
  const answerQuiz = useCallback((fact: Fact, selected: string, correct: string) => {
    const isCorrect = selected === correct;
    setQuiz({ factId: fact.id, selected, correct: isCorrect });
    if (isCorrect && !discoveries[fact.id]) {
      const next = { ...discoveries, [fact.id]: todayStr() };
      setDiscoveries(next);
      saveDiscoveries(next);
      setXpTrigger((prev) => ({ trigger: prev.trigger + 1, amount: 10 }));
    }
  }, [discoveries, saveDiscoveries]);
  const shareFact = useCallback((fact: Fact) => {
    const text = factDisplayText(fact, lang);
    if (navigator.share) {
      void navigator.share({ title: "Amy Discovery Lab", text }).catch(() => undefined);
      return;
    }
    void navigator.clipboard?.writeText(text);
  }, [lang]);
  const weeklyDiscoveries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    return Object.values(discoveries).filter((date) => date >= cutoffKey).length;
  }, [discoveries]);
  const favoriteCategories = useMemo(() => {
    const counts: Record<FactCategory, number> = { animal: 0, science: 0, gk: 0 };
    for (const fact of ALL_FACTS) {
      if (likes.has(fact.id)) counts[fact.category] += 1;
    }
    return (Object.entries(counts) as Array<[FactCategory, number]>)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => CATEGORY_LABEL[category])
      .slice(0, 2);
  }, [likes]);
  const curiosityScore = Math.min(100, weeklyDiscoveries * 10 + likes.size * 3);
  const curiosityStreak = weeklyDiscoveries > 0 ? Math.min(7, weeklyDiscoveries) : 0;
  if (facts.length === 0) return null;
  return <div className="relative space-y-4 text-white">
      <ConfettiBurst trigger={xpTrigger.trigger} />
      <XpPopup amount={xpTrigger.amount} trigger={xpTrigger.trigger} />

      <section className="overflow-hidden rounded-[2rem] border border-white/12 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.30),transparent_30%),radial-gradient(circle_at_90%_8%,rgba(251,191,36,0.28),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.90))] p-4 shadow-[0_24px_80px_-36px_rgba(34,211,238,0.82)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-blue-500 to-emerald-400 text-2xl shadow-[0_0_30px_rgba(34,211,238,0.38)]">
                🔬
              </div>
              <div>
                <h3 className="font-quicksand text-2xl font-black leading-tight">Discovery Lab</h3>
                <p className="text-sm font-semibold text-white/60">Fun knowledge adventures for {childName}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshFacts}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3 py-2 text-xs font-black text-white/80 backdrop-blur-xl transition-all hover:bg-white/[0.13] active:scale-[0.98]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            New Facts
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <DiscoveryStat icon={BookOpenCheck} label="Today's Discoveries" value={String(facts.length)} tone="cyan" />
          <DiscoveryStat icon={Star} label="Weekly Curiosity Score" value={`${curiosityScore}/100`} tone="amber" />
          <DiscoveryStat icon={Trophy} label="Facts Learned" value={String(Object.keys(discoveries).length)} tone="emerald" />
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-black/18 p-3">
          <MiniDiscoveryMetric label="Curiosity Streak" value={`${curiosityStreak}d`} />
          <MiniDiscoveryMetric label="Weekly Discoveries" value={String(weeklyDiscoveries)} />
          <MiniDiscoveryMetric label="Favorite Categories" value={favoriteCategories.join(", ") || "Start saving"} />
        </div>

        <div className="grid gap-4">
          {facts.slice(0, 6).map((fact, index) => {
            const isLiked = likes.has(fact.id);
            const displayText = factDisplayText(fact, lang);
            const speakText = buildFactSpeakText(fact);
            const activeQuiz = quiz?.factId === fact.id ? quiz : null;
            const challenge = buildFactQuiz(fact, facts, lang);
            const style = CATEGORY_STYLE[fact.category];
            const learned = !!discoveries[fact.id];
            return (
              <Card
                key={fact.id}
                className="group overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.07] text-white shadow-[0_18px_54px_-34px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.10]"
                style={{ boxShadow: `0 20px 60px -42px ${style.glow}` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br text-6xl shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]", style.from, style.to)}>
                      <div className="absolute inset-x-5 top-4 h-1 rounded-full bg-white/35" />
                      <span className="drop-shadow-[0_12px_18px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover:scale-110">{fact.emoji}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-black", style.chip)}>
                          {CATEGORY_LABEL[fact.category]} Discovery
                        </span>
                        <span className="rounded-full border border-white/12 bg-black/20 px-2.5 py-1 text-[11px] font-black text-white/62">
                          {index < 2 ? "Easy" : index < 4 ? "Medium" : "Explorer"}
                        </span>
                        <span className="rounded-full border border-pink-200/20 bg-pink-200/12 px-2.5 py-1 text-[11px] font-black text-pink-50">
                          Fun Meter {Math.min(99, 72 + index * 4)}%
                        </span>
                        {learned ? (
                          <span className="rounded-full border border-emerald-200/25 bg-emerald-200/14 px-2.5 py-1 text-[11px] font-black text-emerald-50">
                            Learned
                          </span>
                        ) : null}
                      </div>

                      <p className="font-quicksand text-lg font-black text-white">
                        {fact.emoji} {CATEGORY_LABEL[fact.category]} Discovery
                      </p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/40">Did you know?</p>
                      <p className="mt-1 text-base font-semibold leading-relaxed text-white/82">
                        {displayText}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onPointerDown={() => primeSpeakGesture(speakText, { parentHub: true })}
                          onClick={() => handleListen(fact)}
                          className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition-all active:scale-[0.98]", playingId === fact.id || (speaking && playingId === fact.id) ? "border-cyan-200/40 bg-cyan-200/16 text-cyan-50" : "border-white/10 bg-black/18 text-white/66 hover:bg-white/10 hover:text-white")}
                        >
                          {playingId === fact.id && (speaking || loading) ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                          Listen
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleLike(fact.id)}
                          className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition-all active:scale-[0.98]", isLiked ? "border-pink-200/35 bg-pink-200/18 text-pink-50" : "border-white/10 bg-black/18 text-white/66 hover:bg-white/10 hover:text-white")}
                        >
                          <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={refreshFacts}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/18 px-3 py-2 text-xs font-black text-white/66 transition-all hover:bg-white/10 hover:text-white active:scale-[0.98]"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          New Fact
                        </button>
                        <button
                          type="button"
                          onClick={() => shareFact(fact)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/18 px-3 py-2 text-xs font-black text-white/66 transition-all hover:bg-white/10 hover:text-white active:scale-[0.98]"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Share
                        </button>
                      </div>

                      <div className="mt-4 rounded-3xl border border-white/10 bg-black/18 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Brain className="h-4 w-4 text-amber-200" />
                          <p className="font-quicksand text-sm font-black text-white">Quick Challenge</p>
                        </div>
                        <p className="mb-2 text-sm font-semibold text-white/68">{challenge.question}</p>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {challenge.options.map((option, optionIndex) => {
                            const selected = activeQuiz?.selected === option;
                            const correct = activeQuiz?.correct && selected;
                            const wrong = activeQuiz && selected && !activeQuiz.correct;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => answerQuiz(fact, option, challenge.correct)}
                                className={cn(
                                  "rounded-2xl border px-3 py-2.5 text-left text-xs font-black transition-all active:scale-[0.98]",
                                  correct && "border-emerald-200/40 bg-emerald-200/18 text-emerald-50",
                                  wrong && "border-rose-200/40 bg-rose-200/18 text-rose-50",
                                  !selected && "border-white/10 bg-white/[0.06] text-white/72 hover:bg-white/[0.10]",
                                )}
                              >
                                {String.fromCharCode(65 + optionIndex)}. {option}
                              </button>
                            );
                          })}
                        </div>
                        {activeQuiz ? (
                          <p className={cn("mt-2 text-sm font-black", activeQuiz.correct ? "text-emerald-200" : "text-rose-200")}>
                            {activeQuiz.correct ? "+10 Curiosity XP earned!" : `Not quite. Correct answer: ${challenge.correct}`}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>;
}