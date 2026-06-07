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
import { safeImport } from "@/lib/safe-import";
import { canRenderLive3D } from "@/lib/amy-3d/webgl-support";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

const Amy3DStage = lazy(() =>
  safeImport(() => import("@/components/amy-3d/amy-3d-stage")),
);

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
  const fallback = (
    <AmyIcon size={size} ring={ring} bounce={bounce} className={className} />
  );

  if (tier !== "hero" || !canRenderLive3D()) {
    return fallback;
  }

  return (
    <Amy3DErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Amy3DStage state={state} size={size} modelUrl={modelUrl} className={className} />
      </Suspense>
    </Amy3DErrorBoundary>
  );
}

export default AmyAvatar;
