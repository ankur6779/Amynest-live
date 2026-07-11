import { useMemo } from "react";
import type { LayoutTree } from "@workspace/worksheet-studio";
import { validateLayoutTree } from "@workspace/worksheet-studio";
import type { FabricLayoutDebugInfo, PipelineVerifyResult } from "./fabric-layout-verify";
import { layoutTreeDebugBoxes } from "./fabric-layout-verify";

type Props = {
  layoutTree: LayoutTree;
  pageIndex: number;
  scale: number;
  visible: boolean;
  selectionDebug?: FabricLayoutDebugInfo | null;
  parityWarnings?: FabricLayoutDebugInfo[];
  verifyResult?: PipelineVerifyResult | null;
};

/** Developer overlay — LayoutTree expected boxes (red=Q, blue=child) + Fabric parity. */
export function WorksheetLayoutDebugOverlay({
  layoutTree,
  pageIndex,
  scale,
  visible,
  selectionDebug,
  parityWarnings = [],
  verifyResult,
}: Props) {
  const page = layoutTree.pages[pageIndex];
  const validation = useMemo(
    () => (visible && page ? validateLayoutTree(layoutTree) : null),
    [layoutTree, page, visible],
  );

  const boxes = useMemo(() => {
    if (!page || !visible) return [];
    return layoutTreeDebugBoxes(page, scale);
  }, [page, visible, scale]);

  if (!visible || !page) return null;

  const parityCount = parityWarnings.filter((w) => w.warning).length;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {boxes.map((b) => (
        <div
          key={b.id}
          className="absolute border border-dashed"
          style={{
            left: b.x,
            top: b.y,
            width: b.w,
            height: b.h,
            backgroundColor: b.color,
            borderColor: b.stroke,
          }}
        >
          {b.label && (
            <span className="absolute left-1 top-1 rounded bg-white/90 px-1 text-[9px] font-mono text-[#1e3a5f]">
              {b.label}
            </span>
          )}
        </div>
      ))}
      <div className="absolute bottom-2 left-2 max-w-[90%] rounded bg-black/75 px-2 py-1 font-mono text-[10px] text-white">
        <div>layout {layoutTree.geometryHash.slice(0, 12)} · bottom {page.contentRegion.bottom}px</div>
        {verifyResult && (
          <div className={verifyResult.ok ? "text-emerald-300" : "text-amber-300"}>
            verify {verifyResult.ok ? "OK" : `FAIL ${verifyResult.stoppedAt ?? ""}`}
          </div>
        )}
        {parityCount > 0 && (
          <div className="mt-1 text-amber-300">
            Fabric Δ &gt; 2px on {parityCount} object{parityCount === 1 ? "" : "s"}
          </div>
        )}
        {validation && !validation.ok && (
          <div className="mt-1 text-amber-300">
            {validation.errors.length} overflow/overlap warning{validation.errors.length === 1 ? "" : "s"}
          </div>
        )}
      </div>
      {selectionDebug && (
        <div className="absolute left-2 top-2 max-w-[55%] rounded bg-[#1e3a5f]/95 px-2 py-1.5 font-mono text-[9px] text-white">
          <div className="font-semibold text-[#c9a227]">{selectionDebug.kind}</div>
          <div>id {selectionDebug.layoutNodeId}</div>
          <div>
            Layout X/Y {selectionDebug.expected.x.toFixed(1)},{selectionDebug.expected.y.toFixed(1)}
          </div>
          <div>
            Fabric X/Y {selectionDebug.actual.x.toFixed(1)},{selectionDebug.actual.y.toFixed(1)}
          </div>
          <div className={selectionDebug.warning ? "text-amber-300" : "text-emerald-300"}>
            Δ {selectionDebug.delta.x.toFixed(1)},{selectionDebug.delta.y.toFixed(1)}
            {selectionDebug.warning ? " ⚠" : " ok"}
          </div>
          <div>
            W×H {selectionDebug.expected.width.toFixed(0)}×{selectionDebug.expected.height.toFixed(0)}
          </div>
          {selectionDebug.parentId && <div>parent {selectionDebug.parentId}</div>}
          <div>hash {layoutTree.geometryHash.slice(0, 16)}</div>
        </div>
      )}
      {validation && validation.errors.length > 0 && (
        <div className="absolute right-2 top-2 max-h-40 max-w-[45%] overflow-y-auto rounded bg-red-900/85 px-2 py-1 font-mono text-[9px] text-red-100">
          {validation.errors.slice(0, 8).map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}
    </div>
  );
}
