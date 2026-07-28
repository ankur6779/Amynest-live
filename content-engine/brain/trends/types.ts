import type {
  TrendProviderHealth,
  TrendProviderId,
  TrendSignal,
} from "../../types/campaign-plan.js";
import type { TopicCategory } from "../../types/index.js";

export interface TrendQuery {
  region: string;
  keywords?: string[];
  categories?: TopicCategory[];
  limit?: number;
}

/**
 * Provider-agnostic trend contract.
 * Orchestration never hardcodes vendor SDKs — only this interface.
 */
export interface TrendProvider {
  readonly id: TrendProviderId;
  health(): Promise<TrendProviderHealth>;
  fetchTrends(query: TrendQuery): Promise<TrendSignal[]>;
}
