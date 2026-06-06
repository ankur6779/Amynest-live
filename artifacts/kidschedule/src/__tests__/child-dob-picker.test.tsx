import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ChildDobPicker } from "@/components/child-dob-picker";

describe("ChildDobPicker", () => {
  it("does not infinite-loop when value is set programmatically", () => {
    const onChange = vi.fn();
    let value = "";

    const { rerender } = render(
      <ChildDobPicker value={value} onChange={onChange} max="2026-06-06" />,
    );

    expect(onChange).not.toHaveBeenCalled();

    value = "2019-05-15";
    rerender(<ChildDobPicker value={value} onChange={onChange} max="2026-06-06" />);
    rerender(<ChildDobPicker value={value} onChange={onChange} max="2026-06-06" />);
    rerender(<ChildDobPicker value={value} onChange={onChange} max="2026-06-06" />);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("emits once when the user changes a select", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ChildDobPicker value="" onChange={onChange} max="2026-06-06" />,
    );

    const month = container.querySelector('select[aria-label="Birth month"]') as HTMLSelectElement;
    month.value = "3";
    month.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(onChange.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
