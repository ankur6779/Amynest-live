import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { parseApiJson } from "@/lib/safe-json-response";
import type { GrowthTimePreset } from "./types";

type ProductAnalytics = {
  executive: {
    firstOpens: number;
    dau: number;
    wau: number;
    mau: number;
    newSignups: number;
    activeSessions: number;
    returningUsers: number;
    paidUsers: number;
    activatedUsers: number;
    storeTrialStarts: number;
    speechTrialStarts: number;
    paidConversions: number;
    unknownPurchaseClass: number;
    refundOrCancelEvents: number;
  };
  pages: Array<{ pageName: string; views: number; uniqueUsers: number; avgActiveMs: number }>;
  navigation: Array<{ from: string; to: string; transitions: number }>;
  features: Array<{
    featureName: string;
    views: number;
    uniqueUsers: number;
    starts: number;
    completions: number;
    abandoned: number;
    avgDurationMs: number;
    paidUsers: number;
  }>;
  journey: {
    firstOpen: number;
    signup: number;
    onboardingCompleted: number;
    firstFeature: number;
    paywall: number;
    checkout: number;
    trialStarts: number;
    paidConversions: number;
    purchase: number;
  };
  retention: { cohortSize: number; d1: number; d3: number; d7: number; d14: number; d30: number };
  acquisition: Array<{ bucket: string; campaignId: string; users: number }>;
  sourceConversion: Array<{
    bucket: string;
    installs: number;
    signups: number;
    paywall: number;
    checkout: number;
    paid: number;
  }>;
  availability: {
    mrr: { state: "not_collected"; reason: string };
    refundAmount: { state: "not_collected"; reason: string };
    deviceQueue: { state: "not_collected"; reason: string };
    historicalPaidPeriod: { state: "partial"; reason: string };
    deviceRetryCount: { state: "not_collected"; reason: string };
    lastDeviceSync: { state: "not_collected"; reason: string };
    taxesAndNetProceeds: { state: "not_collected"; reason: string };
  };
  reliability: {
    eventsInRange: number;
    missingPlatform: number;
    missingAppVersion: number;
    latestServerTs: string | null;
    unknownAttributionUsers: number;
    attributionUsers: number;
    purchaseReconciliation: {
      state: "collected" | "unverified";
      reason: string;
      trialInitial: number | null;
      paidInitial: number | null;
      introductoryPriced: number | null;
      introductoryUnpriced: number | null;
      promotional: number | null;
      unknownInitial: number | null;
      renewals: number | null;
      cancellations: number | null;
      refunds: number | null;
      billingIssues: number | null;
      unclassified: number | null;
      webhookRows: number | null;
      serverPurchaseRows: number | null;
    };
  };
  technical: {
    ingestionSuccessRate: number | null;
    duplicateEventGroups: number;
    queueBacklog: null;
    queueBacklogNote: string;
    coverage: Array<{ platform: string; appVersion: string; events: number; users: number }>;
    processQuality: {
      accepted: number;
      rejected: { unknownEvent: number; invalidProps: number; tooLarge: number };
    };
  };
};

function queryUrl(preset: GrowthTimePreset, start: string, end: string): string {
  const params = new URLSearchParams({ preset });
  if (preset === "custom") {
    if (start) params.set("start", start);
    if (end) params.set("end", end);
  }
  return `/api/admin/growth/product-analytics?${params.toString()}`;
}

