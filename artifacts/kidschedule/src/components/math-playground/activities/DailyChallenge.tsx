import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { DailyPayload } from "@workspace/math-playground";
import { PlaygroundAmyShell } from "../shell/PlaygroundAmyShell";
import { ConfettiCelebration } from "../effects/ConfettiCelebration";
import { ActivityTaskRenderer } from "./ActivityTaskRenderer";
import type { ActivitySharedProps } from "./activity-shared-props";

interface DailyChallengeProps extends ActivitySharedProps {
  payload: DailyPayload;
}

export function DailyChallenge({
  payload,
  amy,
  accentColor,
  onComplete,
  engagement,
  childId = 0,
}: DailyChallengeProps) {
  const [taskIdx, setTaskIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(payload.timeLimitSec);
  const [allDone, setAllDone] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const tasks = payload.tasks;
  const current = tasks[taskIdx];

  useEffect(() => {
    amy.queueCue("amy_daily_intro");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (allDone) return;
    const iv = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [allDone]);

  const handleTaskComplete = useCallback(
    (_hints: number) => {
      if (taskIdx + 1 >= tasks.length) {
        setAllDone(true);
        setCelebrate(true);
        amy.queueCue("amy_daily_done");
        setTimeout(() => onComplete(0), 2000);
      } else {
        setTaskIdx((i) => i + 1);
        amy.queueCue("amy_keep_going");
      }
    },
    [taskIdx, tasks.length, onComplete, amy],
  );

  const pct = ((payload.timeLimitSec - secondsLeft) / payload.timeLimitSec) * 100;

  if (allDone) {
    return (
      <div className="text-center py-8 relative">
        <ConfettiCelebration active={celebrate} color={accentColor} />
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-black"
          style={{ color: accentColor }}
        >
          🏆 Daily Complete!
        </motion.p>
        <p className="text-sm text-white/60 mt-2">+5 ⭐</p>
      </div>
    );
  }

  return (
    <div>
      <PlaygroundAmyShell
        messageKey="amy_daily_intro"
        muted={amy.muted}
        onToggleMute={() => amy.setMuted(!amy.muted)}
        speaking={amy.speaking}
        engagement={engagement}
        accentColor={accentColor}
      />

      <div className="mb-3">
        <div className="flex justify-between text-[10px] font-bold text-white/40 mb-1">
          <span>
            Task {taskIdx + 1}/{tasks.length}
          </span>
          <span>{secondsLeft}s</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: accentColor, width: `${pct}%` }}
          />
        </div>
      </div>

      {current && (
        <ActivityTaskRenderer
          activity={current}
          amy={amy}
          accentColor={accentColor}
          onComplete={handleTaskComplete}
          engagement={engagement}
          childId={childId}
        />
      )}
    </div>
  );
}
