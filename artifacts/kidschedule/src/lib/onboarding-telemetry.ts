type AmyNestTelemetryWindow = Window & {
  __amynestOnboardingRunId?: string;
  __amynestOnboardingStep?: string;
};

let activeRunId: string | null = null;

export function createOnboardingRunId(): string {
  const id = crypto.randomUUID();
  activeRunId = id;
  if (typeof window !== "undefined") {
    (window as AmyNestTelemetryWindow).__amynestOnboardingRunId = id;
  }
  return id;
}

export function getOnboardingRunId(): string | null {
  if (activeRunId) return activeRunId;
  if (typeof window === "undefined") return null;
  return (window as AmyNestTelemetryWindow).__amynestOnboardingRunId ?? null;
}

export function clearOnboardingRunId(): void {
  activeRunId = null;
  if (typeof window !== "undefined") {
    delete (window as AmyNestTelemetryWindow).__amynestOnboardingRunId;
  }
}

export function getOnboardingStep(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as AmyNestTelemetryWindow).__amynestOnboardingStep;
}

export function buildOnboardingTelemetryPayload(
  extra: Record<string, unknown>,
  opts?: { userId?: string | null; step?: string },
): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    onboardingRunId: getOnboardingRunId(),
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    step: opts?.step ?? getOnboardingStep(),
    userId: opts?.userId ?? null,
    ...extra,
  };
}
