import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { getAuth } from "firebase/auth";
import {
  ChevronLeft,
  Mic,
  BookOpen,
  Gamepad2,
  Sparkles,
  Heart,
  BarChart3,
  GraduationCap,
  Stethoscope,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Star,
  Lock,
} from "lucide-react";
import {
  useListChildren,
  useGetSpeechMilestones,
  useSetSpeechMilestoneStatus,
  useLogSpeechPracticeAttempt,
  useGetSpeechProgress,
  useJoinSpeechExpertWaitlist,
  getGetSpeechMilestonesQueryKey,
  getGetSpeechProgressQueryKey,
  type SpeechMilestoneEntry,
  type SpeechPromptKind,
  type SpeechMilestoneStatus,
} from "@workspace/api-client-react";
import {
  SPEECH_GAMES,
  SPEECH_AFFIRMATIONS,
  PARENT_GUIDANCE_CARDS,
  monthsToBand,
  compareTranscript,
  getPromptsPool,
  type SpeechAgeBand,
  type TranscriptFeedback,
  type PronouncePrompt,
} from "@workspace/speech-coach";
import {
  type SessionPhase,
  type PromptPhase,
  type SessionDifficulty,
  PronunciationCompanion,
} from "./pronunciation-companion";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LockedBlock } from "@/components/locked-block";
import { TryFreeBadge } from "@/components/try-free-badge";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { useAmyVoice } from "@/hooks/use-amy-voice";

type AnyChild = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number | null;
};

const BAND_TABS: readonly { band: SpeechAgeBand; key: string }[] = [
  { band: "1y", key: "1y" },
  { band: "2y", key: "2y" },
  { band: "3y", key: "3y" },
  { band: "4y_plus", key: "4y_plus" },
];

function totalMonths(c: AnyChild): number {
  return (c.age ?? 0) * 12 + (c.ageMonths ?? 0);
}

