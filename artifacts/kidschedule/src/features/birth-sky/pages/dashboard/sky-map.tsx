/**
 * Sky map shell — Dashboard contract.
 * Delegates visuals to SkyMapRendererPort (snapshot/VM untouched).
 */

import type { SkyBodyKey, SkySegmentVM } from "../../application/view-models/dashboard-vm";
import { toSkyMapRenderModel } from "../../domain/ports/sky-map-renderer-port";
import { getSkyMapRenderer } from "../../infrastructure/sky-map/resolve-sky-map-renderer";

type Props = {
  vm: SkySegmentVM;
  selectedBody: SkyBodyKey | null;
  onSelect: (key: SkyBodyKey) => void;
  onInteractive: () => void;
  reducedMotion: boolean;
};

export function BirthSkyMap({
  vm,
  selectedBody,
  onSelect,
  onInteractive,
  reducedMotion,
}: Props) {
  const renderer = getSkyMapRenderer();
  const ModelView = renderer.Component;
  return (
    <ModelView
      model={toSkyMapRenderModel(vm)}
      selectedBody={selectedBody}
      onSelect={onSelect}
      onInteractive={onInteractive}
      reducedMotion={reducedMotion}
    />
  );
}
