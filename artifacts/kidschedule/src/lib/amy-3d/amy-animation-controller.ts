import {
  LoopOnce,
  LoopRepeat,
  type AnimationAction,
  type AnimationClip,
} from "three";
import type { Amy3DState } from "./use-amy-3d-state";
import {
  AMY_GLTF_CLIP,
  AMY_GLTF_CLIP_FOR_STATE,
  AMY_GLTF_FADE_SEC,
  AMY_GLTF_LOOPING_CLIPS,
  AMY_SESSION_START_FADE_SEC,
  type AmyGltfClipName,
} from "./amy-gltf-clips";

let clipsLogged = false;

/** Log detected GLB clip names once per page load (dev-friendly). */
export function logAmyGltfClipsOnce(clips: AnimationClip[]): void {
  if (clipsLogged || clips.length === 0) return;
  clipsLogged = true;
  console.info(
    "[amy-3d] GLB animation clips:",
    clips.map((c) => `${c.name} (${c.duration.toFixed(1)}s)`),
  );
}

export function resolveAmyGltfClipName(
  clips: AnimationClip[],
  preferred: AmyGltfClipName,
): string | null {
  const byName = clips.find((c) => c.name === preferred);
  if (byName) return byName.name;
  const semantic = Object.values(AMY_GLTF_CLIP).find((name) =>
    clips.some((c) => c.name === name),
  );
  return semantic ?? clips[0]?.name ?? null;
}

export interface AmyAnimationStep {
  name: string;
  loop?: boolean;
}

/**
 * Single AnimationMixer driver — crossfade, loop, once, and queued chains.
 * No React; consumed by useAmyAnimationState.
 */
export class AmyAnimationController {
  private active: string | null = null;
  private chainCleanup: (() => void) | null = null;

  constructor(
    private readonly actions: Record<string, AnimationAction | null>,
    private readonly clips: AnimationClip[],
    private readonly fadeSec = AMY_GLTF_FADE_SEC,
  ) {}

  getActive(): string | null {
    return this.active;
  }

  hasClip(name: AmyGltfClipName | string): boolean {
    return Boolean(this.actions[name]);
  }

  dispose(): void {
    this.clearChain();
    for (const action of Object.values(this.actions)) {
      action?.fadeOut(this.fadeSec);
    }
    this.active = null;
  }

  play(name: string, loop = true, fadeSec = this.fadeSec): AnimationAction | null {
    const action = this.actions[name];
    if (!action) return null;
    action.reset();
    action.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.fadeIn(fadeSec).play();
    this.active = name;
    return action;
  }

  crossfade(name: string, loop = true, fadeSec = this.fadeSec): AnimationAction | null {
    if (this.active === name) {
      const current = this.actions[name];
      if (current && !current.isRunning()) {
        return this.play(name, loop, fadeSec);
      }
      return current;
    }
    this.clearChain();
    for (const [key, action] of Object.entries(this.actions)) {
      if (key !== name) action?.fadeOut(fadeSec);
    }
    return this.play(name, loop, fadeSec);
  }

  once(name: string, onFinished?: () => void, fadeSec = this.fadeSec): AnimationAction | null {
    this.clearChain();
    for (const action of Object.values(this.actions)) {
      action?.fadeOut(fadeSec);
    }
    const action = this.play(name, false, fadeSec);
    if (!action || !onFinished) return action;

    const mixer = action.getMixer();
    const handler = (event: { action: AnimationAction }) => {
      if (event.action !== action) return;
      mixer.removeEventListener("finished", handler);
      onFinished();
    };
    mixer.addEventListener("finished", handler);
    this.chainCleanup = () => mixer.removeEventListener("finished", handler);
    return action;
  }

  queue(steps: AmyAnimationStep[], onComplete?: () => void): void {
    this.clearChain();
    let index = 0;

    const runNext = (): void => {
      if (index >= steps.length) {
        onComplete?.();
        return;
      }
      const step = steps[index++];
      if (step.loop) {
        this.crossfade(step.name, true);
        runNext();
        return;
      }
      this.once(step.name, runNext);
    };

    runNext();
  }

  private clearChain(): void {
    this.chainCleanup?.();
    this.chainCleanup = null;
  }
}

export interface AmyAnimationStateInput {
  controller: AmyAnimationController | null;
  clips: AnimationClip[];
  state: Amy3DState;
  reduced: boolean;
  getState: () => Amy3DState;
  /** Speech Coach pre-session: loop warmup instead of static idle. */
  waitingForSession?: boolean;
}

function playSpeechCoachGreeting(
  controller: AmyAnimationController,
  clips: AnimationClip[],
): boolean {
  const wave = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP.wave);
  const warmup = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP.warmup);
  if (wave && warmup) {
    controller.queue([
      { name: wave, loop: false },
      { name: warmup, loop: true },
    ]);
    return true;
  }
  if (warmup) {
    controller.crossfade(warmup, true);
    return true;
  }
  return false;
}

/** Map Amy3DState → skeletal clip playback (warmup loop pre-session, talk on speak). */
export function applyAmyAnimationState(input: AmyAnimationStateInput): boolean {
  const { controller, clips, state, reduced, getState, waitingForSession } = input;
  if (!controller || reduced || clips.length === 0) {
    controller?.dispose();
    return false;
  }

  if (state === "speaking") {
    const talk = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP.talk);
    if (!talk) return true;
    controller.crossfade(talk, true, AMY_SESSION_START_FADE_SEC);
    return true;
  }

  if (waitingForSession && state === "idle") {
    const warmup = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP.warmup);
    if (warmup) {
      controller.crossfade(warmup, true);
      return true;
    }
  }

  if (state === "celebrating") {
    const clip = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP.celebrate);
    if (!clip) return true;
    controller.once(clip, () => {
      const current = getState();
      if (current === "celebrating" || current === "idle") {
        const idle = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP.idle);
        if (idle) controller.crossfade(idle, true);
      }
    });
    return true;
  }

  if (state === "encouraging") {
    const clip = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP.cheer);
    if (!clip) return true;
    controller.once(clip, () => {
      const current = getState();
      if (current === "encouraging" || current === "idle") {
        const idle = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP.idle);
        if (idle) controller.crossfade(idle, true);
      }
    });
    return true;
  }

  const target = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP_FOR_STATE[state]);
  if (!target) return true;
  const loop = AMY_GLTF_LOOPING_CLIPS.has(target as AmyGltfClipName);
  controller.crossfade(target, loop);
  return true;
}

export { playSpeechCoachGreeting };
