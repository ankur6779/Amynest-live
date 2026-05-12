// audit-block-ignore-start — intentional neon-dark futuristic Amy AI Companion.
// All Tailwind colour utilities and hex glow values here are deliberate premium
// design tokens. Inline styles are used for all dark backgrounds so the
// on-dark-marker safety net in index.css does not need to rewrite them.

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Volume2,
  Mic,
  MicOff,
  Loader2,
  ChevronRight,
  Star,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import type { SpeechRecognitionState } from "@/hooks/useSpeechRecognition";
import type { UseAmyVoiceState } from "@/hooks/use-amy-voice";
import type {
  TranscriptFeedback,
  PronouncePrompt,
  PronouncePromptDifficulty,
} from "@workspace/speech-coach";
import type { SpeechPromptKind } from "@workspace/api-client-react";

// ── Exported types (imported by index.tsx) ────────────────────────────────────
export type SessionPhase = "setup" | "practice" | "done";
export type PromptPhase =
  | "idle"
  | "heard"
  | "recording"
  | "analyzing"
  | "result";
export type SessionDifficulty = PronouncePromptDifficulty;

// ── Amy avatar state ──────────────────────────────────────────────────────────
type AmyAvatarState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "celebrating"
  | "encouraging";

function deriveAmyState(
  promptPhase: PromptPhase,
  sessionPhase: SessionPhase,
  feedback: TranscriptFeedback | undefined,
  voiceBusy: boolean,
  sttListening: boolean,
  sttTranscribing: boolean,
): AmyAvatarState {
  if (sessionPhase === "done") return "celebrating";
  if (voiceBusy) return "speaking";
  if (promptPhase === "recording" && sttListening) return "listening";
  if (promptPhase === "analyzing" || sttTranscribing) return "thinking";
  if (promptPhase === "result") {
    return feedback === "great" ? "celebrating" : "encouraging";
  }
  return "idle";
}

// ── Conversational messages (JS arrays, not i18n keys — same as ENCOURAGEMENT) ─
const AMY_REPLIES: Record<TranscriptFeedback, string[]> = {
  great: [
    "WOW! That was amazing! Amy is so proud of you!",
    "You said it perfectly! You're a speech superstar!",
    "Incredible! Your sound is so strong and clear!",
    "Fantastic speaking! Keep up the amazing work!",
    "Wonderful — that was crystal clear! High five!",
  ],
  close: [
    "Great try! Let's slow down the word a little.",
    "So close! Say each sound one at a time — you've got this!",
    "Almost there — one more try and you'll nail it!",
    "Lovely try! Your tongue almost got it — keep going!",
  ],
  try_again: [
    "Oops! Amy didn't hear that clearly. Let's try together again!",
    "Keep going — every try makes you stronger! One more!",
    "Practice makes perfect — give it another amazing go!",
    "You can do this! Amy believes in you!",
  ],
};

const AMY_INTRO_TEXT: Record<string, string> = {
  letter: "Let's practise this letter! Tap to hear Amy — then copy me.",
  phonic: "Let's practise this sound! Tap Hear Amy — then repeat after me.",
  word: "Let's practise this word! Tap to hear Amy — then say it yourself.",
  sentence:
    "Let's practise this sentence! Listen carefully, then repeat after Amy.",
};

const AMY_STATE_LABEL: Record<AmyAvatarState, string> = {
  idle: "Amy is ready!",
  listening: "Amy is listening...",
  thinking: "Amy is thinking...",
  speaking: "Amy is speaking...",
  celebrating: "Amazing job!",
  encouraging: "You can do it!",
};

function pickReply(feedback: TranscriptFeedback, score: number): string {
  const list = AMY_REPLIES[feedback];
  return list[Math.floor((score / 101) * list.length)] ?? list[0];
}

