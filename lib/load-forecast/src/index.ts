// ─────────────────────────────────────────────────────────────────────────
// @workspace/load-forecast — public surface.
// ─────────────────────────────────────────────────────────────────────────

export type {
  BottleneckPrediction,
  CaregiverLoadForecast,
  ForecastOptions,
  HistoricalDay,
  LoadBucketSeries,
  LoadHotspot,
  MultiDayForecast,
  RebalanceProposal,
} from "./types";

export {
  buildDayLoadSeries,
  detectHotspots,
  forecastDailyLoad,
  forecastHorizon,
  historicalLoadProfile,
  predictBottlenecks,
  recommendRebalance,
} from "./forecast";
