import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DivisionPayload } from "@workspace/math-playground";
import { audioManager } from "@/lib/audio-manager";
import { EquationMorph } from "@/components/math-animation/EquationMorph";
import { useReducedMotion } from "@/lib/reduced-motion";
import { PlaygroundAmyShell } from "../shell/PlaygroundAmyShell";
import { ConfettiCelebration } from "../effects/ConfettiCelebration";
import { LivingPlaygroundObject } from "../objects/LivingPlaygroundObject";
import type { ActivitySharedProps } from "./activity-shared-props";

interface DivisionBakeryProps extends ActivitySharedProps {
  payload: DivisionPayload;
}

export function DivisionBakery({
  payload,
  amy,
  accentColor,
  onComplete,
  engagement,
  childId = 0,
}: DivisionBakeryProps) {
  const reduced = useReducedMotion();
  const perChild = payload.total / payload.recipients;
  const [selectedCookie, setSelectedCookie] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string[]>>({});
  const [wrongShake, setWrongShake] = useState<number | null>(null);
  const [showEquation, setShowEquation] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  const cookies = useMemo(
    () => Array.from({ length: payload.total }, (_, i) => `c-${i}`),
    [payload.total],
  );

  const assignedSet = useMemo(() => {
    const s = new Set<string>();
    for (const arr of Object.values(assignments)) arr.forEach((id) => s.add(id));
    return s;
  }, [assignments]);

  const allAssigned = assignedSet.size === payload.total;

  useEffect(() => {
    amy.queueCue("amy_division_intro", {
      total: payload.total,
      children: payload.recipients,
    });
  }, [payload.total, payload.recipients]); // eslint-disable-line react-hooks/exhaustive-deps

  const assignToChild = useCallback(
    (childIdx: number) => {
      if (!selectedCookie || assignedSet.has(selectedCookie)) return;
      audioManager.unlockFromUserGesture();
      engagement?.recordInteraction();
      const current = assignments[childIdx] ?? [];
      if (current.length >= perChild) {
        setWrongShake(childIdx);
        engagement?.recordFailure();
        amy.queueCue("amy_fair_share");
        setHintsUsed((h) => h + 1);
        window.setTimeout(() => setWrongShake(null), 400);
        return;
      }
      setAssignments((prev) => ({
        ...prev,
        [childIdx]: [...current, selectedCookie],
      }));
      setSelectedCookie(null);
    },
    [selectedCookie, assignedSet, assignments, perChild, amy, engagement],
  );

  useEffect(() => {
    if (!allAssigned) return;
    const counts = Object.values(assignments).map((a) => a.length);
    const fair = counts.every((c) => c === perChild);
    if (!fair) {
      amy.queueCue("amy_fair_share");
      return;
    }
    setShowEquation(true);
    setCelebrate(true);
    amy.queueCue("amy_great_job");
    const t = window.setTimeout(() => onComplete(hintsUsed), 2400);
    return () => window.clearTimeout(t);
  }, [allAssigned, assignments, perChild, hintsUsed, onComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PlaygroundAmyShell
        messageKey={allAssigned ? "amy_great_job" : "amy_division_intro"}
        messageVars={{ total: payload.total, children: payload.recipients }}
        muted={amy.muted}
        onToggleMute={() => amy.setMuted(!amy.muted)}
        speaking={amy.speaking}
        engagement={engagement}
        accentColor={accentColor}
      />

      {/* Cookie tray */}
      <div
        className="rounded-xl p-3 mb-3 flex flex-wrap gap-1 justify-center min-h-[56px]"
        style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
      >
        <span className="w-full text-[10px] font-bold text-white/40 text-center mb-1">🍪 Tray</span>
        {cookies.map(
          (id) =>
            !assignedSet.has(id) && (
              <button
                key={id}
                type="button"
                onClick={() => {
                  audioManager.unlockFromUserGesture();
                  setSelectedCookie(id);
                }}
                className="rounded-lg transition-all"
                style={{
                  outline: selectedCookie === id ? `2px solid ${accentColor}` : "none",
                  transform: selectedCookie === id ? "scale(1.1)" : "scale(1)",
                }}
              >
                <LivingPlaygroundObject
                  kind={payload.objectKind}
                  size={32}
                  interactive={false}
                  childId={childId}
                />
              </button>
            ),
        )}
      </div>

      {/* Children */}
      <div
        className="flex flex-wrap justify-center gap-2 mb-2"
        style={{ maxWidth: "100%" }}
      >
        {Array.from({ length: payload.recipients }).map((_, childIdx) => (
          <motion.button
            key={childIdx}
            type="button"
            onClick={() => assignToChild(childIdx)}
            animate={wrongShake === childIdx ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }}
            className="rounded-xl p-2 min-h-[80px] min-w-[80px] flex flex-col items-center"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: `2px dashed ${accentColor}44`,
            }}
          >
            <span className="text-2xl mb-1">🧒</span>
            <div className="flex flex-wrap gap-0.5 justify-center">
              {(assignments[childIdx] ?? []).map((cid) => (
                <LivingPlaygroundObject
                  key={cid}
                  kind={payload.objectKind}
                  size={20}
                  motionTrigger="collect"
                  childId={childId}
                />
              ))}
            </div>
            <span className="text-[9px] text-white/30 mt-1">
              {(assignments[childIdx] ?? []).length}/{perChild}
            </span>
          </motion.button>
        ))}
      </div>

      <ConfettiCelebration active={celebrate} color={accentColor} />

      <AnimatePresence>
        {showEquation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <EquationMorph
              equation={`${payload.total} ÷ ${payload.recipients} = ${perChild}`}
              color={accentColor}
              reduced={reduced}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {selectedCookie && !allAssigned && (
        <p className="text-center text-[10px] text-white/50 mt-2">
          Tap a child to share the cookie 🍪
        </p>
      )}
    </div>
  );
}
