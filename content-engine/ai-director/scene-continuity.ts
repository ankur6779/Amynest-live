/**
 * Scene continuity spine — Pixar-style match across cuts.
 * Direction-only: feeds AI Director prompts. No rendering changes.
 */

import type { TransitionType } from "../types/storyboard.js";
import type {
  DirectorBeatRole,
  DirectorCameraMovement,
  EmotionArcStage,
  SceneContinuityState,
  SceneCutBridge,
  SpeechState,
  TargetEmotionLabel,
  VisualContinuityBible,
} from "./types.js";

const ARC_BY_ROLE: Record<DirectorBeatRole, EmotionArcStage> = {
  hook: "Curious",
  problem: "Thinking",
  emotion: "Understanding",
  feature: "Understanding",
  transformation: "Success",
  cta: "Celebration",
  "end-card": "Celebration",
  bridge: "Thinking",
};

const SPEECH_BY_ROLE: Record<DirectorBeatRole, SpeechState> = {
  hook: "reacting",
  problem: "listening",
  emotion: "listening",
  feature: "listening", // child listens; Amy may speak — note in hand/mentor
  transformation: "speaking",
  cta: "speaking",
  "end-card": "silent",
  bridge: "reacting",
};

const HAND_PROP_BY_ROLE: Record<DirectorBeatRole, string> = {
  hook: "Pencil in RIGHT hand, tip on notebook center; notebook flat on desk, spine camera-left",
  problem: "Pencil still in RIGHT hand (same grip); notebook unmoved; cup/toy stays desk camera-left if present",
  emotion: "Pencil lowers but stays RIGHT hand; notebook same place; no teleport props",
  feature:
    "Tablet/device enters SAME desk zone (center-right); pencil rests notebook edge RIGHT side; Amy's hand open-palm near child, not swapping prop sides",
  transformation:
    "Device or notebook still same side; celebration hands free but props remain where left — no magically relocated cup/toy",
  cta: "No new homework props; mentor hands open invite; prior desk world soft in depth unchanged",
  "end-card": "Brand end card — no character prop teleport from prior world",
  bridge: "Carry previous prop side and hand exactly",
};

const BODY_BY_ROLE: Record<DirectorBeatRole, string> = {
  hook: "Child seated desk, torso angled slightly camera-right; shoulders soft-forward",
  problem: "Same seat; torso still camera-right; weight shift only — no teleport to standing",
  emotion: "Same seat; chest opens a degree; orientation still camera-right unless looking to partner",
  feature:
    "Child remains seated same chair; Amy AI enters camera-left of child at child height and KNEELS/leans — hold kneel until motivated rise",
  transformation:
    "If Amy was kneeling, she may rise only now (motivation: celebrate); child may stand or stay seated — choose ONE and hold",
  cta: "Amy AI standing/warm center — only after celebration motivation; never snap from kneel without the rise beat",
  "end-card": "Settled brand hold",
  bridge: "Preserve prior body orientation; ease only",
};

const EYE_EXIT_BY_ROLE: Record<DirectorBeatRole, string> = {
  hook: "looking DOWN-LEFT into notebook (screen-left)",
  problem: "still looking DOWN-LEFT / toward partner on camera-left — MATCH prior eye-line start",
  emotion: "eye-line lifts along SAME axis toward partner (camera-left → center) — eyeline cut friendly",
  feature: "eyes to Amy (camera-left of child) then to tablet center-right — continuous look path",
  transformation: "eyes to partner then soft camera — start MATCHING end of prior look",
  cta: "eyes to viewer; if prior was partner, motivate glance through camera",
  "end-card": "brand center focus",
  bridge: "match previous eye-line exactly on cut-in",
};

const POSITION_BY_ROLE: Record<DirectorBeatRole, string> = {
  hook: "Child mid/right of frame at study desk; window key camera-LEFT; empty mentor space camera-LEFT of child",
  problem: "SAME desk geography — child mid/right; window still camera-LEFT; no room swap",
  emotion: "SAME desk; tighter lens only — characters do not jump sides",
  feature:
    "SAME desk; Amy occupies the reserved camera-LEFT mentor slot at child height; child still mid/right",
  transformation: "SAME room; frame may open but screen direction L→R preserved; no character side flip",
  cta: "Mentor forward; home world continuous in soft depth — not a new planet",
  "end-card": "Brand card; prior wardrobe/world not redesigned",
  bridge: "Hold prior geography",
};

const SPEED_BY_ROLE: Record<DirectorBeatRole, SceneContinuityState["movementSpeed"]> = {
  hook: "slow",
  problem: "slow",
  emotion: "measured",
  feature: "measured",
  transformation: "lively",
  cta: "measured",
  "end-card": "still",
  bridge: "measured",
};

