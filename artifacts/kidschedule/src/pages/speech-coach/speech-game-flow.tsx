import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuth } from "firebase/auth";
import {
  useGetSpeechProgress,
  useLogSpeechPracticeAttempt,
} from "@workspace/api-client-react";
import {
  buildGamePromptSession,
  compareTranscript,
  getArticulationCue,
  getPromptSpeakText,
  type SpeechGameId,
  type TranscriptFeedback,
} from "@workspace/speech-coach";
import { Button } from "@/components/ui/button";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  PronunciationCompanion,
  type PromptPhase,
  type SessionPhase,
} from "./pronunciation-companion";
import {
  clampClarityScore,
  weakSoundsToHistory,
  type SpeechViewMode,
} from "./speech-coach-utils";

type Child = { id: number; name: string; age: number; ageMonths?: number | null };

function totalMonths(c: Child): number {
  return (c.age ?? 0) * 12 + (c.ageMonths ?? 0);
}

export function SpeechGameFlow({
  child,
  gameId,
  gameTitle,
  viewMode,
  onClose,
  onAction,
}: {
  child: Child;
  gameId: SpeechGameId;
  gameTitle: string;
  viewMode: SpeechViewMode;
  onClose: () => void;
  onAction: () => void;
}) {
  const { t } = useTranslation();
  const ageMonths = totalMonths(child);
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
  const stt = useSpeechRecognition("en-US", { getAuthToken });

  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("setup");
  const [promptPhase, setPromptPhase] = useState<PromptPhase>("idle");
  const [sessionItems, setSessionItems] = useState<
    ReturnType<typeof buildGamePromptSession>
  >([]);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [sessionResults, setSessionResults] = useState<
    Array<{ id: string; feedback: TranscriptFeedback; score: number }>
  >([]);
  const [currentResult, setCurrentResult] = useState<{
    feedback: TranscriptFeedback;
    score: number;
    transcript: string;
  } | null>(null);

  const currentItem = sessionItems[sessionIdx] ?? null;
  const isLastItem = sessionIdx >= sessionItems.length - 1;
  const promptPhaseRef = useRef(promptPhase);
  const currentItemRef = useRef(currentItem);
  useEffect(() => {
    promptPhaseRef.current = promptPhase;
  }, [promptPhase]);
  useEffect(() => {
    currentItemRef.current = currentItem;
  }, [currentItem]);

  useEffect(() => {
    if (promptPhaseRef.current !== "recording") return;
    if (stt.listening || stt.transcribing) return;
    const item = currentItemRef.current;
    const final = stt.transcript.trim();
    const r = item
      ? compareTranscript(item.text, final || "", {
          kind: item.kind,
          ageMonths,
        })
      : null;
    setCurrentResult({
      feedback: final && r ? r.feedback : "try_again",
      score: final && r ? r.score : 0,
      transcript: final,
    });
    setPromptPhase("result");
  }, [ageMonths, stt.listening, stt.transcribing, stt.transcript]);

  const startSession = () => {
    onAction();
    const history = weakSoundsToHistory(progress.data?.weakSounds ?? []);
    const items = buildGamePromptSession(
      gameId,
      ageMonths,
      Date.now(),
      history,
    );
    setSessionItems(items);
    setSessionIdx(0);
    setSessionResults([]);
    setCurrentResult(null);
    setPromptPhase("idle");
    setSessionPhase(items.length > 0 ? "practice" : "setup");
    stt.reset();
    voice.stop();
  };

  const handleHear = () => {
    if (!currentItem) return;
    const mode =
      currentItem.kind === "phonic" || currentItem.kind === "letter"
        ? "phonics"
        : "default";
    void voice.speak(getPromptSpeakText(currentItem), { mode: mode as "phonics" | "default" });
    if (promptPhase === "idle") setPromptPhase("heard");
    const cue = getArticulationCue(currentItem.text, currentItem.kind);
    if (cue && viewMode === "parent") {
      void voice.speak(cue.coachLine, { mode: "default" });
    }
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

  const handleNext = () => {
    if (!currentItem || !currentResult) return;
    log.mutate({
      data: {
        childId: child.id,
        promptId: currentItem.id,
        clarityScore: clampClarityScore(currentResult.score),
      },
    });
    const updated = [
      ...sessionResults,
      {
        id: currentItem.id,
        feedback: currentResult.feedback,
        score: currentResult.score,
      },
    ];
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
  };

  const articulationCue = currentItem
    ? getArticulationCue(currentItem.text, currentItem.kind)
    : null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-sm text-foreground">
          {t("screens.speech_coach.games.session_title", { game: gameTitle })}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          {t("screens.speech_coach.games.exit")}
        </Button>
      </div>
      {sessionPhase === "setup" ? (
        <Button type="button" className="w-full rounded-full" onClick={startSession}>
          {t("screens.speech_coach.games.play_now")}
        </Button>
      ) : (
        <PronunciationCompanion
          kind={currentItem?.kind ?? "word"}
          difficulty={currentItem?.difficulty ?? "easy"}
          sessionPhase={sessionPhase}
          promptPhase={promptPhase}
          currentItem={currentItem}
          currentResult={currentResult}
          sessionIdx={sessionIdx}
          sessionItems={sessionItems}
          sessionResults={sessionResults}
          sessionSize={sessionItems.length}
          stt={stt}
          voice={voice}
          onKindChange={() => undefined}
          onDifficultyChange={() => undefined}
          onStartSession={startSession}
          onHear={handleHear}
          onRecord={handleRecord}
          onStop={handleStop}
          onNext={handleNext}
          onTryAgain={() => {
            setCurrentResult(null);
            setPromptPhase("idle");
            stt.reset();
          }}
          onNewSession={() => {
            setSessionPhase("setup");
            setSessionItems([]);
            stt.reset();
            voice.stop();
          }}
          onAction={onAction}
          viewMode={viewMode}
          compactMode
          articulationCue={articulationCue}
        />
      )}
    </div>
  );
}