function share(part: number, whole: number): string {
  if (whole === 0) return "Not applicable";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold font-quicksand">{value}</p>
    </div>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No events in this range.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            {headers.map((header) => (
              <th key={header} className="py-1 pr-3 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-white/5">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-1 pr-3">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function rate(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

export function ProductAnalyticsPanel({
  preset,
  customStart,
  customEnd,
}: {
  preset: GrowthTimePreset;
  customStart: string;
  customEnd: string;
}) {
  const authFetch = useAuthFetch();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-growth-product", preset, customStart, customEnd],
    queryFn: async () => {
      const res = await authFetch(queryUrl(preset, customStart, customEnd));
      if (res.status === 403) throw new Error("not_admin");
      if (!res.ok) throw new Error(`http_${res.status}`);
      return parseApiJson<ProductAnalytics>(res);
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground py-8 text-center">Loading product analytics…</p>;
  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm">
        Product analytics could not be loaded from analytics_events.
      </div>
    );
  }

  const journey = [
    ["First open", data.journey.firstOpen],
    ["Signup", data.journey.signup],
    ["Onboarding completed", data.journey.onboardingCompleted],
    ["First feature", data.journey.firstFeature],
    ["Paywall", data.journey.paywall],
    ["Checkout", data.journey.checkout],
    ["Store trial starts", data.journey.trialStarts],
    ["Server paid conversions", data.journey.paidConversions],
    ["Any purchase event", data.journey.purchase],
  ] as const;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="First opens" value={data.executive.firstOpens} />
        <Stat label="DAU" value={data.executive.dau} />
        <Stat label="WAU" value={data.executive.wau} />
        <Stat label="MAU" value={data.executive.mau} />
        <Stat label="New signups" value={data.executive.newSignups} />
        <Stat label="Sessions" value={data.executive.activeSessions} />
        <Stat label="Returning users" value={data.executive.returningUsers} />
        <Stat label="Activated users" value={data.executive.activatedUsers} />
        <Stat label="Store trial starts" value={data.executive.storeTrialStarts} />
        <Stat label="Speech trial starts" value={data.executive.speechTrialStarts} />
        <Stat label="Server paid conversions" value={data.executive.paidConversions} />
        <Stat label="Unknown purchase class" value={data.executive.unknownPurchaseClass} />
        <Stat label="Refund or cancel events" value={data.executive.refundOrCancelEvents} />
        <Stat label="MRR" value="Not collected" />
      </section>
      <p className="text-xs text-muted-foreground">{data.availability.mrr.reason}</p>
      <p className="text-xs text-muted-foreground">{data.availability.refundAmount.reason}</p>
      <p className="text-xs text-muted-foreground">{data.availability.historicalPaidPeriod.reason}</p>
      <p className="text-xs text-muted-foreground">{data.availability.taxesAndNetProceeds.reason}</p>

      <section className="rounded-2xl border border-white/10 p-4 space-y-2">
        <h2 className="font-quicksand font-semibold text-sm">Pages</h2>
        <Table
          headers={["Page", "Views", "Users", "Avg active ms"]}
          rows={data.pages.map((page) => [page.pageName, page.views, page.uniqueUsers, page.avgActiveMs])}
        />
      </section>

      <section className="rounded-2xl border border-white/10 p-4 space-y-2">
        <h2 className="font-quicksand font-semibold text-sm">Page transitions</h2>
        <Table
          headers={["From", "To", "Transitions"]}
          rows={data.navigation.map((step) => [step.from, step.to, step.transitions])}
        />
      </section>

      <section className="rounded-2xl border border-white/10 p-4 space-y-2">
        <h2 className="font-quicksand font-semibold text-sm">Features</h2>
        <Table
          headers={["Feature", "Users", "Starts", "Completed", "Abandoned", "Paid in range", "Avg ms"]}
          rows={data.features.map((feature) => [
            feature.featureName,
            feature.uniqueUsers,
            feature.starts,
            feature.completions,
            feature.abandoned,
            feature.paidUsers,
            feature.avgDurationMs,
          ])}
        />
      </section>

      <section className="rounded-2xl border border-white/10 p-4 space-y-2">
        <h2 className="font-quicksand font-semibold text-sm">Journey</h2>
        <Table
          headers={["Step", "Users", "Rate from first open"]}
          rows={journey.map(([label, value]) => [label, value, rate(value, data.journey.firstOpen)])}
        />
      </section>

      <section className="rounded-2xl border border-white/10 p-4 space-y-2">
        <h2 className="font-quicksand font-semibold text-sm">Retention</h2>
        <p className="text-xs text-muted-foreground">
          Cohort size {data.retention.cohortSize} first opens in range. Counts are users active on that exact day.
        </p>
        <div className="grid grid-cols-5 gap-3">
          <Stat label="D1" value={rate(data.retention.d1, data.retention.cohortSize)} />
          <Stat label="D3" value={rate(data.retention.d3, data.retention.cohortSize)} />
          <Stat label="D7" value={rate(data.retention.d7, data.retention.cohortSize)} />
          <Stat label="D14" value={rate(data.retention.d14, data.retention.cohortSize)} />
          <Stat label="D30" value={rate(data.retention.d30, data.retention.cohortSize)} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 p-4 space-y-2">
        <h2 className="font-quicksand font-semibold text-sm">Acquisition</h2>
        <p className="text-xs text-muted-foreground">
          verified_paid requires gclid, gbraid, or wbraid. A campaign id alone stays attribution_unknown.
        </p>
        <Table
          headers={["Bucket", "Campaign", "Users"]}
          rows={data.acquisition.map((row) => [row.bucket, row.campaignId, row.users])}
        />
        <h3 className="font-quicksand font-semibold text-xs pt-2">Source conversion</h3>
        <p className="text-xs text-muted-foreground">
          First-touch bucket on first_open or install_source in this range. Paid means a server purchase event, not a trial start. An empty table means no install events in range, not a missing collector.
        </p>
        <Table
          headers={["Bucket", "Installs", "Signups", "Paywall", "Checkout", "Paid"]}
          rows={data.sourceConversion.map((row) => [
            row.bucket,
            row.installs,
            row.signups,
            row.paywall,
            row.checkout,
            row.paid,
          ])}
        />
      </section>

      <section className="rounded-2xl border border-white/10 p-4 space-y-2">
        <h2 className="font-quicksand font-semibold text-sm">Technical health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="Ingest success"
            value={
              data.technical.ingestionSuccessRate == null
                ? "Not applicable"
                : rate(data.technical.ingestionSuccessRate, 1)
            }
          />
          <Stat label="Received (process)" value={data.technical.processQuality.accepted} />
          <Stat
            label="Rejected (process)"
            value={
              data.technical.processQuality.rejected.unknownEvent
              + data.technical.processQuality.rejected.invalidProps
              + data.technical.processQuality.rejected.tooLarge
            }
          />
          <Stat label="Duplicate groups" value={data.technical.duplicateEventGroups} />
          <Stat label="Events in range" value={data.reliability.eventsInRange} />
          <Stat label="Device queue" value="Not collected" />
          <Stat label="Device retries" value="Not collected" />
          <Stat
            label="Latest stored event"
            value={data.reliability.latestServerTs ?? "Zero"}
          />
          <Stat
            label="Unknown attribution"
            value={share(data.reliability.unknownAttributionUsers, data.reliability.attributionUsers)}
          />
          <Stat label="Missing platform" value={data.reliability.missingPlatform} />
          <Stat label="Missing app version" value={data.reliability.missingAppVersion} />
          <Stat
            label="Purchase reconciliation"
            value={data.reliability.purchaseReconciliation.state === "collected" ? "Collected" : "Unverified"}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Received and rejected counts are since this API process started. They are not the selected range. A zero there means this process has not seen that outcome.
        </p>
        <p className="text-xs text-muted-foreground">{data.technical.queueBacklogNote}</p>
        <p className="text-xs text-muted-foreground">{data.availability.deviceQueue.reason}</p>
        <p className="text-xs text-muted-foreground">{data.availability.deviceRetryCount.reason}</p>
        <p className="text-xs text-muted-foreground">{data.availability.lastDeviceSync.reason}</p>
        <p className="text-xs text-muted-foreground">{data.reliability.purchaseReconciliation.reason}</p>
        {data.reliability.purchaseReconciliation.state === "collected" ? (
          <p className="text-xs text-muted-foreground">
            Webhook classes, not paid conversions. Trial initial {data.reliability.purchaseReconciliation.trialInitial}. Paid initial {data.reliability.purchaseReconciliation.paidInitial}. Introductory priced {data.reliability.purchaseReconciliation.introductoryPriced}. Introductory unpriced {data.reliability.purchaseReconciliation.introductoryUnpriced}. Promotional {data.reliability.purchaseReconciliation.promotional}. Unknown initial {data.reliability.purchaseReconciliation.unknownInitial}. Renewals {data.reliability.purchaseReconciliation.renewals}. Cancellations {data.reliability.purchaseReconciliation.cancellations}. Refunds {data.reliability.purchaseReconciliation.refunds}. Billing issues {data.reliability.purchaseReconciliation.billingIssues}. Unclassified {data.reliability.purchaseReconciliation.unclassified}. Webhook rows {data.reliability.purchaseReconciliation.webhookRows} are not paid conversions. Server purchase rows {data.reliability.purchaseReconciliation.serverPurchaseRows}.
          </p>
        ) : null}
        <Table
          headers={["Platform", "App version", "Events", "Users"]}
          rows={data.technical.coverage.map((row) => [row.platform, row.appVersion, row.events, row.users])}
        />
      </section>
    </div>
  );
}
