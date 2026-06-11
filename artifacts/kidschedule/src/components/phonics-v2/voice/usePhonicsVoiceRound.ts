import { useCallback, useEffect, useRef, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { audioManager } from "@/lib/audio-manager";
import {
  createCoachDialogueContext,
  evaluateCoachResponse,
  type PronouncePrompt,
} from "@workspace/speech-coach";
import {
  loadPronunciationScores,
  outcomeFromCoachScore,
  recordPronunciationScore,
  savePronunciationScores,
  type PronunciationOutcome,
} from "@/lib/phonics-v2/pronunciation-scores";
import {
  buildSpeechFeedback,
  type SpeechFeedbackResult,
} from "@/lib/phonics-v3/speech-feedback";

export type PhonicsVoicePhase = "idle" | "listen" | "evaluating" | "feedback";

export function usePhonicsVoiceRound(opts: {
  childId: number;
  childName: string;
  totalAgeMonths: number;
  word: string;
  onOutcome?: (
    outcome: PronunciationOutcome,
    feedback: string,
    speech: SpeechFeedbackResult,
  ) => void;
}) {
  const getAuthToken = useCallback(async () => {
    try {
      return (await getFirebaseAuth().currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }, []);

  const stt = useSpeechRecognition("en-US", { getAuthToken });
  const [phase, setPhase] = useState<PhonicsVoicePhase>("idle");
  const [outcome, setOutcome] = useState<PronunciationOutcome | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [speechFeedback, setSpeechFeedback] = useState<SpeechFeedbackResult | null>(null);
  const processedRef = useRef("");

  const prompt: PronouncePrompt = {
    id: `phonics-v2-${opts.word}`,
    kind: "word",
    text: opts.word,
    speakText: opts.word,
    ageBands: ["2y", "3y", "4y_plus"],
    i18nKeyHint: "screens.speech_coach.pronunciation.hint_word",
  };

  const startListening = useCallback(() => {
    processedRef.current = "";
    setOutcome(null);
    setFeedback(null);
    setSpeechFeedback(null);
    stt.reset();
    audioManager.unlockFromUserGesture();
    setPhase("listen");
    void stt.start();
  }, [stt]);

  const stopListening = useCallback(() => {
    void stt.stop();
  }, [stt]);

  useEffect(() => {
    if (phase !== "listen") return;
    if (stt.listening || stt.transcribing) return;
    const transcript = (stt.transcript ?? "").trim();
    if (!transcript || transcript === processedRef.current) return;
    processedRef.current = transcript;
    setPhase("evaluating");

    const ctx = createCoachDialogueContext({
      childName: opts.childName,
      ageMonths: opts.totalAgeMonths,
      promptKind: "word",
      sessionIndex: 0,
      sessionTotal: 1,
      streak: 0,
      sessionSeed: opts.childId,
      turnIndex: 0,
      toddler: opts.totalAgeMonths < 36,
    });
    const result = evaluateCoachResponse(prompt, transcript, ctx);
    const resolved = outcomeFromCoachScore(result.correct, result.score);
    const speech = buildSpeechFeedback({
      word: opts.word,
      transcript,
      correct: result.correct,
      score: result.score,
      coachFeedback: result.displayFeedback ?? result.feedback,
    });
    const fb = speech.guidance;

    setOutcome(resolved);
    setFeedback(fb);
    setSpeechFeedback(speech);
    setPhase("feedback");

    const scores = loadPronunciationScores(opts.childId);
    savePronunciationScores(
      opts.childId,
      recordPronunciationScore(scores, {
        word: opts.word,
        outcome: resolved,
        confidence: Math.round(result.confidence * 100),
      }),
    );
    opts.onOutcome?.(resolved, fb, speech);
  }, [
    phase,
    stt.transcript,
    stt.listening,
    stt.transcribing,
    prompt,
    opts.childId,
    opts.childName,
    opts.totalAgeMonths,
    opts.onOutcome,
  ]);

  return {
    phase,
    outcome,
    feedback,
    speechFeedback,
    listening: stt.listening,
    transcribing: stt.transcribing,
    transcript: stt.transcript,
    error: stt.error,
    startListening,
    stopListening,
    reset: () => {
      setPhase("idle");
      setOutcome(null);
      setFeedback(null);
      setSpeechFeedback(null);
      stt.reset();
    },
  };
}
