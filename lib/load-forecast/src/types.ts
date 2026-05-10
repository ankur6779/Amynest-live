// ─────────────────────────────────────────────────────────────────────────
// @workspace/load-forecast — Predictive Caregiver Load Forecasting
//
// Patent-positioning vocabulary (internal only): "predictive caregiver
// allocation", "anticipatory bottleneck detection", "exponential temporal
// load smoothing", "multi-horizon household demand projection",
// "rebalance proposal synthesis".
// ─────────────────────────────────────────────────────────────────────────

import type {
  CaregiverAvailability,
  ChildRoutineInput,
} from "@workspace/conflict-resolution";
import type { HandlerKey } from "@workspace/family-routine";

/** A single historical day's routines for the household (one entry per child). */
export interface HistoricalDay {
  /** "YYYY-MM-DD". */
  date: string;
  routines: ChildRoutineInput[];
}

/** Per-15-min (or configurable) bucket load profile across the day. */
export interface LoadBucketSeries {
  /** Bucket size in minutes (default 15). */
  bucketMinutes: number;
  /** dayBuckets = ceil(1440 / bucketMinutes). */
  buckets: number;
  /** load[caregiver][bucketIndex] = expected number of children needing that
   *  caregiver during that bucket. Decimal because of EWMA blending. */
  load: Record<HandlerKey, number[]>;
}

/** A single anticipated hot-spot — a window where projected load exceeds
 *  caregiver capacity. */
export interface LoadHotspot {
  /** Stable hash for client diffing. */
  id: string;
  caregiver: HandlerKey;
  /** Display "H:MM AM/PM". */
  startTime: string;
  endTime: string;
  /** 24h "HH:MM" — programmatic sort key. */
  startTime24: string;
  endTime24: string;
  /** Projected demand at peak (children-per-caregiver). */
  projectedLoad: number;
  /** Caregiver's known capacity. */
  capacity: number;
  /** projectedLoad - capacity (>0 means bottleneck). */
  overload: number;
  /** 1..10 — how confident the forecast is (more history → higher). */
  confidence: number;
}

/** A full forecast for a single target date. */
export interface CaregiverLoadForecast {
  /** Target date being forecasted ("YYYY-MM-DD"). */
  date: string;
  /** How many days of history this forecast was built from. */
  historyDays: number;
  /** Per-caregiver bucketed load series for the day. */
  series: LoadBucketSeries;
  /** Detected (or anticipated) bottleneck windows. */
  hotspots: LoadHotspot[];
  /** Aggregate confidence 1..10. */
  confidence: number;
}

/** Multi-day forecast — Module 2 supports a horizon ≥ 1. */
export interface MultiDayForecast {
  generatedAt: string;            // ISO timestamp
  horizonDays: number;
  forecasts: CaregiverLoadForecast[];
  /** Overall household risk score 0..100 (100 = fully balanced). */
  householdLoadScore: number;
}

/** A suggested rebalance — move an activity from one caregiver to another. */
export interface RebalanceProposal {
  id: string;
  date: string;
  hotspotId: string;
  /** Caregiver currently overloaded. */
  fromCaregiver: HandlerKey;
  /** Caregiver to absorb the load. */
  toCaregiver: HandlerKey;
  /** Affected child + activity (best candidate to move). */
  childId: number;
  childName: string;
  activity: string;
  startTime: string;
  rationale: string;
  /** Projected load reduction if accepted. */
  projectedRelief: number;
}

/** Aggregated bottleneck prediction (≥ horizonDays). */
export interface BottleneckPrediction {
  date: string;
  caregiver: HandlerKey;
  windowLabel: string;            // "07:30–08:15 AM" etc
  severity: "low" | "medium" | "high";
  reason: string;                 // human-readable explanation
}

export interface ForecastOptions {
  /** Target date "YYYY-MM-DD". */
  date: string;
  /** Future horizon, default 1. */
  horizonDays?: number;
  /** History to consider, default 7. */
  lookbackDays?: number;
  /** Bucket size, default 15. */
  bucketMinutes?: number;
  /** Historical days (most-recent first or any order). */
  history: HistoricalDay[];
  /** Optional draft routines for the target day to blend with history. */
  draftRoutines?: ChildRoutineInput[];
  /** Caregiver capacities for hotspot detection. */
  caregivers: CaregiverAvailability[];
  /** EWMA alpha (0 < alpha ≤ 1). Default 0.45 — recent days weighted higher. */
  alpha?: number;
}
