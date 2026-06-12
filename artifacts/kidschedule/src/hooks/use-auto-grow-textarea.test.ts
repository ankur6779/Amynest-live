/** @vitest-environment jsdom */
import { createRef } from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAutoGrowTextarea } from "./use-auto-grow-textarea";

function mountTextarea() {
  const el = document.createElement("textarea");
  document.body.appendChild(el);
  const ref = createRef<HTMLTextAreaElement>();
  (ref as { current: HTMLTextAreaElement }).current = el;
  return { el, ref };
}

describe("useAutoGrowTextarea", () => {
  it("grows with content up to maxHeightPx", () => {
    const { el, ref } = mountTextarea();
    const { rerender } = renderHook(
      ({ value }) => useAutoGrowTextarea(ref, value, { maxHeightPx: 80, minHeightPx: 40 }),
      { initialProps: { value: "hello" } },
    );

    act(() => {
      el.value = "hello";
      Object.defineProperty(el, "scrollHeight", { configurable: true, value: 52 });
    });
    rerender({ value: "hello\nworld\nline3" });
    expect(parseInt(el.style.height, 10)).toBeGreaterThanOrEqual(40);
    expect(parseInt(el.style.height, 10)).toBeLessThanOrEqual(80);
  });

  it("enables internal scroll when content exceeds max height", () => {
    const { el, ref } = mountTextarea();
    Object.defineProperty(el, "scrollHeight", { configurable: true, value: 400 });
    renderHook(() =>
      useAutoGrowTextarea(ref, "x".repeat(5000), { maxHeightPx: 60, minHeightPx: 40 }),
    );
    expect(el.style.height).toBe("60px");
    expect(el.style.overflowY).toBe("auto");
  });

  it("preserves cursor selection across resize", () => {
    const { el, ref } = mountTextarea();
    el.value = "abcdef";
    el.setSelectionRange(3, 3);

    renderHook(() => useAutoGrowTextarea(ref, el.value, { maxHeightPx: 120 }));

    expect(el.selectionStart).toBe(3);
    expect(el.selectionEnd).toBe(3);
  });
});
