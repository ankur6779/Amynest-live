import { useCallback } from "react";
import {
  feedbackCorrect,
  feedbackTap,
  feedbackWrong,
  isGameSoundEnabled,
  setGameSoundEnabled,
} from "@/lib/game-feedback";
import { getProceduralAudioContext, playProceduralTone } from "@/lib/procedural-sfx";
import { hapticGameSuccess } from "@/lib/game-haptics";

/** Pre-warm audio context on first interaction for <100ms latency */
let audioPreloaded = false;

function preloadAudio() {
  if (audioPreloaded) return;
  audioPreloaded = true;
  getProceduralAudioContext();
}

export function useHealthLabAudio() {
  const playTap = useCallback(() => {
    preloadAudio();
    void feedbackTap();
  }, []);

  const playSuccess = useCallback(async (perfect = false) => {
    preloadAudio();
    if (!isGameSoundEnabled()) return;
    await feedbackCorrect();
    await hapticGameSuccess(perfect);
  }, []);

  const playMilestone = useCallback(() => {
    preloadAudio();
    if (!isGameSoundEnabled()) return;
    playProceduralTone(659, 80, "sine", 0.045);
    setTimeout(() => playProceduralTone(784, 100, "sine", 0.04), 70);
  }, []);

  const playCombo = useCallback((streak: number) => {
    preloadAudio();
    if (!isGameSoundEnabled()) return;
    const base = 600 + streak * 40;
    playProceduralTone(base, 70, "sine", 0.05);
    setTimeout(() => playProceduralTone(base + 200, 90, "sine", 0.05), 60);
  }, []);

  const playReward = useCallback(() => {
    preloadAudio();
    if (!isGameSoundEnabled()) return;
    playProceduralTone(523, 90, "sine", 0.04);
    setTimeout(() => playProceduralTone(784, 110, "sine", 0.045), 80);
    setTimeout(() => playProceduralTone(1047, 130, "sine", 0.05), 160);
  }, []);

  const playCompletion = useCallback(() => {
    preloadAudio();
    if (!isGameSoundEnabled()) return;
    [523, 659, 784, 988, 1175].forEach((freq, i) => {
      setTimeout(() => playProceduralTone(freq, 100, "sine", 0.045), i * 80);
    });
    void hapticGameSuccess(true);
  }, []);

  const playLevelUp = useCallback(() => {
    preloadAudio();
    if (!isGameSoundEnabled()) return;
    playProceduralTone(523, 120, "sine", 0.05);
    setTimeout(() => playProceduralTone(659, 120, "sine", 0.05), 100);
    setTimeout(() => playProceduralTone(784, 180, "sine", 0.06), 200);
    void hapticGameSuccess(true);
  }, []);

  const playAchievement = useCallback(() => {
    preloadAudio();
    if (!isGameSoundEnabled()) return;
    playProceduralTone(880, 100, "sine", 0.05);
    setTimeout(() => playProceduralTone(1100, 150, "sine", 0.05), 90);
    void hapticGameSuccess(true);
  }, []);

  const playQuestComplete = useCallback(() => {
    preloadAudio();
    if (!isGameSoundEnabled()) return;
    playProceduralTone(600, 80, "sine", 0.04);
    setTimeout(() => playProceduralTone(800, 100, "sine", 0.04), 70);
    void hapticGameSuccess(false);
  }, []);

  const playNewRecord = useCallback(() => {
    preloadAudio();
    if (!isGameSoundEnabled()) return;
    playProceduralTone(700, 90, "sine", 0.05);
    setTimeout(() => playProceduralTone(900, 90, "sine", 0.05), 80);
    setTimeout(() => playProceduralTone(1100, 120, "sine", 0.05), 160);
    void hapticGameSuccess(true);
  }, []);

  const playCelebration = useCallback(() => {
    preloadAudio();
    if (!isGameSoundEnabled()) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => playProceduralTone(freq, 100, "sine", 0.045), i * 90);
    });
    void hapticGameSuccess(true);
  }, []);

  const playMiss = useCallback(() => {
    preloadAudio();
    void feedbackWrong();
  }, []);

  const setEnabled = setGameSoundEnabled;

  return {
    playTap,
    playSuccess,
    playMilestone,
    playCombo,
    playReward,
    playCompletion,
    playLevelUp,
    playAchievement,
    playQuestComplete,
    playNewRecord,
    playCelebration,
    playMiss,
    setEnabled,
  };
}
