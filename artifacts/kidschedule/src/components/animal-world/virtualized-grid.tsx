import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type VirtualizedGridProps<T> = {
  items: T[];
  columns: number;
  rowHeight: number;
  gap?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscanRows?: number;
};

/** Windowed grid — only mounts visible rows (+ overscan) for large catalogs. */
export function VirtualizedGrid<T>({
  items,
  columns,
  rowHeight,
  gap = 12,
  renderItem,
  className,
  overscanRows = 2,
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(640);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => {
      setScrollTop(el.scrollTop);
      setHeight(el.clientHeight);
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, []);

  const rowStride = rowHeight + gap;
  const rowCount = Math.ceil(items.length / columns);
  const startRow = Math.max(0, Math.floor(scrollTop / rowStride) - overscanRows);
  const endRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + height) / rowStride) + overscanRows,
  );
  const startIndex = startRow * columns;
  const endIndex = Math.min(items.length, endRow * columns);
  const slice = items.slice(startIndex, endIndex);
  const paddingTop = startRow * rowStride;
  const totalHeight = rowCount * rowStride - (rowCount > 0 ? gap : 0);

  return (
    <div ref={containerRef} className={cn("overflow-y-auto", className)}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap,
            paddingTop,
            position: "absolute",
            left: 0,
            right: 0,
          }}
        >
          {slice.map((item, i) => renderItem(item, startIndex + i))}
        </div>
      </div>
    </div>
  );
}

export function useResponsiveGridColumns(): number {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1024) setColumns(4);
      else if (w >= 768) setColumns(3);
      else setColumns(2);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}
