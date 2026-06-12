import { useCallback } from "react";
import {
  feedbackCorrect,
  feedbackTap,
  feedbackWrong,
  isGameSoundEnabled,
  setGameSoundEnabled,
} from "@/lib/game-feedback";
import { playProceduralTone } from "@/lib/procedural-sfx";
import { hapticGameSuccess } from "@/lib/game-haptics";

export function useHealthLabAudio() {
  const playTap = useCallback(() => {
    void feedbackTap();
  }, []);

  const playSuccess = useCallback(async (perfect = false) => {
    if (!isGameSoundEnabled()) return;
    await feedbackCorrect();
    await hapticGameSuccess(perfect);
  }, []);

  const playLevelUp = useCallback(() => {
    if (!isGameSoundEnabled()) return;
    playProceduralTone(523, 120, "sine", 0.05);
    setTimeout(() => playProceduralTone(659, 120, "sine", 0.05), 100);
    setTimeout(() => playProceduralTone(784, 180, "sine", 0.06), 200);
    void hapticGameSuccess(true);
  }, []);

  const playAchievement = useCallback(() => {
    if (!isGameSoundEnabled()) return;
    playProceduralTone(880, 100, "sine", 0.05);
    setTimeout(() => playProceduralTone(1100, 150, "sine", 0.05), 90);
    void hapticGameSuccess(true);
  }, []);

  const playQuestComplete = useCallback(() => {
    if (!isGameSoundEnabled()) return;
    playProceduralTone(600, 80, "sine", 0.04);
    setTimeout(() => playProceduralTone(800, 100, "sine", 0.04), 70);
    void hapticGameSuccess(false);
  }, []);

  const playNewRecord = useCallback(() => {
    if (!isGameSoundEnabled()) return;
    playProceduralTone(700, 90, "sine", 0.05);
    setTimeout(() => playProceduralTone(900, 90, "sine", 0.05), 80);
    setTimeout(() => playProceduralTone(1100, 120, "sine", 0.05), 160);
    void hapticGameSuccess(true);
  }, []);

  const playCelebration = useCallback(() => {
    if (!isGameSoundEnabled()) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => playProceduralTone(freq, 100, "sine", 0.045), i * 90);
    });
    void hapticGameSuccess(true);
  }, []);

  const playMiss = useCallback(() => {
    void feedbackWrong();
  }, []);

  const setEnabled = setGameSoundEnabled;

  return {
    playTap,
    playSuccess,
    playLevelUp,
    playAchievement,
    playQuestComplete,
    playNewRecord,
    playCelebration,
    playMiss,
    setEnabled,
  };
}
