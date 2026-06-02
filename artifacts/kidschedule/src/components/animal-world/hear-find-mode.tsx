import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildHearFindQuestion,
  getAllAnimals,
  getAnimalById,
  getPrimaryQuizSound,
  gradeHearFindAnswer,
  hearFindAccuracyPct,
  resolveAnimalSoundUrl,
  type HearFindQuestion,
} from "@workspace/animal-world";
import { cn } from "@/lib/utils";
import { TRANSITION } from "@/lib/experience-system";
import { animalAudioManager } from "@/lib/animal-world-audio-manager";
import { trackAnimalWorldEvent } from "@/lib/animal-world-telemetry";
import { loadAnimalWorldProgress, recordHearFindAttempt } from "@/lib/animal-world-progress";
import { CelebrationBurst, ConfettiDots } from "./world-motion";

type HearFindModeProps = {
  childId: number;
};

export function HearFindMode({ childId }: HearFindModeProps) {
  const animals = getAllAnimals();
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [question, setQuestion] = useState<HearFindQuestion | null>(() =>
    buildHearFindQuestion(animals, { optionCount: 4 }),
  );
  const [feedback, setFeedback] = useState<"correct" | "try-again" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [stars, setStars] = useState(0);

  const correctAnimal = useMemo(
    () => (question ? getAnimalById(question.correctAnimalId) : undefined),
    [question],
  );

  useEffect(() => {
    if (!question) return;
    trackAnimalWorldEvent("hear_find_started", { childId, questionId: question.id });
  }, [childId, question?.id]);

  useEffect(() => {
    if (!question || !correctAnimal) return;
    const sound = getPrimaryQuizSound(correctAnimal);
    if (!sound) return;
    animalAudioManager.unlockFromGesture();
    void animalAudioManager.play(resolveAnimalSoundUrl(sound), {
      animalId: correctAnimal.id,
      soundId: sound.id,
      label: sound.label,
    });
  }, [question, correctAnimal]);

  const nextQuestion = () => {
    const next = buildHearFindQuestion(animals, {
      optionCount: 4,
      recentQuestionIds: recentIds,
    });
    setQuestion(next);
    setFeedback(null);
    setSelected(null);
    if (next) {
      setRecentIds((prev) => [...prev, next.id].slice(-10));
    }
  };

  const onAnswer = (animalId: string) => {
    if (!question || selected) return;
    setSelected(animalId);
    const result = gradeHearFindAnswer(question, animalId);
    const progress = loadAnimalWorldProgress(childId);
    const attempts = progress.hearFindAttemptTotal + 1;
    const correctTotal = progress.hearFindCorrectTotal + (result.correct ? 1 : 0);

    recordHearFindAttempt(childId, question.correctAnimalId, result.correct);

    trackAnimalWorldEvent("hear_find_accuracy", {
      childId,
      accuracy: hearFindAccuracyPct(correctTotal, attempts),
    });

    if (result.correct) {
      setFeedback("correct");
      setStars((s) => s + 1);
      trackAnimalWorldEvent("hear_find_completed", { childId, correct: true });
      window.setTimeout(nextQuestion, 1600);
    } else {
      setFeedback("try-again");
      trackAnimalWorldEvent("hear_find_completed", { childId, correct: false });
      window.setTimeout(() => {
        setFeedback(null);
        setSelected(null);
      }, 1400);
    }
  };

  if (!question) {
    return <p className="px-4 text-center text-muted-foreground">More animals coming soon.</p>;
  }

  return (
    <div className="relative mx-auto max-w-lg space-y-6 px-4 py-4">
      <CelebrationBurst show={feedback === "correct"} />
      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-6 text-center">
        <ConfettiDots active={feedback === "correct"} />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Hear & Find</p>
        <p className="mt-2 text-3xl font-bold text-foreground">{question.prompt}</p>
        <p className="mt-1 text-sm text-muted-foreground">Which animal makes this sound?</p>
        <p className="mt-3 text-sm text-muted-foreground">⭐ {stars} stars</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        {question.options.map((option) => {
          const isSelected = selected === option.animalId;
          const isCorrect = option.animalId === question.correctAnimalId;
          return (
            <motion.button
              key={option.animalId}
              type="button"
              whileTap={{ scale: 0.96 }}
              transition={TRANSITION.springGentle}
              onClick={() => onAnswer(option.animalId)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-[28px] border border-white/10 bg-[rgba(18,28,60,0.78)] text-6xl shadow-lg",
                isSelected && isCorrect && "border-emerald-400/60 bg-emerald-500/10",
                isSelected && !isCorrect && "border-sky-300/40 bg-sky-400/10",
              )}
            >
              {option.emoji}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {feedback === "correct" && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.warm}
            className="text-center text-lg font-bold text-emerald-300"
          >
            🎉 You found it!
          </motion.p>
        )}
        {feedback === "try-again" && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.warm}
            className="text-center text-lg font-semibold text-sky-200"
          >
            Almost — listen again and try!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
