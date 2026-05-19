/**
 * Blocks pull-to-refresh / rubber-band when the user pulls down at the top of
 * the active scroll container (layout main, modals, etc.). Safe for nested
 * scroll regions — only prevents default when that region is already at scrollTop 0.
 */
export function installDisableOverscrollGesture(): () => void {
  if (typeof document === "undefined") return () => {};

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
    if (!target || target.scrollTop > 0) return;

    e.preventDefault();
  };

  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: false });

  return () => {
    document.removeEventListener("touchstart", onTouchStart);
    document.removeEventListener("touchmove", onTouchMove);
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