const MOMENTUM_BY_MOVEMENT: Record<
  DirectorCameraMovement,
  SceneContinuityState["cameraMomentum"]
> = {
  "static-hold": "hold",
  "slow-push-in": "pushing-in",
  "slow-dolly": "pushing-in",
  "gentle-pull-out": "pulling-out",
  tracking: "tracking-right",
  orbit: "orbiting",
  "tilt-reveal": "pushing-in",
  "parallax-drift": "tracking-right",
};

/** Ordered emotion arc — never random-jump backward. */
const ARC_ORDER: EmotionArcStage[] = [
  "Curious",
  "Thinking",
  "Understanding",
  "Success",
  "Celebration",
];

export function emotionArcStageForRole(role: DirectorBeatRole): EmotionArcStage {
  return ARC_BY_ROLE[role];
}

export function buildSceneContinuityState(input: {
  role: DirectorBeatRole;
  index: number;
  lightingKey: string;
  cameraMovement: DirectorCameraMovement;
  emotionLabel: TargetEmotionLabel;
  previous?: SceneContinuityState;
}): SceneContinuityState {
  const role = input.role;
  let arc = ARC_BY_ROLE[role];
  // Never regress arc stage vs previous (bridge/end-card may hold).
  if (input.previous && role !== "end-card") {
    const prevIdx = ARC_ORDER.indexOf(input.previous.emotionArc);
    const nextIdx = ARC_ORDER.indexOf(arc);
    if (nextIdx < prevIdx) {
      arc = input.previous.emotionArc;
    }
  }

  const eyeDirection = input.previous
    ? `${EYE_EXIT_BY_ROLE[role]} | CUT-IN MATCH: begin on prior exit eye-line (${input.previous.eyeDirection})`
    : EYE_EXIT_BY_ROLE[role];

  const bodyOrientation = input.previous
    ? `${BODY_BY_ROLE[role]} | Carry: ${shortCarry(input.previous.bodyOrientation)}`
    : BODY_BY_ROLE[role];

  const characterPosition = input.previous
    ? `${POSITION_BY_ROLE[role]} | Geography lock from prior: window camera-LEFT, child mid/right unless end-card`
    : POSITION_BY_ROLE[role];

  const handPosition = input.previous
    ? `${HAND_PROP_BY_ROLE[role]} | HAND/PROP LOCK from prior beat — same hand, same side`
    : HAND_PROP_BY_ROLE[role];

  const amyPose =
    role === "feature"
      ? "Amy AI kneeling/leaning at child height camera-LEFT of child — HOLD kneel"
      : role === "transformation"
        ? "Amy may rise from kneel only with celebration motivation; do not teleport standing"
        : role === "cta" || role === "end-card"
          ? "Amy warm standing invite — arrived via prior rise, not a snap"
          : input.previous?.amyPose ?? "Amy not yet in frame — reserve camera-LEFT mentor slot";

  return {
    characterPosition,
    eyeDirection,
    bodyOrientation,
    handPosition,
    objectPlacement: handPosition,
    lightingDirection: input.previous
      ? `${input.lightingKey} | LOCK window/key from camera-LEFT as prior (${input.previous.lightingDirection})`
      : `${input.lightingKey} | Key/window from camera-LEFT — lock for entire short`,
    emotionArc: arc,
    emotionLabel: input.emotionLabel,
    speechState: SPEECH_BY_ROLE[role],
    cameraMomentum: MOMENTUM_BY_MOVEMENT[input.cameraMovement],
    movementSpeed: SPEED_BY_ROLE[role],
    amyPose,
    screenDirection: "L→R",
  };
}

