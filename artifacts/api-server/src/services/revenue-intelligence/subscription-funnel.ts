import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "../growth-dashboard/sqlHelpers.js";
import type { SubscriptionFunnelStage } from "./types.js";

async function countUsers(condition: ReturnType<typeof sql>, range: GrowthTimeRange): Promise<number> {
  const res = await db.execute(sql`
    SELECT count(DISTINCT user_id)::int AS users
    FROM analytics_events
    WHERE ${condition}
      AND server_ts >= ${range.start.toISOString()}::timestamptz
      AND server_ts <= ${range.end.toISOString()}::timestamptz
      AND ${ANALYTICS_NOISE_FILTER}
  `);
  return rowNum((res.rows[0] ?? {}) as Record<string, unknown>, "users");
}

const STAGES: Array<{
  key: string;
  label: string;
  condition: ReturnType<typeof sql>;
  evidence: string;
}> = [
  { key: "install", label: "Install", condition: sql`event_name = 'device_registered'`, evidence: "device_registered" },
  { key: "trial_started", label: "Trial Started", condition: sql`event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started'`, evidence: "trial_started" },
  { key: "trial_active", label: "Trial Active", condition: sql`event_name IN ('subscription_funnel_event') AND props->>'step' IN ('trial_started', 'plan_selected')`, evidence: "trial funnel events" },
  { key: "trial_expired", label: "Trial Expired", condition: sql`event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_expired'`, evidence: "trial_expired" },
  { key: "checkout_started", label: "Checkout Started", condition: sql`event_name = 'subscription_funnel_event' AND props->>'step' = 'checkout_started'`, evidence: "checkout_started" },
  { key: "purchase_success", label: "Purchase Success", condition: sql`(event_name = 'upgrade_completed' OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success'))`, evidence: "upgrade_completed + purchase_success" },
  { key: "renewal", label: "Renewal", condition: sql`event_name = 'subscription_funnel_event' AND props->>'step' ILIKE '%renew%'`, evidence: "renewal funnel steps — sparse" },
  { key: "cancellation", label: "Cancellation", condition: sql`event_name = 'subscription_funnel_event' AND props->>'step' IN ('cancel_confirmed', 'cancel_continue')`, evidence: "cancel_confirmed" },
  { key: "winback", label: "Winback", condition: sql`event_name = 'subscription_funnel_event' AND props->>'step' IN ('winback_converted', 'winback_clicked')`, evidence: "winback_* steps" },
];

export async function computeSubscriptionFunnel(range: GrowthTimeRange): Promise<SubscriptionFunnelStage[]> {
  const counts = await Promise.all(STAGES.map(async (s) => ({ ...s, users: await countUsers(s.condition, range) })));

  return counts.map((stage, idx) => {
    const prev = idx > 0 ? counts[idx - 1] : null;
    const prevUsers = prev?.users ?? stage.users;
    return {
      key: stage.key,
      label: stage.label,
      users: stage.users,
      conversionPct: idx === 0 ? (stage.users > 0 ? 100 : null) : pctRate(stage.users, prevUsers),
      dropPct: idx > 0 && prevUsers > 0 ? pctRate(prevUsers - stage.users, prevUsers) : null,
      available: stage.users > 0 || idx <= 2,
      evidence: stage.evidence,
    };
  });
}
