import { useEffect, useMemo, useRef, useState } from "react";
import {
  GraduationCap, BookOpen, Gamepad2, Headphones, Trophy,
  UserCheck, Sparkles, Volume2, VolumeX, RefreshCw, Star,
  CheckCircle2, XCircle, Loader2, ListOrdered,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  type SpellingAgeGroup,
  type SpellingDifficulty,
  type SpellingWord,
  spellingAgeGroupFor,
  useSpellingTTS,
  useSpellingWords,
  useSpellingProgress,
  useSpellingLeaderboard,
  BADGE_LABELS,
} from "@/hooks/use-spelling";

interface SpellingMasteryProps {
  childId: number;
  childName: string;
  ageMonths: number;
}

type Mode = "learn" | "practice" | "dictation" | "competition" | "parent";

const MODES: { id: Mode; label: string; icon: React.ComponentType<{ className?: string }>; tint: string }[] = [
  { id: "learn",       label: "Learn",       icon: BookOpen,    tint: "from-indigo-500 to-blue-500" },
  { id: "practice",    label: "Practice",    icon: Gamepad2,    tint: "from-emerald-500 to-teal-500" },
  { id: "dictation",   label: "Dictation",   icon: Headphones,  tint: "from-violet-500 to-purple-500" },
  { id: "competition", label: "Competition", icon: Trophy,      tint: "from-amber-500 to-orange-500" },
  { id: "parent",      label: "Parent Mode", icon: UserCheck,   tint: "from-pink-500 to-rose-500" },
];

const AGE_GROUPS: { id: SpellingAgeGroup; label: string }[] = [
  { id: "2-4",   label: "Age 2–4" },
  { id: "4-6",   label: "Age 4–6" },
  { id: "6-8",   label: "Age 6–8" },
  { id: "8-10+", label: "Age 8–10+" },
];

const DIFFICULTIES: SpellingDifficulty[] = ["easy", "medium", "hard"];

