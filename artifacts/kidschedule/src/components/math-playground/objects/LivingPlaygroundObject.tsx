import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  pickObjectAnimation,
  type ObjectAnimationTrigger,
} from "@workspace/math-playground-engagement";
import type { ObjectKind } from "@workspace/math-playground";
import { useReducedMotion } from "@/lib/reduced-motion";
import { PlaygroundObject } from "../shared/PlaygroundObject";
import { isMpLivingObjectsEnabled } from "../lib/feature-flags";
import { trackPlaygroundEvent } from "../lib/playground-analytics";
import { OBJECT_MOTION_VARIANTS, motionDurationMs } from "./object-motion-variants";

interface LivingPlaygroundObjectProps {
  kind: ObjectKind;
  size?: number;
  collected?: boolean;
  onTap?: () => void;
  interactive?: boolean;
  style?: React.CSSProperties;
  className?: string;
  /** Bump to replay tap delight animation */
  delightKey?: number;
  motionTrigger?: ObjectAnimationTrigger;
  childId?: number;
}

export function LivingPlaygroundObject({
  delightKey,
  motionTrigger,
  childId = 0,
  onTap,
  ...props
}: LivingPlaygroundObjectProps) {
  const enabled = isMpLivingObjectsEnabled();
  const reduced = useReducedMotion();
  const [activeAnim, setActiveAnim] = useState<string | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playAnimation = (trigger: ObjectAnimationTrigger, seed?: number) => {
    if (!enabled || reduced) return;
    const anim = pickObjectAnimation(props.kind, trigger, seed);
    setActiveAnim(anim);
    window.setTimeout(() => setActiveAnim(null), motionDurationMs(anim));
  };

  useEffect(() => {
    if (!enabled || reduced || props.collected) return;
    if (!props.interactive && delightKey === undefined) return;

    idleTimerRef.current = setInterval(() => {
      if (!props.collected) {
        playAnimation("idle_wiggle", Date.now());
      }
    }, 6_000);

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [enabled, reduced, props.collected, props.interactive, props.kind, delightKey]);

  useEffect(() => {
    if (motionTrigger) playAnimation(motionTrigger);
  }, [motionTrigger, props.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (delightKey !== undefined && delightKey > 0) {
      playAnimation(props.collected ? "collect" : "tap", delightKey);
      if (enabled && childId > 0) {
        trackPlaygroundEvent("object_delight_tap", childId, { kind: props.kind });
      }
    }
  }, [delightKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!enabled) {
    return <PlaygroundObject {...props} onTap={onTap} />;
  }

  const variant = activeAnim ? OBJECT_MOTION_VARIANTS[activeAnim] : undefined;

  return (
    <motion.div
      animate={variant}
      style={{ display: "inline-flex" }}
      onClick={(e) => e.stopPropagation()}
    >
      <PlaygroundObject
        {...props}
        onTap={() => {
          playAnimation("tap");
          onTap?.();
        }}
      />
    </motion.div>
  );
}
