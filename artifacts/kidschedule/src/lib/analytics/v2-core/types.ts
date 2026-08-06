/**
 * AmyNest V2 Analytics Core — shared types.
 * Constitution V1 · Event Registry V1.
 */

export const V2_ANALYTICS_LAYERS = [
  "product",
  "business",
  "commerce",
  "ads",
  "system",
] as const;

export type V2AnalyticsLayer = (typeof V2_ANALYTICS_LAYERS)[number];

export type V2RegistryStatus = "active" | "reserved" | "deprecated" | "forbidden";

export type V2Platform = "android" | "ios" | "web";

/** Context available to every track call — no child PII. */
export type V2AnalyticsContext = {
  anonymousId: string;
  accountId: string | null;
  sessionId: string;
  journeyId: string | null;
  journeyVersion: number | null;
  appVersion: string | null;
  platform: V2Platform;
};

export type V2RegistryEventDefinition = {
  eventName: string;
  description: string;
  owner: string;
  layer: V2AnalyticsLayer;
  status: V2RegistryStatus;
  eventVersion: number;
  /** Template with `{param}` placeholders filled from payload + context. */
  onceKeyTemplate: string;
  requiredPayloadKeys: readonly string[];
  firebase: boolean;
  googleAds: boolean;
  internal: boolean;
  canOptimize: boolean;
};

export type V2TrackInput = {
  eventName: string;
  /** Must match registry eventVersion. */
  eventVersion: number;
  /** Must match registry layer. */
  layer: V2AnalyticsLayer;
  /** Must match registry owner string. */
  owner: string;
  /**
   * Business payload (no envelope fields required from caller for ids —
   * context supplies anonymousId / sessionId / etc.).
   */
  payload?: Record<string, unknown>;
  /**
   * Optional explicit once-key. If omitted, built from registry template.
   */
  onceKey?: string;
};

export type V2TrackRejectionReason =
  | "unknown_event"
  | "forbidden_event"
  | "reserved_event"
  | "version_mismatch"
  | "layer_mismatch"
  | "owner_mismatch"
  | "missing_payload_key"
  | "invalid_payload"
  | "pii_forbidden"
  | "flag_disabled"
  | "invalid_once_key";

export type V2TrackResult =
  | { ok: true; status: "tracked"; onceKey: string; eventName: string }
  | { ok: true; status: "already_tracked"; onceKey: string; eventName: string }
  | {
      ok: false;
      status: "rejected";
      reason: V2TrackRejectionReason;
      message: string;
      eventName?: string;
    };

/** Envelope attached after validation — sinks receive this later. */
export type V2AnalyticsRecord = {
  eventName: string;
  eventVersion: number;
  layer: V2AnalyticsLayer;
  owner: string;
  onceKey: string;
  context: V2AnalyticsContext;
  payload: Record<string, unknown>;
  occurredAt: string;
};
