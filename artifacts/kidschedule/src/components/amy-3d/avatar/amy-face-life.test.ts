import { describe, expect, it } from "vitest";
import { expressionForState, AMY_EXPRESSION_PRESETS } from "@/components/amy-3d/avatar/expression-presets";
import { createPose } from "@/components/amy-3d/avatar/pose";
import { AMY_FACE_LANDMARKS } from "@/components/amy-3d/avatar/procedural-face";
import type { FaceDriver } from "@/components/amy-3d/avatar/face-driver";
import { HybridFaceDriver } from "@/components/amy-3d/avatar/hybrid-face-driver";
import { MorphTargetManager } from "@/components/amy-3d/avatar/visemes";
import {
  createOrganicPhases,
  fbm2D,
  organic,
  valueNoise2D,
} from "@/components/amy-3d/avatar/organic-noise";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { blinkSchedule } from "@/lib/amy/character/amy-blink-schedule";
import {
  AMY_BLINK_CLOSE_MS,
  AMY_BLINK_INTERVAL_MAX_MS,
  AMY_BLINK_INTERVAL_MIN_MS,
} from "@/lib/amy/character/amy-character-constants";

const DEG = Math.PI / 180;

describe("Amy face polish — smile targets", () => {
  it("uses production smile intensities", () => {
    expect(expressionForState("celebrating").smile).toBeCloseTo(0.25, 5);
    expect(expressionForState("listening").smile).toBeCloseTo(0.15, 5);
    expect(expressionForState("thinking").smile).toBeCloseTo(0.1, 5);
    // Talking base is dynamic — energy lifts it in compose.
    expect(expressionForState("speaking").smile).toBeGreaterThan(0.1);
    expect(expressionForState("speaking").smile).toBeLessThan(0.25);
  });

  it("keeps smile drift on every state so smile is never static", () => {
    const states: Amy3DState[] = [
      "idle",
      "listening",
      "thinking",
      "speaking",
      "celebrating",
      "encouraging",
    ];
    for (const s of states) {
      expect(expressionForState(s).smile).toBeGreaterThan(0);
      expect(expressionForState(s).smileDrift).toBeGreaterThan(0);
    }
  });

  it("caps procedural head tilt near 1°", () => {
    for (const s of Object.keys(AMY_EXPRESSION_PRESETS) as Amy3DState[]) {
      expect(Math.abs(AMY_EXPRESSION_PRESETS[s].headTilt)).toBeLessThanOrEqual(1.1 * DEG);
      expect(Math.abs(AMY_EXPRESSION_PRESETS[s].lean)).toBeLessThanOrEqual(1.1 * DEG);
    }
  });

  it("enables listening nods, thinking glance, speech eye react", () => {
    expect(expressionForState("listening").microNod).toBe(true);
    expect(expressionForState("thinking").thinkingGlance).toBe(true);
    expect(expressionForState("speaking").speechEyeReact).toBe(true);
    expect(expressionForState("idle").thinkingGlance).toBe(false);
  });
});

describe("Amy face polish — organic noise", () => {
  it("returns bounded noise and desynced phases", () => {
    const a = valueNoise2D(0.3, 0.7, 1);
    const b = fbm2D(0.3, 0.7, 1, 3);
    expect(a).toBeGreaterThanOrEqual(-1.01);
    expect(a).toBeLessThanOrEqual(1.01);
    expect(b).toBeGreaterThanOrEqual(-1.01);
    expect(b).toBeLessThanOrEqual(1.01);

    const p1 = createOrganicPhases();
    const p2 = createOrganicPhases();
    // Extremely unlikely all six match — phases are independent.
    const same =
      p1.breath === p2.breath &&
      p1.sway === p2.sway &&
      p1.smile === p2.smile &&
      p1.eyes === p2.eyes;
    expect(same).toBe(false);

    const s0 = organic(0, p1.breath, 0.2, 11);
    const s1 = organic(1.5, p1.breath, 0.2, 11);
    expect(s0).not.toBe(s1);
  });
});

describe("Amy face polish — FaceDriver hybrid", () => {
  it("routes blink/smile/mouth/cheek/eyeOpen to procedural when morphs empty", () => {
    const morph = new MorphTargetManager();
    const calls = {
      blink: 0,
      smile: 0,
      mouth: 0,
      gaze: 0,
      highlight: 0,
      cheek: 0,
      eyeOpen: 0,
    };
    const procedural = {
      kind: "procedural" as const,
      hasBlink: true,
      hasMouth: true,
      hasSmile: true,
      setBlink: () => {
        calls.blink++;
      },
      setSmile: () => {
        calls.smile++;
      },
      lerpSmile: () => {
        calls.smile++;
      },
      setMouthOpen: () => {
        calls.mouth++;
      },
      setEyeHighlight: () => {
        calls.highlight++;
      },
      setEyeOpen: () => {
        calls.eyeOpen++;
      },
      setCheekLift: () => {
        calls.cheek++;
      },
      setGaze: () => {
        calls.gaze++;
      },
      dispose: () => {},
    } satisfies FaceDriver;

    const hybrid = new HybridFaceDriver(morph, procedural as never);
    hybrid.setBlink(1);
    hybrid.setSmile(0.4);
    hybrid.setMouthOpen(0.5);
    hybrid.setGaze({ eyeYaw: 0.01, eyePitch: 0 });
    hybrid.setEyeHighlight(1.05);
    hybrid.setCheekLift(0.3);
    hybrid.setEyeOpen(0.96);

    expect(calls.blink).toBe(1);
    expect(calls.smile).toBe(1);
    expect(calls.mouth).toBe(1);
    expect(calls.gaze).toBe(1);
    expect(calls.highlight).toBe(1);
    expect(calls.cheek).toBe(1);
    expect(calls.eyeOpen).toBe(1);
  });
});

