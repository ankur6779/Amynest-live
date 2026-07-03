import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { AnalyticsEventName, AnalyticsEventProps } from "@workspace/analytics-taxonomy";
import {
  AnalyticsService,
  getAnalyticsService,
} from "./analytics-service";
import type { AnalyticsServiceConfig } from "./analytics-service";
import type { AuthFetchFn } from "./constants";
import { installAnalyticsErrorBridge } from "./error-bridge";
import { installAnalyticsPerformanceBridge } from "./performance-bridge";

export type AnalyticsContextValue = {
  service: AnalyticsService;
  track: <E extends AnalyticsEventName>(
    name: E,
    props: AnalyticsEventProps<E>,
  ) => void;
  trackButtonClick: AnalyticsService["trackButtonClick"];
  trackFeatureOpen: AnalyticsService["trackFeatureOpen"];
  trackFeatureComplete: AnalyticsService["trackFeatureComplete"];
  trackFunnel: AnalyticsService["trackFunnel"];
  flush: (authFetch?: AuthFetchFn) => Promise<void>;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export type AnalyticsProviderProps = {
  children: ReactNode;
  authFetch?: AuthFetchFn | null;
  context?: AnalyticsServiceConfig;
};

export function AnalyticsProvider({
  children,
  authFetch = null,
  context,
}: AnalyticsProviderProps) {
  const service = useMemo(() => getAnalyticsService(), []);

  useEffect(() => {
    service.setAuthFetch(authFetch ?? null);
  }, [service, authFetch]);

  useEffect(() => {
    if (context) service.updateContext(context);
  }, [service, context]);

  useEffect(() => {
    const removeErrors = installAnalyticsErrorBridge(service);
    const removePerf = installAnalyticsPerformanceBridge(service);
    return () => {
      removeErrors();
      removePerf();
    };
  }, [service]);

  const track = useCallback(
    <E extends AnalyticsEventName>(name: E, props: AnalyticsEventProps<E>) => {
      service.track(name, props);
    },
    [service],
  );

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      service,
      track,
      trackButtonClick: service.trackButtonClick.bind(service),
      trackFeatureOpen: service.trackFeatureOpen.bind(service),
      trackFeatureComplete: service.trackFeatureComplete.bind(service),
      trackFunnel: service.trackFunnel.bind(service),
      flush: (fetcher) => service.flush(fetcher),
    }),
    [service, track],
  );

  return (
    <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    const service = getAnalyticsService();
    return {
      service,
      track: service.track.bind(service),
      trackButtonClick: service.trackButtonClick.bind(service),
      trackFeatureOpen: service.trackFeatureOpen.bind(service),
      trackFeatureComplete: service.trackFeatureComplete.bind(service),
      trackFunnel: service.trackFunnel.bind(service),
      flush: service.flush.bind(service),
    };
  }
  return ctx;
}
