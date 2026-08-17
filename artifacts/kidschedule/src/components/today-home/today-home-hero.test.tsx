import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodayHomeHero } from "./today-home-hero";
import type { TodayNrtDecision } from "@/lib/today-home/resolve-today-nrt";

function decision(partial: Partial<TodayNrtDecision> & Pick<TodayNrtDecision, "cta">): TodayNrtDecision {
  return {
    title: "Outdoor sensory play",
    why: "Next on today’s plan.",
    detail: "About 15 minutes — begin when you are ready.",
    minutes: 15,
    source: "routine_next",
    childName: "Aria",
    childId: 1,
    basedOn: ["Next on today’s plan."],
    lawPassed: true,
    ...partial,
  };
}

describe("TodayHomeHero", () => {
  it("uses Begin today with the living sanctuary CTA", () => {
    render(
      <TodayHomeHero
        decision={decision({
          cta: { kind: "begin_routine", label: "Begin today", routineId: 9 },
        })}
        onBegin={vi.fn()}
      />,
    );
    const cta = screen.getByTestId("today-home-begin");
    expect(cta).toHaveTextContent("Begin today");
    expect(cta).toHaveClass("th-hero-cta");
    expect(cta).not.toHaveTextContent(/generate routine/i);
    expect(cta.querySelector("svg")).toBeNull();
  });

  it("uses Build today's plan when there is no plan yet", () => {
    render(
      <TodayHomeHero
        decision={decision({
          title: "Prepare Aria's day",
          source: "decide_next",
          cta: { kind: "generate", label: "Build today's plan" },
        })}
        onBegin={vi.fn()}
      />,
    );
    expect(screen.getByTestId("today-home-begin")).toHaveTextContent("Build today's plan");
  });

  it("keeps compact weather insight after the CTA", () => {
    render(
      <TodayHomeHero
        decision={decision({
          cta: { kind: "generate", label: "Build today's plan" },
        })}
        insight={{
          kind: "weather",
          text: "Air quality is poor — keep today’s step short and sheltered.",
        }}
        onBegin={vi.fn()}
      />,
    );
    expect(screen.getByTestId("today-home-insight")).toHaveAttribute("data-insight-kind", "weather");
    expect(screen.getByTestId("today-home-insight")).toHaveTextContent(/air quality is poor/i);
  });
});
