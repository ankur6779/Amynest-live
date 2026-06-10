import type { ObjectKind } from "@workspace/math-playground";
import type { ObjectAnimationPreset } from "./types";

const PRESETS: ObjectAnimationPreset[] = [
  {
    kind: "apple",
    triggers: {
      tap: ["jump", "smile"],
      collect: ["bounce"],
      correct: ["jump", "smile"],
      idle_wiggle: ["bounce"],
    },
  },
  {
    kind: "cookie",
    triggers: {
      tap: ["wobble", "spin"],
      collect: ["spin"],
      correct: ["wobble"],
      idle_wiggle: ["wobble"],
    },
  },
  {
    kind: "flower",
    triggers: {
      tap: ["bloom", "sparkle"],
      collect: ["bloom"],
      correct: ["sparkle"],
      idle_wiggle: ["bloom"],
    },
  },
  {
    kind: "toy",
    triggers: {
      tap: ["spin", "hop"],
      collect: ["hop"],
      correct: ["spin"],
      idle_wiggle: ["hop"],
    },
  },
  {
    kind: "star",
    triggers: {
      tap: ["twinkle", "burst"],
      collect: ["burst"],
      correct: ["twinkle", "burst"],
      idle_wiggle: ["twinkle"],
    },
  },
  {
    kind: "block",
    triggers: {
      tap: ["bounce"],
      collect: ["bounce"],
      correct: ["bounce"],
      idle_wiggle: ["bounce"],
    },
  },
];

const PRESET_MAP = new Map<ObjectKind, ObjectAnimationPreset>(
  PRESETS.map((p) => [p.kind, p]),
);

export function getObjectAnimationPreset(kind: ObjectKind): ObjectAnimationPreset {
  return (
    PRESET_MAP.get(kind) ?? {
      kind,
      triggers: { tap: ["bounce"], idle_wiggle: ["bounce"] },
    }
  );
}

export function pickObjectAnimation(
  kind: ObjectKind,
  trigger: keyof ObjectAnimationPreset["triggers"],
  seed = Date.now(),
): string {
  const preset = getObjectAnimationPreset(kind);
  const variants = preset.triggers[trigger] ?? preset.triggers.tap ?? ["bounce"];
  return variants[Math.abs(seed) % variants.length] ?? "bounce";
}