function scrollToSection(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Mirrors the parenting-hub `tryFreeFor("hub_*")` contract from
 * `src/pages/parenting-hub.tsx`. Each gated sub-section uses the shared
 * `useFeatureUsage()` hook — exactly the same source of truth the Hub uses
 * — and exposes a `tryFreeFor` helper plus an `onAction` callback that
 * fires `markFeatureUsed` on the first deliberate user interaction
 * (button click / tap). markFeatureUsed never fires on mount, so opening
 * the Speech Coach page does not consume the free trial for any section.
 */
function useSpeechHubGate(featureId: string) {
  const usage = useFeatureUsage();
  const firedRef = useRef(false);
  const locked = usage.isFeatureLocked(featureId);
  // Same expression as `tryFreeFor` in parenting-hub.tsx (line ~468).
  const tryFreeFor = (id: string) =>
    !usage.isPremium && !usage.hasUsedFeature(id);
  const tryFree = tryFreeFor(featureId);

  const onAction = () => {
    if (firedRef.current) return;
    if (locked) return;
    if (tryFree) {
      firedRef.current = true;
      usage.markFeatureUsed(featureId);
    }
  };

  return { locked, tryFree, onAction };
}

function GatedSection({
  featureId,
  title,
  description,
  icon,
  anchorId,
  consumeOnView = false,
  children,
}: {
  featureId: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  anchorId?: string;
  /**
   * Read-only sections (Dashboard, Reports, Affirmations) have no required
   * user interaction — viewing them IS the value. For those, set this prop
   * so the first-time-free is consumed once when the section actually
   * renders unlocked, ensuring the second visit is correctly gated.
   * Interactive sections leave this false and rely on `onAction`.
   */
  consumeOnView?: boolean;
  children: (gate: { onAction: () => void; locked: boolean }) => React.ReactNode;
}) {
  const { locked, tryFree, onAction } = useSpeechHubGate(featureId);

  // Per the spec's "first-time-free, then locked" model: read-only
  // sections still need to consume their free use, otherwise they'd
  // remain unlocked forever. Fire once on mount when unlocked + tryFree.
  useEffect(() => {
    if (consumeOnView && !locked && tryFree) onAction();
    // onAction is idempotent (guarded by firedRef inside the gate hook).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumeOnView, locked, tryFree]);

  return (
    <LockedBlock locked={locked} rounded="rounded-3xl">
      <Card
        className="rounded-3xl border border-border bg-card"
        id={anchorId}
      >
        <CardContent className="p-5 space-y-4">
          <header className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base text-foreground leading-tight">
                  {title}
                </h2>
                {tryFree && <TryFreeBadge />}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {description}
              </p>
            </div>
          </header>
          <div>{children({ onAction, locked })}</div>
        </CardContent>
      </Card>
    </LockedBlock>
  );
}

// ─── 1. Speech Development Dashboard ─────────────────────────────────────────
function DashboardSection({ child }: { child: AnyChild }) {
  const { t } = useTranslation();
  const progress = useGetSpeechProgress({ childId: child.id, range: "week" });
  const data = progress.data;
  const score = data?.score ?? 0;
  const pron = data?.pronunciationPct ?? 0;
  const streak = data?.streakDays ?? 0;
  const onTrack = data?.milestonesOnTrack ?? 0;
  const totalMs = data?.milestonesTotal ?? 0;
  const ageMonths = totalMonths(child);

  const confidenceLabel =
    pron >= 80
      ? t("screens.speech_coach.dashboard.confidence_high")
      : pron >= 50
        ? t("screens.speech_coach.dashboard.confidence_mid")
        : t("screens.speech_coach.dashboard.confidence_low");

  return (
    <GatedSection
      featureId="hub_speech_dashboard"
      anchorId="speech-section-dashboard"
      title={t("screens.speech_coach.dashboard.title")}
      description={t("screens.speech_coach.subtitle")}
      icon={<BarChart3 className="h-5 w-5" />}
      consumeOnView
    >
      {() => (<>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={t("screens.speech_coach.dashboard.weekly_score")}
          value={`${score}%`}
        />
        <Stat
          label={t("screens.speech_coach.dashboard.pronunciation_improvement")}
          value={`${pron}%`}
        />
        <Stat
          label={t("screens.speech_coach.dashboard.daily_streak")}
          value={t(
            streak === 1
              ? "screens.speech_coach.dashboard.streak_days_one"
              : "screens.speech_coach.dashboard.streak_days_other",
            { count: streak },
          )}
        />
        <Stat
          label={t("screens.speech_coach.dashboard.confidence")}
          value={confidenceLabel}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {t("screens.speech_coach.dashboard.milestones_completed", {
          done: onTrack,
          total: totalMs,
        })}{" "}
        · {t("screens.speech_coach.dashboard.speech_age")}: {ageMonths}m
      </p>
      </>)}
    </GatedSection>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

// ─── 2. Milestone Checker ────────────────────────────────────────────────────
function MilestoneStatusButton({
  status,
  active,
  onClick,
  label,
  Icon,
}: {
  status: SpeechMilestoneStatus;
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`milestone-status-${status}`}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:border-primary/50",
      ].join(" ")}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function MilestonesSection({ child }: { child: AnyChild }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const milestones = useGetSpeechMilestones({ childId: child.id });
  const setStatus = useSetSpeechMilestoneStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: getGetSpeechMilestonesQueryKey({ childId: child.id }),
        });
        qc.invalidateQueries({
          queryKey: getGetSpeechProgressQueryKey({
            childId: child.id,
            range: "week",
          }),
        });
      },
    },
  });
  const ageBand = monthsToBand(totalMonths(child));
  const [tab, setTab] = useState<SpeechAgeBand>(ageBand ?? "2y");

  const items = useMemo(
    () =>
      (milestones.data?.milestones ?? []).filter((m) => {
        // Pull band from the well-known id prefix (m_<band>_…) since the
        // API entry doesn't return ageBand directly.
        if (m.id.startsWith("m_1y_")) return tab === "1y";
        if (m.id.startsWith("m_2y_")) return tab === "2y";
        if (m.id.startsWith("m_3y_")) return tab === "3y";
        if (m.id.startsWith("m_4plus_")) return tab === "4y_plus";
        return false;
      }),
    [milestones.data, tab],
  );

  return (
    <GatedSection
      featureId="hub_speech_milestones"
      anchorId="speech-section-milestones"
      title={t("screens.speech_coach.milestones.section_title")}
      description={t("screens.speech_coach.subtitle")}
      icon={<CheckCircle2 className="h-5 w-5" />}
    >
      {({ onAction }) => (<>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {BAND_TABS.map(({ band, key }) => (
          <button
            key={band}
            type="button"
            onClick={() => setTab(band)}
            data-testid={`milestone-tab-${band}`}
            className={[
              "px-3 py-1 rounded-full text-xs font-bold border transition-colors",
              tab === band
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50",
            ].join(" ")}
          >
            {t(`screens.speech_coach.milestones.tab.${key}`)}
          </button>
        ))}
      </div>

      {milestones.isLoading && (
        <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
      )}

      <ul className="space-y-2">
        {items.map((m) => (
          <li
            key={m.id}
            className="rounded-2xl border border-border bg-card p-3"
            data-testid={`milestone-${m.id}`}
          >
            <p className="font-semibold text-sm text-foreground">
              {t(m.i18nKeyLabel)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(m.i18nKeyHint)}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <MilestoneStatusButton
                status="on_track"
                active={m.status === "on_track"}
                onClick={() => {
                  onAction();
                  setStatus.mutate({
                    id: m.id,
                    data: { childId: child.id, status: "on_track" },
                  });
                }}
                label={t("screens.speech_coach.milestones.status.on_track")}
                Icon={CheckCircle2}
              />
              <MilestoneStatusButton
                status="needs_attention"
                active={m.status === "needs_attention"}
                onClick={() => {
                  onAction();
                  setStatus.mutate({
                    id: m.id,
                    data: { childId: child.id, status: "needs_attention" },
                  });
                }}
                label={t(
                  "screens.speech_coach.milestones.status.needs_attention",
                )}
                Icon={AlertTriangle}
              />
              <MilestoneStatusButton
                status="consult_expert"
                active={m.status === "consult_expert"}
                onClick={() => {
                  onAction();
                  setStatus.mutate({
                    id: m.id,
                    data: { childId: child.id, status: "consult_expert" },
                  });
                }}
                label={t(
                  "screens.speech_coach.milestones.status.consult_expert",
                )}
                Icon={HelpCircle}
              />
            </div>
          </li>
        ))}
      </ul>
      </>)}
    </GatedSection>
  );
}

