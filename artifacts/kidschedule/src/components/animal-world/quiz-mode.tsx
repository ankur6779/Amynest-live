import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  buildQuizQuestion,
  getAllAnimals,
  getAnimalById,
  getPrimaryQuizSound,
  gradeQuizAnswer,
  resolveAnimalSoundUrl,
  type QuizQuestion,
} from "@workspace/animal-world";
import { cn } from "@/lib/utils";
import { TRANSITION } from "@/lib/experience-system";
import { animalAudioManager } from "@/lib/animal-world-audio-manager";
import { trackAnimalWorldEvent } from "@/lib/animal-world-telemetry";
import { grantXp, loadAnimalWorldProgress } from "@/lib/animal-world-progress";
import { recordAnimalWorldHubDaily } from "@/lib/animal-world-hub-daily";

type QuizModeProps = {
  childId: number;
};

export function QuizMode({ childId }: QuizModeProps) {
  const animals = getAllAnimals();
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [question, setQuestion] = useState<QuizQuestion | null>(() =>
    buildQuizQuestion(animals),
  );
  const [feedback, setFeedback] = useState<"correct" | "try-again" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const correctAnimal = useMemo(
    () => (question ? getAnimalById(question.correctAnimalId) : undefined),
    [question],
  );

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
    const next = buildQuizQuestion(animals, { recentQuestionIds: recentIds });
    setQuestion(next);
    setFeedback(null);
    setSelected(null);
    if (next) {
      setRecentIds((prev) => [...prev, next.id].slice(-8));
    }
  };

  const onAnswer = (animalId: string) => {
    if (!question || selected) return;
    setSelected(animalId);
    const result = gradeQuizAnswer(question, animalId);
    if (result.correct) {
      setFeedback("correct");
      const progress = loadAnimalWorldProgress(childId);
      grantXp(childId, "quizCorrect", {
        animalId: question.correctAnimalId,
        patch: {
          quizzesCorrect: (progress.animalMastery[question.correctAnimalId]?.quizzesCorrect ?? 0) + 1,
        },
      });
      recordAnimalWorldHubDaily(childId, "quiz_correct");
      trackAnimalWorldEvent("quiz_completed", { childId, correct: true, animalId: question.correctAnimalId });
      window.setTimeout(nextQuestion, 1400);
    } else {
      setFeedback("try-again");
      trackAnimalWorldEvent("quiz_completed", { childId, correct: false, animalId: question.correctAnimalId });
      window.setTimeout(() => {
        setFeedback(null);
        setSelected(null);
      }, 1200);
    }
  };

  if (!question) {
    return <p className="px-4 text-center text-muted-foreground">More animals coming soon.</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-4">
      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-center">
        <p className="text-lg font-semibold text-foreground">{question.prompt}</p>
        <p className="mt-1 text-sm text-muted-foreground">Listen and pick the right friend</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {question.options.map((option) => {
          const isSelected = selected === option.animalId;
          const isCorrect = option.animalId === question.correctAnimalId;
          return (
            <button
              key={option.animalId}
              type="button"
              onClick={() => onAnswer(option.animalId)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[rgba(18,28,60,0.78)] text-5xl shadow-lg transition active:scale-95",
                isSelected && isCorrect && "border-emerald-400/60 bg-emerald-500/10",
                isSelected && !isCorrect && "border-amber-300/50 bg-amber-400/10",
              )}
            >
              {option.emoji}
            </button>
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
            🎉 Yes! Great listening!
          </motion.p>
        )}
        {feedback === "try-again" && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.warm}
            className="text-center text-lg font-semibold text-amber-200"
          >
            Nice try — listen again!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
