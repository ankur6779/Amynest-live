import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoutineFeedbackBar, feedbackActivityKey } from "./routine-feedback-bar";

const mutate = vi.fn();
const toast = vi.fn();
let isPending = false;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

vi.mock("@workspace/api-client-react", () => ({
  useCreateRoutineFeedback: () => ({ mutate, isPending }),
}));

beforeEach(() => {
  mutate.mockReset();
  toast.mockReset();
  isPending = false;
});

const baseProps = {
  childId: 7,
  routineId: 42,
  routineDate: "2026-06-05",
};

describe("feedbackActivityKey", () => {
  it("normalizes to lowercase and strips parentheticals / em-dash suffixes", () => {
    expect(feedbackActivityKey("Morning Stretch (10 min)")).toBe("morning stretch");
    expect(feedbackActivityKey("Lunch — rice and dal")).toBe("lunch");
    expect(feedbackActivityKey("  Bath Time ")).toBe("bath time");
  });

  it("returns null for empty / nullish input", () => {
    expect(feedbackActivityKey("")).toBeNull();
    expect(feedbackActivityKey(undefined)).toBeNull();
    expect(feedbackActivityKey(null)).toBeNull();
  });
});

describe("RoutineFeedbackBar", () => {
  it("renders the requested signal chips with labels", () => {
    render(<RoutineFeedbackBar {...baseProps} signals={["worked_well", "too_tiring", "bedtime_smooth"]} />);
    expect(screen.getByText("Worked well")).toBeInTheDocument();
    expect(screen.getByText("Too tiring")).toBeInTheDocument();
    expect(screen.getByText("Bedtime smooth")).toBeInTheDocument();
  });

  it("renders nothing when no signals are provided", () => {
    const { container } = render(<RoutineFeedbackBar {...baseProps} signals={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("submits routine-level feedback with a null activityKey", () => {
    render(<RoutineFeedbackBar {...baseProps} signals={["worked_well", "too_tiring"]} />);
    fireEvent.click(screen.getByText("Worked well"));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({
      data: {
        childId: 7,
        routineId: 42,
        routineDate: "2026-06-05",
        activityKey: null,
        signal: "worked_well",
      },
    });
  });

  it("submits per-activity feedback with the provided activityKey", () => {
    render(
      <RoutineFeedbackBar
        {...baseProps}
        activityKey="bath time"
        signals={["loved_this", "too_tiring"]}
      />,
    );
    fireEvent.click(screen.getByText("Loved this"));
    expect(mutate.mock.calls[0][0].data.activityKey).toBe("bath time");
    expect(mutate.mock.calls[0][0].data.signal).toBe("loved_this");
  });

  it("shows a thank-you message and hides chips after submitting", () => {
    render(<RoutineFeedbackBar {...baseProps} signals={["worked_well", "too_tiring"]} />);
    fireEvent.click(screen.getByText("Worked well"));
    expect(screen.getByText(/Thanks for the feedback/i)).toBeInTheDocument();
    expect(screen.queryByText("Too tiring")).not.toBeInTheDocument();
  });

  it("does not fire a second mutation on a repeat tap", () => {
    render(<RoutineFeedbackBar {...baseProps} signals={["worked_well", "too_tiring"]} />);
    const chip = screen.getByText("Worked well");
    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("re-enables and toasts when the mutation errors", () => {
    mutate.mockImplementation((_vars, opts?: { onError?: () => void }) => {
      opts?.onError?.();
    });
    render(<RoutineFeedbackBar {...baseProps} signals={["worked_well", "too_tiring"]} />);
    fireEvent.click(screen.getByText("Worked well"));
    expect(toast).toHaveBeenCalledTimes(1);
    // Chips remain available for another attempt.
    expect(screen.getByText("Worked well")).toBeInTheDocument();
  });
});
