/**
 * Speech Coach recording UI states for viewport certification.
 * Open: /playwright-speech-coach.html?panel=setup|denied|recording|result
 *
 * Does not exercise a real microphone stream.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "../i18n";
import { PronunciationCompanion } from "@/pages/speech-coach/pronunciation-companion";
import type { SpeechRecognitionState } from "@/hooks/useSpeechRecognition";
import type { UseAmyVoiceState } from "@/hooks/use-amy-voice";
import type { PronouncePrompt } from "@workspace/speech-coach";

const params = new URLSearchParams(window.location.search);
const panel = params.get("panel") ?? "setup";

const prompt: PronouncePrompt = {
  id: "cert-cat",
  kind: "word",
  text: "cat",
  ageBands: ["2y"],
  i18nKeyHint: "tap",
  difficulty: "easy",
};

const noop = () => {};

function stubStt(error: string | null, listening: boolean): SpeechRecognitionState {
  return {
    transcript: error ? "" : listening ? "" : "cat",
    interimTranscript: "",
    listening,
    transcribing: false,
    mode: "unsupported",
    error,
    start: async () => false,
    stop: noop,
    reset: noop,
    warm: async () => undefined,
    status: error ? "error" : listening ? "recording" : "idle",
  };
}

const stubVoice: UseAmyVoiceState = {
  speaking: false,
  loading: false,
  error: null,
  activePhrase: null,
  speak: async () => ({ success: true }),
  playPreparedUrl: async () => ({ success: true }),
  primeSpeakGesture: noop,
  pause: noop,
};

function resolvePanel() {
  if (panel === "denied") {
    return {
      sessionPhase: "practice" as const,
      promptPhase: "idle" as const,
      stt: stubStt("microphone_denied", false),
      currentItem: prompt,
      currentResult: null,
    };
  }
  if (panel === "recording") {
    return {
      sessionPhase: "practice" as const,
      promptPhase: "recording" as const,
      stt: stubStt(null, true),
      currentItem: prompt,
      currentResult: null,
    };
  }
  if (panel === "result") {
    return {
      sessionPhase: "practice" as const,
      promptPhase: "result" as const,
      stt: stubStt(null, false),
      currentItem: prompt,
      currentResult: { feedback: "great" as const, score: 92, transcript: "cat" },
    };
  }
  return {
    sessionPhase: "setup" as const,
    promptPhase: "idle" as const,
    stt: stubStt(null, false),
    currentItem: null,
    currentResult: null,
  };
}

const resolved = resolvePanel();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div
      className="amynest-content-column p-4"
      data-testid="speech-coach-cert-fixture"
      data-panel={panel}
    >
      <PronunciationCompanion
        kind="word"
        difficulty="easy"
        sessionPhase={resolved.sessionPhase}
        promptPhase={resolved.promptPhase}
        currentItem={resolved.currentItem}
        currentResult={resolved.currentResult}
        sessionIdx={0}
        sessionItems={resolved.currentItem ? [resolved.currentItem] : []}
        sessionResults={
          resolved.currentResult
            ? [{ id: prompt.id, feedback: resolved.currentResult.feedback, score: resolved.currentResult.score }]
            : []
        }
        sessionSize={5}
        stt={resolved.stt}
        voice={stubVoice}
        onKindChange={noop}
        onDifficultyChange={noop}
        onStartSession={noop}
        onHear={noop}
        onRecord={noop}
        onStop={noop}
        onNext={noop}
        onTryAgain={noop}
        onNewSession={noop}
        onAction={noop}
        viewMode="parent"
        childName="Aria"
        ageMonths={48}
      />
    </div>
  </StrictMode>,
);
