import {
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "@workspace/analytics-taxonomy";
import type { AnalyticsRuntimeContext } from "./context";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { getAnalyticsRuntimeContext } from "./context";
import { AnalyticsEventQueue } from "./event-queue";
import { buildEnvelopeFields, scrubAnalyticsProps } from "./privacy";
import {
  SessionManager,
  installSessionLifecycle,
  type SessionEndReason,
} from "./session-manager";
import {
  HEARTBEAT_INTERVAL_MS,
  type AuthFetchFn,
  type QueuedAnalyticsEvent,
} from "./constants";

export type AnalyticsServiceConfig = Partial<AnalyticsRuntimeContext>;

function detectAuthState(): "authenticated" | "guest" | "unknown" {
  if (typeof localStorage === "undefined") return "unknown";
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith("firebase:authUser")) continue;
      const raw = localStorage.getItem(key);
      if (raw && raw !== "null") return "authenticated";
    }
  } catch {
    return "unknown";
  }
  return "guest";
}

function stringProp(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 64) : undefined;
}

function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function readDeviceFacts(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const w = window as Window & {
    __AMYNEST_DEVICE_INFO?: Record<string, unknown>;
  };
  const info = w.__AMYNEST_DEVICE_INFO ?? {};
  const out: Record<string, string> = {};
  for (const key of ["os_version", "device_model", "webview_version", "app_build"] as const) {
    const value = info[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim().slice(0, 64);
  }
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  if (typeof connection?.effectiveType === "string" && connection.effectiveType) {
    out.network_type = connection.effectiveType.slice(0, 32);
  }
  return out;
}

function attachInstallAttribution(props: Record<string, unknown>): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("amynest:install_attribution");
    const attr = raw
      ? (JSON.parse(raw) as {
          utmSource?: string;
          utmMedium?: string;
          utmCampaign?: string;
          campaignId?: string;
          gclid?: string;
          gbraid?: string;
          wbraid?: string;
          fbclid?: string;
          ref?: string;
          playReferrer?: string;
        })
      : null;
    if (!props.install_source) {
      if (attr?.gclid) props.install_source = "google_ads";
      else if (attr?.fbclid) props.install_source = "meta_ads";
      else if (attr?.utmSource) props.install_source = attr.utmSource;
      else if (attr?.ref) props.install_source = "referral";
      else if (attr?.playReferrer) props.install_source = "play_referrer";
      else props.install_source = attr ? "organic" : "unknown";
    }
    if (attr?.utmSource && !props.utm_source) props.utm_source = attr.utmSource;
    if (attr?.utmMedium && !props.utm_medium) props.utm_medium = attr.utmMedium;
    if (attr?.utmCampaign && !props.utm_campaign) props.utm_campaign = attr.utmCampaign;
    if (attr?.gclid && !props.gclid) props.gclid = attr.gclid;
    if (attr?.gbraid && !props.gbraid) props.gbraid = attr.gbraid;
    if (attr?.wbraid && !props.wbraid) props.wbraid = attr.wbraid;
    if (attr?.fbclid && !props.fbclid) props.fbclid = attr.fbclid;
    if (attr?.utmCampaign && !props.utm_campaign) props.utm_campaign = attr.utmCampaign;
    if (attr?.campaignId && !props.campaign_id) props.campaign_id = attr.campaignId;
    const capturedAt = raw ? (JSON.parse(raw) as { capturedAt?: string }).capturedAt : undefined;
    if (capturedAt && !props.first_touch_at) props.first_touch_at = capturedAt;
    const lastRaw = localStorage.getItem("amynest:last_touch_attribution");
    if (lastRaw) {
      const last = JSON.parse(lastRaw) as {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        gclid?: string;
        gbraid?: string;
        wbraid?: string;
        campaignId?: string;
        at?: string;
      };
      if (last.utmSource && !props.last_touch_source) props.last_touch_source = last.utmSource;
      if (last.utmMedium && !props.last_touch_medium) props.last_touch_medium = last.utmMedium;
      if (last.utmCampaign && !props.last_touch_campaign) props.last_touch_campaign = last.utmCampaign;
      if (last.gclid && !props.last_touch_gclid) props.last_touch_gclid = last.gclid;
      if (last.gbraid && !props.last_touch_gbraid) props.last_touch_gbraid = last.gbraid;
      if (last.wbraid && !props.last_touch_wbraid) props.last_touch_wbraid = last.wbraid;
      if (last.campaignId && !props.last_touch_campaign_id) props.last_touch_campaign_id = last.campaignId;
      if (last.at && !props.last_touch_at) props.last_touch_at = last.at;
    }
  } catch {
    if (!props.install_source) props.install_source = "unknown";
  }
}