// ─── Neon colour tokens ───────────────────────────────────────────────────────
const C = {
  violet: "rgba(139,92,246,1)",
  violetMid: "rgba(139,92,246,0.6)",
  violetDim: "rgba(139,92,246,0.2)",
  violetBorder: "rgba(139,92,246,0.35)",
  fuchsia: "rgba(236,72,153,0.9)",
  purple: "rgba(167,139,250,1)",
  purpleDim: "rgba(167,139,250,0.7)",
  purpleFaint: "rgba(167,139,250,0.25)",
  textBright: "rgba(240,230,255,1)",
  textMid: "rgba(220,210,255,1)",
  textDim: "rgba(200,180,255,0.85)",
  emerald: "rgba(52,211,153,1)",
  emeraldDim: "rgba(52,211,153,0.1)",
  emeraldBorder: "rgba(52,211,153,0.35)",
  amber: "rgba(251,191,36,1)",
  amberDim: "rgba(251,191,36,0.08)",
  amberBorder: "rgba(251,191,36,0.25)",
  red: "rgba(239,68,68,1)",
  redDim: "rgba(239,68,68,0.08)",
  redBorder: "rgba(239,68,68,0.3)",
  panelBg:
    "linear-gradient(145deg, #0f0a1e 0%, #130d2a 55%, #0d1020 100%)",
  panelBorder: "rgba(139,92,246,0.28)",
} as const;

// ─── Neon ring glow colours per Amy state ─────────────────────────────────────
const RING_GLOW: Record<AmyAvatarState, string> = {
  idle: C.violetMid,
  listening: C.purple,
  thinking: "rgba(236,72,153,0.75)",
  speaking: "rgba(109,40,217,0.9)",
  celebrating: C.amber,
  encouraging: "rgba(167,139,250,0.65)",
};

// ─────────────────────────────────────────────────────────────────────────────
// AmyRing — animated neon halo around the Amy avatar
// ─────────────────────────────────────────────────────────────────────────────
function AmyRing({
  state,
  size,
}: {
  state: AmyAvatarState;
  size: number;
}) {
  const glow = RING_GLOW[state];
  const boxShadow = `0 0 ${state === "listening" ? 28 : 18}px ${glow}, 0 0 ${state === "listening" ? 52 : 34}px ${glow.replace(/,([\d.]+)\)$/, ",0.3)")}`;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Listening → double ping rings */}
      {state === "listening" && (
        <>
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: "rgba(168,85,247,0.18)",
              animationDuration: "1.2s",
            }}
          />
          <span
            className="absolute inset-2 rounded-full animate-ping"
            style={{
              background: "rgba(168,85,247,0.12)",
              animationDuration: "1.7s",
              animationDelay: "0.35s",
            }}
          />
        </>
      )}

      {/* Celebrating → amber + emerald ping */}
      {state === "celebrating" && (
        <>
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: "rgba(251,191,36,0.22)",
              animationDuration: "1s",
            }}
          />
          <span
            className="absolute -inset-2 rounded-full animate-ping"
            style={{
              background: "rgba(52,211,153,0.15)",
              animationDuration: "1.5s",
              animationDelay: "0.25s",
            }}
          />
        </>
      )}

      {/* Thinking → spinning arc */}
      {state === "thinking" && (
        <span
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: "3px solid transparent",
            borderTopColor: "rgba(236,72,153,0.95)",
            borderRightColor: "rgba(168,85,247,0.6)",
          }}
        />
      )}

      {/* Core glowing ring */}
      <span
        className={`absolute inset-0 rounded-full ${state === "idle" || state === "encouraging" ? "animate-pulse" : ""}`}
        style={{
          boxShadow,
          border: `2px solid ${glow}`,
          borderRadius: "9999px",
        }}
      />

      {/* Speaking → pulsing inner ring */}
      {state === "speaking" && (
        <span
          className="absolute inset-2 rounded-full animate-pulse"
          style={{
            border: "1px solid rgba(109,40,217,0.5)",
          }}
        />
      )}

      {/* Amy character */}
      <AmyIcon size={size * 0.75} ring bounce={state === "celebrating"} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NeonWaveform — mic-reactive audio bars
// ─────────────────────────────────────────────────────────────────────────────
const WAVE_HEIGHTS = [
  35, 72, 90, 55, 85, 42, 78, 60, 95, 50, 82, 45, 88, 65, 70,
] as const;

