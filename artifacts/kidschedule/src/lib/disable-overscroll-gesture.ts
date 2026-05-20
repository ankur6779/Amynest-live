import { isAndroidMobileShell } from "@/lib/device-lite";

/**
 * Blocks pull-to-refresh / rubber-band only when the whole scroll chain is at
 * the top. Nested scroll regions must still be able to hand the gesture to a
 * parent that can scroll upward.
 *
 * Android mobile shells need a stronger path: some WebViews get stuck after a
 * downward document scroll and then treat the next downward gesture as refresh.
 * We drive the active scroll container directly and cancel only gestures we
 * handled, so links/taps and horizontal carousels still work.
 */
export function installDisableOverscrollGesture(): () => void {
  if (typeof document === "undefined") return () => {};
  if (isAndroidMobileShell()) return installAndroidScrollDriver();

  let startY = 0;
  let scrollTarget: Element | null = null;

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startY = touch.clientY;
    scrollTarget = findScrollableAncestor(
      document.elementFromPoint(touch.clientX, touch.clientY),
    );
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const isPullingDown = touch.clientY > startY;
    if (!isPullingDown) return;

    const target =
      scrollTarget ??
      findScrollableAncestor(
        document.elementFromPoint(touch.clientX, touch.clientY),
      );
    if (!target) return;

    if (canScrollChainMoveUp(target)) return;

    e.preventDefault();
  };

  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: false });

  return () => {
    document.removeEventListener("touchstart", onTouchStart);
    document.removeEventListener("touchmove", onTouchMove);
  };
}

function installAndroidScrollDriver(): () => void {
  let startX = 0;
  let startY = 0;
  let lastY = 0;
  let activeScroller: Element | null = null;
  let gestureLockedToScroll = false;
  const root = document.documentElement;
  const body = document.body;
  const appRoot = document.getElementById("app-root");
  const previousTouchActions = [
    [root, root.style.touchAction],
    [body, body.style.touchAction],
    ...(appRoot ? ([[appRoot, appRoot.style.touchAction]] as const) : []),
  ] as const;

  root.style.touchAction = "none";
  body.style.touchAction = "none";
  if (appRoot) appRoot.style.touchAction = "none";

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    lastY = touch.clientY;
    gestureLockedToScroll = false;
    activeScroller = findScrollableAncestor(
      document.elementFromPoint(touch.clientX, touch.clientY),
    );
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - lastY;
    const totalDy = touch.clientY - startY;

    // Horizontal swipes (carousels/reels) must never be captured.
    if (!gestureLockedToScroll && Math.abs(dx) > Math.abs(totalDy)) return;

    const scroller =
      activeScroller ??
      findScrollableAncestor(
        document.elementFromPoint(touch.clientX, touch.clientY),
      );
    if (!scroller) return;

    const maxScrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const current = scroller.scrollTop;
    const next = clamp(current - dy, 0, maxScrollTop);
    const canMove = Math.abs(next - current) > 0.5;

    lastY = touch.clientY;

    if (canMove) {
      scroller.scrollTop = next;
      gestureLockedToScroll = true;
      e.preventDefault();
      return;
    }

    // At the top, cancel pull-down so Android Chrome/WebView cannot refresh.
    if (dy > 0 && !canScrollChainMoveUp(scroller)) {
      gestureLockedToScroll = true;
      e.preventDefault();
      return;
    }

    // At the bottom, cancel extra push-up rubber-band for consistency.
    if (dy < 0 && current >= maxScrollTop - 1) {
      gestureLockedToScroll = true;
      e.preventDefault();
    }
  };

  document.addEventListener("touchstart", onTouchStart, {
    passive: true,
    capture: true,
  });
  document.addEventListener("touchmove", onTouchMove, {
    passive: false,
    capture: true,
  });

  return () => {
    document.removeEventListener("touchstart", onTouchStart, { capture: true });
    document.removeEventListener("touchmove", onTouchMove, { capture: true });
    for (const [el, touchAction] of previousTouchActions) {
      el.style.touchAction = touchAction;
    }
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function findScrollableAncestor(el: Element | null): Element | null {
  while (el && el !== document.body && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    const canScrollY =
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowY === "overlay";
    if (canScrollY && el.scrollHeight > el.clientHeight + 1) {
      return el;
    }
    el = el.parentElement;
  }

  const appRoot = document.getElementById("app-root");
  if (appRoot && appRoot.scrollHeight > appRoot.clientHeight + 1) {
    return appRoot;
  }

  return document.documentElement;
}

function canScrollChainMoveUp(target: Element): boolean {
  if (getDocumentScrollTop() > 0) return true;

  let el: Element | null = target;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.scrollTop > 1) return true;
    el = el.parentElement;
  }

  const appRoot = document.getElementById("app-root");
  return Boolean(appRoot && appRoot !== target && appRoot.scrollTop > 1);
}

function getDocumentScrollTop(): number {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
}