/**
 * Single analytics entry point for the entire app.
 * All product telemetry flows through this service.
 */
export class AnalyticsService {
  private readonly session = new SessionManager();
  private readonly queue: AnalyticsEventQueue;
  private contextOverrides: Partial<AnalyticsRuntimeContext> = {};
  private currentScreen = "";
  private currentPath = "";
  private lifecycleCleanup: (() => void) | null = null;
  private onlineCleanup: (() => void) | null = null;
  private firstOpenAwaitingAck = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private visibilityCleanup: (() => void) | null = null;
  private foregroundStartedAt = Date.now();
  private hiddenAt: number | null = null;
  private lastPageView: { path: string; at: number } | null = null;
  private readonly featureStartedAt = new Map<string, number>();

  /** Dedupe guard — prevents duplicate emitters for the same logical action */
  private readonly recentFingerprints = new Map<string, number>();
  private static readonly DEDUPE_MS = 300;

  constructor() {
    this.queue = new AnalyticsEventQueue(() => this.getContext());
    this.session.onRotate((info) => {
      this.track("session_end", {
        reason: info.reason as SessionEndReason,
        duration_ms: info.durationMs,
        event_count: info.eventCount,
      });
      this.track("session_start", {
        durationSinceLastMs: info.durationMs,
      });
      void this.queue.flush();
    });
  }

  initialize(): void {
    if (this.lifecycleCleanup) return;
    this.lifecycleCleanup = installSessionLifecycle(this.session);
    if (typeof window !== "undefined") {
      const onOnline = () => void this.queue.flush();
      window.addEventListener("online", onOnline);
      this.onlineCleanup = () => window.removeEventListener("online", onOnline);
      document.addEventListener("visibilitychange", this.onVisibility);
      this.visibilityCleanup = () => document.removeEventListener("visibilitychange", this.onVisibility);
      if (typeof document === "undefined" || document.visibilityState !== "hidden") {
        this.startHeartbeat();
      }
    }
  }

  dispose(): void {
    this.lifecycleCleanup?.();
    this.onlineCleanup?.();
    this.visibilityCleanup?.();
    this.stopHeartbeat();
    this.lifecycleCleanup = null;
    this.onlineCleanup = null;
    this.visibilityCleanup = null;
  }