describe("Amy face polish — landmarks + pose", () => {
  it("includes cheek landmarks under the eyes", () => {
    expect(AMY_FACE_LANDMARKS.leftCheek.y).toBeLessThan(AMY_FACE_LANDMARKS.leftEye.y);
    expect(AMY_FACE_LANDMARKS.rightCheek.y).toBeLessThan(AMY_FACE_LANDMARKS.rightEye.y);
  });

  it("keeps eye/mouth landmarks on the camera-facing Head-local −Z face shell", () => {
    expect(AMY_FACE_LANDMARKS.leftEye.z).toBeLessThan(-0.25);
    expect(AMY_FACE_LANDMARKS.rightEye.z).toBeLessThan(-0.25);
    expect(AMY_FACE_LANDMARKS.mouth.z).toBeLessThan(-0.25);
    // Must sit on painted eyes, not the visor/forehead (runtime: y≈0.32 was too high).
    expect(AMY_FACE_LANDMARKS.leftEye.y).toBeGreaterThan(0.15);
    expect(AMY_FACE_LANDMARKS.leftEye.y).toBeLessThan(0.24);
    expect(AMY_FACE_LANDMARKS.mouth.y).toBeLessThan(AMY_FACE_LANDMARKS.leftEye.y);
  });

  it("creates face-life + energy + presence slices on the shared pose buffer", () => {
    const pose = createPose();
    expect(pose.face.smileBase).toBeGreaterThan(0);
    expect(pose.face.eyeOpen).toBe(1);
    expect(pose.idle.gestureAmp).toBe(1);
    expect(pose.presence.phase).toBe("none");
    expect(pose.presence.anticipate).toBe(0);
    pose.energy.level = 0.4;
    expect(pose.energy.level).toBe(0.4);
  });
});

describe("Amy face polish — procedural renderer visibility", () => {
  it("draws nothing: no lid/mouth meshes on the head", async () => {
    const THREE = await import("three");
    const { ProceduralFaceDriver } = await import(
      "@/components/amy-3d/avatar/procedural-face"
    );
    const head = new THREE.Object3D();
    head.name = "Head";
    const face = new ProceduralFaceDriver(head);
    expect(face.hasBlink).toBe(false);
    expect(face.hasMouth).toBe(false);

    const idle = face.getOverlayState();
    expect(idle.lidVisible).toBe(false);
    expect(idle.mouthOpenVisible).toBe(false);
    expect(head.getObjectByName("AmyProceduralFace")).toBeTruthy();
    expect(head.getObjectByName("AmyProcLid_L")).toBeFalsy();
    expect(head.getObjectByName("AmyProcMouthOpen")).toBeFalsy();

    face.setBlink(1);
    face.setMouthOpen(0.7);
    expect(face.getOverlayState().lidVisible).toBe(false);
    expect(face.getOverlayState().mouthOpenVisible).toBe(false);
    expect(head.getObjectByName("AmyProcMouthOpen")).toBeFalsy();
    face.dispose();
  });
});

describe("Amy character polish — emotional presence contract", () => {
  it("keeps thinking as a once-per-cycle glance flag", () => {
    expect(expressionForState("thinking").thinkingGlance).toBe(true);
    expect(expressionForState("listening").microNod).toBe(true);
    expect(expressionForState("speaking").speechEyeReact).toBe(true);
  });

  it("uses warm smile targets for child engagement", () => {
    expect(expressionForState("celebrating").smile).toBeCloseTo(0.25, 5);
    expect(expressionForState("listening").smile).toBeCloseTo(0.15, 5);
    expect(expressionForState("thinking").smile).toBeCloseTo(0.1, 5);
  });
});

describe("Amy face polish — 2D blink schedule alignment", () => {
  it("uses 3–6s idle interval and 120–180ms close", () => {
    expect(AMY_BLINK_INTERVAL_MIN_MS).toBe(3000);
    expect(AMY_BLINK_INTERVAL_MAX_MS).toBe(6000);
    expect(AMY_BLINK_CLOSE_MS).toBeGreaterThanOrEqual(120);
    expect(AMY_BLINK_CLOSE_MS).toBeLessThanOrEqual(180);
  });

  it("matches state intent for listening / thinking / talking", () => {
    const listening = blinkSchedule("listening");
    const thinking = blinkSchedule("thinking");
    const talking = blinkSchedule("talking");
    const idle = blinkSchedule("idle");
    expect(listening.minMs).toBeLessThanOrEqual(3500);
    expect(thinking.minMs).toBeGreaterThan(idle.minMs);
    expect(talking.minMs).toBeGreaterThanOrEqual(idle.minMs);
  });
});
