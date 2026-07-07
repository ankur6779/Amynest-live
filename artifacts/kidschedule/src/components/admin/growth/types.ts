export type GrowthTimePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export type TrendValue = {
  value: number | null;
  previous: number | null;
  changePct: number | null;
};

export type FunnelStage = {
  key: string;
  label: string;
  users: number;
  conversionPct: number | null;
  dropPct: number | null;
  trendPct: number | null;
  available: boolean;
};

export type CampaignRow = {
  campaign: string;
  platform: string | null;
  spend: number | null;
  cpi: number | null;
  ctr: number | null;
  installs: number;
  signups: number;
  routinePct: number | null;
  trialPct: number | null;
  subscriptionPct: number | null;
  revenue: number | null;
  roas: number | null;
  ltv: number | null;
};

export type FeatureMetric = {
  key: string;
  label: string;
  dau: number;
  completionPct: number | null;
  avgTimeSec: number | null;
  repeatUsagePct: number | null;
  trendPct: number | null;
};

export type SeriesPoint = { day: string; value: number };

export type GrowthDashboardData = {
  generatedAt: string;
  timeRange: {
    preset: GrowthTimePreset;
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
    label: string;
  };
  kpis: Record<string, TrendValue>;
  funnel: FunnelStage[];
  campaigns: {
    available: boolean;
    rows: CampaignRow[];
    message: string | null;
  };
  retention: {
    summary: {
      d1: number | null;
      d3: number | null;
      d7: number | null;
      d14: number | null;
      d30: number | null;
    };
    weeklyCohorts: Array<{
      cohort: string;
      cohortSize: number;
      d1: number | null;
      d3: number | null;
      d7: number | null;
      d14: number | null;
      d30: number | null;
    }>;
    monthlyCohorts: Array<{
      cohort: string;
      cohortSize: number;
      d1: number | null;
      d3: number | null;
      d7: number | null;
      d14: number | null;
      d30: number | null;
    }>;
    heatmap: Array<{ cohort: string; day: number; rate: number | null; users: number }>;
  };
  features: FeatureMetric[];
  subscriptions: {
    freeUsers: number;
    trialUsers: number;
    paidUsers: number;
    expiredUsers: number;
    activeUsers: number;
    mrr: number;
    arr: number;
    conversionPct: number | null;
    renewalPct: number | null;
    cancellationPct: number | null;
    revenueByCountry: Array<{ country: string; revenue: number; users: number }>;
    revenueByPlatform: Array<{ platform: string; revenue: number; users: number }>;
  };
  geography: Array<{
    country: string;
    state: string | null;
    city: string | null;
    users: number;
    revenue: number;
    retentionD7: number | null;
  }>;
  devices: {
    platforms: Array<{ platform: string; users: number; sessions: number }>;
    browsers: Array<{ browser: string; users: number }>;
    appVersions: Array<{ version: string; users: number }>;
    screenSizes: Array<{ size: string; users: number }>;
    osVersions: Array<{ os: string; users: number }>;
  };
  performance: {
    ttfbMs: number | null;
    apiLatencyMs: number | null;
    crashCount: number;
    jsErrors: number;
    slowScreens: Array<{ screen: string; count: number; avgMs: number | null }>;
    networkErrors: number;
    crashFreePct: number | null;
  };
  insights: Array<{ id: string; severity: "info" | "warning" | "positive"; message: string }>;
  charts: {
    dau: SeriesPoint[];
    wau: SeriesPoint[];
    revenue: SeriesPoint[];
    subscriptionGrowth: SeriesPoint[];
    featureUsage: SeriesPoint[];
    routineGenerated: SeriesPoint[];
    trialStarted: SeriesPoint[];
    subscriptionPurchased: SeriesPoint[];
    retention: SeriesPoint[];
    sessions: SeriesPoint[];
  };
  tables: {
    topCountries: Array<{ country: string; users: number; revenue: number }>;
    topDevices: Array<{ device: string; users: number }>;
    topAppVersions: Array<{ version: string; users: number }>;
    topScreens: Array<{ screen: string; users: number; views: number }>;
    topEvents: Array<{ event: string; users: number; count: number }>;
    topReferrers: Array<{ referrer: string; users: number }>;
    topCampaigns: Array<{ campaign: string; users: number; installs: number }>;
  };
  executive: ExecutiveIntelligence;
};

