import { describe, expect, it, vi } from "vitest";
import {
  AMY_GLTF_CLIP,
  AMY_GLTF_CLIP_FOR_STATE,
  AMY_SESSION_START_FADE_SEC,
} from "./amy-gltf-clips";
import {
  AmyAnimationController,
  applyAmyAnimationState,
  playSpeechCoachGreeting,
  resolveAmyGltfClipName,
} from "./amy-animation-controller";
import type { AnimationAction, AnimationClip } from "three";

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

function mockClips(): AnimationClip[] {
  return Object.values(AMY_GLTF_CLIP).map((name) => ({
    name,
    duration: 2,
    tracks: [],
  })) as AnimationClip[];
}

describe("amy-animation-controller", () => {
  it("maps every Amy3DState to a resolvable clip", () => {
    const clips = mockClips();
    const states = [
      "idle",
      "listening",
      "thinking",
      "speaking",
      "celebrating",
      "encouraging",
    ] as const;
    for (const state of states) {
      const preferred = AMY_GLTF_CLIP_FOR_STATE[state];
      expect(resolveAmyGltfClipName(clips, preferred)).toBeTruthy();
    }
  });

  it("crossfades idle without throwing", () => {
    const clips = mockClips();
    const actions = Object.fromEntries(
      clips.map((c) => [c.name, mockAction()]),
    );
    const ctrl = new AmyAnimationController(actions, clips);
    expect(ctrl.crossfade("idle", true)).toBeTruthy();
    ctrl.dispose();
  });

  it("applyAmyAnimationState drives listening loop", () => {
    const clips = mockClips();
    const actions = Object.fromEntries(
      clips.map((c) => [c.name, mockAction()]),
    );
    const ctrl = new AmyAnimationController(actions, clips);
    const active = applyAmyAnimationState({
      controller: ctrl,
      clips,
      state: "listening",
      reduced: false,
      getState: () => "listening",
    });
    expect(active).toBe(true);
    expect(actions.listening?.play).toHaveBeenCalled();
  });

  it("pre-session idle loops warmup instead of static idle", () => {
    const clips = mockClips();
    const actions = Object.fromEntries(
      clips.map((c) => [c.name, mockAction()]),
    );
    const ctrl = new AmyAnimationController(actions, clips);
    applyAmyAnimationState({
      controller: ctrl,
      clips,
      state: "idle",
      reduced: false,
      getState: () => "idle",
      waitingForSession: true,
    });
    expect(actions.warmup?.play).toHaveBeenCalled();
    expect(actions.idle?.play).not.toHaveBeenCalled();
  });

  it("speaking crossfades to talk with session-start fade", () => {
    const clips = mockClips();
    const actions = Object.fromEntries(
      clips.map((c) => [c.name, mockAction()]),
    );
    const ctrl = new AmyAnimationController(actions, clips);
    ctrl.crossfade("warmup", true);
    applyAmyAnimationState({
      controller: ctrl,
      clips,
      state: "speaking",
      reduced: false,
      getState: () => "speaking",
    });
    expect(actions.talk?.fadeIn).toHaveBeenCalledWith(AMY_SESSION_START_FADE_SEC);
  });

  it("playSpeechCoachGreeting queues wave then warmup", () => {
    const clips = mockClips();
    const actions = Object.fromEntries(
      clips.map((c) => [c.name, mockAction()]),
    );
    const ctrl = new AmyAnimationController(actions, clips);
    const ok = playSpeechCoachGreeting(ctrl, clips);
    expect(ok).toBe(true);
    expect(actions.wave?.play).toHaveBeenCalled();
  });
});
