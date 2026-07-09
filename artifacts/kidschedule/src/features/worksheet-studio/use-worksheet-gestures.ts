import { useCallback, useRef } from "react";

type GestureHandlers = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinchZoom?: (scale: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onPan?: (dx: number, dy: number) => void;
  onRotate?: (deg: number) => void;
  /** When true, single-finger swipe triggers page nav; when false, pan mode */
  allowPageSwipe?: boolean;
};

export function useWorksheetGestures(handlers: GestureHandlers) {
  const touchStart = useRef<{
    x: number; y: number; t: number; dist: number; angle: number;
    fingers: number; vx: number; vy: number;
  } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inertiaRaf = useRef<number>(0);
  const lastMove = useRef<{ x: number; y: number; t: number } | null>(null);

  const stopInertia = () => {
    if (inertiaRaf.current) cancelAnimationFrame(inertiaRaf.current);
    inertiaRaf.current = 0;
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    stopInertia();
    const t = e.touches[0];
    if (!t) return;
    const fingers = e.touches.length;
    let dist = 0;
    let angle = 0;
    if (fingers === 2) {
      const dx = e.touches[1]!.clientX - t.clientX;
      const dy = e.touches[1]!.clientY - t.clientY;
      dist = Math.hypot(dx, dy);
      angle = Math.atan2(dy, dx);
    }
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now(), dist, angle, fingers, vx: 0, vy: 0 };
    lastMove.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    if (fingers === 1) {
      longPressTimer.current = setTimeout(() => {
        handlers.onLongPress?.(t.clientX, t.clientY);
      }, 480);
    }
  }, [handlers]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const start = touchStart.current;
    if (!start) return;

    if (e.touches.length === 2) {
      const dx = e.touches[1]!.clientX - e.touches[0]!.clientX;
      const dy = e.touches[1]!.clientY - e.touches[0]!.clientY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      if (start.dist > 0 && handlers.onPinchZoom) {
        handlers.onPinchZoom(dist / start.dist);
        start.dist = dist;
      }
      if (handlers.onRotate && start.angle !== 0) {
        const delta = ((angle - start.angle) * 180) / Math.PI;
        if (Math.abs(delta) > 2) handlers.onRotate(delta);
        start.angle = angle;
      }
      if (handlers.onPan) {
        const mx = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2 - start.x;
        const my = (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2 - start.y;
        if (Math.abs(mx) > 2 || Math.abs(my) > 2) {
          handlers.onPan(mx * 0.15, my * 0.15);
          start.x = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2;
          start.y = (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2;
        }
      }
      return;
    }

    const t = e.touches[0]!;
    const now = Date.now();
    if (lastMove.current) {
      const dt = Math.max(1, now - lastMove.current.t);
      start.vx = (t.clientX - lastMove.current.x) / dt;
      start.vy = (t.clientY - lastMove.current.y) / dt;
    }
    lastMove.current = { x: t.clientX, y: t.clientY, t: now };
  }, [handlers]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const start = touchStart.current;
    if (!start || e.changedTouches.length === 0) return;

    const t = e.changedTouches[0]!;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const elapsed = Date.now() - start.t;

    if (start.fingers === 1 && handlers.allowPageSwipe !== false && elapsed < 400) {
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) handlers.onSwipeLeft?.();
        else handlers.onSwipeRight?.();
      }
    }

    if (handlers.onPan && (Math.abs(start.vx) > 0.3 || Math.abs(start.vy) > 0.3)) {
      let vx = start.vx * 16;
      let vy = start.vy * 16;
      const step = () => {
        if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) return;
        handlers.onPan?.(vx, vy);
        vx *= 0.92;
        vy *= 0.92;
        inertiaRaf.current = requestAnimationFrame(step);
      };
      inertiaRaf.current = requestAnimationFrame(step);
    }

    touchStart.current = null;
    lastMove.current = null;
  }, [handlers]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
