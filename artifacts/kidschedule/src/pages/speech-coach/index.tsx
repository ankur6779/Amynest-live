import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AppLink } from "@/components/app-link";
import { AddChildLink } from "@/components/add-child-link";
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
  MessageCircle,
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
  setAudioTraceModule,
  traceBrokenModulePreflight,
} from "@/lib/audio-root-cause-trace";
import {
  SPEECH_GAMES,
  SPEECH_AFFIRMATIONS,
  PARENT_GUIDANCE_CARDS,
  monthsToBand,
  isSpeechCoachEligibleAgeMonths,
  compareTranscript,
  buildPracticeSession,
  buildActivityIntro,
  buildCoachSessionMemory,
  buildItemPromptLines,
  buildProgressNote,
  buildSessionClosing,
  buildSessionGreeting,
  createCoachDialogueContext,
  evaluateCoachResponse,
  getArticulationCue,
  getPromptSpeakText,
  getPromptsPool,
  type SpeechAgeBand,
  type SpeechGameId,
  type TranscriptFeedback,
  type PronouncePrompt,
} from "@workspace/speech-coach";
import {
  type SessionPhase,
  type PromptPhase,
  type SessionDifficulty,
  PronunciationCompanion,
} from "./pronunciation-companion";
import { SpeechGameFlow, SpeechGameRewardsBar } from "./speech-game-flow";
import { loadSpeechGameRewards } from "./speech-game-rewards";
import { SPEECH_GAME_THEMES } from "./speech-game-theme";
import {
  isSpeechCoachV2Enabled,
  startSpeechCoachV2RemoteConfigPolling,
} from "@/features/speech-coach-v2/lib/remote-config";
import {
  buildCoachLocalSnapshot,
  clampClarityScore,
  getSessionTypeAction,
  getSpeechViewMode,
  isToddlerMonths,
  loadCoachLocalSnapshot,
  saveCoachJourneySnapshot,
  setSpeechViewMode,
  weakSoundsToHistory,
  speechCoachSttOptions,
  type SpeechViewMode,
} from "./speech-coach-utils";
import { formatAge } from "@/lib/age-groups";
import { usePrimeIosMicrophone } from "@/hooks/use-prime-ios-microphone";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LockedBlock } from "@/components/locked-block";
import { TryFreeBadge } from "@/components/try-free-badge";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { SPEECH_COACH_SESSION_FEATURE } from "@/lib/feature-usage-limits";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { handleSubscriptionMutationGateError } from "@/lib/subscription-mutation-gate";
import {
  auditSpeechCoachStaticCache,
  preloadSpeechCoachSessionAudio,
  speakCoachFeedbackLines,
} from "@/lib/speech-coach-audio-warmup";
import { speechCoachPerf } from "@/lib/speech-coach-perf-trace";

type AnyChild = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number | null;
};

