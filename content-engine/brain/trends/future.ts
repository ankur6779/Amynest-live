import type { TrendProviderHealth, TrendSignal } from "../../types/campaign-plan.js";
import type { TrendProvider, TrendQuery } from "./types.js";

export class FutureTrendProvider implements TrendProvider {
  readonly id = "future" as const;

  async health(): Promise<TrendProviderHealth> {
    return {
      ok: false,
      message: "FutureTrendProvider is a reserved extension slot",
      checkedAt: new Date().toISOString(),
    };
  }

  async fetchTrends(_query: TrendQuery): Promise<TrendSignal[]> {
    throw new Error(
      "FutureTrendProvider is not configured. Register a concrete trend provider.",
    );
  }
}
