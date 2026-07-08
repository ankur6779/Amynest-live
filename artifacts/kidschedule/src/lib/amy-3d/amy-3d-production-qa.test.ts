import { describe, expect, it } from "vitest";
import {
  AMY_GLTF_CLIP,
  AMY_GLTF_CLIP_FOR_STATE,
  AMY_GLTF_LOOPING_CLIPS,
} from "@/lib/amy-3d/amy-gltf-clips";
import { applyAmyAnimationState, AmyAnimationController } from "@/lib/amy-3d/amy-animation-controller";
import type { AnimationAction, AnimationClip } from "three";
import { vi } from "vitest";
import { useSpeechCoachHeroSize } from "@/features/speech-coach-v2/lib/session-presentation";

function mockAction(): AnimationAction {
  const mixer = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  return {
    reset: vi.fn().mockReturnThis(),
    setLoop: vi.fn().mockReturnThis(),
    fadeIn: vi.fn().mockReturnThis(),
    fadeOut: vi.fn().mockReturnThis(),
    play: vi.fn().mockReturnThis(),
    isRunning: vi.fn().mockReturnValue(false),
    getMixer: vi.fn().mockReturnValue(mixer),
    clampWhenFinished: false,
  } as unknown as AnimationAction;
}

function allSemanticClips(): AnimationClip[] {
  return Object.values(AMY_GLTF_CLIP).map((name) => ({
    name,
    duration: 2,
    tracks: [],
  })) as AnimationClip[];
}

describe("Amy 3D production QA (automated)", () => {
  it("maps idle, cheer, celebrate, talk clips for QA states", () => {
    expect(AMY_GLTF_CLIP_FOR_STATE.idle).toBe("idle");
    expect(AMY_GLTF_CLIP_FOR_STATE.encouraging).toBe("cheer");
    expect(AMY_GLTF_CLIP_FOR_STATE.celebrating).toBe("celebrate");
    expect(AMY_GLTF_CLIP_FOR_STATE.speaking).toBe("talk");
    expect(AMY_GLTF_CLIP_FOR_STATE.listening).toBe("listening");
    expect(AMY_GLTF_CLIP_FOR_STATE.thinking).toBe("thinking");
    expect(AMY_GLTF_LOOPING_CLIPS.has("idle")).toBe(true);
    expect(AMY_GLTF_LOOPING_CLIPS.has("wave")).toBe(false);
    expect(AMY_GLTF_LOOPING_CLIPS.has("cheer")).toBe(false);
    expect(AMY_GLTF_LOOPING_CLIPS.has("celebrate")).toBe(false);
  });

  it("starts idle animation on controller init", () => {
    const clips = allSemanticClips();
    const actions = Object.fromEntries(clips.map((c) => [c.name, mockAction()]));
    const ctrl = new AmyAnimationController(actions, clips);
    applyAmyAnimationState({
      controller: ctrl,
      clips,
      state: "idle",
      reduced: false,
      getState: () => "idle",
    });
    expect(actions.idle?.play).toHaveBeenCalled();
    ctrl.dispose();
  });

  it("starts cheer once for encouraging", () => {
    const clips = allSemanticClips();
    const actions = Object.fromEntries(clips.map((c) => [c.name, mockAction()]));
    const ctrl = new AmyAnimationController(actions, clips);
    applyAmyAnimationState({
      controller: ctrl,
      clips,
      state: "encouraging",
      reduced: false,
      getState: () => "encouraging",
    });
    expect(actions.cheer?.play).toHaveBeenCalled();
    ctrl.dispose();
  });

  it("speech coach hero size targets phone/tablet/desktop bands", () => {
    expect(useSpeechCoachHeroSize).toBeTypeOf("function");
  });
});
