import { memo, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Copy,
  Italic,
  Lock,
  Paintbrush,
  Trash2,
  Underline,
  Unlock,
} from "lucide-react";
import type { WorksheetCanvasHandle } from "./fabric-editor";
import { FONT_FAMILIES, type SelectionStyle } from "./selection-style";

type Props = {
  handle: WorksheetCanvasHandle | null;
  onReplaceImage?: () => void;
  className?: string;
};

function ColorInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-w-[88px] flex-col gap-1 text-xs">
      {label}
      <input
        type="color"
        className="h-10 w-full cursor-pointer rounded-lg border touch-manipulation"
        value={value?.startsWith("#") ? value : "#111111"}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </label>
  );
}

function NumInput({ label, value, onChange, min, max }: {
  label: string; value?: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <label className="flex min-w-[72px] flex-1 flex-col gap-1 text-xs">
      {label}
      <input
        type="number"
        className="h-10 rounded-lg border px-2 touch-manipulation"
        value={value ?? 0}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function WorksheetPropertyPanelInner({ handle, onReplaceImage, className }: Props) {
  const [style, setStyle] = useState<SelectionStyle | null>(null);
  const apply = useCallback((patch: Partial<SelectionStyle>) => handle?.applySelectionStyle(patch), [handle]);

  useEffect(() => {
    if (!handle) return;
    return handle.onSelectionChange(setStyle);
  }, [handle]);

  if (!style || !handle) return null;

  const isText = style.objectType === "text";
  const isShape = style.objectType === "shape";
  const isImage = style.objectType === "image";

  return (
    <aside
      className={cn(
        "max-h-[38dvh] overflow-y-auto border-t border-white/30 bg-white/95 px-3 py-3 backdrop-blur-md",
        className,
      )}
      aria-label="Object properties"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60">
          Inspector · {style.objectType}
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handle.copyStyle()} aria-label="Copy style">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handle.pasteStyle()} aria-label="Paste style">
            <Paintbrush className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handle.deleteSelected()} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Position & size */}
      <div className="mb-3 flex flex-wrap gap-2">
        <NumInput label="X" value={style.left} onChange={(v) => apply({ left: v })} />
        <NumInput label="Y" value={style.top} onChange={(v) => apply({ top: v })} />
        <NumInput label="W" value={style.width} min={8} onChange={(v) => apply({ width: v })} />
        <NumInput label="H" value={style.height} min={8} onChange={(v) => apply({ height: v })} />
      </div>

      {/* Text properties */}
      {isText && (
        <div className="mb-3 space-y-2">
          <label className="flex flex-col gap-1 text-xs">
            Font
            <select
              className="h-10 rounded-lg border px-2 touch-manipulation"
              value={style.fontFamily ?? "Arial"}
              onChange={(e) => apply({ fontFamily: e.target.value })}
            >
              {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <NumInput label="Size" value={style.fontSize} min={8} max={96} onChange={(v) => apply({ fontSize: v })} />
            <NumInput label="Line H" value={style.lineHeight} min={1} max={3} onChange={(v) => apply({ lineHeight: v })} />
            <NumInput label="Spacing" value={style.charSpacing} onChange={(v) => apply({ charSpacing: v })} />
          </div>
          <div className="flex gap-1">
            <Button
              variant={style.fontWeight === "bold" ? "default" : "outline"}
              size="icon"
              className="h-10 w-10"
              onClick={() => apply({ fontWeight: style.fontWeight === "bold" ? "normal" : "bold" })}
              aria-label="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={style.fontStyle === "italic" ? "default" : "outline"}
              size="icon"
              className="h-10 w-10"
              onClick={() => apply({ fontStyle: style.fontStyle === "italic" ? "normal" : "italic" })}
              aria-label="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={style.underline ? "default" : "outline"}
              size="icon"
              className="h-10 w-10"
              onClick={() => apply({ underline: !style.underline })}
              aria-label="Underline"
            >
              <Underline className="h-4 w-4" />
            </Button>
            {(["left", "center", "right"] as const).map((a) => (
              <Button
                key={a}
                variant={style.textAlign === a ? "default" : "outline"}
                size="icon"
                className="h-10 w-10"
                onClick={() => apply({ textAlign: a })}
                aria-label={`Align ${a}`}
              >
                {a === "left" ? <AlignLeft className="h-4 w-4" /> : a === "center" ? <AlignCenter className="h-4 w-4" /> : <AlignRight className="h-4 w-4" />}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <ColorInput label="Text" value={style.fill} onChange={(v) => apply({ fill: v })} />
            <ColorInput label="Background" value={style.backgroundColor} onChange={(v) => apply({ backgroundColor: v })} />
          </div>
        </div>
      )}

      {/* Shape properties */}
      {isShape && (
        <div className="mb-3 flex flex-wrap gap-2">
          <ColorInput label="Fill" value={style.fill === "transparent" ? "#ffffff" : style.fill} onChange={(v) => apply({ fill: v })} />
          <ColorInput label="Stroke" value={style.stroke} onChange={(v) => apply({ stroke: v })} />
          <NumInput label="Stroke W" value={style.strokeWidth} min={0} max={12} onChange={(v) => apply({ strokeWidth: v })} />
          <NumInput label="Radius" value={style.rx} min={0} max={48} onChange={(v) => apply({ rx: v })} />
        </div>
      )}

      {/* Image properties */}
      {isImage && (
        <div className="mb-3 space-y-2">
          {onReplaceImage && (
            <Button variant="outline" className="h-10 w-full rounded-xl touch-manipulation" onClick={onReplaceImage}>
              Replace image
            </Button>
          )}
          <label className="flex flex-col gap-1 text-xs">
            Brightness
            <Slider value={[Math.round((style.brightness ?? 0) * 100)]} min={-100} max={100} step={5}
              onValueChange={([v]) => apply({ brightness: (v ?? 0) / 100 })} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Contrast
            <Slider value={[Math.round((style.contrast ?? 0) * 100)]} min={-100} max={100} step={5}
              onValueChange={([v]) => apply({ contrast: (v ?? 0) / 100 })} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Saturation
            <Slider value={[Math.round((style.saturation ?? 0) * 100)]} min={-100} max={100} step={5}
              onValueChange={([v]) => apply({ saturation: (v ?? 0) / 100 })} />
          </label>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-10 flex-1" onClick={() => handle.flipHorizontal()}>Flip H</Button>
            <Button variant="outline" size="sm" className="h-10 flex-1" onClick={() => handle.flipVertical()}>Flip V</Button>
          </div>
        </div>
      )}

      {/* Common */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[120px] flex-1 flex-col gap-1 text-xs">
          Opacity
          <Slider
            value={[Math.round((style.opacity ?? 1) * 100)]}
            max={100}
            step={5}
            onValueChange={([v]) => apply({ opacity: (v ?? 100) / 100 })}
          />
        </label>
        <NumInput label="Rotate°" value={Math.round(style.angle ?? 0)} min={-360} max={360} onChange={(v) => apply({ angle: v })} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        <Button variant="outline" size="sm" className="h-9 touch-manipulation" onClick={() => handle.duplicateSelected()}>Duplicate</Button>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handle.bringForward()} aria-label="Forward"><ArrowUp className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handle.sendBackward()} aria-label="Backward"><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handle.bringToFront()} aria-label="To front"><ArrowUp className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handle.sendToBack()} aria-label="To back"><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handle.toggleLock()} aria-label={style.locked ? "Unlock" : "Lock"}>
          {style.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}

export const WorksheetPropertyPanel = memo(WorksheetPropertyPanelInner);
