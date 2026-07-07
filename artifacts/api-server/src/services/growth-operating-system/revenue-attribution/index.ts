import type { FunnelStage } from "../../growth-dashboard/types.js";

export type AttributionStage = {
  key: string;
  label: string;
  users: number;
  conversionPct: number | null;
  dropPct: number | null;
};

const STAGE_MAP: Record<string, string> = {
  store_visit: "campaign",
  install: "install",
  signup: "signup",
  routine_generated: "routine_generated",
  speech_coach_started: "speech_coach_started",
  nutrition_hub_used: "nutrition_hub_used",
  trial_started: "trial_started",
  subscription_purchased: "subscription_purchased",
  renewed: "renewed",
};

const LABELS: Record<string, string> = {
  campaign: "Campaign (UTM / Store)",
  install: "Install",
  signup: "Signup",
  routine_generated: "Routine Generated",
  speech_coach_started: "Speech Coach",
  nutrition_hub_used: "Nutrition",
  trial_started: "Trial",
  subscription_purchased: "Subscription",
  renewed: "Renewal",
};

const ORDER = Object.keys(LABELS);

export function buildRevenueAttribution(funnel: FunnelStage[]): {
  stages: AttributionStage[];
  note: string | null;
} {
  const byKey = new Map<string, FunnelStage>();
  for (const f of funnel) {
    const mapped = STAGE_MAP[f.key] ?? f.key;
    const existing = byKey.get(mapped);
    if (!existing || f.users > existing.users) {
      byKey.set(mapped, { ...f, key: mapped, label: LABELS[mapped] ?? f.label });
    }
  }

  if (!byKey.has("campaign") && byKey.has("install")) {
    const install = byKey.get("install")!;
    byKey.set("campaign", { ...install, key: "campaign", label: LABELS.campaign! });
  }

  const stages: AttributionStage[] = [];
  let prevUsers = 0;

  for (const key of ORDER) {
    const stage = byKey.get(key);
    const users = stage?.users ?? 0;
    const conversionPct =
      stages.length === 0 || prevUsers === 0 ? null : Math.round((users / prevUsers) * 1000) / 10;
    const dropPct =
      stages.length === 0 || prevUsers === 0
        ? null
        : Math.round(((prevUsers - users) / prevUsers) * 1000) / 10;
    stages.push({
      key,
      label: LABELS[key] ?? key,
      users,
      conversionPct,
      dropPct,
    });
    if (users > 0) prevUsers = users;
  }

  const hasSubs = stages.find((s) => s.key === "subscription_purchased")?.users ?? 0;
  return {
    stages,
    note:
      hasSubs > 0
        ? null
        : "Revenue attribution uses in-app funnel events; store revenue may also arrive via billing webhooks.",
  };
}
