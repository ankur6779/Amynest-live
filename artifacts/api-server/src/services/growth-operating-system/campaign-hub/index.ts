import type { CampaignRow, GrowthTimeRange } from "../../growth-dashboard/types.js";
import { computeCampaigns } from "../../growth-dashboard/campaigns.js";

export type CampaignHubRow = CampaignRow & {
  status: string;
  paidSubscribers: number;
  revenue: number | null;
  cac: number | null;
  ltv: number | null;
  integrationNote: string | null;
};

export async function getCampaignHub(range: GrowthTimeRange) {
  const campaigns = await computeCampaigns(range);
  const rows: CampaignHubRow[] = campaigns.rows.map((r) => ({
    ...r,
    status: r.installs > 0 ? "active" : "inactive",
    paidSubscribers:
      r.subscriptionPct != null && r.installs > 0
        ? Math.round((r.subscriptionPct / 100) * r.installs)
        : 0,
    revenue: r.revenue,
    cac: r.spend != null && r.installs > 0 ? Math.round(r.spend / r.installs) : null,
    ltv: r.ltv,
    integrationNote:
      r.spend == null ? "Spend/CAC/LTV/ROAS awaiting ad platform integration" : null,
  }));

  return {
    available: campaigns.available,
    message: campaigns.message,
    awaitingIntegration: rows.every((r) => r.spend == null),
    integrationTargets: ["Meta Marketing API", "Google Ads API", "Apple Search Ads", "TikTok"],
    rows,
  };
}
