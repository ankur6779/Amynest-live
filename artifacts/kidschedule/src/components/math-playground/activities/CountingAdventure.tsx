import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CountingPayload } from "@workspace/math-playground";
import { audioManager } from "@/lib/audio-manager";
import { EquationMorph } from "@/components/math-animation/EquationMorph";
import { useReducedMotion } from "@/lib/reduced-motion";
import { PlaygroundAmyShell } from "../shell/PlaygroundAmyShell";
import { ConfettiCelebration } from "../effects/ConfettiCelebration";
import { SparkleBurst } from "../effects/SparkleBurst";
import { LivingPlaygroundObject } from "../objects/LivingPlaygroundObject";
import type { ActivitySharedProps } from "./activity-shared-props";

interface CountingAdventureProps extends ActivitySharedProps {
  payload: CountingPayload;
}

export function CountingAdventure({
  payload,
  amy,
  accentColor,
  onComplete,
  engagement,
  childId = 0,
}: CountingAdventureProps) {
  const reduced = useReducedMotion();
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [sparkle, setSparkle] = useState<{ x: number; y: number } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [hintsUsed] = useState(0);
  const [delightKeys, setDelightKeys] = useState<Record<string, number>>({});
  const count = collected.size;
  const done = count === payload.targetCount;

  const handleTap = useCallback(
    (id: string, el: HTMLElement) => {
      if (collected.has(id) || done) return;
      audioManager.unlockFromUserGesture();
      engagement?.recordInteraction();
      setDelightKeys((d) => ({ ...d, [id]: (d[id] ?? 0) + 1 }));
      setCollected((prev) => new Set([...prev, id]));
      const rect = el.getBoundingClientRect();
      const parent = el.offsetParent as HTMLElement | null;
      const px = parent
        ? rect.left - parent.getBoundingClientRect().left + rect.width / 2
        : rect.width / 2;
      const py = parent
        ? rect.top - parent.getBoundingClientRect().top + rect.height / 2
        : rect.height / 2;
      setSparkle({ x: px, y: py });
      window.setTimeout(() => setSparkle(null), 500);
    },
    [collected, done, engagement],
  );

  useEffect(() => {
    if (!done) return;
    setCelebrate(true);
    amy.queueCue("amy_great_job");
    const t = setTimeout(() => onComplete(hintsUsed), 1800);
    return () => clearTimeout(t);
  }, [done, hintsUsed, onComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PlaygroundAmyShell
        messageKey={done ? "amy_great_job" : "amy_count_prompt"}
        messageVars={{
          count: payload.targetCount,
          objects: objectPlural(payload.objectKind),
        }}
        muted={amy.muted}
        onToggleMute={() => amy.setMuted(!amy.muted)}
        amyAudio={amy}
        engagement={engagement}
        accentColor={accentColor}
      />

      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          minHeight: 220,
          background: "linear-gradient(180deg, rgba(34,197,94,0.12) 0%, rgba(0,0,0,0.2) 100%)",
          border: "1px solid rgba(34,197,94,0.25)",
        }}
      >
        <ConfettiCelebration active={celebrate} color={accentColor} />
        {sparkle && <SparkleBurst x={sparkle.x} y={sparkle.y} active />}

        <div
          className="absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-black"
          style={{ background: "rgba(0,0,0,0.35)", color: accentColor }}
        >
          {count} / {payload.targetCount}
        </div>

        {payload.objects.map((obj) => (
          <div
            key={obj.id}
            data-testid={collected.has(obj.id) || done ? undefined : "mp-tap-target"}
            className="absolute cursor-pointer"
            style={{ left: `${obj.x}%`, top: `${obj.y}%`, transform: "translate(-50%, -50%)" }}
            onClick={(e) => {
              if (collected.has(obj.id) || done) return;
              handleTap(obj.id, e.currentTarget);
            }}
          >
            <LivingPlaygroundObject
              kind={obj.kind}
              collected={collected.has(obj.id)}
              interactive={false}
              delightKey={delightKeys[obj.id]}
              motionTrigger={collected.has(obj.id) ? "collect" : undefined}
              childId={childId}
            />
          </div>
        ))}
      </div>

      {done && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-center text-2xl font-black"
          style={{ color: accentColor }}
        >
          {payload.targetCount}! 🎉
        </motion.p>
      )}
    </div>
  );
}

function objectPlural(kind: CountingPayload["objectKind"]): string {
  const labels: Record<CountingPayload["objectKind"], string> = {
    apple: "apples",
    flower: "flowers",
    star: "stars",
    cookie: "cookies",
    toy: "toys",
    block: "blocks",
  };
  return labels[kind];
}
