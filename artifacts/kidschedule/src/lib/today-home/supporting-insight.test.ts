import { describe, expect, it } from "vitest";
import {
  buildWeatherInsightLine,
  resolveSupportingInsight,
  weatherChangesRecommendation,
} from "./supporting-insight";

describe("supporting insight", () => {
  it("keeps weather silent when it does not change the recommendation", () => {
    expect(
      weatherChangesRecommendation({
        outdoorSuitability: "yes",
        aqiBucket: "good",
        temperatureC: 24,
      }),
    ).toBe(false);
    expect(
      buildWeatherInsightLine({
        outdoorSuitability: "yes",
        aqiBucket: "good",
        temperatureC: 24,
      }),
    ).toBeNull();
  });

  it("lets weather speak only when it changes today’s recommendation", () => {
    expect(
      weatherChangesRecommendation({
        outdoorSuitability: "no",
        aqiBucket: "moderate",
        temperatureC: 22,
      }),
    ).toBe(true);
    const insight = resolveSupportingInsight({
      weather: {
        outdoorSuitability: "no",
        aqiBucket: "moderate",
        temperatureC: 22,
        line: "Outdoor time isn’t kind today — Amy chose an indoor next step.",
      },
      familyHeadline: "Amy remembers your rhythm",
    });
    expect(insight?.kind).toBe("weather");
  });

  it("picks exactly one non-weather insight when weather is silent", () => {
    const insight = resolveSupportingInsight({
      weather: {
        outdoorSuitability: "yes",
        aqiBucket: "good",
        temperatureC: 24,
        line: "",
      },
      familyHeadline: "Amy adapted today’s plan gently.",
      infantLine: "Feeding window open",
    });
    expect(insight).toEqual({
      kind: "family",
      text: "Amy adapted today’s plan gently.",
    });
  });

  it("remains silent when nothing supports the hero", () => {
    expect(resolveSupportingInsight({})).toBeNull();
  });
});
