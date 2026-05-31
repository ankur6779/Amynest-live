import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ThumbsUp, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import {
  createParentHubAudioIdentity,
  PARENT_HUB_SECTIONS,
} from "@/lib/parent-hub-audio-identity";
import type { AgeGroup } from "@/lib/age-groups";
import { ALL_HUB_FACTS, buildFactSpeakText, type HubFact } from "@workspace/parent-hub-speak";

// ─── Types ─────────────────────────────────────────────────────────────────────
import { useTranslation } from "react-i18next";
type FactCategory = "animal" | "science" | "gk";
type Fact = HubFact;
const ALL_FACTS = ALL_HUB_FACTS;

// ─── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<FactCategory, string> = {
  animal: "Animal",
  science: "Science",
  gk: "G.K."
};
const CATEGORY_COLORS: Record<FactCategory, string> = {
  animal: "bg-muted dark:bg-card text-primary dark:text-muted-foreground border-border dark:border-border",
  science: "bg-muted dark:bg-card text-primary dark:text-muted-foreground border-border dark:border-border",
  gk: "bg-muted dark:bg-card text-primary dark:text-muted-foreground border-border dark:border-border"
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

function buildFactQuiz(
  fact: Fact,
  pool: Fact[],
  lang: string,
): { statement: string; isTrue: boolean } {
  const seed = dateSeed(fact.id, todayStr());
  const useTrue = seed % 2 === 0;
  if (useTrue) {
    return { statement: factDisplayText(fact, lang), isTrue: true };
  }
  const others = pool.filter((f) => f.id !== fact.id);
  const distractor = others[seed % Math.max(others.length, 1)] ?? fact;
  return { statement: factDisplayText(distractor, lang), isTrue: false };
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
  statement: string;
  isTrue: boolean;
  answered?: boolean;
  correct?: boolean;
};

export function AmazingFacts({
  childName,
  ageGroup,
}: AmazingFactsProps) {
  const {
    t,
    i18n,
  } = useTranslation();
  const lang = i18n.language ?? "en";
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
      playbackMode: "full-required",
    }).then(() => {
      setPlayingId(null);
    });
  }, [playingId, speak, pause]);
  const startQuiz = useCallback((fact: Fact) => {
    pause();
    setPlayingId(null);
    const q = buildFactQuiz(fact, facts, lang);
    setQuiz({ factId: fact.id, ...q });
  }, [facts, lang, pause]);
  const answerQuiz = useCallback((pickedTrue: boolean) => {
    setQuiz(prev => {
      if (!prev) return prev;
      const correct = pickedTrue === prev.isTrue;
      return { ...prev, answered: true, correct };
    });
  }, []);
  if (facts.length === 0) return null;
  return <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">{t("components.amazing_facts.amazing_facts_for_today")}</h3>
        </div>
        <button onClick={refreshFacts} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full">
          <RefreshCw className="h-3.5 w-3.5" /> {t("components.amazing_facts.show_new_facts")}
        </button>
      </div>

      {/* Facts grid */}
      <div className="grid gap-3">
        {facts.map(fact => {
        const isLiked = likes.has(fact.id);
        const displayText = factDisplayText(fact, lang);
        const speakText = buildFactSpeakText(fact);
        const activeQuiz = quiz?.factId === fact.id ? quiz : null;
        return <Card key={fact.id} className="rounded-3xl border-border/50 overflow-hidden hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0 mt-0.5">{fact.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge className={`text-[10px] px-2 py-0 border rounded-full ${CATEGORY_COLORS[fact.category]}`}>
                      {CATEGORY_LABEL[fact.category]}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground leading-snug">
                    {displayText}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onPointerDown={() => primeSpeakGesture(speakText, { parentHub: true })}
                    onClick={() => handleListen(fact)}
                    className={`flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1.5 transition-all ${playingId === fact.id || (speaking && playingId === fact.id) ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/60 text-muted-foreground hover:bg-muted dark:bg-card hover:text-primary"}`}
                    title={t("components.amazing_facts.listen")}
                  >
                    {playingId === fact.id && (speaking || loading) ? (
                      <VolumeX className="h-3 w-3" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => startQuiz(fact)}
                    className="flex items-center justify-center text-xs font-bold rounded-full px-2.5 py-1.5 bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 hover:bg-amber-500/25 transition-all"
                    title={t("components.amazing_facts.quiz")}
                  >
                    ?
                  </button>
                  <button onClick={() => toggleLike(fact.id)} className={`flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1.5 transition-all ${isLiked ? "bg-muted dark:bg-card text-primary dark:text-muted-foreground border border-border dark:border-border" : "bg-muted/60 text-muted-foreground hover:bg-muted dark:bg-card hover:text-primary"}`} title={t("components.amazing_facts.interesting")}>
                    <ThumbsUp className="h-3 w-3" />
                    {isLiked && <span>{t("components.amazing_facts.liked")}</span>}
                  </button>
                </div>
                </div>

                {activeQuiz && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-3 space-y-2">
                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide">
                      {t("components.amazing_facts.quiz_prompt")}
                    </p>
                    <p className="text-sm text-foreground font-medium leading-snug italic">
                      &ldquo;{activeQuiz.statement}&rdquo;
                    </p>
                    {!activeQuiz.answered ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => answerQuiz(true)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30"
                        >
                          {t("components.amazing_facts.true")}
                        </button>
                        <button
                          type="button"
                          onClick={() => answerQuiz(false)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/30 hover:bg-rose-500/30"
                        >
                          {t("components.amazing_facts.false")}
                        </button>
                      </div>
                    ) : (
                      <p className={`text-sm font-bold ${activeQuiz.correct ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {activeQuiz.correct
                          ? t("components.amazing_facts.quiz_correct")
                          : t("components.amazing_facts.quiz_wrong", {
                              answer: factDisplayText(fact, lang),
                            })}
                      </p>
                    )}
                  </div>}
              </CardContent>
            </Card>;
      })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("components.amazing_facts.tap_for_fresh_facts_tap_to_mark_favourites")}
      </p>
    </div>;
}