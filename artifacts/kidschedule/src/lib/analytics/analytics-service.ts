import {
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "@workspace/analytics-taxonomy";
import type { AnalyticsRuntimeContext } from "./context";
import { getAnalyticsRuntimeContext } from "./context";
import { AnalyticsEventQueue } from "./event-queue";
import { buildEnvelopeFields, scrubAnalyticsProps } from "./privacy";
import {
  SessionManager,
  installSessionLifecycle,
  type SessionEndReason,
} from "./session-manager";
import type { AuthFetchFn, QueuedAnalyticsEvent } from "./constants";

export type AnalyticsServiceConfig = Partial<AnalyticsRuntimeContext>;

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
    }
  }

  dispose(): void {
    this.lifecycleCleanup?.();
    this.onlineCleanup?.();
    this.lifecycleCleanup = null;
    this.onlineCleanup = null;
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
    const props: Record<string, unknown> = {
      ...scrubbed,
      ...envelope,
      platform: ctx.platform,
      os: ctx.os,
      browser: ctx.browser,
      language: ctx.language,
    };
    if (ctx.subscriptionState) props.subscription_state = ctx.subscriptionState;
    if (ctx.childAgeBand) props.child_age_band = ctx.childAgeBand;
    if (ctx.country) props.country = ctx.country;

    const event: QueuedAnalyticsEvent = {
      name,
      props,
      sessionId: this.session.getSessionId(),
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
    } = {},
  ): void {
    this.track("error_captured", {
      error_class: errorClass,
      message: message.slice(0, 500),
      route: opts.route ?? this.currentPath,
      screen: opts.screen ?? this.currentScreen,
      status_code: opts.statusCode,
      feature: opts.feature,
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

  trackAppOpen(): void {
    if (!this.session.shouldEmitAppOpen()) return;
    const cold = this.session.shouldEmitFirstOpen();
    if (cold) {
      this.track("first_open", { cold: true }, { dedupe: false });
    }
    this.track("app_open", {}, { dedupe: false });
    this.track("session_start", {}, { dedupe: false });
  }

  async flush(authFetch?: AuthFetchFn): Promise<void> {
    await this.queue.flush(authFetch);
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
