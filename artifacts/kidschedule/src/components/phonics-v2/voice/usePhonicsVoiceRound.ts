import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  evaluateReadingCoachAttempt,
  normalizeScore01,
  type CoachEvaluation,
  type CoachTargetKind,
} from "@/lib/phonics-v3/ai-reading-coach";

export type PhonicsVoicePhase = "idle" | "listen" | "evaluating" | "feedback";

export function usePhonicsVoiceRound(opts: {
  childId: number;
  childName: string;
  totalAgeMonths: number;
  word: string;
  /** phoneme for single sounds; word (default) for CVC / reading */
  targetKind?: CoachTargetKind;
  onOutcome?: (
    outcome: PronunciationOutcome,
    feedback: string,
    speech: SpeechFeedbackResult,
  ) => void;
  /** Rich AI Reading Coach evaluation (preferred for lessons). */
  onCoachEvaluation?: (evaluation: CoachEvaluation) => void;
}) {
  const targetKind: CoachTargetKind = opts.targetKind ?? "word";
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
  const [coachEval, setCoachEval] = useState<CoachEvaluation | null>(null);
  const processedRef = useRef("");

  const promptKind = targetKind === "phoneme" ? "phonic" : targetKind === "sentence" || targetKind === "phrase" ? "sentence" : "word";

  const prompt: PronouncePrompt = useMemo(
    () => ({
      id: `phonics-coach-${targetKind}-${opts.word}`,
      kind: promptKind,
      text: opts.word,
      speakText: opts.word,
      ageBands: ["2y", "3y", "4y_plus"],
      i18nKeyHint: "screens.speech_coach.pronunciation.hint_word",
    }),
    [opts.word, promptKind, targetKind],
  );

  const startListening = useCallback(() => {
    processedRef.current = "";
    setOutcome(null);
    setFeedback(null);
    setSpeechFeedback(null);
    setCoachEval(null);
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
      promptKind,
      sessionIndex: 0,
      sessionTotal: 1,
      streak: 0,
      sessionSeed: opts.childId,
      turnIndex: 0,
      toddler: opts.totalAgeMonths < 36,
    });
    const result = evaluateCoachResponse(prompt, transcript, ctx);
    const score01 = normalizeScore01(result.score);
    const confidence01 = normalizeScore01(result.confidence);

    const evaluation = evaluateReadingCoachAttempt({
      expected: opts.word,
      transcript,
      targetKind,
      score: score01,
      confidence: confidence01,
      correct: result.correct,
    });

    const resolved = outcomeFromCoachScore(evaluation.correct, score01);
    const speech = buildSpeechFeedback({
      word: opts.word,
      transcript,
      correct: evaluation.correct,
      score: score01,
      coachFeedback: evaluation.feedback,
    });

    setOutcome(resolved);
    setFeedback(evaluation.feedback);
    setSpeechFeedback({
      ...speech,
      guidance: evaluation.feedback,
      label:
        evaluation.tier === "excellent"
          ? "Excellent!"
          : evaluation.tier === "good"
            ? "Good!"
            : evaluation.tier === "almost"
              ? "Almost there!"
              : "Let's try again",
      confidence: evaluation.confidencePct,
    });
    setCoachEval(evaluation);
    setPhase("feedback");

    const scores = loadPronunciationScores(opts.childId);
    savePronunciationScores(
      opts.childId,
      recordPronunciationScore(scores, {
        word: opts.word,
        outcome: resolved,
        confidence: evaluation.confidencePct,
      }),
    );
    opts.onCoachEvaluation?.(evaluation);
    opts.onOutcome?.(resolved, evaluation.feedback, speech);
  }, [
    phase,
    stt.transcript,
    stt.listening,
    stt.transcribing,
    prompt,
    promptKind,
    targetKind,
    opts.childId,
    opts.childName,
    opts.totalAgeMonths,
    opts.word,
    opts.onOutcome,
    opts.onCoachEvaluation,
  ]);

  return {
    phase,
    outcome,
    feedback,
    speechFeedback,
    coachEval,
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
      setCoachEval(null);
      stt.reset();
    },
  };
}
