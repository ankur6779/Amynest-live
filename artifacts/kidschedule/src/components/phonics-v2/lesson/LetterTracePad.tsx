import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RotateCcw, Check } from "lucide-react";

type LetterTracePadProps = {
  letter: string;
  onComplete: () => void;
  className?: string;
};

/**
 * Finger-trace pad — child draws over a ghost letter.
 * Completes after enough stroke length (child-friendly threshold).
 */
export function LetterTracePad({ letter, onComplete, className }: LetterTracePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [ink, setInk] = useState(0);
  const [done, setDone] = useState(false);
  const display = letter.trim().toUpperCase().slice(0, 2);

  const redrawGhost = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(120,120,140,0.18)";
    ctx.font = `bold ${Math.min(w, h) * 0.55}px Quicksand, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(display, w / 2, h / 2 + 4);
  }, [display]);

  const reset = () => {
    setInk(0);
    setDone(false);
    redrawGhost();
  };

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (done) return;
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.strokeStyle = "hsl(var(--primary))";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvas?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || done) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setInk((n) => {
      const next = n + 1;
      if (next >= 40 && !done) {
        setDone(true);
        drawing.current = false;
        onComplete();
      }
      return next;
    });
  };

  const onPointerUp = () => {
    drawing.current = false;
  };

  return (
    <div
      data-testid="letter-trace-pad"
      className={cn("space-y-3", className)}
    >
      <p className="text-center text-sm font-semibold text-muted-foreground">
        Trace {display}
      </p>
      <canvas
        ref={(el) => {
          (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
          if (el) queueMicrotask(redrawGhost);
        }}
        className={cn(
          "mx-auto block h-48 w-full max-w-xs touch-none rounded-2xl border-2 border-dashed border-primary/30 bg-card",
          done && "border-emerald-500/50",
        )}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={`Trace the letter ${display}`}
      />
      <div className="flex justify-center gap-2">
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={reset}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Retry
        </Button>
        {done && (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
            <Check className="h-4 w-4" /> Nice tracing!
          </span>
        )}
      </div>
      {/* Accessibility: skip for motor difficulty */}
      {!done && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mx-auto flex text-xs text-muted-foreground"
          onClick={() => {
            setDone(true);
            onComplete();
          }}
        >
          I know this letter — continue
        </Button>
      )}
    </div>
  );
}
