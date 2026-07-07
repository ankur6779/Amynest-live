/**
 * One record per attempted notification (sent OR suppressed) enriched with the
 * intelligence metadata this engine now produces. Designed to be projected
 * directly from notification_log + structured suppression logs.
 */
export interface NotificationIntelligenceRecord {
  status: "sent" | "suppressed" | "failed";
  delivered?: boolean;
  opened?: boolean;
  clicked?: boolean;
  dismissed?: boolean;
  converted?: boolean;
  /** Revenue attributed to this notification (minor units or currency float). */
  revenue?: number;
  suppressionReason?: string | null;
  lifecycleStage?: string | null;
  persona?: string | null;
  qualityScore?: number | null;
  decisionExpectedValue?: number | null;
  decisionAccepted?: boolean | null;
  permissionLostAfter?: boolean;
  uninstalledAfter?: boolean;
}

export interface NotificationIntelligenceDashboard {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  dismissed: number;
  ignored: number;
  suppressed: number;
  conversions: number;
  subscriptionRevenue: number;
  ctr: number;
  openRate: number;
  dismissRate: number;
  conversionRate: number;
  revenuePerNotification: number;
  permissionLoss: number;
  uninstallAfterPush: number;
  avgQualityScore: number;
  decisionAcceptanceRate: number;
  avgExpectedValue: number;
  lifecycleDistribution: Record<string, number>;
  personaDistribution: Record<string, number>;
  suppressionBreakdown: Record<string, number>;
}

/**
 * Aggregate notification-intelligence KPIs for the Growth OS dashboard. Pure —
 * accepts a projection of records and returns every metric the dashboard needs.
 */
export function computeNotificationIntelligence(
  records: NotificationIntelligenceRecord[],
): NotificationIntelligenceDashboard {
  const sentRecords = records.filter((r) => r.status === "sent");
  const suppressedRecords = records.filter((r) => r.status === "suppressed");

  const sent = sentRecords.length;
  const delivered = sentRecords.filter((r) => r.delivered !== false).length;
  const opened = sentRecords.filter((r) => r.opened).length;
  const clicked = sentRecords.filter((r) => r.clicked).length;
  const dismissed = sentRecords.filter((r) => r.dismissed).length;
  const conversions = sentRecords.filter((r) => r.converted).length;
  const ignored = sentRecords.filter((r) => !r.opened && !r.dismissed).length;
  const subscriptionRevenue = round2(sum(sentRecords.map((r) => r.revenue ?? 0)));

  const permissionLoss = records.filter((r) => r.permissionLostAfter).length;
  const uninstallAfterPush = records.filter((r) => r.uninstalledAfter).length;

  const qualityScores = records
    .map((r) => r.qualityScore)
    .filter((q): q is number => typeof q === "number");
  const evScores = records
    .map((r) => r.decisionExpectedValue)
    .filter((v): v is number => typeof v === "number");
  const decisionEvaluated = records.filter((r) => r.decisionAccepted != null);
  const decisionAccepted = decisionEvaluated.filter((r) => r.decisionAccepted === true).length;

  return {
    sent,
    delivered,
    opened,
    clicked,
    dismissed,
    ignored,
    suppressed: suppressedRecords.length,
    conversions,
    subscriptionRevenue,
    ctr: rate(clicked, delivered),
    openRate: rate(opened, delivered),
    dismissRate: rate(dismissed, delivered),
    conversionRate: rate(conversions, delivered),
    revenuePerNotification: delivered > 0 ? round2(subscriptionRevenue / delivered) : 0,
    permissionLoss,
    uninstallAfterPush,
    avgQualityScore: qualityScores.length > 0 ? round2(avg(qualityScores)) : 0,
    decisionAcceptanceRate: rate(decisionAccepted, decisionEvaluated.length),
    avgExpectedValue: evScores.length > 0 ? round2(avg(evScores)) : 0,
    lifecycleDistribution: distribution(records, (r) => r.lifecycleStage),
    personaDistribution: distribution(records, (r) => r.persona),
    suppressionBreakdown: distribution(suppressedRecords, (r) => r.suppressionReason),
  };
}

function distribution(
  records: NotificationIntelligenceRecord[],
  key: (r: NotificationIntelligenceRecord) => string | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    const k = key(r);
    if (!k) continue;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? round4(numerator / denominator) : 0;
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function avg(xs: number[]): number {
  return xs.length > 0 ? sum(xs) / xs.length : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
