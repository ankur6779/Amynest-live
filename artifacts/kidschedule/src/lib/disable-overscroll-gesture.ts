import { isAndroidMobileShell } from "@/lib/device-lite";

/**
 * Blocks pull-to-refresh / rubber-band only when the whole scroll chain is at
 * the top. Nested scroll regions must still be able to hand the gesture to a
 * parent that can scroll upward.
 *
 * Android mobile shells still need a JS guard: Chrome/WebView can ignore CSS
 * overscroll-behavior and turn a top-edge pull into a page refresh. The guard
 * only cancels downward pulls when the entire scroll chain is already at top.
 */
export function installDisableOverscrollGesture(): () => void {
  if (typeof document === "undefined") return () => {};
  if (isAndroidMobileShell()) return installAndroidPullToRefreshGuard();

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

function installAndroidPullToRefreshGuard(): () => void {
  let startX = 0;
  let startY = 0;
  let scrollTarget: Element | null = null;

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    scrollTarget = findScrollableAncestor(
      document.elementFromPoint(touch.clientX, touch.clientY),
    );
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    // Horizontal swipes and upward swipes must never be cancelled.
    if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) return;

    const target =
      scrollTarget ??
      findScrollableAncestor(
        document.elementFromPoint(touch.clientX, touch.clientY),
      );
    if (!target) return;

    if (canScrollChainMoveUp(target)) return;
    e.preventDefault();
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
  };
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