function shortCarry(text: string): string {
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

export function buildCutBridge(input: {
  fromRole: DirectorBeatRole;
  toRole: DirectorBeatRole | undefined;
  fromState: SceneContinuityState;
  toState?: SceneContinuityState;
}): SceneCutBridge {
  if (!input.toRole || !input.toState) {
    return {
      kind: "match-cut",
      editorTransition: "Fade",
      note: "Settle into final hold — match last eye-line and lighting; no reset",
      matchOn: ["eye-line", "lighting", "wardrobe"],
    };
  }

  const from = input.fromRole;
  const to = input.toRole;

  // Eyeline cut: struggle → hope / hope → mentor
  if (
    (from === "problem" && to === "emotion") ||
    (from === "emotion" && to === "feature") ||
    (from === "hook" && to === "problem")
  ) {
    return {
      kind: "eyeline-cut",
      editorTransition: "Cut",
      note: `EYELINE CUT: start next shot on the same look (${input.fromState.eyeDirection}). No random angle jump.`,
      matchOn: ["eye-line", "body orientation", "desk geography", "lighting side"],
    };
  }

  // Action cut into celebration
  if (from === "feature" && to === "transformation") {
    return {
      kind: "action-cut",
      editorTransition: "Cut",
      note: "ACTION CUT on the understanding micro-gesture (tap/nod/smile) into success — continue motion vector; no teleport.",
      matchOn: ["hand/prop side", "Amy kneel→motivated rise", "screen direction L→R"],
    };
  }

  // Motivated cut to CTA
  if (from === "transformation" && to === "cta") {
    return {
      kind: "motivated-cut",
      editorTransition: "Dissolve",
      note: "MOTIVATED CUT: celebration glance motivates Amy's invite; keep lighting side; no camera reset zoom.",
      matchOn: ["emotion arc Success→Celebration", "lighting", "wardrobe"],
    };
  }

  if (from === "cta" && to === "end-card") {
    return {
      kind: "match-cut",
      editorTransition: "Fade",
      note: "Soft brand wash — match color/lighting; no new character wardrobe.",
      matchOn: ["palette", "lighting"],
    };
  }

  // L-cut / J-cut audio-motivated (direction note for VO alignment)
  if (from === "hook" || to === "bridge") {
    return {
      kind: "l-cut",
      editorTransition: "Crossfade",
      note: "L-CUT feel: picture may lead while listening face continues; maintain eye-line and desk lock.",
      matchOn: ["eye-line", "body orientation", "objects"],
    };
  }

  if (to === "emotion" || to === "feature") {
    return {
      kind: "j-cut",
      editorTransition: "Crossfade",
      note: "J-CUT feel: next emotional/mentor energy may lead slightly; picture matches prior geography.",
      matchOn: ["desk geography", "lighting", "prop side"],
    };
  }

  return {
    kind: "match-cut",
    editorTransition: "Cut",
    note: `MATCH CUT: preserve position, eye-line, hands/props, lighting side. Avoid random zooms and character teleport.`,
    matchOn: ["character position", "eye-line", "hands", "objects", "lighting"],
  };
}

export function continuityPromptBlock(
  state: SceneContinuityState,
  cutIn: SceneCutBridge | undefined,
  cutOut: SceneCutBridge,
): string[] {
  return [
    "SCENE CONTINUITY LOCK (one continuous short — not disconnected AI shots):",
    `- Character position: ${state.characterPosition}`,
    `- Eye direction: ${state.eyeDirection}`,
    `- Body orientation: ${state.bodyOrientation}`,
    `- Hand position: ${state.handPosition}`,
    `- Object placement: ${state.objectPlacement}`,
    `- Lighting direction: ${state.lightingDirection}`,
    `- Emotion arc: ${state.emotionArc} (${state.emotionLabel}) — never random emotion jump`,
    `- Speech state: ${state.speechState}`,
    `- Camera momentum: ${state.cameraMomentum}`,
    `- Movement speed: ${state.movementSpeed}`,
    `- Amy pose lock: ${state.amyPose}`,
    `- Screen direction: ${state.screenDirection}`,
    cutIn
      ? `CUT IN (${cutIn.kind}): ${cutIn.note} | Match: ${cutIn.matchOn.join(", ")}`
      : "CUT IN: Opening establish — plant window camera-LEFT, child mid/right, props for the whole short.",
    `CUT OUT (${cutOut.kind}): ${cutOut.note}`,
    "FORBIDDEN: random angle jumps, random zooms, character teleporting, camera resets, prop hand-swaps, emotion whiplash.",
  ];
}

export function enrichBibleWithSpine(
  bible: VisualContinuityBible,
): VisualContinuityBible {
  return {
    ...bible,
    eyeLine:
      "Match eye-line across cuts: if looking left/down-left, next shot BEGINS looking left/down-left unless an eyeline motivate lifts along the same axis",
    cameraDirection:
      "Continue screen direction L→R; prefer match / eyeline / action / motivated cuts; never random angle jumps or camera resets",
    objectPlacement:
      "Book, cup, toy, desk, pencil: same hand, same side, same orientation unless a visible micro-action moves them",
    characterPositions:
      "Preserve seat/side geography; if Amy kneels, remain kneeling until a motivated rise (success/celebration)",
    emotionArc:
      "Curious → Thinking → Understanding → Success → Celebration — never random reverse jumps",
    speechContinuity:
      "Speech state carries: listening stays listening until a speaker beat; no silent talking heads",
  };
}

export function toEditorTransition(kind: SceneCutBridge["kind"]): TransitionType {
  const map: Record<SceneCutBridge["kind"], TransitionType> = {
    "match-cut": "Cut",
    "motivated-cut": "Dissolve",
    "action-cut": "Cut",
    "eyeline-cut": "Cut",
    "l-cut": "Crossfade",
    "j-cut": "Crossfade",
  };
  return map[kind];
}