export type ExecutiveMetric = TrendValue & { key: string; label: string };

export type ExecutiveSummary = {
  metrics: ExecutiveMetric[];
  revenueTrend: "up" | "down" | "flat";
};

export type BusinessHealthStatus = "excellent" | "healthy" | "warning" | "critical";

export type BusinessHealth = {
  status: BusinessHealthStatus;
  score: number;
  reasons: string[];
};

export type GrowthScoreCategory = {
  key: string;
  label: string;
  score: number;
  weight: number;
};

export type GrowthScore = {
  overall: number;
  categories: GrowthScoreCategory[];
};

export type InsightPriority = "critical" | "high" | "medium" | "low";

export type AmyInsight = {
  id: string;
  priority: InsightPriority;
  title: string;
  description: string;
  affectedUsers: number;
  trendPct: number | null;
  confidence: number;
  suggestedAction: string;
};

export type RootCause = {
  id: string;
  title: string;
  explanation: string;
  confidence: number;
  metrics: string[];
};

export type Recommendation = {
  id: string;
  title: string;
  description: string;
  impactScore: number;
  category: string;
};

export type FeatureImpact = {
  key: string;
  label: string;
  users: number;
  usage: number;
  repeatUsagePct: number | null;
  avgSessionSec: number | null;
  trialCorrelationPct: number | null;
  subscriptionCorrelationPct: number | null;
  retentionCorrelationPct: number | null;
  businessImpactScore: number;
};

export type TimelineEvent = {
  timestamp: string;
  label: string;
  severity: "info" | "warning" | "critical" | "positive";
  detail: string;
};

export type GrowthAlert = {
  id: string;
  category: "critical" | "warning" | "info";
  title: string;
  message: string;
};

export type PredictionHorizon = {
  days: number;
  estimatedMrr: number | null;
  estimatedArr: number | null;
  estimatedInstalls: number | null;
  estimatedSubscriptions: number | null;
  estimatedRevenue: number | null;
};

export type Predictions = {
  label: string;
  horizons: PredictionHorizon[];
};

export type CtoOpsSnapshot = {
  apiLatencyMs: number | null;
  crashCount: number;
  jsErrors: number;
  networkErrors: number;
  analyticsIngest: {
    accepted: number;
    invalidRate: number;
    rejectedUnknown: number;
  };
  queue: {
    mode: string;
    redisConnected: boolean;
    dlqCount: number;
    status: string;
  };
  database: { status: string };
  versionAdoption: Array<{ version: string; users: number; pct: number }>;
  performance: GrowthDashboardData["performance"];
};

export type ExecutiveIntelligence = {
  summary: ExecutiveSummary;
  businessHealth: BusinessHealth;
  growthScore: GrowthScore;
  amyInsights: AmyInsight[];
  rootCauses: RootCause[];
  recommendations: Recommendation[];
  featureImpact: FeatureImpact[];
  timeline: TimelineEvent[];
  alerts: GrowthAlert[];
  predictions: Predictions;
  ctoOps: CtoOpsSnapshot;
};

export type DashboardViewMode = "full" | "ceo" | "cto";

export const TIME_PRESETS: Array<{ id: GrowthTimePreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last_7_days", label: "Last 7 Days" },
  { id: "last_30_days", label: "Last 30 Days" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom" },
];

export const KPI_LABELS: Record<string, string> = {
  dau: "DAU",
  mau: "MAU",
  wau: "WAU",
  newUsers: "New Users",
  returningUsers: "Returning Users",
  sessions: "Sessions",
  avgSessionDuration: "Avg Session (s)",
  crashFreePct: "Crash Free %",
  subscriptionRevenue: "Sub Revenue (est)",
  mrr: "MRR (₹)",
  arr: "ARR (₹)",
  trialsStarted: "Trials Started",
  trialsConverted: "Trials Converted",
  paidSubscribers: "Paid Subscribers",
  renewals: "Renewals",
  churn: "Churn",
  refunds: "Refunds",
  downloads: "Downloads",
  appOpens: "App Opens",
};