// ────────────────────────────────────────────────────────────────────────────
// Main container
// ────────────────────────────────────────────────────────────────────────────
export function SpellingMastery({ childId, childName, ageMonths }: SpellingMasteryProps) {
  const initialAge = spellingAgeGroupFor(ageMonths);
  const [ageGroup, setAgeGroup] = useState<SpellingAgeGroup>(initialAge);
  const [difficulty, setDifficulty] = useState<SpellingDifficulty>("easy");
  const [mode, setMode] = useState<Mode>("learn");

  const wordsState = useSpellingWords(ageGroup, difficulty);
  const progressState = useSpellingProgress(childId, ageGroup);
  const tts = useSpellingTTS();

  // Re-sync age group if the child's stored age changes mid-session.
  useEffect(() => {
    setAgeGroup(spellingAgeGroupFor(ageMonths));
  }, [ageMonths]);

  return (
    <div className="space-y-3">
      <SpellingHero
        progress={progressState.progress}
        childName={childName}
      />

      {/* Age + Difficulty + Word source */}
      <Card className="border-violet-200/40 dark:border-violet-500/20 bg-gradient-to-br from-violet-50/60 to-indigo-50/60 dark:from-violet-500/[0.06] dark:to-indigo-500/[0.06]">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {AGE_GROUPS.map((g) => (
              <button
                key={g.id}
                onClick={() => setAgeGroup(g.id)}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-quicksand font-bold transition-all",
                  ageGroup === g.id
                    ? "bg-violet-600 text-white shadow-md"
                    : "bg-white/70 dark:bg-white/[0.06] text-foreground hover:bg-white",
                ].join(" ")}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Difficulty
            </span>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={[
                  "px-2.5 py-1 rounded-md text-xs font-bold capitalize transition-all",
                  difficulty === d
                    ? "bg-foreground text-background"
                    : "bg-white/60 dark:bg-white/[0.06] text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {d}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void wordsState.refresh()}
                disabled={wordsState.loading}
                className="h-8 text-xs"
              >
                {wordsState.loading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                )}
                New words
              </Button>
              <Button
                size="sm"
                onClick={() => void wordsState.generateWithAI(difficulty)}
                disabled={wordsState.loading}
                className="h-8 text-xs bg-gradient-to-r from-pink-500 to-violet-600 text-white hover:from-pink-600 hover:to-violet-700"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                AI words
              </Button>
            </div>
          </div>

          {wordsState.source === "ai" && (
            <div className="text-[11px] text-violet-700 dark:text-violet-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Showing AI-generated words
            </div>
          )}
          {wordsState.error && (
            <div className="text-[11px] text-red-600 dark:text-red-400">
              Couldn't load words ({wordsState.error}). Try "New words".
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={[
                "shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-quicksand transition-all",
                active
                  ? `bg-gradient-to-r ${m.tint} text-white shadow-md`
                  : "bg-white/70 dark:bg-white/[0.06] text-foreground hover:bg-white",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Active mode panel */}
      <div>
        {mode === "learn" && (
          <LearnView
            words={wordsState.words}
            loading={wordsState.loading}
            tts={tts}
            onCorrect={() => void progressState.recordAttempt(true)}
          />
        )}
        {mode === "practice" && (
          <PracticeView
            words={wordsState.words}
            loading={wordsState.loading}
            tts={tts}
            onAttempt={(c) => void progressState.recordAttempt(c)}
          />
        )}
        {mode === "dictation" && (
          <DictationView
            words={wordsState.words}
            loading={wordsState.loading}
            tts={tts}
            onAttempt={(c) => void progressState.recordAttempt(c)}
          />
        )}
        {mode === "competition" && (
          <CompetitionView
            words={wordsState.words}
            loading={wordsState.loading}
            tts={tts}
            childId={childId}
            ageGroup={ageGroup}
            onAttempt={(c) => void progressState.recordAttempt(c)}
            onRequestRefresh={() => void wordsState.refresh()}
          />
        )}
        {mode === "parent" && (
          <ParentView
            words={wordsState.words}
            loading={wordsState.loading}
            tts={tts}
            onAttempt={(c) => void progressState.recordAttempt(c)}
          />
        )}
      </div>

      {/* Always-visible leaderboard for the active age group */}
      <LeaderboardPanel ageGroup={ageGroup} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Hero — stars / level / badges
// ────────────────────────────────────────────────────────────────────────────
function SpellingHero({
  progress,
  childName,
}: {
  progress: ReturnType<typeof useSpellingProgress>["progress"];
  childName: string;
}) {
  const stars = progress?.totalStars ?? 0;
  const level = progress?.currentLevel ?? 1;
  const streak = progress?.currentStreak ?? 0;
  const badges = progress?.badges ?? [];
  // 10 stars per level — show progress to next.
  const nextLevelAt = level * 10;
  const progressPct = Math.min(100, Math.round(((stars % 10) / 10) * 100));

  return (
    <Card className="border-amber-200/50 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-500/[0.08] dark:via-yellow-500/[0.06] dark:to-orange-500/[0.08]">
      <CardContent className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shrink-0">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-quicksand font-bold text-[15px] text-foreground">
                {childName}'s Spelling Journey
              </p>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                Level {level}
              </Badge>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {stars}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-[10px]">🔥</span> Streak: {streak}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {stars % 10}/10 to L{level + 1}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-amber-200/40 dark:bg-amber-500/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {badges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {badges.map((id) => {
                  const meta = BADGE_LABELS[id];
                  if (!meta) return null;
                  return (
                    <span
                      key={id}
                      title={meta.label}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-white/[0.06] text-[10px] font-bold"
                    >
                      <span>{meta.emoji}</span>
                      <span>{meta.label}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {nextLevelAt > 0 && null /* nextLevelAt referenced for future tooltip */}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared sub-bits
// ────────────────────────────────────────────────────────────────────────────
function PlayButtons({
  text,
  tts,
  showLabel = true,
}: {
  text: string;
  tts: ReturnType<typeof useSpellingTTS>;
  showLabel?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => void tts.speak(text)}
        disabled={tts.loading}
        className="bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        {tts.loading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : tts.speaking ? (
          <VolumeX className="h-4 w-4 mr-1" />
        ) : (
          <Volume2 className="h-4 w-4 mr-1" />
        )}
        {showLabel && (tts.speaking ? "Stop" : "Play")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void tts.speak(text, { slow: true })}
        disabled={tts.loading}
      >
        🐢 Slow
      </Button>
    </div>
  );
}

function EmptyOrLoading({
  loading,
  empty,
  emptyMsg = "No words available yet.",
}: { loading: boolean; empty: boolean; emptyMsg?: string }) {
  if (loading) {
    return (
      <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" /> Loading words…
      </CardContent></Card>
    );
  }
  if (empty) {
    return (
      <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
        {emptyMsg}
      </CardContent></Card>
    );
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Learn — show word + syllables + sound chunks + audio
// ────────────────────────────────────────────────────────────────────────────
function LearnView({
  words, loading, tts, onCorrect,
}: {
  words: SpellingWord[];
  loading: boolean;
  tts: ReturnType<typeof useSpellingTTS>;
  onCorrect: () => void;
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [words]);
  const empty = !loading && words.length === 0;
  const word = words[idx];

  if (loading || empty || !word) {
    return <EmptyOrLoading loading={loading} empty={empty} />;
  }

  return (
    <Card className="border-indigo-200/40 dark:border-indigo-500/20">
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            Word {idx + 1} of {words.length}
          </p>
          <p className="mt-2 text-5xl font-quicksand font-extrabold tracking-wide text-indigo-700 dark:text-indigo-300 capitalize">
            {word.word}
          </p>
          <p className="mt-2 text-sm text-muted-foreground italic">
            "{word.hint}"
          </p>
        </div>

        <div className="flex justify-center">
          <PlayButtons text={word.word} tts={tts} />
        </div>

        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-bold mb-1.5">
              Syllables
            </p>
            <div className="flex flex-wrap gap-1.5">
              {word.syllables.map((s, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/[0.08] text-base font-quicksand font-bold text-indigo-700 dark:text-indigo-200"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-bold mb-1.5">
              Sounds
            </p>
            <div className="flex flex-wrap gap-1.5">
              {word.chunks.map((s, i) => (
                <button
                  key={i}
                  onClick={() => void tts.speak(s, { slow: true })}
                  className="px-2.5 py-1 rounded-md bg-white dark:bg-white/[0.08] text-sm font-bold text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex-1"
          >
            ← Back
          </Button>
          <Button
            onClick={() => {
              onCorrect();
              setIdx((i) => Math.min(words.length - 1, i + 1));
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> I learned it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Practice — alternates between Missing-Letter and Jumbled-Letter games
// ────────────────────────────────────────────────────────────────────────────
function PracticeView({
  words, loading, tts, onAttempt,
}: {
  words: SpellingWord[];
  loading: boolean;
  tts: ReturnType<typeof useSpellingTTS>;
  onAttempt: (correct: boolean) => void;
}) {
  const [idx, setIdx] = useState(0);
  const empty = !loading && words.length === 0;
  useEffect(() => { setIdx(0); }, [words]);
  const word = words[idx];
  // Alternate game: even idx = missing letter, odd idx = jumbled.
  const game: "missing" | "jumbled" = idx % 2 === 0 ? "missing" : "jumbled";

  if (loading || empty || !word) {
    return <EmptyOrLoading loading={loading} empty={empty} />;
  }

  const next = () => setIdx((i) => (i + 1) % words.length);

  return (
    <div className="space-y-3">
      <div className="text-center text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
        {game === "missing" ? "Missing Letter" : "Jumbled Letters"} — {idx + 1} / {words.length}
      </div>
      {game === "missing" ? (
        <MissingLetterGame
          key={`m-${word.id}`}
          word={word}
          tts={tts}
          onResult={(c) => { onAttempt(c); }}
          onNext={next}
        />
      ) : (
        <JumbledLetterGame
          key={`j-${word.id}`}
          word={word}
          tts={tts}
          onResult={(c) => { onAttempt(c); }}
          onNext={next}
        />
      )}
    </div>
  );
}

function MissingLetterGame({
  word, tts, onResult, onNext,
}: {
  word: SpellingWord;
  tts: ReturnType<typeof useSpellingTTS>;
  onResult: (correct: boolean) => void;
  onNext: () => void;
}) {
  // Hide one "chunk" (letter or digraph) and ask the child to choose it
  // from a small set of distractor chunks pulled from the same word's
  // siblings. Determined once per word so the puzzle is stable.
  const { chunks } = word;
  const hideIdx = useMemo(() => Math.floor(Math.random() * chunks.length), [chunks]);
  const target = chunks[hideIdx];

  const options = useMemo(() => {
    // Take up to 3 distractor letters from the rest of the word + a few
    // common letters, dedupe, then shuffle in the correct answer.
    const distractors = new Set<string>();
    chunks.forEach((c, i) => { if (i !== hideIdx) distractors.add(c); });
    const filler = ["a", "e", "i", "o", "u", "s", "t", "n", "r"];
    for (const f of filler) {
      if (distractors.size >= 3) break;
      if (f !== target) distractors.add(f);
    }
    const arr = [target, ...Array.from(distractors).slice(0, 3)];
    // Fisher-Yates
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [chunks, hideIdx, target]);

  const [chosen, setChosen] = useState<string | null>(null);
  const correct = chosen !== null && chosen === target;

  const pick = (val: string) => {
    if (chosen !== null) return;
    setChosen(val);
    onResult(val === target);
  };

  return (
    <Card className="border-emerald-200/40 dark:border-emerald-500/20">
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <p className="text-3xl font-quicksand font-extrabold tracking-wider text-emerald-700 dark:text-emerald-300 capitalize">
            {chunks.map((c, i) => (
              <span key={i} className={i === hideIdx ? (chosen === null ? "text-emerald-300/70 underline" : correct ? "text-emerald-600" : "text-red-500 line-through") : ""}>
                {i === hideIdx && chosen === null ? "_".repeat(Math.max(1, c.length)) : i === hideIdx ? chosen : c}
              </span>
            ))}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground italic">"{word.hint}"</p>
        </div>

        <div className="flex justify-center">
          <PlayButtons text={word.word} tts={tts} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {options.map((o) => {
            const picked = chosen === o;
            const isAns = chosen !== null && o === target;
            return (
              <button
                key={o}
                onClick={() => pick(o)}
                disabled={chosen !== null}
                className={[
                  "py-3 rounded-xl text-lg font-quicksand font-extrabold transition-all",
                  chosen === null
                    ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : isAns
                      ? "bg-emerald-600 text-white"
                      : picked
                        ? "bg-red-500 text-white"
                        : "bg-white/40 dark:bg-white/[0.04] text-muted-foreground",
                ].join(" ")}
              >
                {o}
              </button>
            );
          })}
        </div>

        {chosen !== null && (
          <div className="flex items-center justify-between gap-2">
            <p className={["text-sm font-bold", correct ? "text-emerald-600" : "text-red-600"].join(" ")}>
              {correct ? "✅ Nice spelling!" : `❌ It's "${word.word}"`}
            </p>
            <Button onClick={onNext} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Next →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JumbledLetterGame({
  word, tts, onResult, onNext,
}: {
  word: SpellingWord;
  tts: ReturnType<typeof useSpellingTTS>;
  onResult: (correct: boolean) => void;
  onNext: () => void;
}) {
  // Tap-to-pick from a shuffled tile bank. Build/typed string is committed
  // when the child has placed exactly word.length letters.
  const target = word.word;
  const tiles = useMemo(() => {
    const arr = target.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.map((ch, i) => ({ id: `${ch}-${i}`, ch }));
  }, [target]);

  const [picked, setPicked] = useState<typeof tiles>([]);
  const [committed, setCommitted] = useState<"ok" | "bad" | null>(null);

  const pick = (tile: typeof tiles[number]) => {
    if (committed) return;
    if (picked.find((p) => p.id === tile.id)) return;
    const nextPicked = [...picked, tile];
    setPicked(nextPicked);
    if (nextPicked.length === target.length) {
      const guess = nextPicked.map((p) => p.ch).join("");
      const ok = guess === target;
      setCommitted(ok ? "ok" : "bad");
      onResult(ok);
    }
  };

  const remove = (i: number) => {
    if (committed) return;
    setPicked(picked.filter((_, idx) => idx !== i));
  };

  return (
    <Card className="border-emerald-200/40 dark:border-emerald-500/20">
      <CardContent className="p-4 space-y-4">
        <div className="text-center text-[11px] text-muted-foreground italic">
          Tap the letters in the right order — clue: "{word.hint}"
        </div>
        <div className="flex justify-center">
          <PlayButtons text={target} tts={tts} />
        </div>

        {/* Picked row */}
        <div className="min-h-[56px] rounded-xl border-2 border-dashed border-emerald-300/60 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/[0.05] p-2 flex flex-wrap justify-center gap-1.5">
          {picked.length === 0 && (
            <span className="text-xs text-muted-foreground self-center">Tap letters below</span>
          )}
          {picked.map((p, i) => (
            <button
              key={p.id}
              onClick={() => remove(i)}
              className={[
                "w-10 h-10 rounded-lg font-quicksand font-extrabold text-lg transition-all",
                committed === "ok"
                  ? "bg-emerald-600 text-white"
                  : committed === "bad"
                    ? "bg-red-500 text-white"
                    : "bg-white dark:bg-white/[0.08] text-emerald-700 dark:text-emerald-300 hover:bg-red-50 dark:hover:bg-red-500/20",
              ].join(" ")}
            >
              {p.ch}
            </button>
          ))}
        </div>

        {/* Tile bank */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {tiles.map((t) => {
            const used = picked.find((p) => p.id === t.id);
            return (
              <button
                key={t.id}
                onClick={() => pick(t)}
                disabled={!!used || !!committed}
                className={[
                  "w-10 h-10 rounded-lg font-quicksand font-extrabold text-lg transition-all",
                  used
                    ? "bg-white/30 dark:bg-white/[0.04] text-muted-foreground/50"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
                ].join(" ")}
              >
                {t.ch}
              </button>
            );
          })}
        </div>

        {committed && (
          <div className="flex items-center justify-between gap-2">
            <p className={["text-sm font-bold", committed === "ok" ? "text-emerald-600" : "text-red-600"].join(" ")}>
              {committed === "ok" ? "✅ Spelt right!" : `❌ It's "${target}"`}
            </p>
            <Button
              onClick={() => { setPicked([]); setCommitted(null); onNext(); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Next →
            </Button>
          </div>
        )}
        {!committed && picked.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setPicked([])}
            className="w-full"
          >
            Clear
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Dictation — audio plays, child types the word
// ────────────────────────────────────────────────────────────────────────────
function DictationView({
  words, loading, tts, onAttempt,
}: {
  words: SpellingWord[];
  loading: boolean;
  tts: ReturnType<typeof useSpellingTTS>;
  onAttempt: (correct: boolean) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [committed, setCommitted] = useState<"ok" | "bad" | null>(null);
  const empty = !loading && words.length === 0;

  useEffect(() => { setIdx(0); setGuess(""); setCommitted(null); }, [words]);

  const word = words[idx];

  // Auto-play when the word changes (mounting effect on idx).
  useEffect(() => {
    if (word) {
      const t = setTimeout(() => void tts.speak(word.word), 200);
      return () => clearTimeout(t);
    }
  }, [idx, word, tts]);

  if (loading || empty || !word) {
    return <EmptyOrLoading loading={loading} empty={empty} />;
  }

  const submit = () => {
    if (committed) return;
    const ok = guess.trim().toLowerCase() === word.word;
    setCommitted(ok ? "ok" : "bad");
    onAttempt(ok);
  };

  const next = () => {
    setIdx((i) => (i + 1) % words.length);
    setGuess("");
    setCommitted(null);
  };

  return (
    <Card className="border-violet-200/40 dark:border-violet-500/20">
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            Dictation — {idx + 1} / {words.length}
          </p>
          <p className="mt-2 text-base text-violet-700 dark:text-violet-300 font-bold">
            🎧 Listen and spell the word
          </p>
        </div>

        <div className="flex justify-center">
          <PlayButtons text={word.word} tts={tts} />
        </div>

        <Input
          value={guess}
          onChange={(e) => !committed && setGuess(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Type the word…"
          autoFocus
          disabled={!!committed}
          className={[
            "text-center text-xl font-quicksand font-bold tracking-wider h-12",
            committed === "ok" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "",
            committed === "bad" ? "border-red-500 bg-red-50 dark:bg-red-500/10" : "",
          ].join(" ")}
        />

        {committed === null ? (
          <Button
            onClick={submit}
            disabled={!guess.trim()}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            Check
          </Button>
        ) : (
          <div className="space-y-2">
            <div className={["flex items-center justify-center gap-2 text-sm font-bold", committed === "ok" ? "text-emerald-600" : "text-red-600"].join(" ")}>
              {committed === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {committed === "ok" ? `Spot on — "${word.word}"` : `It's "${word.word}"`}
            </div>
            <Button onClick={next} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
              Next word →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Competition — timed, no hints, score reveal at end
// ────────────────────────────────────────────────────────────────────────────
function CompetitionView({
  words, loading, tts, childId, ageGroup, onAttempt, onRequestRefresh,
}: {
  words: SpellingWord[];
  loading: boolean;
  tts: ReturnType<typeof useSpellingTTS>;
  childId: number;
  ageGroup: SpellingAgeGroup;
  onAttempt: (correct: boolean) => void;
  onRequestRefresh: () => void;
}) {
  const lb = useSpellingLeaderboard(ageGroup);
  type Phase = "idle" | "running" | "done";
  const [phase, setPhase] = useState<Phase>("idle");
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [correct, setCorrect] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [savedAccuracy, setSavedAccuracy] = useState<number | null>(null);
  const startedAtRef = useRef<number>(0);

  // 1Hz timer while running
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Reset & refresh words whenever we leave a finished run.
  const start = () => {
    onRequestRefresh();
    setIdx(0); setGuess(""); setCorrect(0); setElapsed(0);
    setSavedScore(null); setSavedAccuracy(null);
    startedAtRef.current = Date.now();
    setPhase("running");
  };

  const word = words[idx];

  // Auto-speak each new word during the run.
  useEffect(() => {
    if (phase === "running" && word) {
      const t = setTimeout(() => void tts.speak(word.word), 250);
      return () => clearTimeout(t);
    }
  }, [phase, idx, word, tts]);

  const submit = async () => {
    if (phase !== "running" || !word) return;
    const ok = guess.trim().toLowerCase() === word.word;
    if (ok) setCorrect((c) => c + 1);
    onAttempt(ok);
    setGuess("");

    const nextIdx = idx + 1;
    if (nextIdx >= words.length) {
      // End of run: stamp duration, persist score.
      const finalElapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      setElapsed(finalElapsed);
      setPhase("done");
      const finalCorrect = correct + (ok ? 1 : 0);
      const acc = Math.round((finalCorrect / words.length) * 100);
      setSavedAccuracy(acc);
      const saved = await lb.recordScore({
        childId,
        wordsAttempted: words.length,
        wordsCorrect: finalCorrect,
        durationSec: finalElapsed,
      });
      setSavedScore(saved?.score ?? null);
    } else {
      setIdx(nextIdx);
    }
  };

  if (phase === "idle") {
    return (
      <Card className="border-amber-200/40 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/[0.06] dark:to-orange-500/[0.06]">
        <CardContent className="p-5 space-y-3 text-center">
          <Trophy className="h-10 w-10 mx-auto text-amber-500" />
          <p className="font-quicksand font-bold text-base text-foreground">
            Spelling Competition
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            10 words. Timer is on. No hints. Listen carefully and type your answer.
            Faster + accurate = higher score.
          </p>
          <Button
            onClick={start}
            disabled={loading || words.length === 0}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trophy className="h-4 w-4 mr-1" />}
            Start Competition
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "done") {
    return (
      <Card className="border-amber-200/40 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/[0.06] dark:to-orange-500/[0.06]">
        <CardContent className="p-5 space-y-3 text-center">
          <Trophy className="h-12 w-12 mx-auto text-amber-500" />
          <p className="font-quicksand font-extrabold text-lg text-foreground">
            All done!
          </p>
          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
            <Stat label="Correct" value={`${correct}/${words.length}`} />
            <Stat label="Accuracy" value={`${savedAccuracy ?? 0}%`} />
            <Stat label="Time" value={`${elapsed}s`} />
          </div>
          {savedScore !== null && (
            <div className="text-sm">
              <span className="text-muted-foreground">Score:</span>{" "}
              <span className="font-quicksand font-extrabold text-2xl text-amber-700 dark:text-amber-300">
                {savedScore}
              </span>
            </div>
          )}
          <Button onClick={start} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            Play again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // running
  if (!word) return null;
  return (
    <Card className="border-amber-200/40 dark:border-amber-500/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-amber-700 dark:text-amber-300">
            Word {idx + 1} of {words.length}
          </span>
          <span className="font-mono">⏱ {elapsed}s</span>
          <span className="font-bold text-emerald-600">✓ {correct}</span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          🎧 Listen and type the word — no hints!
        </p>
        <div className="flex justify-center">
          <PlayButtons text={word.word} tts={tts} />
        </div>
        <Input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
          placeholder="Spell the word…"
          autoFocus
          className="text-center text-xl font-quicksand font-bold tracking-wider h-12"
        />
        <Button
          onClick={() => void submit()}
          disabled={!guess.trim()}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        >
          Submit
        </Button>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 dark:bg-white/[0.06] p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-quicksand font-bold text-sm text-foreground">{value}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Parent Mode — list of words for parent to read aloud, child answers
// ────────────────────────────────────────────────────────────────────────────
function ParentView({
  words, loading, tts, onAttempt,
}: {
  words: SpellingWord[];
  loading: boolean;
  tts: ReturnType<typeof useSpellingTTS>;
  onAttempt: (correct: boolean) => void;
}) {
  const empty = !loading && words.length === 0;
  if (loading || empty) return <EmptyOrLoading loading={loading} empty={empty} />;

  return (
    <Card className="border-pink-200/40 dark:border-pink-500/20">
      <CardContent className="p-4 space-y-3">
        <div className="text-center">
          <p className="font-quicksand font-bold text-foreground">
            Ask your child to spell these words
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Tap 🔊 to hear the word, then ask your child. Mark right or wrong.
          </p>
        </div>
        <div className="space-y-2">
          {words.map((w) => (
            <ParentRow key={w.id} word={w} tts={tts} onAttempt={onAttempt} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ParentRow({
  word, tts, onAttempt,
}: {
  word: SpellingWord;
  tts: ReturnType<typeof useSpellingTTS>;
  onAttempt: (correct: boolean) => void;
}) {
  const [marked, setMarked] = useState<"ok" | "bad" | null>(null);

  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-pink-50/60 dark:bg-pink-500/[0.06] border border-pink-200/40 dark:border-pink-500/20">
      <button
        onClick={() => void tts.speak(word.word)}
        className="w-9 h-9 shrink-0 rounded-lg bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600"
        aria-label={`Play ${word.word}`}
      >
        <Volume2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => void tts.speak(word.word, { slow: true })}
        className="w-9 h-9 shrink-0 rounded-lg bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-200 flex items-center justify-center hover:bg-pink-200"
        aria-label={`Play ${word.word} slowly`}
      >
        <span className="text-base">🐢</span>
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-quicksand font-bold text-sm text-foreground capitalize">{word.word}</p>
        <p className="text-[11px] text-muted-foreground italic truncate">"{word.hint}"</p>
      </div>
      <Button
        size="sm"
        variant={marked === "ok" ? "default" : "outline"}
        onClick={() => { if (marked) return; setMarked("ok"); onAttempt(true); }}
        disabled={!!marked}
        className={marked === "ok" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
      >
        ✓
      </Button>
      <Button
        size="sm"
        variant={marked === "bad" ? "default" : "outline"}
        onClick={() => { if (marked) return; setMarked("bad"); onAttempt(false); }}
        disabled={!!marked}
        className={marked === "bad" ? "bg-red-500 hover:bg-red-600 text-white" : ""}
      >
        ✗
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Leaderboard panel
// ────────────────────────────────────────────────────────────────────────────
function LeaderboardPanel({ ageGroup }: { ageGroup: SpellingAgeGroup }) {
  const lb = useSpellingLeaderboard(ageGroup);

  return (
    <Card className="border-yellow-200/40 dark:border-yellow-500/20">
      <CardContent className="p-3.5 space-y-2">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-amber-500" />
          <p className="font-quicksand font-bold text-sm text-foreground">
            Family Leaderboard ({ageGroup})
          </p>
        </div>
        {lb.loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : lb.rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No scores yet — finish a Competition run to land on the board!
          </p>
        ) : (
          <ol className="space-y-1">
            {lb.rows.map((row, i) => (
              <li
                key={row.id}
                className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-amber-50/60 dark:bg-amber-500/[0.06]"
              >
                <span className="w-5 text-center font-bold text-amber-700 dark:text-amber-300">
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-bold text-foreground">
                  {row.childName ?? "—"}
                </span>
                <span className="text-muted-foreground">
                  {row.wordsCorrect}/{row.wordsAttempted} • {row.accuracyPct}% • {row.durationSec}s
                </span>
                <span className="font-quicksand font-extrabold text-amber-700 dark:text-amber-300">
                  {row.score}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
