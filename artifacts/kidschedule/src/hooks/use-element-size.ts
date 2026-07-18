import { useCallback, useLayoutEffect, useRef, useState } from "react";

export type ElementSize = { width: number; height: number };

/**
 * Measure an element's content box via ResizeObserver.
 * Updates are rAF-coalesced to avoid layout thrash on rapid resize.
 */
export function useElementSize<T extends HTMLElement = HTMLDivElement>(): [
  (node: T | null) => void,
  ElementSize,
] {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<ElementSize | null>(null);

  const ref = useCallback((el: T | null) => {
    setNode(el);
  }, []);

  const flush = useCallback(() => {
    rafRef.current = null;
    const next = pendingRef.current;
    pendingRef.current = null;
    if (!next) return;
    setSize((prev) =>
      prev.width === next.width && prev.height === next.height ? prev : next,
    );
  }, []);

  const schedule = useCallback(
    (width: number, height: number) => {
      pendingRef.current = { width, height };
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  useLayoutEffect(() => {
    if (!node) {
      setSize({ width: 0, height: 0 });
      return;
    }

    const updateFromRect = () => {
      const rect = node.getBoundingClientRect();
      schedule(rect.width, rect.height);
    };
    updateFromRect();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateFromRect, { passive: true });
      return () => {
        window.removeEventListener("resize", updateFromRect);
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      };
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      schedule(width, height);
    });
    ro.observe(node);
    return () => {
      ro.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [node, schedule]);

  return [ref, size];
}
