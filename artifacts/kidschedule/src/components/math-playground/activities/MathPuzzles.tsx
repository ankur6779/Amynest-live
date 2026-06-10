import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { isMiniGameTemplate, type PuzzlePayload } from "@workspace/math-playground";
import { audioManager } from "@/lib/audio-manager";
import { PlaygroundAmyShell } from "../shell/PlaygroundAmyShell";
import { ConfettiCelebration } from "../effects/ConfettiCelebration";
import { LivingPlaygroundObject } from "../objects/LivingPlaygroundObject";
import { MiniGameRouter } from "../mini-games/MiniGameRouter";
import { MINI_GAME_AMY_KEYS } from "../mini-games/mini-game-shared";
import { isMpMiniGamesEnabled } from "../lib/feature-flags";
import type { ActivitySharedProps } from "./activity-shared-props";

interface MathPuzzlesProps extends ActivitySharedProps {
  payload: PuzzlePayload;
}

export function MathPuzzles({
  payload,
  amy,
  accentColor,
  onComplete,
  engagement,
  childId = 0,
}: MathPuzzlesProps) {
  const [hintsUsed, setHintsUsed] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const miniGamesOn = isMpMiniGamesEnabled();
  const isMiniGame = isMiniGameTemplate(payload.template) && miniGamesOn;

  const finish = useCallback(() => {
    setCelebrate(true);
    amy.queueCue("amy_great_job");
    window.setTimeout(() => onComplete(hintsUsed), 1600);
  }, [hintsUsed, onComplete, amy]);

  const onWrong = useCallback(() => {
    engagement?.recordFailure();
    setHintsUsed((h) => h + 1);
    amy.queueCue("amy_try_together");
  }, [amy, engagement]);

  const messageKey = useMemo(() => {
    if (isMiniGame) return MINI_GAME_AMY_KEYS[payload.template] ?? "amy_puzzle_match";
    if (payload.template === "bigger_number") return "amy_puzzle_bigger";
    if (payload.template === "match_quantity") return "amy_puzzle_match";
    return "amy_puzzle_sort";
  }, [isMiniGame, payload.template]);

  useEffect(() => {
    amy.queueCue(messageKey);
  }, [messageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PlaygroundAmyShell
        messageKey={messageKey}
        muted={amy.muted}
        onToggleMute={() => amy.setMuted(!amy.muted)}
        speaking={amy.speaking}
        engagement={engagement}
        accentColor={accentColor}
      />
      <ConfettiCelebration active={celebrate} color={accentColor} />

      {isMiniGame ? (
        <MiniGameRouter
          payload={payload}
          accentColor={accentColor}
          onCorrect={finish}
          onWrong={onWrong}
          engagement={engagement}
          childId={childId}
        />
      ) : (
        <>
          {payload.template === "bigger_number" && (
            <BiggerNumberPuzzle
              left={payload.leftValue!}
              right={payload.rightValue!}
              accentColor={accentColor}
              onCorrect={finish}
              onWrong={onWrong}
            />
          )}
          {payload.template === "match_quantity" && (
            <MatchQuantityPuzzle
              target={payload.targetNumeral!}
              accentColor={accentColor}
              onCorrect={finish}
              onWrong={onWrong}
              childId={childId}
            />
          )}
          {payload.template === "sort_ascending" && (
            <SortPuzzle
              numbers={payload.sortNumbers!}
              accentColor={accentColor}
              onCorrect={finish}
              onWrong={onWrong}
            />
          )}
        </>
      )}
    </div>
  );
}

function BiggerNumberPuzzle({
  left,
  right,
  accentColor,
  onCorrect,
  onWrong,
}: {
  left: number;
  right: number;
  accentColor: string;
  onCorrect: () => void;
  onWrong: () => void;
}) {
  const bigger = Math.max(left, right);
  return (
    <div className="flex gap-4 justify-center">
      {[left, right].map((val, i) => (
        <motion.button
          key={i}
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            audioManager.unlockFromUserGesture();
            if (val === bigger) onCorrect();
            else onWrong();
          }}
          className="flex-1 max-w-[120px] rounded-2xl py-6 font-black text-3xl"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: `2px solid ${accentColor}44`,
            color: "white",
          }}
        >
          {val}
        </motion.button>
      ))}
    </div>
  );
}

function MatchQuantityPuzzle({
  target,
  accentColor,
  onCorrect,
  onWrong,
  childId,
}: {
  target: number;
  accentColor: string;
  onCorrect: () => void;
  onWrong: () => void;
  childId: number;
}) {
  const options = useMemo(
    () => [target, target + 1, Math.max(1, target - 1)].sort((a, b) => a - b),
    [target],
  );
  return (
    <div>
      <div className="flex justify-center gap-1 mb-4 flex-wrap">
        {Array.from({ length: target }).map((_, i) => (
          <LivingPlaygroundObject key={i} kind="star" size={28} childId={childId} />
        ))}
      </div>
      <div className="flex justify-center gap-2">
        {options.map((opt) => (
          <motion.button
            key={opt}
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              audioManager.unlockFromUserGesture();
              if (opt === target) onCorrect();
              else onWrong();
            }}
            className="w-14 h-14 rounded-xl font-black text-xl"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: `2px solid ${accentColor}44`,
              color: "white",
            }}
          >
            {opt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function SortPuzzle({
  numbers,
  accentColor,
  onCorrect,
  onWrong,
}: {
  numbers: number[];
  accentColor: string;
  onCorrect: () => void;
  onWrong: () => void;
}) {
  const sorted = useMemo(() => [...numbers].sort((a, b) => a - b), [numbers]);
  const [picked, setPicked] = useState<number[]>([]);

  const handlePick = (n: number) => {
    if (picked.includes(n)) return;
    audioManager.unlockFromUserGesture();
    const next = [...picked, n];
    const expected = sorted[next.length - 1];
    if (n !== expected) {
      onWrong();
      setPicked([]);
      return;
    }
    setPicked(next);
    if (next.length === sorted.length) onCorrect();
  };

  return (
    <div className="flex justify-center gap-2 flex-wrap">
      {numbers.map((n) => (
        <motion.button
          key={n}
          type="button"
          whileTap={{ scale: 0.9 }}
          disabled={picked.includes(n)}
          onClick={() => handlePick(n)}
          className="w-14 h-14 rounded-xl font-black text-lg"
          style={{
            background: picked.includes(n) ? `${accentColor}44` : "rgba(255,255,255,0.08)",
            border: `2px solid ${picked.includes(n) ? accentColor : "rgba(255,255,255,0.12)"}`,
            color: "white",
            opacity: picked.includes(n) ? 0.5 : 1,
          }}
        >
          {n}
        </motion.button>
      ))}
    </div>
  );
}