  private onVisibility = (): void => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "hidden") {
      const foregroundMs = Math.max(0, Date.now() - this.foregroundStartedAt);
      this.hiddenAt = Date.now();
      this.stopHeartbeat();
      this.track("app_background", { foreground_ms: foregroundMs }, { dedupe: false });
      void this.queue.flush();
      return;
    }
    const backgroundMs = this.hiddenAt ? Math.max(0, Date.now() - this.hiddenAt) : 0;
    this.hiddenAt = null;
    this.foregroundStartedAt = Date.now();
    this.track("app_foreground", { background_ms: backgroundMs }, { dedupe: false });
    this.startHeartbeat();
  };

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      this.track(
        "session_heartbeat",
        {
          active_ms: Math.max(0, Date.now() - this.foregroundStartedAt),
          interval_ms: HEARTBEAT_INTERVAL_MS,
        },
        { dedupe: false },
      );
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  setAuthFetch(fetcher: AuthFetchFn | null): void {
    this.queue.setAuthFetch(fetcher);
  }

  updateContext(overrides: AnalyticsServiceConfig): void {
    this.contextOverrides = { ...this.contextOverrides, ...overrides };
  }

  setCurrentScreen(screen: string, path: string): void {
    this.currentScreen = screen;
    this.currentPath = path;
  }

  getContext(): AnalyticsRuntimeContext {
    return getAnalyticsRuntimeContext(this.contextOverrides);
  }

  private fingerprint(name: string, props: Record<string, unknown>): string {
    return `${name}:${JSON.stringify(props)}`;
  }

  private shouldDedupe(name: string, props: Record<string, unknown>): boolean {
    const fp = this.fingerprint(name, props);
    const now = Date.now();
    const last = this.recentFingerprints.get(fp);
    if (last && now - last < AnalyticsService.DEDUPE_MS) return true;
    this.recentFingerprints.set(fp, now);
    if (this.recentFingerprints.size > 200) {
      const cutoff = now - AnalyticsService.DEDUPE_MS;
      for (const [k, t] of this.recentFingerprints) {
        if (t < cutoff) this.recentFingerprints.delete(k);
      }
    }
    return false;
  }

  private emit(
    name: AnalyticsEventName,
    rawProps: Record<string, unknown>,
    options?: { dedupe?: boolean },
  ): void {
    if (options?.dedupe !== false && this.shouldDedupe(name, rawProps)) return;

    const ctx = this.getContext();
    const envelope = buildEnvelopeFields({
      appVersion: ctx.appVersion,
      buildNumber: ctx.buildNumber,
      environment: ctx.environment,
    });

    const scrubbed = scrubAnalyticsProps(rawProps);
    const deviceId = getOrCreateDeviceId();
    const sessionId = this.session.getSessionId();
    const props: Record<string, unknown> = {
      ...scrubbed,
      ...envelope,
      platform: ctx.platform,
      os: ctx.os,
      browser: ctx.browser,
      language: ctx.language,
      device_id: deviceId,
      installation_id: deviceId,
      anonymous_device_id: deviceId,
      session_id: sessionId,
    };
    if (!props.route && this.currentPath) props.route = this.currentPath;
    if (ctx.subscriptionState) props.subscription_state = ctx.subscriptionState;
    if (ctx.childAgeBand) props.child_age_band = ctx.childAgeBand;
    if (ctx.country) props.country = ctx.country;
    attachInstallAttribution(props);
    if (!props.auth_state) {
      props.auth_state = detectAuthState();
    }
    const facts = readDeviceFacts();
    for (const [key, value] of Object.entries(facts)) {
      if (!props[key]) props[key] = value;
    }
    if (!props.event_schema_version) props.event_schema_version = "1.1.0";

    const event: QueuedAnalyticsEvent = {
      name,
      eventId: newEventId(),
      props,
      sessionId,
      clientTs: new Date().toISOString(),
    };

    this.session.incrementEventCount();
    this.session.touchActivity();
    this.queue.enqueue(event);
  }

  track<E extends AnalyticsEventName>(
    name: E,
    props: AnalyticsEventProps<E>,
    options?: { dedupe?: boolean },
  ): void {
    this.emit(name, (props ?? {}) as Record<string, unknown>, options);
  }

  trackScreenView(path: string, source?: string): void {
    const screen = path.split("?")[0] || "/";
    this.track(
      "navigation",
      {
        from_route: this.currentPath || "/",
        to_route: screen,
        trigger: source === "back" ? "back" : "programmatic",
      },
      { dedupe: false },
    );
    this.track(
      "screen_view",
      {
        screen,
        path,
        navigation_source: source,
        subscription_state: this.contextOverrides.subscriptionState,
      },
      { dedupe: false },
    );
    this.currentScreen = screen;
    this.currentPath = path;
  }

  trackScreenLeave(screen: string, timeOnScreenMs: number, destination?: string): void {
    this.track(
      "screen_leave",
      {
        screen,
        path: this.currentPath,
        time_on_screen_ms: Math.round(timeOnScreenMs),
        navigation_destination: destination,
      },
      { dedupe: false },
    );
  }

  trackButtonClick(
    buttonId: string,
    extra?: {
      screen?: string;
      feature?: string;
      label?: string;
    },
  ): void {
    this.track("button_click", {
      button_id: buttonId,
      screen: extra?.screen ?? this.currentScreen,
      feature: extra?.feature,
      label: extra?.label,
      subscription_state: this.contextOverrides.subscriptionState,
    });
  }

  trackFeatureOpen(featureId: string, source?: string): void {
    this.track("feature_open", {
      feature_id: featureId,
      screen: this.currentScreen,
      source,
      subscription_state: this.contextOverrides.subscriptionState,
    });
  }

  trackFeatureComplete(
    featureId: string,
    durationMs?: number,
    success = true,
  ): void {
    this.track("feature_complete", {
      feature_id: featureId,
      screen: this.currentScreen,
      duration_ms: durationMs,
      success,
    });
  }

  trackFunnel(
    funnel: "subscription" | "onboarding" | "growth",
    step: string,
    props: Record<string, string | number | boolean | undefined> = {},
  ): void {
    const cleaned: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(props)) {
      if (v !== undefined) cleaned[k] = String(v).slice(0, 64);
    }
    if (funnel === "subscription") {
      this.track("subscription_funnel_event", { step, ...cleaned });
    } else if (funnel === "onboarding") {
      this.track("onboarding_funnel_event", { step, ...cleaned });
    } else {
      this.track("growth_funnel_event", { step, ...cleaned });
    }
  }

  trackPerformance(
    metric:
      | "api_duration"
      | "screen_render"
      | "ai_response"
      | "startup_time"
      | "cache_hit"
      | "cache_miss",
    opts: {
      durationMs?: number;
      path?: string;
      screen?: string;
      cacheKey?: string;
      success?: boolean;
    } = {},
  ): void {
    this.track("performance_metric", {
      metric,
      duration_ms: opts.durationMs,
      path: opts.path,
      screen: opts.screen ?? this.currentScreen,
      cache_key: opts.cacheKey,
      success: opts.success,
    });
  }

  trackError(
    errorClass:
      | "react"
      | "api"
      | "ai"
      | "network"
      | "database"
      | "unhandled"
      | "unknown",
    message: string,
    opts: {
      route?: string;
      screen?: string;
      statusCode?: number;
      feature?: string;
      fingerprint?: string;
      stack_hash?: string;
      component?: string;
      session_id?: string;
    } = {},
  ): void {
    this.track("error_captured", {
      error_class: errorClass,
      message: message.slice(0, 500),
      route: opts.route ?? this.currentPath,
      screen: opts.screen ?? this.currentScreen,
      status_code: opts.statusCode,
      feature: opts.feature,
      fingerprint: opts.fingerprint,
      stack_hash: opts.stack_hash,
      component: opts.component,
      session_id: opts.session_id,
    });
  }

  trackSearchQuery(
    query: string,
    opts: { screen?: string; resultCount?: number } = {},
  ): void {
    const trimmed = query.trim().slice(0, 256);
    if (!trimmed) return;
    const screen = opts.screen ?? this.currentScreen;
    const resultCount = opts.resultCount;
    this.track("search_query", {
      query: trimmed,
      screen,
      result_count: resultCount,
    });
    if (resultCount === 0) {
      this.track("search_no_results", { query: trimmed, screen });
    }
  }

  trackAssetDownload(
    assetType: string,
    opts: { assetId?: string; feature?: string } = {},
  ): void {
    this.track("asset_download", {
      asset_type: assetType.slice(0, 64),
      asset_id: opts.assetId?.slice(0, 128),
      feature: opts.feature?.slice(0, 80),
    });
  }

  trackEvent<E extends AnalyticsEventName>(
    eventName: E,
    properties: AnalyticsEventProps<E>,
  ): void {
    this.track(eventName, properties);
  }

  trackPageView(pageName: string, properties: Record<string, unknown> = {}): void {
    const path = String(properties.path ?? properties.page_path ?? pageName);
    const now = Date.now();
    if (this.lastPageView && this.lastPageView.path === path && now - this.lastPageView.at < 800) {
      return;
    }
    this.lastPageView = { path, at: now };
    const screen = String(properties.screen ?? path);
    this.track(
      "page_view",
      {
        screen,
        path,
        page_name: typeof properties.page_name === "string" ? properties.page_name : pageName,
        page_path: path,
        previous_page: typeof properties.previous_page === "string" ? properties.previous_page : undefined,
        referrer_page: typeof properties.referrer_page === "string" ? properties.referrer_page : undefined,
        route_transition_id:
          typeof properties.route_transition_id === "string" ? properties.route_transition_id : undefined,
        page_visit_id: typeof properties.page_visit_id === "string" ? properties.page_visit_id : undefined,
        feature_name: typeof properties.feature_name === "string" ? properties.feature_name : undefined,
        navigation_source:
          typeof properties.navigation_source === "string" ? properties.navigation_source : undefined,
      },
      { dedupe: false },
    );
    this.currentScreen = screen;
    this.currentPath = path;
  }

  trackPageExit(pageName: string, properties: Record<string, unknown> = {}): void {
    const path = String(properties.path ?? properties.page_path ?? this.currentPath ?? pageName);
    const screen = String(properties.screen ?? path);
    const duration = Number(properties.active_duration_ms ?? properties.page_duration_ms ?? 0);
    const active = Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0;
    this.track(
      "page_exit",
      {
        screen,
        path,
        page_name: typeof properties.page_name === "string" ? properties.page_name : pageName,
        page_path: path,
        previous_page: typeof properties.previous_page === "string" ? properties.previous_page : undefined,
        next_page: typeof properties.next_page === "string" ? properties.next_page : undefined,
        page_visit_id: typeof properties.page_visit_id === "string" ? properties.page_visit_id : undefined,
        route_transition_id:
          typeof properties.route_transition_id === "string" ? properties.route_transition_id : undefined,
        feature_name: typeof properties.feature_name === "string" ? properties.feature_name : undefined,
        page_duration_ms: active,
        active_duration_ms: active,
        time_on_screen_ms: active,
      },
      { dedupe: false },
    );
  }

  trackFeatureUsage(
    featureName: string,
    action: "viewed" | "started" | "interaction" | "completed" | "abandoned" | "error",
    properties: Record<string, unknown> = {},
  ): void {
    const name = featureName.slice(0, 80);
    if (!name) return;
    if (action === "started") this.featureStartedAt.set(name, Date.now());
    const startedAt = this.featureStartedAt.get(name);
    const duration =
      startedAt && (action === "completed" || action === "abandoned")
        ? Math.max(0, Date.now() - startedAt)
        : undefined;
    if (action === "completed" || action === "abandoned") this.featureStartedAt.delete(name);
    const screen = this.currentScreen || undefined;
    if (action === "viewed") {
      this.track("feature_viewed", {
        feature_name: name,
        screen,
        source: stringProp(properties.source),
        page_visit_id: stringProp(properties.page_visit_id),
      });
    } else if (action === "started") {
      this.track("feature_started", { feature_name: name, screen, source: stringProp(properties.source) });
    } else if (action === "interaction") {
      this.track("feature_interaction", {
        feature_name: name,
        screen,
        interaction_type: stringProp(properties.interaction_type),
        source: stringProp(properties.source),
      });
    } else if (action === "completed") {
      this.track("feature_completed", {
        feature_name: name,
        screen,
        duration_ms: duration,
        success: properties.success !== false,
      });
    } else if (action === "abandoned") {
      this.track("feature_abandoned", {
        feature_name: name,
        screen,
        duration_ms: duration,
        reason: stringProp(properties.reason),
      });
    } else {
      this.track("feature_error", {
        feature_name: name,
        screen,
        error_class: stringProp(properties.error_class) ?? "unknown",
      });
    }
    if ((action === "started" || action === "completed") && this.session.claimFirstFeature()) {
      this.track("first_feature_used", { feature_name: name, source: stringProp(properties.source) });
    }
  }

  /** Modal and drawer UI. Not a page view. */
  trackModal(name: string, action: "open" | "close", properties: Record<string, unknown> = {}): void {
    this.trackFeatureUsage(name, "interaction", {
      ...properties,
      interaction_type: action === "open" ? "modal_open" : "modal_close",
    });
  }

  trackScrollMilestone(depthPct: 25 | 50 | 75 | 100, pageVisitId?: string): void {
    const screen = this.currentScreen || this.currentPath || "/";
    this.track(
      "scroll_milestone",
      { screen, depth_pct: depthPct, page_visit_id: pageVisitId },
      { dedupe: false },
    );
  }

  startSession(): void {
    this.session.getSessionId();
    this.trackAppOpen();
  }

  endSession(): void {
    this.session.rotateSession("manual");
  }

  trackAppOpen(): void {
    if (!this.session.shouldEmitAppOpen()) return;
    const cold = this.session.shouldEmitFirstOpen();
    if (cold) {
      const deviceId = getOrCreateDeviceId();
      this.firstOpenAwaitingAck = true;
      this.track(
        "first_open",
        {
          cold: true,
          event_key: `${deviceId}:first_open`,
          anonymous_id: `device:${deviceId}`,
          device_id: deviceId,
          auth_state: detectAuthState() === "authenticated" ? "authenticated" : "guest",
        },
        { dedupe: false },
      );
    }
    this.track("app_open", {}, { dedupe: false });
    this.track("session_start", {}, { dedupe: false });
  }

  async flush(authFetch?: AuthFetchFn): Promise<void> {
    await this.queue.flush(authFetch);
    if (this.firstOpenAwaitingAck && !this.queue.hasEvent("first_open")) {
      this.session.markFirstOpenDelivered();
      this.firstOpenAwaitingAck = false;
    }
  }

  pendingCount(): number {
    return this.queue.pendingCount();
  }
}

let singleton: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!singleton) {
    singleton = new AnalyticsService();
    singleton.initialize();
  }
  return singleton;
}

/** Test helper */
export function resetAnalyticsServiceForTests(): void {
  singleton?.dispose();
  singleton = null;
}
