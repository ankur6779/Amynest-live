import { useCallback, useRef, useState } from "react";
import { Minus, Plus, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clampPropPosition,
  type CostumeProp,
} from "@/lib/event-prep-costume-props";

interface DragState {
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

interface Props {
  props: CostumeProp[];
  onChange: (next: CostumeProp[]) => void;
  showCostume: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}

export function EventPrepDraggableProps({
  props,
  onChange,
  showCostume,
  selectedId,
  onSelect,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const updateProp = useCallback(
    (id: string, patch: Partial<CostumeProp>) => {
      onChange(props.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    [onChange, props],
  );

  const onPointerDown = (id: string, e: React.PointerEvent) => {
    if (!showCostume) return;
    const prop = props.find((p) => p.id === id);
    if (!prop) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(id);
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: prop.x,
      origY: prop.y,
    };
    setDraggingId(id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const box = containerRef.current?.getBoundingClientRect();
    if (!drag || !box) return;
    const dx = (e.clientX - drag.startX) / box.width;
    const dy = (e.clientY - drag.startY) / box.height;
    const { x, y } = clampPropPosition(drag.origX + dx, drag.origY + dy);
    updateProp(drag.id, { x, y });
  };

  const onPointerUp = () => {
    dragRef.current = null;
    setDraggingId(null);
  };

  if (!showCostume) return null;

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 touch-none", className)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {props.map((prop) => {
        const selected = selectedId === prop.id;
        const baseSize = prop.kind === "main" ? 5.5 : prop.kind === "cape" ? 4.5 : 3.5;
        const fontSize = `${baseSize * prop.scale}rem`;
        return (
          <button
            key={prop.id}
            type="button"
            aria-label={prop.label}
            onPointerDown={(e) => onPointerDown(prop.id, e)}
            className={cn(
              "absolute select-none cursor-grab active:cursor-grabbing",
              "rounded-full transition-shadow",
              selected && "ring-2 ring-amber-300/80 ring-offset-2 ring-offset-transparent",
            )}
            style={{
              left: `${prop.x * 100}%`,
              top: `${prop.y * 100}%`,
              fontSize,
              transform: `translate(-50%, -50%) rotate(${prop.rotation}deg) scale(${prop.scale * (draggingId === prop.id ? 1.06 : 1)})`,
              filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.45))",
            }}
          >
            <span className="block leading-none" aria-hidden>
              {prop.emoji}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface PropToolbarProps {
  selected: CostumeProp | null;
  onScale: (delta: number) => void;
  onRotate: (delta: number) => void;
  onReset: () => void;
  resetLabel: string;
  scaleLabel: string;
  rotateLabel: string;
}

export function EventPrepPropToolbar({
  selected,
  onScale,
  onRotate,
  onReset,
  resetLabel,
  scaleLabel,
  rotateLabel,
}: PropToolbarProps) {
  if (!selected) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm">
      <span className="text-[11px] font-semibold text-amber-100/90 truncate max-w-[100px]">
        {selected.label}
      </span>
      <button
        type="button"
        aria-label={scaleLabel}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10"
        onClick={() => onScale(-0.1)}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={scaleLabel}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10"
        onClick={() => onScale(0.1)}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={rotateLabel}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10"
        onClick={() => onRotate(15)}
      >
        <RotateCw className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="ml-auto text-[10px] font-bold text-muted-foreground hover:text-foreground"
        onClick={onReset}
      >
        {resetLabel}
      </button>
    </div>
  );
}