const BAND_TABS: readonly { band: SpeechAgeBand; key: string }[] = [
  { band: "infant", key: "infant" },
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

function ChildPicker({
  eligible,
  activeId,
  onSelect,
}: {
  eligible: AnyChild[];
  activeId: number | undefined;
  onSelect: (id: number) => void;
}) {
  if (eligible.length <= 1) return null;
  return (
    <div className="flex gap-2 flex-wrap" data-testid="speech-child-picker">
      {eligible.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          data-testid={`speech-child-${c.id}`}
          className={[
            "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors",
            activeId === c.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/50",
          ].join(" ")}
          aria-pressed={activeId === c.id}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
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
function useSpeechHubGate() {
  const usage = useFeatureUsage();
  const firedRef = useRef(false);
  const locked = usage.isFeatureLocked(SPEECH_COACH_SESSION_FEATURE);
  const tryFree = usage.tryFreeFor(SPEECH_COACH_SESSION_FEATURE);

  const onAction = () => {
    if (firedRef.current) return;
    if (locked) return;
    if (tryFree) {
      firedRef.current = true;
      usage.markFeatureUsed(SPEECH_COACH_SESSION_FEATURE);
    }
  };

  return { locked, tryFree, onAction };
}

function GatedSection({
  title,
  description,
  icon,
  anchorId,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  anchorId?: string;
  children: (gate: { onAction: () => void; locked: boolean }) => React.ReactNode;
}) {
  const { locked, tryFree, onAction } = useSpeechHubGate();

  return (
    <LockedBlock locked={locked} reason="speech_coach" rounded="rounded-3xl">
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


function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: SpeechViewMode;
  onChange: (m: SpeechViewMode) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/50 px-3 py-2">
      <Button
        type="button"
        size="sm"
        variant={mode === "child" ? "default" : "outline"}
        data-testid="speech-view-mode-child"
        onClick={() => onChange("child")}
      >
        {t("screens.speech_coach.view_mode.child")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === "parent" ? "default" : "outline"}
        data-testid="speech-view-mode-parent"
        onClick={() => onChange("parent")}
      >
        {t("screens.speech_coach.view_mode.parent")}
      </Button>
      <p className="text-[11px] text-muted-foreground w-full">
        {mode === "parent" ? t("screens.speech_coach.view_mode.hint_parent") : t("screens.speech_coach.view_mode.hint_child")}
      </p>
    </div>
  );
}

// ─── 1. Speech Development Dashboard ─────────────────────────────────────────
function DashboardSection({ child, viewMode }: { child: AnyChild; viewMode: SpeechViewMode }) {
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
      anchorId="speech-section-dashboard"
      title={t("screens.speech_coach.dashboard.title")}
      description={t("screens.speech_coach.subtitle")}
      icon={<BarChart3 className="h-5 w-5" />}
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
        if (m.id.startsWith("m_infant_")) return tab === "infant";
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

function PronunciationSection({ child, viewMode }: { child: AnyChild; viewMode: SpeechViewMode }) {
  const { t } = useTranslation();
  const progress = useGetSpeechProgress({ childId: child.id, range: "week" });
  const log = useLogSpeechPracticeAttempt();
  const voice = useAmyVoice();
  const getAuthToken = useCallback(async () => {
    try {
      return (await getAuth().currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }, []);
  const stt = useSpeechRecognition("en-US", speechCoachSttOptions({
    getAuthToken,
    onTranscribeStart: () => speechCoachPerf.mark("stt_start"),
    onTranscribeEnd: () => speechCoachPerf.mark("stt_end"),
  }));

  const [kind, setKind] = useState<SpeechPromptKind>("word");
  const [difficulty, setDifficulty] = useState<SessionDifficulty>("easy");
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("setup");
  const [promptPhase, setPromptPhase] = useState<PromptPhase>("idle");
  const [sessionItems, setSessionItems] = useState<PronouncePrompt[]>([]);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [sessionResults, setSessionResults] = useState<Array<{ id: string; feedback: TranscriptFeedback; score: number }>>([]);
  const [currentResult, setCurrentResult] = useState<{ feedback: TranscriptFeedback; score: number; transcript: string } | null>(null);
  const [sessionSeed, setSessionSeed] = useState(() => Date.now());
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [turnIndex, setTurnIndex] = useState(0);

  const ageMonths = totalMonths(child);
  const localSnapshot = useMemo(() => loadCoachLocalSnapshot(child.id), [child.id]);
  const coachMemory = useMemo(() => {
    const p = progress.data;
    if (!p) return undefined;
    return buildCoachSessionMemory(
      {
        promptsAttempted: p.promptsAttempted,
        promptsClear: p.promptsClear,
        pronunciationPct: p.pronunciationPct,
        streakDays: p.streakDays,
        daysActive: p.daysActive,
        dailyTrend: p.dailyTrend,
        weakSounds: p.weakSounds,
      },
      localSnapshot,
    );
  }, [localSnapshot, progress.data]);

  const makeDialogueCtx = useCallback(
    (sessionIndex: number, currentStreak: number, promptKind: SpeechPromptKind = kind) =>
      createCoachDialogueContext({
        childName: child.name,
        ageMonths,
        promptKind,
        sessionIndex,
        sessionTotal: sessionItems.length,
        streak: currentStreak,
        sessionSeed,
        turnIndex,
        memory: coachMemory,
        sessionBestStreak: bestStreak,
        sessionScore,
      }),
    [
      ageMonths,
      bestStreak,
      child.name,
      coachMemory,
      kind,
      sessionItems.length,
      sessionScore,
      sessionSeed,
      turnIndex,
    ],
  );

  const currentItem = sessionItems[sessionIdx] ?? null;
  const isLastItem = sessionIdx === sessionItems.length - 1;

  // ── keep a ref so the STT effect can read promptPhase without re-triggering
  const promptPhaseRef = useRef<PromptPhase>("idle");
  useEffect(() => { promptPhaseRef.current = promptPhase; }, [promptPhase]);
  const currentItemRef = useRef<PronouncePrompt | null>(null);
  useEffect(() => { currentItemRef.current = currentItem; }, [currentItem]);

  // ── when STT finishes, evaluate result (phase stays "recording" or moves to "analyzing" on stop)
  useEffect(() => {
    const phase = promptPhaseRef.current;
    if (phase !== "recording" && phase !== "analyzing") return;
    if (stt.listening || stt.transcribing) return;
    if (stt.error) {
      setPromptPhase("heard");
      return;
    }
    const item = currentItemRef.current;
    const final = stt.transcript.trim();
    if (!item) return;
    const ctx = makeDialogueCtx(sessionIdx, streak, item.kind);
    speechCoachPerf.mark("evaluation_start");
    const evaluated = evaluateCoachResponse(item, final, ctx);
    speechCoachPerf.mark("evaluation_end");
    setCurrentResult({
      feedback: evaluated.feedback,
      score: evaluated.score,
      transcript: final,
    });
    setSessionScore((n) => n + evaluated.points);
    setStreak((n) => {
      const next = evaluated.correct ? n + 1 : 0;
      if (next > bestStreak) setBestStreak(next);
      return next;
    });
    setTurnIndex((n) => n + 1);
    setPromptPhase("result");
    void speakCoachFeedbackLines(voice, evaluated.spokenLines, item);
  }, [bestStreak, makeDialogueCtx, sessionIdx, stt.error, stt.listening, stt.transcribing, stt.transcript, streak, turnIndex, voice]);

  const startSession = useCallback(() => {
    speechCoachPerf.startSession();
    speechCoachPerf.mark("session_start");
    const history = weakSoundsToHistory(progress.data?.weakSounds ?? []);
    const items = buildPracticeSession(ageMonths, kind, difficulty, SESSION_SIZE, Date.now(), history);
    const seed = Date.now();
    setSessionSeed(seed);
    setStreak(0);
    setBestStreak(0);
    setSessionScore(0);
    setTurnIndex(0);
    setSessionItems([...items]);
    setSessionIdx(0);
    setSessionResults([]);
    setCurrentResult(null);
    setPromptPhase("idle");
    setSessionPhase("practice");
    stt.reset();
    voice.pause();
    void stt.warm();
    if (items[0]) {
      const ctx = createCoachDialogueContext({
        childName: child.name,
        ageMonths,
        promptKind: kind,
        sessionIndex: 0,
        sessionTotal: items.length,
        streak: 0,
        sessionSeed: seed,
        turnIndex: 0,
        memory: coachMemory,
        sessionBestStreak: 0,
        sessionScore: 0,
      });
      const opening = [
        ...buildSessionGreeting(ctx),
        ...buildActivityIntro(ctx),
        ...buildItemPromptLines(ctx, items[0]),
      ];
      preloadSpeechCoachSessionAudio(opening);
      speechCoachPerf.recordCacheAudit(auditSpeechCoachStaticCache("opening", opening));
      const firstLine = opening.find((line) => line.trim());
      if (firstLine) {
        const mode = (items[0]!.kind === "phonic" || items[0]!.kind === "letter") ? "phonics" : "default";
        voice.primeSpeakGesture(firstLine, { mode: mode as "phonics" | "default" });
      }
      void (async () => {
        speechCoachPerf.mark("opening_audio_start");
        for (const line of opening) {
          const mode = (items[0]!.kind === "phonic" || items[0]!.kind === "letter") ? "phonics" : "default";
          await voice.speak(line, { mode: mode as "phonics" | "default" });
        }
        speechCoachPerf.mark("opening_audio_end");
        speechCoachPerf.logSummary("opening_complete");
        setPromptPhase("heard");
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageMonths, coachMemory, kind, difficulty, progress.data?.weakSounds, child.name]);

  const handleHear = () => {
    if (!currentItem) return;
    const spoken = getPromptSpeakText(currentItem);
    const mode = (currentItem.kind === "phonic" || currentItem.kind === "letter") ? "phonics" : "default";
    voice.primeSpeakGesture(spoken, { mode: mode as "phonics" | "default" });
    void (async () => {
      const speakOpts = {
        mode: mode as "phonics" | "default",
        catalogPlayback: true as const,
        staticCatalogTexts: [spoken],
        waitUntilEnd: true,
      };
      setAudioTraceModule("Speech Coach");
      traceBrokenModulePreflight("Speech Coach", {
        audioIdentity: undefined,
        resolvedText: spoken,
        staticCatalogTexts: speakOpts.staticCatalogTexts,
        catalogPlayback: speakOpts.catalogPlayback,
      });
      await voice.speak(spoken, speakOpts);
      setAudioTraceModule(null);
      if (promptPhase === "idle") setPromptPhase("heard");
    })();
  };

  const handleRecord = async () => {
    if (!currentItem) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    voice.pause();
    stt.reset();
    setCurrentResult(null);
    setPromptPhase("recording");
    speechCoachPerf.mark("recording_start");
    const ok = await stt.start();
    if (!ok) setPromptPhase("heard");
  };

  const handleStop = () => {
    stt.stop();
    speechCoachPerf.mark("recording_stop");
    setPromptPhase("analyzing");
  };

  const handleNext = useCallback(() => {
    if (!currentItem || !currentResult) return;
    log.mutate(
      { data: { childId: child.id, promptId: currentItem.id, clarityScore: clampClarityScore(currentResult.score) } },
      { onError: (err) => handleSubscriptionMutationGateError(err, "speech_coach_log") },
    );
    const updated = [...sessionResults, { id: currentItem.id, feedback: currentResult.feedback, score: currentResult.score }];
    setSessionResults(updated);
    if (isLastItem) {
      const attempts = updated.map((r) => {
        const item = sessionItems.find((i) => i.id === r.id);
        return {
          promptId: r.id,
          promptText: item?.text ?? r.id,
          kind: item?.kind ?? kind,
          score: r.score,
        };
      });
      saveCoachJourneySnapshot(
        {
          childId: child.id,
          score: sessionScore,
          bestStreak,
          itemsCompleted: sessionItems.length,
          attempts,
          activity: "practice",
          perfectSession: attempts.length > 0 && attempts.every((a) => a.score >= 80),
        },
        localSnapshot,
      );
      const ctx = makeDialogueCtx(sessionIdx, streak, currentItem.kind);
      void (async () => {
        for (const line of buildSessionClosing(ctx, sessionScore, bestStreak)) {
          await voice.speak(line);
        }
      })();
      setSessionPhase("done");
    } else {
      const nextIdx = sessionIdx + 1;
      const nextItem = sessionItems[nextIdx];
      setSessionIdx(nextIdx);
      setPromptPhase("idle");
      setCurrentResult(null);
      stt.reset();
      voice.pause();
      if (nextItem) {
        const ctx = makeDialogueCtx(nextIdx, streak, nextItem.kind);
        const lines = [...buildProgressNote(ctx), ...buildItemPromptLines(ctx, nextItem)];
        void (async () => {
          for (const line of lines) {
            const mode = (nextItem.kind === "phonic" || nextItem.kind === "letter") ? "phonics" : "default";
            await voice.speak(line, { mode: mode as "phonics" | "default" });
          }
          setPromptPhase("heard");
        })();
      }
    }
  }, [bestStreak, child.id, currentItem, currentResult, isLastItem, localSnapshot, log, makeDialogueCtx, sessionIdx, sessionItems, sessionResults, sessionScore, streak, stt, voice]);

  const handleTryAgain = () => {
    setCurrentResult(null);
    setPromptPhase("idle");
    stt.reset();
  };

  const handleNewSession = () => {
    speechCoachPerf.reset();
    setSessionPhase("setup");
    setSessionItems([]);
    stt.reset();
    voice.pause();
  };

  const pool = getPromptsPool(ageMonths, kind, difficulty);
  const sessionSize = Math.max(1, Math.min(SESSION_SIZE, pool.length));

  return (
    <GatedSection
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
          viewMode={viewMode}
          compactMode={viewMode === "child"}
          holdToSpeak={viewMode === "child" || isToddlerMonths(ageMonths)}
          childName={child.name}
          sessionSeed={sessionSeed}
          streak={streak}
          ageMonths={ageMonths}
          articulationCue={
            viewMode === "parent" && currentItem
              ? getArticulationCue(currentItem.text, currentItem.kind)
              : null
          }
        />
      )}
    </GatedSection>
  );
}

// ─── 4. Read Aloud & Repeat ──────────────────────────────────────────────────
function ReadAloudSection({ child, viewMode }: { child: AnyChild; viewMode: SpeechViewMode }) {
  const { t } = useTranslation();
  const voice = useAmyVoice();
  const ageMonths = totalMonths(child);
  const getAuthToken = useCallback(async () => {
    try { return (await getAuth().currentUser?.getIdToken()) ?? null; } catch { return null; }
  }, []);
  const stt = useSpeechRecognition("en-US", speechCoachSttOptions({ getAuthToken }));
  const story = t("screens.speech_coach.read_aloud.story_default_body");
  const lines = useMemo(() => story.split(/(?<=[.!?])\s+/), [story]);
  const [idx, setIdx] = useState(0);
  // Per-line "child repeat" confidence rating (0 = unrated, 1-5 stars).
  // Local-only placeholder until real STT lands; matches spec's confidence readout.
  const [confidence, setConfidence] = useState<Record<number, number>>({});
  const [lineRecording, setLineRecording] = useState<number | null>(null);
  const [lineSttScore, setLineSttScore] = useState<Record<number, number>>({});


  useEffect(() => {
    if (lineRecording === null) return;
    if (stt.listening || stt.transcribing) return;
    const line = lines[lineRecording] ?? "";
    const r = compareTranscript(line, stt.transcript.trim(), { kind: "sentence", ageMonths });
    setLineSttScore((p) => ({ ...p, [lineRecording]: r.score }));
    setConfidence((c) => ({ ...c, [lineRecording]: r.score >= 70 ? 5 : r.score >= 45 ? 3 : 1 }));
    setLineRecording(null);
  }, [ageMonths, lineRecording, lines, stt.listening, stt.transcribing, stt.transcript]);

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
            voice.speaking || voice.loading ? voice.pause() : playAll();
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
                  <Button type="button" size="sm" onPointerDown={() => { onAction(); setLineRecording(i); stt.reset(); stt.start(); }} onPointerUp={() => { if (lineRecording === i) stt.stop(); }} data-testid={`read-aloud-mic-${i}`}>
                    <Mic className="h-3.5 w-3.5" />
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
function GamesSection({ child, viewMode }: { child: AnyChild; viewMode: SpeechViewMode }) {
  const { t } = useTranslation();
  const ageBand = monthsToBand(totalMonths(child));
  const [activeGame, setActiveGame] = useState<SpeechGameId | null>(null);
  const [rewardsTick, setRewardsTick] = useState(0);
  const rewards = useMemo(
    () => loadSpeechGameRewards(child.id),
    [child.id, rewardsTick],
  );
  const games = SPEECH_GAMES.filter(
    (g) => !ageBand || g.ageBands.includes(ageBand),
  );

  return (
    <GatedSection
      anchorId="speech-section-games"
      title={t("screens.speech_coach.games.section_title")}
      description={t("screens.speech_coach.games.section_subtitle")}
      icon={<Gamepad2 className="h-5 w-5" />}
    >
      {({ onAction }) => (
        <>
          <SpeechGameRewardsBar key={rewardsTick} childId={child.id} />
          {activeGame ? (
            <SpeechGameFlow
              child={child}
              gameId={activeGame}
              gameTitle={t(
                SPEECH_GAMES.find((g) => g.id === activeGame)!.i18nKeyTitle,
              )}
              viewMode={viewMode}
              onClose={() => setActiveGame(null)}
              onAction={onAction}
              onRewardsChange={() => setRewardsTick((n) => n + 1)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {games.map((g) => {
                const theme = SPEECH_GAME_THEMES[g.id];
                const plays = rewards.plays[g.id] ?? 0;
                const best = rewards.bestScores[g.id];
                const earnedBadge = rewards.badges.includes(g.badgeId);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      onAction();
                      setActiveGame(g.id);
                    }}
                    className={[
                      "rounded-2xl border p-3 text-left transition-all hover:scale-[1.01] hover:shadow-md",
                      theme.cardClass,
                      earnedBadge ? "ring-2 ring-amber-400/50" : "",
                    ].join(" ")}
                    data-testid={`speech-game-${g.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl shrink-0">{theme.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-foreground">
                          {t(g.i18nKeyTitle)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                          {t(g.i18nKeyDescription)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                        {Array.from({ length: g.rewardStars }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                      {plays > 0 ? (
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {t("screens.speech_coach.games.played_count", {
                            count: plays,
                          })}
                        </span>
                      ) : null}
                      {best !== undefined ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {t("screens.speech_coach.games.best_score", {
                            score: best,
                          })}
                        </span>
                      ) : null}
                      {earnedBadge ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] rounded-full"
                        >
                          {t("screens.speech_coach.games.badge_earned")}
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </GatedSection>
  );
}

// ─── 6. Parent Guidance ──────────────────────────────────────────────────────
function GuidanceSection() {
  const { t } = useTranslation();
  return (
    <GatedSection
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
      anchorId="speech-section-affirmations"
      title={t("screens.speech_coach.affirmations.section_title")}
      description={t("screens.speech_coach.affirmations.intro")}
      icon={<Heart className="h-5 w-5" />}
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

  const weeklyTrend = useMemo(() => {
    const trend = data?.dailyTrend ?? [];
    const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
    if (trend.length >= 7) {
      return dayKeys.map((dayKey, i) => ({
        dayKey,
        value: trend[i]?.avgScore ?? 0,
        isToday: i === 6,
      }));
    }
    const score = data?.score ?? 0;
    return dayKeys.map((dayKey, i) => {
      const ramp = 0.55 + (i / 6) * 0.45;
      const value = Math.max(0, Math.min(100, Math.round(score * ramp)));
      return { dayKey, value, isToday: i === 6 };
    });
  }, [data?.dailyTrend, data?.score]);
  const trendMax = Math.max(10, ...weeklyTrend.map((d) => d.value));

  return (
    <GatedSection
      anchorId="speech-section-reports"
      title={t("screens.speech_coach.reports.section_title")}
      description={t("screens.speech_coach.reports.intro")}
      icon={<Sparkles className="h-5 w-5" />}
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
  usePrimeIosMicrophone();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<SpeechViewMode>(() =>
    getSpeechViewMode(),
  );
  const childrenQuery = useListChildren();
  const childList = (childrenQuery.data ?? []) as AnyChild[];
  const eligible = childList.filter((c) =>
    isSpeechCoachEligibleAgeMonths(totalMonths(c)),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [v2Enabled, setV2Enabled] = useState(isSpeechCoachV2Enabled());
  const child =
    eligible.find((c) => c.id === selectedId) ?? eligible[0] ?? null;

  useEffect(() => {
    const stop = startSpeechCoachV2RemoteConfigPolling();
    const interval = setInterval(() => setV2Enabled(isSpeechCoachV2Enabled()), 30_000);
    return () => {
      stop();
      clearInterval(interval);
    };
  }, []);

  const handleSessionType = useCallback(
    (key: string) => {
      const action = getSessionTypeAction(key);
      if (action.type === "scroll") {
        scrollToSection(action.anchor);
        return;
      }
      setLocation(`/speech-coach/live-session?preset=${action.preset}`, {
        replace: false,
      });
    },
    [setLocation],
  );

  return (
    <div
      className="container mx-auto max-w-3xl p-4 space-y-4"
      data-testid="speech-coach-page"
    >
      <div className="flex items-center gap-2">
        <AppLink href="/parenting-hub" replace source="speech-coach-back">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
            {t("parent_hub.shell.title")}
          </Button>
        </AppLink>
        <Mic className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">
          {t("screens.speech_coach.title")}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("screens.speech_coach.subtitle")}
      </p>

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
              <AddChildLink source="speech-coach-empty">
                <Button size="sm">{t("parent_hub.empty.cta")}</Button>
              </AddChildLink>
            </div>
          </CardContent>
        </Card>
      )}

      {child && (
        <ChildPicker
          eligible={eligible}
          activeId={child.id}
          onSelect={setSelectedId}
        />
      )}

      {/* === SPEECH COACH HOME / EXPLORE HUB === */}
      {child && (
        <div className="space-y-5 pt-2" data-testid="speech-coach-home">
          {/* Welcome banner */}
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-primary/5 p-5">
            <div className="flex items-start gap-4">
              <div className="text-4xl leading-none mt-0.5">🎤</div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-xl text-foreground tracking-tight">
                  {t("screens.speech_coach.home.welcome_title")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {t("screens.speech_coach.home.welcome_sub")}
                </p>
                <div className="mt-2 text-[10px] uppercase tracking-widest text-primary/70 font-bold">
                  {t("screens.speech_coach.home.personalized_for", {
                    name: child.name,
                    age: formatAge(child.age, child.ageMonths ?? 0),
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* PRIMARY: Start Live Session */}
          <AppLink href="/speech-coach/live-session" source="speech-home-hero-live" replace>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              className="group relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl bg-gradient-to-br from-primary via-fuchsia-500 to-violet-600 border border-white/20"
            >
              <div className="absolute inset-0 bg-[radial-gradient(white_0.8px,transparent_1px)] bg-[length:3px_3px] opacity-10" />
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-[2px] rounded-[20px] bg-gradient-to-r from-white/30 via-white/10 to-white/30 blur-xl"
              />
              <div className="relative flex items-center gap-4">
                <div className="shrink-0 rounded-2xl bg-white/20 p-3.5 ring-1 ring-white/30">
                  <Mic className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-[2.5px] text-white/70">
                    {t("screens.speech_coach.home.hero_live_badge")}
                  </div>
                  <div className="text-2xl font-black leading-none mt-1 tracking-[-0.5px]">
                    {t("screens.speech_coach.home.hero_live_title")}
                  </div>
                  <div className="text-sm mt-2 text-white/85 line-clamp-3 pr-2">
                    {t("screens.speech_coach.home.hero_live_sub")}
                  </div>
                </div>
                <div className="text-3xl opacity-70 group-hover:translate-x-0.5 transition">→</div>
              </div>
            </motion.div>
          </AppLink>

          {v2Enabled && (
            <AppLink href="/speech-coach-v2" source="speech-coach-v2-promo">
              <motion.div
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.985 }}
                className="group relative overflow-hidden rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-5 text-white shadow-lg"
                data-testid="speech-coach-v2-promo"
              >
                <div className="relative flex items-center gap-4">
                  <div className="shrink-0 rounded-2xl bg-white/15 p-3 ring-1 ring-white/25">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[2px] text-white/75">
                      {t("screens.speech_coach.home.hero_v2_badge")}
                    </div>
                    <div className="text-xl font-black leading-tight mt-1">
                      {t("screens.speech_coach.home.hero_v2_title")}
                    </div>
                    <p className="text-sm mt-2 text-white/85 leading-snug">
                      {t("screens.speech_coach.home.hero_v2_sub")}
                    </p>
                  </div>
                  <div className="text-2xl opacity-70 group-hover:translate-x-0.5 transition">→</div>
                </div>
              </motion.div>
            </AppLink>
          )}

          {/* SECONDARY: Talk with Amy + Practice with Amy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppLink href="/speech-coach/talk" source="speech-home-talk-banner" replace>
              <motion.div
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.99 }}
                className="group relative h-full overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-600/90 via-sky-700/85 to-indigo-800/90 p-4 text-white shadow-lg"
              >
                <div className="relative flex h-full flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 rounded-xl bg-white/15 p-2.5 ring-1 ring-white/20">
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-black uppercase tracking-[2px] text-white/75">
                        {t("screens.speech_coach.home.hero_talk_badge")}
                      </div>
                      <div className="text-lg font-black leading-tight mt-0.5">
                        {t("screens.speech_coach.home.hero_talk_title")}
                      </div>
                      <p className="text-[11px] text-cyan-100/80 mt-1">
                        {t("screens.speech_coach.home.hero_talk_hint")}
                      </p>
                    </div>
                    <div className="text-2xl opacity-60 group-hover:translate-x-0.5 transition">→</div>
                  </div>
                  <p className="text-sm text-white/85 line-clamp-3 leading-snug">
                    {t("screens.speech_coach.home.hero_talk_sub", { name: child.name })}
                  </p>
                </div>
              </motion.div>
            </AppLink>

            <button
              type="button"
              onClick={() => scrollToSection("speech-section-practice")}
              className="group rounded-2xl border-2 border-primary/30 bg-card hover:border-primary/60 p-4 text-left transition-all active:scale-[0.985] flex flex-col justify-between min-h-full"
            >
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary mb-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("screens.speech_coach.home.hero_practice_badge")}
                </div>
                <div className="text-xl font-black tracking-tight text-foreground">
                  {t("screens.speech_coach.home.hero_practice_title")}
                </div>
                <p className="text-sm text-muted-foreground mt-2 leading-snug pr-2 line-clamp-3">
                  {t("screens.speech_coach.home.hero_practice_sub")}
                </p>
              </div>
              <div className="mt-4 flex items-center text-sm font-bold text-primary group-hover:gap-2 gap-1.5 transition-all">
                {t("screens.speech_coach.home.hero_practice_cta")}
                <span aria-hidden>↘︎</span>
              </div>
            </button>
          </div>

          {/* Session Types */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <div className="font-bold text-sm flex items-center gap-2 text-foreground">
                <Star className="h-4 w-4 text-amber-500" />
                {t("screens.speech_coach.home.session_types_title")}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {t("screens.speech_coach.home.session_types_hint")}
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1 scrollbar-thin">
              {[
                { key: "quick", emoji: "⚡", ...t("screens.speech_coach.home.session_types.quick", { returnObjects: true }) as { title: string; desc: string; mins: string } },
                { key: "bedtime", emoji: "🌙", ...t("screens.speech_coach.home.session_types.bedtime", { returnObjects: true }) as { title: string; desc: string; mins: string } },
                { key: "school", emoji: "🎒", ...t("screens.speech_coach.home.session_types.school", { returnObjects: true }) as { title: string; desc: string; mins: string } },
                { key: "pronounce", emoji: "🔤", ...t("screens.speech_coach.home.session_types.pronounce", { returnObjects: true }) as { title: string; desc: string; mins: string } },
                { key: "warmup", emoji: "🗣️", ...t("screens.speech_coach.home.session_types.warmup", { returnObjects: true }) as { title: string; desc: string; mins: string } },
                { key: "emotion", emoji: "💖", ...t("screens.speech_coach.home.session_types.emotion", { returnObjects: true }) as { title: string; desc: string; mins: string } },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleSessionType(s.key)}
                  className="snap-start min-w-[148px] flex-shrink-0 rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/50 hover:shadow-md active:scale-[0.985] transition-all"
                  data-testid={`session-type-${s.key}`}
                >
                  <div className="text-3xl mb-2">{s.emoji}</div>
                  <div className="font-bold text-sm leading-tight text-foreground pr-1">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{s.desc}</div>
                  <div className="mt-3 inline-block text-[10px] font-black uppercase tracking-wider rounded-full bg-muted px-2 py-px text-muted-foreground">{s.mins}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Discoverability */}
          <div className="space-y-1.5">
            <div className="font-bold text-sm px-0.5 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t("screens.speech_coach.home.discover_title")}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: t("screens.speech_coach.home.discover.sounds"), anchor: "speech-section-practice" },
                { label: t("screens.speech_coach.home.discover.daily"), anchor: "speech-section-games" },
                { label: t("screens.speech_coach.home.discover.confidence"), anchor: "speech-section-affirmations" },
                { label: t("screens.speech_coach.home.discover.parent"), anchor: "speech-section-guidance" },
                { label: t("screens.speech_coach.home.discover.progress"), anchor: "speech-section-reports" },
                { label: t("screens.speech_coach.home.discover.mirror"), anchor: "speech-section-practice" },
              ].map((d, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToSection(d.anchor)}
                  className="text-xs font-medium rounded-full border border-border bg-muted/40 hover:bg-primary/5 hover:border-primary/40 px-3.5 py-1.5 transition-colors"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {child && (
        <div className="space-y-4">
          <ViewModeToggle mode={viewMode} onChange={(m) => { setViewMode(m); setSpeechViewMode(m); }} />
          {viewMode === "parent" ? (
            <>
              <DashboardSection child={child} viewMode={viewMode} />
              <MilestonesSection child={child} />
            </>
          ) : null}
          <PronunciationSection child={child} viewMode={viewMode} />
          {viewMode === "parent" ? (
            <ReadAloudSection child={child} viewMode={viewMode} />
          ) : null}
          <GamesSection child={child} viewMode={viewMode} />
          {viewMode === "parent" ? (
            <>
              <GuidanceSection />
              <AffirmationsSection />
              <ReportsSection child={child} />
            </>
          ) : null}
          <ExpertSection child={child} />
        </div>
      )}

      {!child && !childrenQuery.isLoading && eligible.length === 0 && (
        <ExpertSection child={null} />
      )}
    </div>
  );
}
