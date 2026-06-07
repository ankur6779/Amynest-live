// AmyAvatar — single tier-aware entry point for rendering Amy.
//
//   tier="hero"  → live WebGL 3D (lazy-loaded three.js), with a 2D fallback
//                  while loading / when WebGL is unavailable / on error.
//   tier="icon"  → lightweight 2D Amy (the existing SVG, optionally a baked 3D
//                  image). NEVER mounts a live canvas, so it is safe to use in
//                  lists, headers, chat bubbles, etc.
//
// This keeps "live 3D only on hero" enforced in one place and guarantees small
// spots stay cheap on low-end Android WebView / iOS.

import { Component, lazy, Suspense, type ReactNode } from "react";
import { AmyIcon } from "@/components/amy-icon";
import { AmyPortrait } from "@/components/amy-3d/amy-portrait";
import { safeImport } from "@/lib/safe-import";
import { canRenderLive3D } from "@/lib/amy-3d/webgl-support";
import { AMY_MODEL_SRC, useAmyModelAvailable } from "@/lib/amy-3d/baked-avatar";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

const Amy3DStage = lazy(() =>
  safeImport(() => import("@/components/amy-3d/amy-3d-stage")),
);

// The only rigged model available today (amy.glb) is a generic Tripo head that
// is OFF-BRAND vs the premium purple-cap Amy. To keep ONE consistent Amy face
// everywhere (header, hero, onboarding, branding), we render the premium
// animated portrait on hero too and keep the live-3D path parked behind this
// flag. Flip to true once an on-brand rigged amy.glb is dropped in — the whole
// runtime animation system (blink/gaze/lip-sync) re-activates automatically.
const ENABLE_LIVE_3D = false;

export interface AmyAvatarProps {
  /** Visual mood of the head. Defaults to "idle". */
  state?: Amy3DState;
  /** Pixel size of the square avatar. */
  size: number;
  /** "hero" mounts live 3D; "icon" stays 2D. Defaults to "icon". */
  tier?: "hero" | "icon";
  /** Optional rigged .glb URL (Phase 3). */
  modelUrl?: string;
  /** Passed to the 2D fallback so it matches the surrounding design. */
  ring?: boolean;
  bounce?: boolean;
  className?: string;
}

// ── Error boundary: any failure inside the 3D stage drops to the 2D fallback ──
class Amy3DErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[amy-3d] live stage failed, using 2D fallback", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function AmyAvatar({
  state = "idle",
  size,
  tier = "icon",
  modelUrl,
  ring = false,
  bounce = false,
  className,
}: AmyAvatarProps) {
  const modelAvailable = useAmyModelAvailable();
  const iconFallback = (
    <AmyIcon size={size} ring={ring} bounce={bounce} className={className} />
  );

  // Small / non-hero spots stay 2D (the premium baked image via AmyIcon).
  if (tier !== "hero") {
    return iconFallback;
  }

  // Hero: prefer the live rigged 3D model when present + WebGL works.
  // Otherwise show the premium animated image portrait (never the old sphere).
  const portrait = <AmyPortrait state={state} size={size} className={className} />;

  if (ENABLE_LIVE_3D && modelAvailable && canRenderLive3D()) {
    return (
      <Amy3DErrorBoundary fallback={portrait}>
        <Suspense fallback={portrait}>
          <Amy3DStage
            state={state}
            size={size}
            modelUrl={modelUrl ?? AMY_MODEL_SRC}
            className={className}
          />
        </Suspense>
      </Amy3DErrorBoundary>
    );
  }

  return portrait;
}

export default AmyAvatar;
