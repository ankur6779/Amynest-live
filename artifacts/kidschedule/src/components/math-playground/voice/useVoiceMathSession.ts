import { useCallback, useEffect, useRef, useState } from "react";
import { ageYearsToBand } from "@workspace/math-playground";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  computeVoiceConfidence,
  validateVoiceAnswer,
  type VoiceRoundSummary,
  type VoiceScenario,
} from "@workspace/math-playground-voice";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { audioManager } from "@/lib/audio-manager";
import type { usePlaygroundAmy } from "../hooks/usePlaygroundAmy";
import { trackPlaygroundEvent } from "../lib/playground-analytics";

export type VoiceRoundPhase = "prompt" | "listen" | "validating" | "success" | "retry";

const MAX_RETRIES = 2;
const ROUND_COMPLETE_DELAY_MS = 1_400;
const RETRY_LISTEN_DELAY_MS = 400;

function scenarioSignature(scenario: VoiceScenario): string {
  return JSON.stringify({
    kind: scenario.kind,
    activityId: scenario.activityId,
    promptKey: scenario.promptKey,
    promptVars: scenario.promptVars,
    expectedAnswers: scenario.expectedAnswers,
  });
}

export function useVoiceMathSession(opts: {
  scenario: VoiceScenario;
  amy: ReturnType<typeof usePlaygroundAmy>;
  ageYears: number;
  childId: number;
  onRoundComplete: (summary: VoiceRoundSummary) => void;
}) {
  const { scenario, amy, ageYears, childId, onRoundComplete } = opts;
  const getAuthToken = useCallback(async () => {
    try {
      return (await getFirebaseAuth().currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }, []);

  const stt = useSpeechRecognition("en-US", { getAuthToken });
  const [phase, setPhase] = useState<VoiceRoundPhase>("prompt");
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const listenStartedAt = useRef(0);
  const roundStartedAt = useRef(Date.now());
  const promptStarted = useRef(false);
  const prevSpeaking = useRef(false);
  const processedTranscript = useRef("");
  const roundCompleteTimeoutRef = useRef<number | null>(null);
  const retryListenTimeoutRef = useRef<number | null>(null);
  const onRoundCompleteRef = useRef(onRoundComplete);

  useEffect(() => {
    onRoundCompleteRef.current = onRoundComplete;
  }, [onRoundComplete]);

  const clearRoundTimers = useCallback(() => {
    if (roundCompleteTimeoutRef.current !== null) {
      window.clearTimeout(roundCompleteTimeoutRef.current);
      roundCompleteTimeoutRef.current = null;
    }
    if (retryListenTimeoutRef.current !== null) {
      window.clearTimeout(retryListenTimeoutRef.current);
      retryListenTimeoutRef.current = null;
    }
  }, []);

  const waitForAmySilentThen = useCallback(
    (fn: () => void, maxWaitMs = 5_000) => {
      const started = Date.now();
      const tick = () => {
        if (!amy.speaking && !amy.loading) {
          fn();
          return;
        }
        if (Date.now() - started >= maxWaitMs) {
          fn();
          return;
        }
        retryListenTimeoutRef.current = window.setTimeout(tick, 120);
      };
      retryListenTimeoutRef.current = window.setTimeout(tick, RETRY_LISTEN_DELAY_MS);
    },
    [amy.speaking, amy.loading],
  );

  const beginPrompt = useCallback(() => {
    clearRoundTimers();
    promptStarted.current = true;
    processedTranscript.current = "";
    setAttempts(0);
    setHintsUsed(0);
    stt.reset();
    setPhase("prompt");
    prevSpeaking.current = false;
    amy.queueCue(scenario.promptKey, scenario.promptVars);
    trackPlaygroundEvent("voice_round_start", childId, {
      scenarioKind: scenario.kind,
      activityId: scenario.activityId,
    });
  }, [amy, scenario, stt, childId, clearRoundTimers]);

  useEffect(() => {
    beginPrompt();
  }, [scenarioSignature(scenario)]); // eslint-disable-line react-hooks/exhaustive-deps

  const startListening = useCallback(async () => {
    audioManager.unlockFromUserGesture();
    listenStartedAt.current = Date.now();
    setPhase("listen");
    const ok = await stt.start();
    if (!ok) {
      setPhase("retry");
      amy.queueCue(scenario.struggleKey, scenario.promptVars);
    }
  }, [stt, amy, scenario]);

  useEffect(() => {
    if (phase !== "prompt" || !promptStarted.current) return;

    if (amy.muted) {
      void startListening();
      return;
    }

    if (prevSpeaking.current && !amy.speaking && !amy.loading) {
      void startListening();
    }
    prevSpeaking.current = amy.speaking || amy.loading;
  }, [amy.speaking, amy.loading, amy.muted, phase, startListening]);

  const finishRound = useCallback(
    (success: boolean, voiceConfidence: number, responseTimeMs: number) => {
      clearRoundTimers();
      setPhase(success ? "success" : "retry");
      const summary: VoiceRoundSummary = {
        scenario,
        attempts: attempts + 1,
        hintsUsed,
        responseTimeMs,
        voiceConfidence,
        success,
      };

      if (success) {
        amy.queueCue(scenario.celebrateKey ?? scenario.successKey, scenario.promptVars);
        trackPlaygroundEvent("voice_round_correct", childId, {
          scenarioKind: scenario.kind,
          responseTimeMs,
          voiceConfidence,
          retryCount: attempts,
        });
        roundCompleteTimeoutRef.current = window.setTimeout(
          () => onRoundCompleteRef.current(summary),
          ROUND_COMPLETE_DELAY_MS,
        );
      } else {
        amy.queueCue(scenario.struggleKey, scenario.promptVars);
        trackPlaygroundEvent("voice_round_incorrect", childId, {
          scenarioKind: scenario.kind,
          retryCount: attempts,
        });
        roundCompleteTimeoutRef.current = window.setTimeout(
          () => onRoundCompleteRef.current(summary),
          ROUND_COMPLETE_DELAY_MS,
        );
      }
    },
    [scenario, attempts, hintsUsed, amy, childId, clearRoundTimers],
  );

  useEffect(() => {
    if (phase !== "listen" && phase !== "validating") return;
    const text = stt.transcript.trim();
    if (!text || text === processedTranscript.current) return;
    if (stt.listening || stt.transcribing) return;

    processedTranscript.current = text;
    setPhase("validating");

    const responseTimeMs = Math.max(0, Date.now() - listenStartedAt.current);
    const ageBand = ageYearsToBand(ageYears);
    const validation = validateVoiceAnswer(text, scenario, {
      sttMode: stt.mode === "unsupported" ? undefined : stt.mode,
      ageBand,
    });
    const voiceConfidence = computeVoiceConfidence({
      sttMode: stt.mode === "unsupported" ? "unsupported" : stt.mode,
      validation,
      transcriptLength: text.length,
      listeningDurationMs: responseTimeMs,
    });

    const accepted =
      validation.outcome === "correct" ||
      (validation.outcome === "close" && ageBand === "2-3");

    if (accepted) {
      finishRound(true, voiceConfidence, responseTimeMs);
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (nextAttempts <= MAX_RETRIES) {
      setHintsUsed((h) => h + 1);
      amy.queueCue(scenario.struggleKey, scenario.promptVars);
      setPhase("retry");
      stt.stop();
      waitForAmySilentThen(() => {
        stt.reset();
        processedTranscript.current = "";
        void startListening();
      });
      return;
    }

    finishRound(false, voiceConfidence, responseTimeMs);
  }, [
    stt.transcript,
    stt.listening,
    stt.transcribing,
    stt.mode,
    phase,
    scenario,
    ageYears,
    attempts,
    amy,
    finishRound,
    startListening,
    stt,
    waitForAmySilentThen,
  ]);

  useEffect(() => {
    return () => {
      clearRoundTimers();
      stt.stop();
      stt.reset();
      amy.pause();
    };
  }, [stt, amy, clearRoundTimers]);

  return {
    phase,
    hintsUsed,
    attempts,
    stt,
    roundDurationMs: Date.now() - roundStartedAt.current,
    replayPrompt: beginPrompt,
  };
}
