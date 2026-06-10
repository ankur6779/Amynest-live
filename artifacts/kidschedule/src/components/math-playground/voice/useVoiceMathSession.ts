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

  const beginPrompt = useCallback(() => {
    promptStarted.current = true;
    processedTranscript.current = "";
    stt.reset();
    setPhase("prompt");
    amy.queueCue(scenario.promptKey, scenario.promptVars);
    trackPlaygroundEvent("voice_round_start", childId, {
      scenarioKind: scenario.kind,
      activityId: scenario.activityId,
    });
  }, [amy, scenario, stt, childId]);

  useEffect(() => {
    beginPrompt();
  }, [scenario.activityId, scenario.kind]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (prevSpeaking.current && !amy.speaking && !amy.loading) {
      void startListening();
    }
    prevSpeaking.current = amy.speaking || amy.loading;
  }, [amy.speaking, amy.loading, phase, startListening]);

  const finishRound = useCallback(
    (success: boolean, voiceConfidence: number, responseTimeMs: number) => {
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
        window.setTimeout(() => onRoundComplete(summary), 1_400);
      } else {
        amy.queueCue(scenario.struggleKey, scenario.promptVars);
        trackPlaygroundEvent("voice_round_incorrect", childId, {
          scenarioKind: scenario.kind,
          retryCount: attempts,
        });
        window.setTimeout(() => onRoundComplete(summary), 1_200);
      }
    },
    [scenario, attempts, hintsUsed, amy, childId, onRoundComplete],
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
      window.setTimeout(() => {
        stt.reset();
        processedTranscript.current = "";
        void startListening();
      }, 1_200);
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
  ]);

  useEffect(() => {
    return () => {
      stt.stop();
      stt.reset();
    };
  }, [stt]);

  return {
    phase,
    hintsUsed,
    attempts,
    stt,
    roundDurationMs: Date.now() - roundStartedAt.current,
    replayPrompt: beginPrompt,
  };
}
