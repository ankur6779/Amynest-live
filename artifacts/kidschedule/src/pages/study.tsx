import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import {
  PLAY_CATEGORIES, BASIC_SUBJECTS, ADVANCED_SUBJECTS,
  resolveStudyMode, MODE_LABELS,
  type StudyMode, type PlayCategory, type PlayItem,
  type SubjectPack, type StudyTopic,
} from "@workspace/study-zone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, ArrowLeft, Volume2, VolumeX, CheckCircle2, XCircle,
  Sparkles, RotateCcw, ChevronRight, Trophy,
} from "lucide-react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import {
  loadProgress, markPlayItem, markTopicResult,
  categoryPercent, subjectPercent, type StudyProgress,
} from "@/lib/study-progress";

type Child = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number;
  childClass?: string | null;
};

type View =
  | { kind: "child-pick" }
  | { kind: "play-home"; childId: number }
  | { kind: "play-cat"; childId: number; categoryId: string }
  | { kind: "study-home"; childId: number; mode: "basic" | "advanced" }
  | { kind: "study-subject"; childId: number; mode: "basic" | "advanced"; subjectId: string }
  | { kind: "study-topic"; childId: number; mode: "basic" | "advanced"; subjectId: string; topicId: string };

export default function StudyPage() {
  const [, navigate] = useLocation();
  const { data: children, isLoading } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });

  const list = (children ?? []) as Child[];
  const [view, setView] = useState<View>({ kind: "child-pick" });
  const [progress, setProgress] = useState<StudyProgress | null>(null);

  // Auto-pick when there's only one child.
  useEffect(() => {
    if (view.kind === "child-pick" && list.length === 1) {
      const onlyChild = list[0];
      const mode = resolveStudyMode(onlyChild.age, onlyChild.childClass);
      setView(mode === "play"
        ? { kind: "play-home", childId: onlyChild.id }
        : { kind: "study-home", childId: onlyChild.id, mode });
    }
  }, [list, view.kind]);

  // Load progress when child changes.
  useEffect(() => {
    if ("childId" in view) setProgress(loadProgress(view.childId));
  }, [("childId" in view) ? view.childId : null]);

  const child = "childId" in view ? list.find((c) => c.id === view.childId) : undefined;
  const mode: StudyMode | undefined = child ? resolveStudyMode(child.age, child.childClass) : undefined;

  const goBack = () => {
    if (view.kind === "play-home" || view.kind === "study-home") {
      if (list.length > 1) setView({ kind: "child-pick" });
      else navigate("/parenting-hub");
      return;
    }
    if (view.kind === "play-cat" || view.kind === "study-subject") {
      setView(mode === "play"
        ? { kind: "play-home", childId: view.childId }
        : { kind: "study-home", childId: view.childId, mode: (view as any).mode });
      return;
    }
    if (view.kind === "study-topic") {
      setView({ kind: "study-subject", childId: view.childId, mode: view.mode, subjectId: view.subjectId });
      return;
    }
    navigate("/parenting-hub");
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full shrink-0"
            onClick={goBack}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-quicksand text-2xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-indigo-600" />
              Smart Study Zone
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              {child ? `${child.name} · ${mode ? MODE_LABELS[mode].title : ""}` : "Pick a child to begin"}
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : list.length === 0 ? (
        <EmptyChildren />
      ) : view.kind === "child-pick" ? (
        <ChildPicker children={list} onPick={(c) => {
          const m = resolveStudyMode(c.age, c.childClass);
          setView(m === "play"
            ? { kind: "play-home", childId: c.id }
            : { kind: "study-home", childId: c.id, mode: m });
        }} />
      ) : view.kind === "play-home" ? (
        <PlayHome
          progress={progress}
          onOpen={(catId) => setView({ kind: "play-cat", childId: view.childId, categoryId: catId })}
        />
      ) : view.kind === "play-cat" ? (
        <PlayCategoryView
          childId={view.childId}
          categoryId={view.categoryId}
          progress={progress}
          onItemDone={(p) => setProgress(p)}
        />
      ) : view.kind === "study-home" ? (
        <StudyHome
          mode={view.mode}
          progress={progress}
          onOpen={(subjId) => setView({ kind: "study-subject", childId: view.childId, mode: view.mode, subjectId: subjId })}
        />
      ) : view.kind === "study-subject" ? (
        <SubjectTopicList
          mode={view.mode}
          subjectId={view.subjectId}
          progress={progress}
          onOpen={(topicId) => setView({
            kind: "study-topic", childId: view.childId, mode: view.mode, subjectId: view.subjectId, topicId,
          })}
        />
      ) : (
        <TopicDetail
          childId={view.childId}
          mode={view.mode}
          subjectId={view.subjectId}
          topicId={view.topicId}
          onScored={(p) => setProgress(p)}
        />
      )}
    </div>
  );
}

// ─── Sub-views ───────────────────────────────────────────────────────────────

