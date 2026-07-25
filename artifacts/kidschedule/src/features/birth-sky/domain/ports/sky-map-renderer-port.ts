/**
 * SkyMapRendererPort — stable visual contract for the Sky segment map.
 *
 * Dashboard / snapshot models must not depend on a concrete renderer
 * (SVG instrument today; WebGL/Canvas later). Swap via resolve-sky-map-renderer.
 */

import type { ReactNode } from "react";
import type { SkyBodyKey, SkySegmentVM } from "../../application/view-models/dashboard-vm";

/** Render-only model — derived from SkySegmentVM; never from live ephemeris. */
export type SkyMapRenderModel = {
  mode: SkySegmentVM["mode"];
  markers: SkySegmentVM["markers"];
  mapAriaLabel: string;
};

export type SkyMapRendererProps = {
  model: SkyMapRenderModel;
  selectedBody: SkyBodyKey | null;
  onSelect: (key: SkyBodyKey) => void;
  /** Called after first stable painted frame when hit-testing is safe. */
  onInteractive: () => void;
  reducedMotion: boolean;
};

export type SkyMapRenderer = {
  readonly rendererId: string;
  /** True for interim/dev visual implementations. */
  readonly isTemporaryRenderer: boolean;
  /** UI host supplies a React component; domain stays framework-free (A2). */
  Component: (props: SkyMapRendererProps) => ReactNode;
};

export function toSkyMapRenderModel(vm: SkySegmentVM): SkyMapRenderModel {
  return {
    mode: vm.mode,
    markers: vm.markers,
    mapAriaLabel: vm.mapAriaLabel,
  };
}
