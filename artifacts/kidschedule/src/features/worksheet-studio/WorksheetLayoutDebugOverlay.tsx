import { useMemo } from "react";
import type { LayoutTree } from "@workspace/worksheet-studio";
import { LAYOUT, PAGE_MARGIN, validateLayoutTree } from "@workspace/worksheet-studio";
import { cn } from "@/lib/utils";

type Props = {
  layoutTree: LayoutTree;
  pageIndex: number;
  scale: number;
  visible: boolean;
};

/** Developer overlay — margins, blocks, content region, overflow hints. */
export function WorksheetLayoutDebugOverlay({ layoutTree, pageIndex, scale, visible }: Props) {
  const page = layoutTree.pages[pageIndex];
  const validation = useMemo(
    () => (visible && page ? validateLayoutTree(layoutTree) : null),
    [layoutTree, page, visible],
  );

  const boxes = useMemo(() => {
    if (!page || !visible) return [];
    const region = page.contentRegion;
    const out: Array<{ id: string; label: string; x: number; y: number; w: number; h: number; color: string }> = [
      {
        id: "content-region",
        label: "Content",
        x: PAGE_MARGIN * scale,
        y: region.top * scale,
        w: region.width * scale,
        h: (region.bottom - region.top) * scale,
        color: "rgba(30,58,95,0.12)",
      },
      {
        id: "margin-left",
        label: "",
        x: 0,
        y: 0,
        w: PAGE_MARGIN * scale,
        h: LAYOUT.PAGE_HEIGHT * scale,
        color: "rgba(201,162,39,0.08)",
      },
      {
        id: "margin-right",
        label: "",
        x: (LAYOUT.PAGE_WIDTH - PAGE_MARGIN) * scale,
        y: 0,
        w: PAGE_MARGIN * scale,
        h: LAYOUT.PAGE_HEIGHT * scale,
        color: "rgba(201,162,39,0.08)",
      },
    ];

    for (const node of page.nodes) {
      if (node.kind === "question_block") {
        out.push({
          id: node.id,
          label: `Q ${node.sourceElementId}`,
          x: node.rect.x * scale,
          y: node.rect.y * scale,
          w: node.rect.width * scale,
          h: node.rect.height * scale,
          color: "rgba(201,162,39,0.18)",
        });
      }
    }
    return out;
  }, [page, visible, scale]);

  if (!visible || !page) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {boxes.map((b) => (
        <div
          key={b.id}
          className={cn("absolute border border-dashed border-[#c9a227]/70")}
          style={{
            left: b.x,
            top: b.y,
            width: b.w,
            height: b.h,
            backgroundColor: b.color,
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
        {validation && !validation.ok && (
          <div className="mt-1 text-amber-300">
            {validation.errors.length} overflow/overlap warning{validation.errors.length === 1 ? "" : "s"}
          </div>
        )}
      </div>
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