function EmptyChildren() {
  return (
    <Card className="rounded-2xl border-dashed">
      <CardContent className="p-10 text-center">
        <h3 className="font-quicksand text-xl font-bold text-foreground mb-2">No children added yet</h3>
        <p className="text-sm text-muted-foreground mb-4">Add a child profile to start using the Smart Study Zone.</p>
        <Button asChild className="rounded-full">
          <Link href="/children/new">Add a child</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ChildPicker({ children, onPick }: { children: Child[]; onPick: (c: Child) => void }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {children.map((c) => {
        const m = resolveStudyMode(c.age, c.childClass);
        const label = MODE_LABELS[m];
        return (
          <Card key={c.id} className="rounded-2xl hover-elevate cursor-pointer" onClick={() => onPick(c)}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xl">
                {label.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-quicksand font-bold text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.age} yr{c.childClass ? ` · Class ${c.childClass}` : ""} · {label.title}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PlayHome({ progress, onOpen }: { progress: StudyProgress | null; onOpen: (catId: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {PLAY_CATEGORIES.map((cat) => {
        const pct = progress ? categoryPercent(progress, cat.id, cat.items.length) : 0;
        return (
          <Card key={cat.id} className="rounded-2xl hover-elevate cursor-pointer" onClick={() => onOpen(cat.id)}>
            <CardContent className="p-4 flex flex-col items-start gap-2 min-h-[124px]">
              <div className="text-3xl">{cat.emoji}</div>
              <div className="font-quicksand font-bold text-foreground">{cat.title}</div>
              <div className="text-xs text-muted-foreground">{progress?.play[cat.id]?.length ?? 0}/{cat.items.length} done</div>
              <Progress value={pct} className="h-1.5 w-full" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PlayCategoryView({
  childId, categoryId, progress, onItemDone,
}: {
  childId: number;
  categoryId: string;
  progress: StudyProgress | null;
  onItemDone: (p: StudyProgress) => void;
}) {
  const cat = PLAY_CATEGORIES.find((c) => c.id === (categoryId as PlayCategory["id"]));
  if (!cat) return <p className="text-sm text-muted-foreground">Category not found.</p>;
  const completed = new Set(progress?.play[cat.id] ?? []);
  const { speak } = useAmyVoice();
  const handleTap = (item: PlayItem) => {
    speak(item.speak);
    onItemDone(markPlayItem(childId, cat.id, item.id));
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-quicksand text-xl font-bold text-foreground flex items-center gap-2">
          <span className="text-2xl">{cat.emoji}</span> {cat.title}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {cat.items.map((item) => {
          const done = completed.has(item.id);
          const isRhyme = cat.id === "rhymes";
          return (
            <button
              key={item.id}
              onClick={() => handleTap(item)}
              className={[
                "group relative rounded-2xl border-2 p-4 text-left transition-all",
                "bg-white dark:bg-zinc-900",
                done ? "border-green-400 dark:border-green-500/60" : "border-indigo-200 dark:border-indigo-500/30",
                "hover:scale-[1.02] active:scale-[0.98] hover:shadow-md",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-4xl leading-none">{item.emoji ?? "·"}</div>
                {done && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </div>
              <div className="mt-2 font-quicksand font-bold text-foreground text-lg">{item.label}</div>
              {isRhyme && item.body ? (
                <div className="text-[11px] text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">
                  {item.body}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground mt-1">{item.speak}</div>
              )}
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-300 font-medium">
                <Volume2 className="h-3 w-3" /> Tap to hear
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StudyHome({
  mode, progress, onOpen,
}: {
  mode: "basic" | "advanced";
  progress: StudyProgress | null;
  onOpen: (subjectId: string) => void;
}) {
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {subjects.map((s) => {
        const pct = progress ? subjectPercent(progress, mode, s.id, s.topics.length) : 0;
        const completed = progress
          ? Object.values(progress[mode][s.id] ?? {}).filter((t) => t.completed).length
          : 0;
        return (
          <Card key={s.id} className="rounded-2xl hover-elevate cursor-pointer" onClick={() => onOpen(s.id)}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl">{s.emoji}</div>
                <div>
                  <div className="font-quicksand text-lg font-bold text-foreground">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{completed}/{s.topics.length} topics</div>
                </div>
              </div>
              <Progress value={pct} className="h-1.5" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SubjectTopicList({
  mode, subjectId, progress, onOpen,
}: {
  mode: "basic" | "advanced";
  subjectId: string;
  progress: StudyProgress | null;
  onOpen: (topicId: string) => void;
}) {
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const subj = subjects.find((s) => s.id === subjectId);
  if (!subj) return <p className="text-sm text-muted-foreground">Subject not found.</p>;
  return (
    <div className="grid gap-3">
      <h2 className="font-quicksand text-xl font-bold text-foreground flex items-center gap-2">
        <span className="text-2xl">{subj.emoji}</span> {subj.title}
      </h2>
      {subj.topics.map((t) => {
        const stat = progress?.[mode][subj.id]?.[t.id];
        return (
          <Card key={t.id} className="rounded-2xl hover-elevate cursor-pointer" onClick={() => onOpen(t.id)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-quicksand font-bold text-foreground">{t.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{t.notes.split("\n")[0]}</div>
                {stat && (
                  <div className="text-[11px] mt-1 inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300 font-medium">
                    <Trophy className="h-3 w-3" /> Best: {stat.score}/{stat.total}
                  </div>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TopicDetail({
  childId, mode, subjectId, topicId, onScored,
}: {
  childId: number;
  mode: "basic" | "advanced";
  subjectId: string;
  topicId: string;
  onScored: (p: StudyProgress) => void;
}) {
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const subj = subjects.find((s) => s.id === subjectId);
  const topic: StudyTopic | undefined = subj?.topics.find((t) => t.id === topicId);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [picks, setPicks] = useState<number[]>(() => topic ? Array(topic.questions.length).fill(-1) : []);
  const [submitted, setSubmitted] = useState(false);
  const { speak: amySpeak, stop: amyStop, speaking: amySpeaking, loading: amyLoading } = useAmyVoice();
  if (!subj || !topic) return <p className="text-sm text-muted-foreground">Topic not found.</p>;

  const score = topic.questions.reduce((acc, q, i) => acc + (picks[i] === q.answer ? 1 : 0), 0);
  const total = topic.questions.length;

  const submit = () => {
    setSubmitted(true);
    onScored(markTopicResult(childId, mode, subj.id, topic.id, score, total));
  };
  const reset = () => { setPicks(Array(total).fill(-1)); setSubmitted(false); };

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-quicksand text-2xl font-bold text-foreground">{topic.title}</h2>
        <p className="text-xs text-muted-foreground">{subj.emoji} {subj.title}</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-5">
          {topic.imageExample && (
            <div className="mb-4 rounded-xl overflow-hidden border border-border/40 bg-white">
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(topic.imageExample)}`}
                alt={`${topic.title} illustration`}
                className="w-full h-auto block"
                style={{ maxHeight: 220, objectFit: "contain" }}
              />
            </div>
          )}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="font-quicksand font-bold text-foreground inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" /> Notes from Amy
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                if (amySpeaking || amyLoading) { amyStop(); return; }
                amySpeak(topic.notes.replace(/\n/g, ". "));
              }}
            >
              {(amySpeaking || amyLoading) ? <VolumeX className="h-4 w-4 mr-1" /> : <Volume2 className="h-4 w-4 mr-1" />}
              {amySpeaking ? "Stop" : amyLoading ? "…" : "Read aloud"}
            </Button>
          </div>
          <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">{topic.notes}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                if (amySpeaking || amyLoading) { amyStop(); return; }
                amySpeak(topic.amyPrompt);
              }}
            >
              Hear Amy's prompt
            </Button>
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/assistant">Ask Amy more →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-quicksand font-bold text-foreground">Practice ({total} questions)</div>
            {!practiceOpen && (
              <Button className="rounded-full bg-indigo-600 hover:bg-indigo-700" onClick={() => setPracticeOpen(true)}>
                Try Now
              </Button>
            )}
          </div>
          {practiceOpen && (
            <div className="grid gap-4">
              {topic.questions.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-border/50 p-3">
                  <div className="font-medium text-foreground mb-2">{qi + 1}. {q.q}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => {
                      const selected = picks[qi] === oi;
                      const correct = q.answer === oi;
                      const showState = submitted;
                      const cls = !showState
                        ? selected ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" : "border-border"
                        : correct ? "border-green-500 bg-green-50 dark:bg-green-500/10"
                        : selected ? "border-red-400 bg-red-50 dark:bg-red-500/10"
                        : "border-border opacity-70";
                      return (
                        <button
                          key={oi}
                          disabled={submitted}
                          onClick={() => setPicks((p) => { const n = [...p]; n[qi] = oi; return n; })}
                          className={`text-left rounded-lg border-2 px-3 py-2 text-sm ${cls} transition-colors`}
                        >
                          <span className="inline-flex items-center gap-2">
                            {showState && correct && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            {showState && !correct && selected && <XCircle className="h-4 w-4 text-red-600" />}
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {submitted && q.hint && (
                    <div className="text-[12px] text-muted-foreground mt-2">💡 {q.hint}</div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between flex-wrap gap-3">
                {!submitted ? (
                  <Button
                    className="rounded-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={submit}
                    disabled={picks.some((p) => p === -1)}
                  >
                    Submit
                  </Button>
                ) : (
                  <>
                    <div className="font-quicksand font-bold text-foreground">
                      You got {score} / {total} {score === total ? "🎉" : score >= Math.ceil(total * 0.6) ? "👍" : "💪"}
                    </div>
                    <Button variant="outline" className="rounded-full" onClick={reset}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Try again
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
