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
  AMY_GLTF_LOOPING_CLIPS,
  type AmyGltfClipName,
} from "./amy-gltf-clips";

const FADE_SEC = 0.35;

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
    private readonly fadeSec = FADE_SEC,
  ) {}

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

  play(name: string, loop = true): AnimationAction | null {
    const action = this.actions[name];
    if (!action) return null;
    action.reset();
    action.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.fadeIn(this.fadeSec).play();
    this.active = name;
    return action;
  }

  crossfade(name: string, loop = true): AnimationAction | null {
    if (this.active === name) {
      const current = this.actions[name];
      if (current && !current.isRunning()) {
        return this.play(name, loop);
      }
      return current;
    }
    this.clearChain();
    for (const [key, action] of Object.entries(this.actions)) {
      if (key !== name) action?.fadeOut(this.fadeSec);
    }
    return this.play(name, loop);
  }

  once(name: string, onFinished?: () => void): AnimationAction | null {
    this.clearChain();
    for (const action of Object.values(this.actions)) {
      action?.fadeOut(this.fadeSec);
    }
    const action = this.play(name, false);
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
}

/** Map Amy3DState → skeletal clip playback (warmup→talk, wave/celebrate once→idle). */
export function applyAmyAnimationState(input: AmyAnimationStateInput): boolean {
  const { controller, clips, state, reduced, getState } = input;
  if (!controller || reduced || clips.length === 0) {
    controller?.dispose();
    return false;
  }

  if (state === "speaking") {
    const talk = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP.talk);
    const warmup = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP.warmup);
    if (!talk) return true;

    if (warmup && controller.hasClip(warmup)) {
      controller.queue(
        [
          { name: warmup, loop: false },
          { name: talk, loop: true },
        ],
        () => {
          if (getState() === "speaking") controller.crossfade(talk, true);
        },
      );
    } else {
      controller.crossfade(talk, true);
    }
    return true;
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
    const clip = resolveAmyGltfClipName(clips, AMY_GLTF_CLIP.wave);
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
