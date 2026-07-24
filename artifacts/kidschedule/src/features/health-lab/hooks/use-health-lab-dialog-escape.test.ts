import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHealthLabDialogEscape } from "./use-health-lab-dialog-escape";

describe("useHealthLabDialogEscape", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    renderHook(() => useHealthLabDialogEscape(true, onClose));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