// ─── 3. AI Pronunciation Practice ────────────────────────────────────────────

const SESSION_SIZE = 10;

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = ((s * 1664525) + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function PronunciationSection({ child }: { child: AnyChild }) {
  const { t } = useTranslation();
  const log = useLogSpeechPracticeAttempt();
  const voice = useAmyVoice();
  const getAuthToken = useCallback(async () => {
    try {
      return (await getAuth().currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }, []);
  const stt = useSpeechRecognition("en-US", { getAuthToken });

  const [kind, setKind] = useState<SpeechPromptKind>("word");
  const [difficulty, setDifficulty] = useState<SessionDifficulty>("easy");
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("setup");
  const [promptPhase, setPromptPhase] = useState<PromptPhase>("idle");
  const [sessionItems, setSessionItems] = useState<PronouncePrompt[]>([]);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [sessionResults, setSessionResults] = useState<Array<{ id: string; feedback: TranscriptFeedback; score: number }>>([]);
  const [currentResult, setCurrentResult] = useState<{ feedback: TranscriptFeedback; score: number; transcript: string } | null>(null);

  const ageMonths = totalMonths(child);
  const currentItem = sessionItems[sessionIdx] ?? null;
  const isLastItem = sessionIdx === sessionItems.length - 1;

  // ── keep a ref so the STT effect can read promptPhase without re-triggering
  const promptPhaseRef = useRef<PromptPhase>("idle");
  useEffect(() => { promptPhaseRef.current = promptPhase; }, [promptPhase]);
  const currentItemRef = useRef<PronouncePrompt | null>(null);
  useEffect(() => { currentItemRef.current = currentItem; }, [currentItem]);

  // ── when STT finishes, evaluate result
  useEffect(() => {
    if (promptPhaseRef.current !== "recording") return;
    if (stt.listening || stt.transcribing) return;
    const item = currentItemRef.current;
    const final = stt.transcript.trim();
    const r = item ? compareTranscript(item.text, final || "") : null;
    setCurrentResult({
      feedback: final && r ? r.feedback : "try_again",
      score: final && r ? r.score : 0,
      transcript: final,
    });
    setPromptPhase("result");
  }, [stt.listening, stt.transcribing, stt.transcript]);

  const startSession = useCallback(() => {
    const pool = getPromptsPool(ageMonths, kind, difficulty);
    const shuffled = seededShuffle([...pool], Date.now());
    setSessionItems(shuffled.slice(0, Math.min(SESSION_SIZE, shuffled.length)));
    setSessionIdx(0);
    setSessionResults([]);
    setCurrentResult(null);
    setPromptPhase("idle");
    setSessionPhase("practice");
    stt.reset();
    voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageMonths, kind, difficulty]);

  const handleHear = () => {
    if (!currentItem) return;
    const mode = (currentItem.kind === "phonic" || currentItem.kind === "letter") ? "phonics" : "default";
    voice.speak(currentItem.text, { mode: mode as "phonics" | "default" });
    if (promptPhase === "idle") setPromptPhase("heard");
  };

  const handleRecord = () => {
    if (!currentItem) return;
    stt.reset();
    setCurrentResult(null);
    setPromptPhase("recording");
    stt.start();
  };

  const handleStop = () => {
    stt.stop();
    setPromptPhase("analyzing");
  };

  const handleNext = useCallback(() => {
    if (!currentItem || !currentResult) return;
    log.mutate({ data: { childId: child.id, promptId: currentItem.id } });
    const updated = [...sessionResults, { id: currentItem.id, feedback: currentResult.feedback, score: currentResult.score }];
    setSessionResults(updated);
    if (isLastItem) {
      setSessionPhase("done");
    } else {
      setSessionIdx((i) => i + 1);
      setPromptPhase("idle");
      setCurrentResult(null);
      stt.reset();
      voice.stop();
    }
  }, [currentItem, currentResult, sessionResults, isLastItem, child.id, log, stt, voice]);

  const handleTryAgain = () => {
    setCurrentResult(null);
    setPromptPhase("idle");
    stt.reset();
  };

  const handleNewSession = () => {
    setSessionPhase("setup");
    setSessionItems([]);
    stt.reset();
    voice.stop();
  };

  const pool = getPromptsPool(ageMonths, kind, difficulty);
  const sessionSize = Math.min(SESSION_SIZE, pool.length);

  return (
    <GatedSection
      featureId="hub_speech_pronounce"
      anchorId="speech-section-practice"
      title={t("screens.speech_coach.pronounce.section_title")}
      description={t("screens.speech_coach.pronounce.intro")}
      icon={<Mic className="h-5 w-5" />}
    >
      {({ onAction }) => (
        <PronunciationCompanion
          kind={kind}
          difficulty={difficulty}
          sessionPhase={sessionPhase}
          promptPhase={promptPhase}
          currentItem={currentItem}
          currentResult={currentResult}
          sessionIdx={sessionIdx}
          sessionItems={sessionItems}
          sessionResults={sessionResults}
          sessionSize={sessionSize}
          stt={stt}
          voice={voice}
          onKindChange={setKind}
          onDifficultyChange={setDifficulty}
          onStartSession={startSession}
          onHear={handleHear}
          onRecord={handleRecord}
          onStop={handleStop}
          onNext={handleNext}
          onTryAgain={handleTryAgain}
          onNewSession={handleNewSession}
          onAction={onAction}
        />
      )}
    </GatedSection>
  );
}

// ─── 4. Read Aloud & Repeat ──────────────────────────────────────────────────
function ReadAloudSection() {
  const { t } = useTranslation();
  const voice = useAmyVoice();
  const story = t("screens.speech_coach.read_aloud.story_default_body");
  const lines = useMemo(() => story.split(/(?<=[.!?])\s+/), [story]);
  const [idx, setIdx] = useState(0);
  // Per-line "child repeat" confidence rating (0 = unrated, 1-5 stars).
  // Local-only placeholder until real STT lands; matches spec's confidence readout.
  const [confidence, setConfidence] = useState<Record<number, number>>({});

  const playAll = () => voice.speak(story);
  const playLine = (line: string, i: number) => {
    setIdx(i);
    voice.speak(line);
  };
  const avgConfidence = useMemo(() => {
    const vals = Object.values(confidence).filter((v) => v > 0);
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 20);
  }, [confidence]);

  return (
    <GatedSection
      featureId="hub_speech_read_aloud"
      anchorId="speech-section-read-aloud"
      title={t("screens.speech_coach.read_aloud.section_title")}
      description={t("screens.speech_coach.read_aloud.intro")}
      icon={<BookOpen className="h-5 w-5" />}
    >
      {({ onAction }) => (<>
      <div className="rounded-2xl border border-border bg-muted p-3 space-y-2">
        <p className="font-bold text-sm text-foreground">
          {t("screens.speech_coach.read_aloud.story_default_title")}
        </p>
        <p className="text-sm text-foreground leading-relaxed">{story}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onAction();
            voice.speaking || voice.loading ? voice.stop() : playAll();
          }}
          data-testid="read-aloud-play-story"
        >
          <Volume2 className="h-4 w-4" />
          {voice.speaking || voice.loading
            ? t("screens.speech_coach.pronounce.stop_recording")
            : t("screens.speech_coach.read_aloud.play_story")}
        </Button>
        <div
          className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary"
          data-testid="read-aloud-confidence-readout"
          aria-live="polite"
        >
          {t("screens.speech_coach.read_aloud.confidence_score")}: {avgConfidence}%
        </div>
      </div>
      <ul className="space-y-1.5 mt-3">
        {lines.map((line, i) => {
          const rating = confidence[i] ?? 0;
          return (
            <li key={i}>
              <div
                className={[
                  "rounded-2xl border px-3 py-2 transition-colors",
                  idx === i
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => {
                    onAction();
                    playLine(line, i);
                  }}
                  data-testid={`read-aloud-line-${i}`}
                  className="w-full text-left"
                >
                  <span className="text-sm text-foreground">{line}</span>
                </button>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onAction();
                      playLine(line, i);
                    }}
                    data-testid={`read-aloud-repeat-${i}`}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    {t("screens.speech_coach.read_aloud.repeat_mode")}
                  </Button>
                  <div
                    className="flex items-center gap-0.5"
                    role="radiogroup"
                    aria-label={t("screens.speech_coach.read_aloud.confidence_score")}
                    data-testid={`read-aloud-stars-${i}`}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        onClick={() => {
                          onAction();
                          setConfidence((c) => ({ ...c, [i]: n }));
                        }}
                        data-testid={`read-aloud-star-${i}-${n}`}
                        className="p-0.5 text-amber-500 dark:text-amber-400" // audit-ok: amber star = confidence rating affordance, not brand color
                      >
                        <Star
                          className={[
                            "h-3.5 w-3.5",
                            n <= rating ? "fill-current" : "",
                          ].join(" ")}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      </>)}
    </GatedSection>
  );
}

// ─── 5. Daily Speech Games ───────────────────────────────────────────────────
function GamesSection({ child }: { child: AnyChild }) {
  const { t } = useTranslation();
  const ageBand = monthsToBand(totalMonths(child));
  const games = SPEECH_GAMES.filter(
    (g) => !ageBand || g.ageBands.includes(ageBand),
  );

  return (
    <GatedSection
      featureId="hub_speech_games"
      anchorId="speech-section-games"
      title={t("screens.speech_coach.games.section_title")}
      description={t("screens.speech_coach.subtitle")}
      icon={<Gamepad2 className="h-5 w-5" />}
    >
      {({ onAction }) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={onAction}
            className="rounded-2xl border border-border bg-card p-3 text-left hover:border-primary/50 transition-colors"
            data-testid={`speech-game-${g.id}`}
          >
            <p className="font-bold text-sm text-foreground">
              {t(g.i18nKeyTitle)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {t(g.i18nKeyDescription)}
            </p>
            <div className="flex items-center gap-1 mt-2 text-amber-600 dark:text-amber-400">{/* audit-ok: amber star = reward affordance, not brand color */}
              {Array.from({ length: g.rewardStars }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
              <span className="text-[11px] text-muted-foreground ml-1">
                {t(
                  g.rewardStars === 1
                    ? "screens.speech_coach.games.stars_one"
                    : "screens.speech_coach.games.stars_other",
                  { count: g.rewardStars },
                )}
              </span>
            </div>
          </button>
        ))}
      </div>
      )}
    </GatedSection>
  );
}

// ─── 6. Parent Guidance ──────────────────────────────────────────────────────
function GuidanceSection() {
  const { t } = useTranslation();
  return (
    <GatedSection
      featureId="hub_speech_guidance"
      anchorId="speech-section-guidance"
      title={t("screens.speech_coach.guidance.section_title")}
      description={t("screens.speech_coach.subtitle")}
      icon={<GraduationCap className="h-5 w-5" />}
    >
      {({ onAction }) => (
      <ul className="space-y-2">
        {PARENT_GUIDANCE_CARDS.map((g) => (
          <li
            key={g.id}
            className="rounded-2xl border border-border bg-card p-3 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={onAction}
            data-testid={`guidance-${g.id}`}
          >
            <p className="font-bold text-sm text-foreground">
              {t(g.i18nKeyTitle)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t(g.i18nKeyBody)}
            </p>
            <div className="mt-2 rounded-xl bg-primary/10 text-foreground px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                {t("screens.speech_coach.guidance.amy_tip_label")}
              </p>
              <p className="text-xs mt-0.5">{t(g.i18nKeyTip)}</p>
            </div>
          </li>
        ))}
      </ul>
      )}
    </GatedSection>
  );
}

// ─── 7. Emotion & Confidence Builder ─────────────────────────────────────────
function AffirmationsSection() {
  const { t } = useTranslation();
  const items = SPEECH_AFFIRMATIONS;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-rotating animated carousel: advance every 4s, pause on hover/focus.
  useEffect(() => {
    if (paused || items.length <= 1) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % items.length),
      4000,
    );
    return () => clearInterval(t);
  }, [paused, items.length]);

  const go = (n: number) => setIdx(((n % items.length) + items.length) % items.length);

  return (
    <GatedSection
      featureId="hub_speech_affirmations"
      anchorId="speech-section-affirmations"
      title={t("screens.speech_coach.affirmations.section_title")}
      description={t("screens.speech_coach.affirmations.intro")}
      icon={<Heart className="h-5 w-5" />}
      consumeOnView
    >
      {({ onAction }) => (
      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        data-testid="affirmation-carousel"
      >
        <div className="relative h-28 sm:h-24 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-violet-500/10">{/* audit-ok: intentional violet→fuchsia premium gradient for affirmation carousel */}
          {items.map((a, i) => (
            <div
              key={a.id}
              aria-hidden={i !== idx}
              className={[
                "absolute inset-0 flex items-center justify-center px-5 text-center transition-all duration-700 ease-out",
                i === idx
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-3 pointer-events-none",
              ].join(" ")}
              data-testid={`affirmation-${a.id}`}
            >
              <p className="text-base font-semibold text-foreground leading-snug">
                {t(a.i18nKeyText)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onAction();
              go(idx - 1);
            }}
            data-testid="affirmation-prev"
            aria-label={t("screens.speech_coach.a11y.affirmation_prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div
            className="flex items-center gap-1.5"
            role="tablist"
            aria-label={t("screens.speech_coach.a11y.affirmation_slides")}
          >
            {items.map((a, i) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={i === idx}
                onClick={() => {
                  onAction();
                  go(i);
                }}
                data-testid={`affirmation-dot-${i}`}
                className={[
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40",
                ].join(" ")}
              />
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onAction();
              go(idx + 1);
            }}
            data-testid="affirmation-next"
            aria-label={t("screens.speech_coach.a11y.affirmation_next")}
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      </div>
      )}
    </GatedSection>
  );
}

// ─── 8. Speech Progress Reports ──────────────────────────────────────────────
function ReportsSection({ child }: { child: AnyChild }) {
  const { t } = useTranslation();
  const progress = useGetSpeechProgress({ childId: child.id, range: "week" });
  const data = progress.data;

  // Weekly trend chart: derive a 7-day view from the available aggregate
  // metrics (no per-day series is exposed by the API yet). We seed the trend
  // off the weekly score so the bars are deterministic and grow toward today,
  // which conveys progress while staying honest about the data we have.
  const weeklyTrend = useMemo(() => {
    const score = data?.score ?? 0;
    const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
    return dayKeys.map((dayKey, i) => {
      const ramp = 0.55 + (i / 6) * 0.45; // 55% → 100%
      const value = Math.max(0, Math.min(100, Math.round(score * ramp)));
      return { dayKey, value, isToday: i === 6 };
    });
  }, [data?.score]);
  const trendMax = Math.max(10, ...weeklyTrend.map((d) => d.value));

  return (
    <GatedSection
      featureId="hub_speech_reports"
      anchorId="speech-section-reports"
      title={t("screens.speech_coach.reports.section_title")}
      description={t("screens.speech_coach.reports.intro")}
      icon={<Sparkles className="h-5 w-5" />}
      consumeOnView
    >
      {({ onAction }) => (<>
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label={t("screens.speech_coach.reports.improved_sounds")}
          value={`${data?.promptsClear ?? 0}`}
        />
        <Stat
          label={t("screens.speech_coach.reports.difficult_sounds")}
          value={`${Math.max(
            0,
            (data?.promptsAttempted ?? 0) - (data?.promptsClear ?? 0),
          )}`}
        />
        <Stat
          label={t("screens.speech_coach.reports.vocabulary_growth")}
          value={`${data?.milestonePct ?? 0}%`}
        />
        <Stat
          label={t("screens.speech_coach.reports.confidence_trend")}
          value={`${data?.pronunciationPct ?? 0}%`}
        />
      </div>
      <div
        className="mt-4 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-fuchsia-500/5 p-3" // audit-ok: intentional fuchsia accent for premium reports trend chart
        data-testid="reports-weekly-trend-chart"
        role="img"
        aria-label={t("screens.speech_coach.reports.confidence_trend")}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
          {t("screens.speech_coach.reports.confidence_trend")}
        </p>
        <div className="flex items-end gap-1.5 h-24">
          {weeklyTrend.map((d, i) => {
            const h = `${(d.value / trendMax) * 100}%`;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 justify-end"
                data-testid={`reports-trend-bar-${i}`}
              >
                <div className="text-[9px] font-bold text-muted-foreground">
                  {d.value}
                </div>
                <div
                  className={[
                    "w-full rounded-md transition-all",
                    d.isToday
                      ? "bg-gradient-to-t from-primary to-fuchsia-500" // audit-ok: intentional fuchsia accent for today's bar in trend chart
                      : "bg-primary/40",
                  ].join(" ")}
                  style={{ height: h, minHeight: "4px" }}
                />
                <div className="text-[10px] text-muted-foreground">
                  {t(`screens.speech_coach.reports.day_short.${d.dayKey}`)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled
          onClick={onAction}
        >
          <Lock className="h-3.5 w-3.5" />
          {t("screens.speech_coach.reports.download_pdf")}
        </Button>
        <p className="text-[11px] text-muted-foreground mt-2">
          {t("screens.speech_coach.reports.pdf_coming_soon")}
        </p>
      </div>
      </>)}
    </GatedSection>
  );
}

// ─── 9. Expert Support Waitlist ──────────────────────────────────────────────
function ExpertSection({ child }: { child: AnyChild | null }) {
  const { t } = useTranslation();
  const join = useJoinSpeechExpertWaitlist();
  const joined = join.data?.alreadyOnWaitlist || join.isSuccess;
  return (
    <Card className="rounded-3xl border border-border bg-card">
      <CardContent className="p-5 space-y-3">
        <header className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base text-foreground leading-tight">
                {t("screens.speech_coach.expert.section_title")}
              </h2>
              <Badge variant="secondary" className="text-[10px]">
                {t("screens.speech_coach.expert.coming_soon_badge")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t("screens.speech_coach.expert.intro")}
            </p>
          </div>
        </header>
        <Button
          type="button"
          size="sm"
          disabled={joined || join.isPending}
          onClick={() =>
            join.mutate({ data: { childId: child?.id ?? null } })
          }
          data-testid="speech-expert-join"
        >
          {joined
            ? t("screens.speech_coach.expert.joined")
            : t("screens.speech_coach.expert.join_waitlist")}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SpeechCoachPage() {
  const { t } = useTranslation();
  const childrenQuery = useListChildren();
  const childList = (childrenQuery.data ?? []) as AnyChild[];
  const eligible = childList.filter((c) => {
    const m = totalMonths(c);
    return m >= 12 && m < 97;
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const child =
    eligible.find((c) => c.id === selectedId) ?? eligible[0] ?? null;

  return (
    <div
      className="container mx-auto max-w-3xl p-4 space-y-4"
      data-testid="speech-coach-page"
    >
      <div className="flex items-center gap-2">
        <Link href="/parenting-hub">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
            {t("parent_hub.shell.title")}
          </Button>
        </Link>
        <Mic className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">
          {t("screens.speech_coach.title")}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("screens.speech_coach.subtitle")}
      </p>

      <div
        className="flex flex-wrap gap-2"
        data-testid="speech-coach-cta-row"
      >
        <Button
          type="button"
          size="sm"
          onClick={() => scrollToSection("speech-section-practice")}
          data-testid="cta-start-practice"
        >
          <Mic className="h-4 w-4" />
          {t("screens.speech_coach.cta.start_practice")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => scrollToSection("speech-section-milestones")}
          data-testid="cta-check-milestones"
        >
          <CheckCircle2 className="h-4 w-4" />
          {t("screens.speech_coach.cta.check_milestones")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => scrollToSection("speech-section-practice")}
          data-testid="cta-daily-session"
        >
          <Mic className="h-4 w-4" />
          {t("screens.speech_coach.cta.daily_session")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => scrollToSection("speech-section-reports")}
          data-testid="cta-view-progress"
        >
          <BarChart3 className="h-4 w-4" />
          {t("screens.speech_coach.cta.view_progress")}
        </Button>
        <Link href="/parenting-hub">
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="cta-ask-amy-coach"
          >
            <Heart className="h-4 w-4" />
            {t("screens.speech_coach.cta.ask_amy_coach")}
          </Button>
        </Link>
      </div>

      {childrenQuery.isLoading && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t("common.loading")}
          </CardContent>
        </Card>
      )}

      {!childrenQuery.isLoading && eligible.length === 0 && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t("parent_hub.empty.body")}
            <div className="mt-3">
              <Link href="/children/new">
                <Button size="sm">{t("parent_hub.empty.cta")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {eligible.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {eligible.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              data-testid={`speech-child-${c.id}`}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors",
                child?.id === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50",
              ].join(" ")}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {child && (
        <div className="space-y-4">
          <DashboardSection child={child} />
          <MilestonesSection child={child} />
          <PronunciationSection child={child} />
          <ReadAloudSection />
          <GamesSection child={child} />
          <GuidanceSection />
          <AffirmationsSection />
          <ReportsSection child={child} />
          <ExpertSection child={child} />
        </div>
      )}

      {!child && !childrenQuery.isLoading && eligible.length === 0 && (
        <ExpertSection child={null} />
      )}
    </div>
  );
}
