import type { Canvas, FabricObject } from "fabric";
import {
  AlignmentGuideRenderer,
  buildSnapContext,
  computeSnap,
} from "./fabric-alignment-guides";

export function attachSnapping(
  canvas: Canvas,
  scale: number,
  fabric: typeof import("fabric"),
): () => void {
  const ctx = buildSnapContext(canvas, scale);
  const guideRenderer = new AlignmentGuideRenderer(fabric);

  const onMoving = (e: { target?: FabricObject }) => {
    const obj = e.target;
    if (!obj || obj.lockMovementX) return;

    const others = canvas.getObjects().filter(
      (o) => o !== obj && o.selectable !== false && !(o as { data?: { isGuide?: boolean } }).data?.isGuide,
    );
    const result = computeSnap(obj, others, ctx);
    obj.set({ left: result.left, top: result.top });
    obj.setCoords();
    guideRenderer.show(canvas, result.guides);
  };

  const onModified = () => guideRenderer.clear(canvas);
  const onUp = () => guideRenderer.clear(canvas);

  canvas.on("object:moving", onMoving);
  canvas.on("object:modified", onModified);
  canvas.on("mouse:up", onUp);

  return () => {
    guideRenderer.clear(canvas);
    canvas.off("object:moving", onMoving);
    canvas.off("object:modified", onModified);
    canvas.off("mouse:up", onUp);
  };
}
