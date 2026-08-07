import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodayProgressStrip } from "./today-progress-strip";

describe("TodayProgressStrip", () => {
  it("stays silent when there is no plan yet", () => {
    const { container } = render(<TodayProgressStrip done={0} total={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows quiet progress without gamification language", () => {
    render(<TodayProgressStrip done={2} total={5} />);
    expect(screen.getByTestId("today-progress-strip")).toHaveTextContent("2 of 5 for today");
    expect(screen.getByTestId("today-progress-strip")).not.toHaveTextContent(/streak|coin|star|score/i);
  });

  it("names completion calmly", () => {
    render(<TodayProgressStrip done={3} total={3} />);
    expect(screen.getByTestId("today-progress-strip")).toHaveTextContent("Today’s plan is complete");
  });
});
