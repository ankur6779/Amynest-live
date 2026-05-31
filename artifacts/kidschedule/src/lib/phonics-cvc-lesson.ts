/**
 * CVC blending lesson state machine — single source of truth for level + word selection.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCvcWordsByLevel,
  type CvcWordEntry,
} from "@workspace/phonics-sounds";
import { phonicsEngineStop, phonicsEnginePreloadWord } from "@/lib/phonics-audio-engine";
import { recordPhonicsTelemetry } from "@/lib/phonics-telemetry";

export type CvcLessonPhase =
  | "idle"
  | "word_selected"
  | "playing_phonemes"
  | "playing_blend"
  | "completed";

export type PhonicsCvcLessonState = {
  activeLevel: 1 | 2 | 3;
  levelWords: CvcWordEntry[];
  selectedWord: CvcWordEntry | null;
  selectedIndex: number;
  phase: CvcLessonPhase;
  isPlaying: boolean;
};

export function getCvcWordsForLevel(level: 1 | 2 | 3): CvcWordEntry[] {
  return getCvcWordsByLevel(level);
}

export function usePhonicsCvcLesson(initialLevel: 1 | 2 | 3) {
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(initialLevel);
  const [levelWords, setLevelWords] = useState<CvcWordEntry[]>(() =>
    getCvcWordsForLevel(initialLevel),
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [phase, setPhase] = useState<CvcLessonPhase>("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const lastLevelRef = useRef(initialLevel);

  const selectedWord = useMemo(
    () => levelWords[selectedIndex] ?? null,
    [levelWords, selectedIndex],
  );

  const refreshLevelWords = useCallback((level: 1 | 2 | 3) => {
    const words = getCvcWordsForLevel(level);
    setLevelWords(words);
    return words;
  }, []);

  const selectLevel = useCallback(
    (level: 1 | 2 | 3) => {
      if (level === activeLevel && levelWords.length > 0) return;

      void phonicsEngineStop("level_change");
      setIsPlaying(false);
      setPhase("idle");

      const prevLevel = lastLevelRef.current;
      const prevWordSet = levelWords.map((w) => w.word).sort().join(",");
      const words = refreshLevelWords(level);
      const newWordSet = words.map((w) => w.word).sort().join(",");

      setActiveLevel(level);
      setSelectedIndex(0);
      lastLevelRef.current = level;

      if (
        prevLevel !== level &&
        level !== 3 &&
        prevLevel !== 3 &&
        prevWordSet.length > 0 &&
        prevWordSet === newWordSet
      ) {
        recordPhonicsTelemetry("phonics_level_changed", {
          level,
          previousLevel: prevLevel,
          error: "same_dataset_across_levels",
          wordCount: words.length,
        });
      } else {
        recordPhonicsTelemetry("phonics_level_changed", {
          level,
          previousLevel: prevLevel,
          wordCount: words.length,
        });
      }

      if (words[0]) {
        phonicsEnginePreloadWord(words[0]);
        setPhase("word_selected");
      }
    },
    [activeLevel, levelWords, refreshLevelWords],
  );

  const selectWord = useCallback(
    (word: CvcWordEntry | string) => {
      void phonicsEngineStop("word_select");
      setIsPlaying(false);

      const w = typeof word === "string" ? word.trim().toLowerCase() : word.word;
      const idx = levelWords.findIndex((entry) => entry.word === w);
      const resolved = idx >= 0 ? levelWords[idx]! : null;

      if (resolved) {
        setSelectedIndex(idx);
        setPhase("word_selected");
        phonicsEnginePreloadWord(resolved);
        recordPhonicsTelemetry("phonics_word_selected", {
          wordId: resolved.word,
          level: activeLevel,
          index: idx,
        });
      }
    },
    [levelWords, activeLevel],
  );

  const selectWordByIndex = useCallback(
    (index: number) => {
      const entry = levelWords[index];
      if (entry) selectWord(entry);
    },
    [levelWords, selectWord],
  );

  const beginPlayback = useCallback((blendPhase: "playing_phonemes" | "playing_blend") => {
    setPhase(blendPhase);
    setIsPlaying(true);
  }, []);

  const endPlayback = useCallback((completed: boolean) => {
    setIsPlaying(false);
    setPhase(completed ? "completed" : "word_selected");
  }, []);

  const resetLesson = useCallback(() => {
    void phonicsEngineStop("lesson_reset");
    setIsPlaying(false);
    setPhase(selectedWord ? "word_selected" : "idle");
  }, [selectedWord]);

  useEffect(() => {
    if (selectedWord) {
      phonicsEnginePreloadWord(selectedWord);
    }
  }, [selectedWord]);

  return {
    activeLevel,
    levelWords,
    selectedWord,
    selectedIndex,
    phase,
    isPlaying,
    selectLevel,
    selectWord,
    selectWordByIndex,
    beginPlayback,
    endPlayback,
    resetLesson,
    setIsPlaying,
  };
}
