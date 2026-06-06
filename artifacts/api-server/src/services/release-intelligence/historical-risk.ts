/**
 * Historical learning — file/component/hook risk multipliers from past incidents.
 * Updated when engineers confirm regressions; read-only at release time.
 */
export type HistoricalRiskProfile = {
  file: string;
  component: string;
  hooks: string[];
  p0Incidents: number;
  riskMultiplier: number;
};

export const HISTORICAL_RISK_PROFILES: HistoricalRiskProfile[] = [
  {
    file: "artifacts/kidschedule/src/pages/children/form.tsx",
    component: "ChildForm",
    hooks: ["useEffect", "useWatch"],
    p0Incidents: 4,
    riskMultiplier: 3,
  },
  {
    file: "artifacts/kidschedule/src/lib/child-form-hydration.ts",
    component: "ChildForm",
    hooks: ["other"],
    p0Incidents: 2,
    riskMultiplier: 2.5,
  },
  {
    file: "artifacts/kidschedule/src/lib/crash-recovery.ts",
    component: "Dashboard",
    hooks: ["other"],
    p0Incidents: 1,
    riskMultiplier: 1.5,
  },
  {
    file: "artifacts/kidschedule/src/lib/self-healing/orchestrator.ts",
    component: "SelfHealing",
    hooks: ["other"],
    p0Incidents: 1,
    riskMultiplier: 1.5,
  },
  {
    file: "lib/notification-engine/src/delivery/guard.ts",
    component: "NotificationEngine",
    hooks: ["other"],
    p0Incidents: 1,
    riskMultiplier: 1.5,
  },
];

export function getHistoricalRiskForFile(path: string): HistoricalRiskProfile | null {
  const normalized = path.replace(/\\/g, "/");
  return (
    HISTORICAL_RISK_PROFILES.find(
      (p) =>
        normalized === p.file ||
        normalized.endsWith(p.file) ||
        p.file.endsWith(normalized),
    ) ?? null
  );
}

export function getHistoricalRiskForComponent(component: string): HistoricalRiskProfile | null {
  const matches = HISTORICAL_RISK_PROFILES.filter((p) => p.component === component);
  if (matches.length === 0) return null;
  return matches.reduce((best, cur) =>
    cur.p0Incidents > best.p0Incidents ? cur : best,
  );
}