function NeonWaveform({ active }: { active: boolean }) {
  return (
    <div
      className="flex items-end justify-center gap-0.5"
      style={{ height: 40 }}
      aria-hidden
      data-testid="pronounce-waveform"
    >
      {WAVE_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all ${active ? "animate-bounce" : ""}`}
          style={{
            height: active ? `${h}%` : "18%",
            background: active
              ? "linear-gradient(to top, rgba(139,92,246,1), rgba(236,72,153,0.9))"
              : "rgba(139,92,246,0.28)",
            boxShadow: active ? "0 0 6px rgba(139,92,246,0.6)" : "none",
            animationDelay: `${i * 55}ms`,
            animationDuration: `${510 + (i % 5) * 65}ms`,
            transition: "height 0.18s ease",
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat bubbles
// ─────────────────────────────────────────────────────────────────────────────
function AmyChatBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2 max-w-[90%]">
      <div
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm"
        style={{
          background: C.violetDim,
          border: `1px solid ${C.violetBorder}`,
        }}
      >
        ✨
      </div>
      <div
        className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed"
        style={{
          background: "rgba(139,92,246,0.13)",
          border: `1px solid ${C.violetBorder}`,
          color: "rgba(230,222,255,1)",
          backdropFilter: "blur(6px)",
        }}
        data-on-dark
      >
        {children}
      </div>
    </div>
  );
}

function ChildChatBubble({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="flex items-end gap-2 max-w-[90%] ml-auto flex-row-reverse">
      <div
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm"
        style={{
          background: "rgba(99,102,241,0.25)",
          border: "1px solid rgba(99,102,241,0.45)",
        }}
      >
        🧒
      </div>
      <div
        className="rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-right leading-relaxed"
        style={{
          background: "rgba(99,102,241,0.18)",
          border: "1px solid rgba(99,102,241,0.4)",
          color: "rgba(220,225,255,1)",
          backdropFilter: "blur(6px)",
        }}
        data-on-dark
      >
        <span
          className="block text-[10px] font-bold uppercase tracking-wide mb-1"
          style={{ color: C.purpleDim }}
          data-on-dark
        >
          {label}
        </span>
        {text}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SessionXPBar
// ─────────────────────────────────────────────────────────────────────────────
function SessionXPBar({
  sessionIdx,
  total,
  sessionResults,
  progressLabel,
  xpLabel,
}: {
  sessionIdx: number;
  total: number;
  sessionResults: Array<{ feedback: TranscriptFeedback }>;
  progressLabel: string;
  xpLabel: string;
}) {
  const xp = sessionResults.reduce(
    (n, r) =>
      n + (r.feedback === "great" ? 3 : r.feedback === "close" ? 1 : 0),
    0,
  );
  const maxXp = total * 3;
  const pct = total > 0 ? Math.round((sessionIdx / total) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: C.purpleDim }}
          data-on-dark
        >
          {progressLabel}
        </span>
        <span
          className="text-[10px] font-bold"
          style={{ color: C.amber }}
          data-on-dark
        >
          {xpLabel} {xp}/{maxXp}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: C.violetDim }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, ${C.violet}, ${C.fuchsia})`,
            boxShadow: `0 0 8px ${C.violetMid}`,
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NeonButton — styled glass button with optional glow
// ─────────────────────────────────────────────────────────────────────────────
function NeonButton({
  onClick,
  disabled,
  glow,
  testId,
  children,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  glow?: boolean;
  testId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={[
        "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 disabled:opacity-40",
        className ?? "",
      ].join(" ")}
      style={{
        background: glow
          ? `linear-gradient(135deg, ${C.violet}, ${C.fuchsia})`
          : "rgba(139,92,246,0.18)",
        border: `1px solid ${glow ? C.violetMid : C.violetBorder}`,
        color: glow ? "#fff" : "rgba(200,180,255,1)",
        boxShadow: glow ? `0 0 18px ${C.violetMid}` : "none",
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confetti burst overlay
// ─────────────────────────────────────────────────────────────────────────────
const CONFETTI_GLYPHS = ["⭐", "✨", "🌟", "💫", "⭐", "✨", "🌟", "⭐"];

function ConfettiBurst() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden
    >
      {CONFETTI_GLYPHS.map((g, i) => (
        <span
          key={i}
          className="absolute text-xl animate-bounce"
          style={{
            left: `${8 + i * 11}%`,
            top: `${6 + (i % 3) * 10}%`,
            animationDelay: `${i * 100}ms`,
            animationDuration: "550ms",
            opacity: 0.9,
          }}
        >
          {g}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pill tab row helper
// ─────────────────────────────────────────────────────────────────────────────
function PillTab({
  active,
  disabled,
  onClick,
  testId,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={[
        "px-3 py-1 rounded-full text-xs font-bold border transition-all disabled:opacity-40",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-card text-muted-foreground border-border hover:border-primary/50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PronunciationCompanion — the main exported component
// ─────────────────────────────────────────────────────────────────────────────

const DIFFICULTY_TAB_KEYS: readonly SessionDifficulty[] = [
  "easy",
  "medium",
  "advanced",
];
const PROMPT_TAB_KEYS: readonly SpeechPromptKind[] = [
  "letter",
  "phonic",
  "word",
  "sentence",
];

export interface PronunciationCompanionProps {
  kind: SpeechPromptKind;
  difficulty: SessionDifficulty;
  sessionPhase: SessionPhase;
  promptPhase: PromptPhase;
  currentItem: PronouncePrompt | null;
  currentResult: {
    feedback: TranscriptFeedback;
    score: number;
    transcript: string;
  } | null;
  sessionIdx: number;
  sessionItems: PronouncePrompt[];
  sessionResults: Array<{ id: string; feedback: TranscriptFeedback; score: number }>;
  sessionSize: number;
  stt: SpeechRecognitionState;
  voice: UseAmyVoiceState;
  onKindChange: (k: SpeechPromptKind) => void;
  onDifficultyChange: (d: SessionDifficulty) => void;
  onStartSession: () => void;
  onHear: () => void;
  onRecord: () => void;
  onStop: () => void;
  onNext: () => void;
  onTryAgain: () => void;
  onNewSession: () => void;
  onAction: () => void;
}

export function PronunciationCompanion({
  kind,
  difficulty,
  sessionPhase,
  promptPhase,
  currentItem,
  currentResult,
  sessionIdx,
  sessionItems,
  sessionResults,
  sessionSize,
  stt,
  voice,
  onKindChange,
  onDifficultyChange,
  onStartSession,
  onHear,
  onRecord,
  onStop,
  onNext,
  onTryAgain,
  onNewSession,
  onAction,
}: PronunciationCompanionProps) {
  const { t } = useTranslation();

  const amyState = deriveAmyState(
    promptPhase,
    sessionPhase,
    currentResult?.feedback,
    voice.speaking || voice.loading,
    stt.listening,
    stt.transcribing,
  );

  const isLastItem = sessionIdx === sessionItems.length - 1;
  const amyStateLabel = AMY_STATE_LABEL[amyState];
  const amyIntro =
    AMY_INTRO_TEXT[currentItem?.kind ?? kind] ?? AMY_INTRO_TEXT.word;
  const amyReply = currentResult
    ? pickReply(currentResult.feedback, currentResult.score)
    : null;

  // Confetti burst on "great" result
  const [showConfetti, setShowConfetti] = useState(false);
  const prevFeedbackRef = useRef<TranscriptFeedback | null>(null);
  useEffect(() => {
    const feedback = currentResult?.feedback ?? null;
    const prev = prevFeedbackRef.current;
    prevFeedbackRef.current = feedback;
    if (feedback !== "great" || prev === "great") return;
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 2200);
    return () => clearTimeout(timer);
  }, [currentResult?.feedback]);

  // Score ring colour
  const scoreBg =
    currentResult?.feedback === "great"
      ? C.emeraldDim
      : currentResult?.feedback === "close"
        ? C.amberDim
        : C.redDim;
  const scoreBorder =
    currentResult?.feedback === "great"
      ? C.emeraldBorder
      : currentResult?.feedback === "close"
        ? C.amberBorder
        : C.redBorder;
  const scoreColour =
    currentResult?.feedback === "great"
      ? C.emerald
      : currentResult?.feedback === "close"
        ? C.amber
        : C.red;
  const scoreBarGradient =
    currentResult?.feedback === "great"
      ? `linear-gradient(to right, ${C.emerald}, rgba(52,211,153,0.7))`
      : currentResult?.feedback === "close"
        ? `linear-gradient(to right, ${C.amber}, rgba(251,191,36,0.7))`
        : `linear-gradient(to right, ${C.red}, rgba(239,68,68,0.7))`;

  return (
    <div className="space-y-3">
      {/* ── Difficulty + category pill tabs ───────────────────────────────── */}
      <div className="space-y-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
            {t("screens.speech_coach.pronounce.difficulty.label")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DIFFICULTY_TAB_KEYS.map((d) => (
              <PillTab
                key={d}
                active={difficulty === d}
                disabled={sessionPhase === "practice"}
                onClick={() => onDifficultyChange(d)}
                testId={`pronounce-difficulty-${d}`}
              >
                {t(`screens.speech_coach.pronounce.difficulty.${d}`)}
              </PillTab>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_TAB_KEYS.map((k) => (
            <PillTab
              key={k}
              active={kind === k}
              disabled={sessionPhase === "practice"}
              onClick={() => onKindChange(k)}
              testId={`pronounce-tab-${k}`}
            >
              {t(`screens.speech_coach.pronounce.tab.${k}`)}
            </PillTab>
          ))}
        </div>
      </div>

      {/* ── Futuristic dark panel ──────────────────────────────────────────── */}
      <div
        data-on-dark
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: C.panelBg,
          border: `1px solid ${C.panelBorder}`,
          boxShadow:
            "0 0 40px rgba(139,92,246,0.07), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Top edge glow line */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          aria-hidden
          style={{
            width: "60%",
            height: "1px",
            background:
              "linear-gradient(to right, transparent, rgba(139,92,246,0.85), transparent)",
          }}
        />

        {/* Confetti burst */}
        {showConfetti && <ConfettiBurst />}

        <div className="relative p-5 space-y-5">

          {/* ════════════════ SETUP ════════════════ */}
          {sessionPhase === "setup" && (
            <div className="flex flex-col items-center gap-5 py-2">

              {/* Avatar */}
              <AmyRing state="idle" size={120} />

              {/* Label + subtitle */}
              <div className="text-center space-y-1">
                <p
                  className="text-base font-bold"
                  style={{ color: C.textMid }}
                  data-on-dark
                >
                  {amyStateLabel}
                </p>
                <p
                  className="text-xs max-w-[220px] leading-relaxed"
                  style={{ color: C.purpleDim }}
                  data-on-dark
                >
                  {amyIntro}
                </p>
              </div>

              {/* Session info card */}
              <div
                className="w-full rounded-xl px-4 py-3 text-center space-y-0.5"
                style={{
                  background: "rgba(139,92,246,0.1)",
                  border: `1px solid ${C.violetBorder}`,
                }}
              >
                <p
                  className="text-sm font-bold"
                  style={{ color: C.textMid }}
                  data-on-dark
                >
                  {t(`screens.speech_coach.pronounce.difficulty.${difficulty}`)}{" "}
                  {t(`screens.speech_coach.pronounce.tab.${kind}`)}
                </p>
                <p
                  className="text-xs"
                  style={{ color: C.purpleDim }}
                  data-on-dark
                >
                  {t(
                    "screens.speech_coach.pronounce.session.session_size",
                    { count: sessionSize },
                  )}{" "}
                  · ~{Math.ceil(sessionSize * 0.5)} min
                </p>
              </div>

              {sessionSize === 0 ? (
                <p
                  className="text-xs"
                  style={{ color: C.purpleDim }}
                  data-on-dark
                >
                  {t("screens.speech_coach.pronounce.session.no_prompts")}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onAction();
                    onStartSession();
                  }}
                  data-testid="pronounce-start-session"
                  className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm transition-all active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${C.violet}, ${C.fuchsia})`,
                    color: "#fff",
                    border: "none",
                    boxShadow: `0 0 22px ${C.violetMid}, 0 4px 16px rgba(139,92,246,0.3)`,
                  }}
                >
                  <Mic className="h-4 w-4" />
                  {t("screens.speech_coach.pronounce.session.start_cta")}
                </button>
              )}
            </div>
          )}

          {/* ════════════════ PRACTICE ════════════════ */}
          {sessionPhase === "practice" && currentItem && (
            <div className="space-y-4">

              {/* Progress bar + exit */}
              <div className="space-y-2">
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onNewSession}
                    data-testid="pronounce-exit-session"
                    className="text-[11px] font-bold transition-opacity hover:opacity-60"
                    style={{ color: C.purpleDim }}
                  >
                    ✕
                  </button>
                </div>
                <SessionXPBar
                  sessionIdx={sessionIdx}
                  total={sessionItems.length}
                  sessionResults={sessionResults}
                  progressLabel={t(
                    "screens.speech_coach.pronounce.session.progress",
                    { done: sessionIdx + 1, total: sessionItems.length },
                  )}
                  xpLabel="XP"
                />
              </div>

              {/* Avatar + word display */}
              <div className="flex flex-col items-center gap-3">
                <AmyRing state={amyState} size={96} />

                {/* State label */}
                <p
                  className="text-xs font-bold tracking-wide"
                  style={{ color: C.textDim }}
                  data-on-dark
                >
                  {amyStateLabel}
                </p>

                {/* Big neon word card */}
                <div
                  data-testid="pronounce-prompt-card"
                  className="w-full rounded-xl px-4 py-4 text-center transition-all duration-300"
                  style={{
                    background:
                      promptPhase === "recording"
                        ? "rgba(139,92,246,0.18)"
                        : promptPhase === "result" &&
                            currentResult?.feedback === "great"
                          ? C.emeraldDim
                          : "rgba(139,92,246,0.07)",
                    border: `1px solid ${
                      promptPhase === "recording"
                        ? C.violetMid
                        : promptPhase === "result" &&
                            currentResult?.feedback === "great"
                          ? C.emeraldBorder
                          : "rgba(139,92,246,0.2)"
                    }`,
                    boxShadow:
                      promptPhase === "recording"
                        ? `0 0 22px ${C.violetDim}`
                        : "none",
                  }}
                >
                  <span
                    className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: C.purpleDim }}
                    data-on-dark
                  >
                    {t(
                      `screens.speech_coach.pronounce.tab.${currentItem.kind}`,
                    )}
                  </span>
                  <span
                    className="block text-5xl font-black tracking-tight leading-none"
                    style={{
                      color: C.textBright,
                      textShadow: `0 0 28px ${C.violetMid}, 0 0 56px rgba(139,92,246,0.28)`,
                    }}
                    data-on-dark
                  >
                    {currentItem.text}
                  </span>
                </div>

                {/* Live waveform — recording only */}
                {promptPhase === "recording" && (
                  <NeonWaveform active={stt.listening} />
                )}

                {/* Analyzing indicator */}
                {(stt.transcribing || promptPhase === "analyzing") && (
                  <p
                    className="text-xs font-bold flex items-center gap-1.5"
                    style={{ color: "rgba(236,72,153,0.95)" }}
                    aria-live="polite"
                    data-on-dark
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("screens.speech_coach.stt.analyzing")}
                  </p>
                )}

                {/* Listening label */}
                {promptPhase === "recording" &&
                  stt.listening &&
                  !stt.transcribing && (
                    <p
                      className="text-xs font-bold flex items-center gap-1.5"
                      style={{ color: C.purple }}
                      aria-live="polite"
                      data-testid="pronounce-listening-indicator"
                      data-on-dark
                    >
                      <span
                        className="h-2 w-2 rounded-full animate-pulse"
                        style={{ background: C.purple }}
                      />
                      {t("screens.speech_coach.stt.listening")}
                    </p>
                  )}

                {/* Interim transcript */}
                {stt.listening && stt.interimTranscript && (
                  <p
                    className="text-xs italic"
                    style={{ color: C.purpleDim }}
                    aria-live="polite"
                    data-on-dark
                  >
                    {stt.interimTranscript}
                  </p>
                )}
              </div>

              {/* ── Chat conversation feed ── */}
              <div className="space-y-2.5">
                {/* Amy's prompt bubble (idle / heard states) */}
                {(promptPhase === "idle" || promptPhase === "heard") && (
                  <AmyChatBubble>{amyIntro}</AmyChatBubble>
                )}

                {/* Result conversation */}
                {promptPhase === "result" && currentResult && (
                  <>
                    {currentResult.transcript && (
                      <ChildChatBubble
                        label={t("screens.speech_coach.stt.you_said")}
                        text={`"${currentResult.transcript}"`}
                      />
                    )}
                    {amyReply && (
                      <AmyChatBubble>{amyReply}</AmyChatBubble>
                    )}
                    {currentResult.feedback !== "great" && (
                      <AmyChatBubble>
                        {t(
                          `screens.speech_coach.stt.feedback.${currentResult.feedback}`,
                        )}
                      </AmyChatBubble>
                    )}
                  </>
                )}
              </div>

              {/* ── Score card (preserves data-testid) ── */}
              {promptPhase === "result" && currentResult && (
                <div
                  data-testid="pronounce-stt-result"
                  className="rounded-xl px-4 py-3 space-y-2"
                  aria-live="polite"
                  style={{ background: scoreBg, border: `1px solid ${scoreBorder}` }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: C.purpleDim }}
                      data-on-dark
                    >
                      {t(
                        "screens.speech_coach.pronounce.session.score_label",
                      )}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {currentResult.feedback === "great" ? (
                        <CheckCircle2
                          className="h-4 w-4"
                          style={{ color: C.emerald }}
                        />
                      ) : (
                        <Star
                          className="h-4 w-4"
                          style={{ color: scoreColour }}
                        />
                      )}
                      <span
                        className="text-sm font-black"
                        style={{ color: scoreColour }}
                        data-on-dark
                      >
                        {currentResult.score}%
                      </span>
                    </div>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(139,92,246,0.12)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${currentResult.score}%`,
                        background: scoreBarGradient,
                      }}
                    />
                  </div>
                  {currentResult.transcript && (
                    <p
                      className="text-[11px]"
                      style={{ color: C.purpleDim }}
                      data-on-dark
                    >
                      {t("screens.speech_coach.stt.you_said")}{" "}
                      <span className="italic">
                        &ldquo;{currentResult.transcript}&rdquo;
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* STT error */}
              {stt.error && promptPhase !== "result" && (
                <p
                  className="text-[11px]"
                  style={{ color: "rgba(252,165,165,1)" }}
                  aria-live="polite"
                  data-on-dark
                >
                  {t(`screens.speech_coach.stt.error.${stt.error}`, {
                    defaultValue: t("screens.speech_coach.stt.error.generic"),
                  })}
                </p>
              )}

              {/* ── Action buttons ── */}
              {stt.mode !== "unsupported" ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Hear Amy */}
                  <NeonButton
                    onClick={() => {
                      onAction();
                      onHear();
                    }}
                    disabled={
                      promptPhase === "recording" || stt.transcribing
                    }
                    testId="pronounce-hear-btn"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    {voice.speaking || voice.loading
                      ? t("screens.speech_coach.pronounce.listening")
                      : promptPhase === "heard" || promptPhase === "result"
                        ? t("screens.speech_coach.pronounce.hear_again")
                        : t(
                            "screens.speech_coach.pronounce.session.hear_amy",
                          )}
                  </NeonButton>

                  {/* Record / Stop */}
                  {promptPhase !== "result" &&
                    (promptPhase === "recording" ? (
                      <button
                        type="button"
                        onClick={() => {
                          onAction();
                          onStop();
                        }}
                        data-testid="pronounce-stop-btn"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
                        style={{
                          background: "rgba(239,68,68,0.18)",
                          border: `1px solid ${C.redBorder}`,
                          color: "rgba(252,165,165,1)",
                          boxShadow: "0 0 12px rgba(239,68,68,0.18)",
                        }}
                      >
                        <MicOff className="h-3.5 w-3.5" />
                        {t("screens.speech_coach.stt.stop_recording")}
                      </button>
                    ) : promptPhase !== "analyzing" &&
                      !stt.transcribing ? (
                      <button
                        type="button"
                        onClick={() => {
                          onAction();
                          onRecord();
                        }}
                        disabled={stt.transcribing}
                        data-testid="pronounce-record-btn"
                        className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-40 active:scale-95"
                        style={{
                          background: `linear-gradient(135deg, ${C.violet}, ${C.fuchsia})`,
                          border: `1px solid ${C.violetMid}`,
                          color: "#fff",
                          boxShadow: `0 0 18px ${C.violetMid}`,
                        }}
                      >
                        <Mic className="h-3.5 w-3.5" />
                        {t("screens.speech_coach.stt.tap_to_record")}
                      </button>
                    ) : null)}

                  {/* After result: Try Again + Next */}
                  {promptPhase === "result" && currentResult && (
                    <>
                      {currentResult.feedback !== "great" && (
                        <NeonButton
                          onClick={onTryAgain}
                          testId="pronounce-try-again-btn"
                        >
                          {t(
                            "screens.speech_coach.pronounce.session.try_again",
                          )}
                        </NeonButton>
                      )}
                      <button
                        type="button"
                        onClick={onNext}
                        data-testid="pronounce-next-btn"
                        className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ml-auto"
                        style={{
                          background: `linear-gradient(135deg, ${C.violet}, ${C.fuchsia})`,
                          border: `1px solid ${C.violetMid}`,
                          color: "#fff",
                          boxShadow: `0 0 18px ${C.violetMid}`,
                        }}
                      >
                        {isLastItem
                          ? t(
                              "screens.speech_coach.pronounce.session.complete_title",
                            )
                          : t(
                              "screens.speech_coach.pronounce.session.next_word",
                            )}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <p
                  className="text-xs"
                  style={{ color: C.purpleDim }}
                  data-on-dark
                >
                  {t("screens.speech_coach.stt.unsupported")}
                </p>
              )}
            </div>
          )}

          {/* ════════════════ DONE ════════════════ */}
          {sessionPhase === "done" && (
            <div
              className="flex flex-col items-center gap-4 py-3"
              data-testid="pronounce-session-complete"
            >
              <AmyRing state="celebrating" size={110} />

              <div className="text-center">
                <p
                  className="text-xl font-black"
                  style={{
                    color: C.textBright,
                    textShadow: `0 0 22px ${C.violetMid}`,
                  }}
                  data-on-dark
                >
                  {t(
                    "screens.speech_coach.pronounce.session.complete_title",
                  )}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: C.purpleDim }}
                  data-on-dark
                >
                  {t(
                    "screens.speech_coach.pronounce.session.complete_subtitle",
                    { count: sessionResults.length },
                  )}
                </p>
              </div>

              {/* Summary */}
              {(() => {
                const strong = sessionResults
                  .filter((r) => r.feedback === "great")
                  .map(
                    (r) => sessionItems.find((s) => s.id === r.id)?.text ?? "",
                  )
                  .filter(Boolean);
                const needsPractice = sessionResults
                  .filter((r) => r.feedback === "try_again")
                  .map(
                    (r) => sessionItems.find((s) => s.id === r.id)?.text ?? "",
                  )
                  .filter(Boolean);
                const totalXP = sessionResults.reduce(
                  (n, r) =>
                    n +
                    (r.feedback === "great"
                      ? 3
                      : r.feedback === "close"
                        ? 1
                        : 0),
                  0,
                );
                return (
                  <div className="w-full space-y-2">
                    {/* XP earned */}
                    <div
                      className="rounded-xl px-4 py-3 text-center"
                      style={{
                        background: "rgba(139,92,246,0.14)",
                        border: `1px solid ${C.violetBorder}`,
                      }}
                    >
                      <span
                        className="text-2xl font-black"
                        style={{
                          color: C.amber,
                          textShadow: `0 0 16px rgba(251,191,36,0.5)`,
                        }}
                        data-on-dark
                      >
                        {totalXP} XP
                      </span>
                      <p
                        className="text-sm mt-0.5"
                        style={{ color: C.purpleDim }}
                        data-on-dark
                      >
                        {"⭐".repeat(Math.min(strong.length, 5))}
                      </p>
                    </div>

                    {strong.length > 0 && (
                      <div
                        className="rounded-xl px-4 py-3"
                        style={{
                          background: C.emeraldDim,
                          border: `1px solid ${C.emeraldBorder}`,
                        }}
                      >
                        <p
                          className="text-[10px] font-bold uppercase tracking-wide mb-1"
                          style={{ color: "rgba(52,211,153,0.9)" }}
                          data-on-dark
                        >
                          {t(
                            "screens.speech_coach.pronounce.session.strong_label",
                          )}{" "}
                          ✓
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "rgba(220,255,240,1)" }}
                          data-on-dark
                        >
                          {strong.join(" · ")}
                        </p>
                      </div>
                    )}

                    {needsPractice.length > 0 && (
                      <div
                        className="rounded-xl px-4 py-3"
                        style={{
                          background: C.amberDim,
                          border: `1px solid ${C.amberBorder}`,
                        }}
                      >
                        <p
                          className="text-[10px] font-bold uppercase tracking-wide mb-1"
                          style={{ color: "rgba(251,191,36,0.9)" }}
                          data-on-dark
                        >
                          {t(
                            "screens.speech_coach.pronounce.session.needs_practice_label",
                          )}
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "rgba(255,240,200,1)" }}
                          data-on-dark
                        >
                          {needsPractice.join(" · ")}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={onNewSession}
                data-testid="pronounce-new-session-btn"
                className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm transition-all active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${C.violet}, ${C.fuchsia})`,
                  color: "#fff",
                  border: "none",
                  boxShadow: `0 0 22px ${C.violetMid}`,
                }}
              >
                <Sparkles className="h-4 w-4" />
                {t("screens.speech_coach.pronounce.session.new_session")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// audit-block-ignore-end
