/**
 * Developer-only debug panel for pre-signup re-engagement (Phase A).
 * Visible only when debug mode is enabled — never shown to production users.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, BellRing, Flag, Activity } from "lucide-react";
import { useDebugMode } from "@/contexts/debug-context";
import { IS_DEV } from "@/lib/is-dev";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPreSignupDebugSnapshot } from "@/lib/pre-signup-reengagement/diagnostics";
import { readCampaignState } from "@/lib/pre-signup-reengagement/storage";
import { getAnalyticsService } from "@/lib/analytics/analytics-service";
import { setPreSignupAnalyticsQueuePending } from "@/lib/pre-signup-reengagement/diagnostics";
import { readPreSignupFeatureFlags } from "@/lib/pre-signup-feature-flags";
import { isAmyNestWrapper } from "@/lib/native-push-bridge";

function Row({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const display =
    value === null || value === undefined
      ? "—"
      : typeof value === "boolean"
        ? value
          ? "yes"
          : "no"
        : String(value);
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm border-b border-white/5 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-white text-right font-mono text-xs break-all">{display}</span>
    </div>
  );
}

export default function PreSignupDebugPage() {
  const { debugMode } = useDebugMode();
  const [, setLocation] = useLocation();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!debugMode && !IS_DEV) return undefined;
    const refresh = () => {
      setPreSignupAnalyticsQueuePending(getAnalyticsService().pendingCount());
      setTick((n) => n + 1);
    };
    refresh();
    const id = window.setInterval(refresh, 1000);
    return () => window.clearInterval(id);
  }, [debugMode]);

  if (!debugMode && !IS_DEV) {
    return <Redirect to="/" />;
  }

  const snapshot = getPreSignupDebugSnapshot();
  const campaign = readCampaignState();
  const flags = readPreSignupFeatureFlags();
  const queuePending = getAnalyticsService().pendingCount();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0a2e] to-[#0d0824] text-white p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white"
            onClick={() => setLocation("/")}
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold font-quicksand flex items-center gap-2">
            <BellRing className="w-5 h-5 text-primary" />
            Pre-Signup Debug
          </h1>
        </div>

        <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Developer-only. Enable via <code className="font-mono">?debug=1</code> or debug panel toggle.
          Not visible to end users.
        </p>

        <Card className="bg-white/[0.04] border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flag className="w-4 h-4" /> Feature Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="VITE_FF_PRE_SIGNUP_REENGAGEMENT" value={flags.parent} />
            <Row label="VITE_FF_PRE_SIGNUP_PERM_NATIVE" value={flags.permNative} />
            <Row label="VITE_FF_PRE_SIGNUP_DIAGNOSTICS" value={flags.diagnostics} />
          </CardContent>
        </Card>

        <Card className="bg-white/[0.04] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Lifecycle state" value={snapshot.lifecycleState} />
            <Row label="Current segment" value={snapshot.segment ?? campaign?.segment} />
            <Row label="Wrapper detected" value={isAmyNestWrapper()} />
            <Row label="Platform" value={snapshot.platform} />
            <Row label="API level (UA)" value={snapshot.androidApiLevel} />
            <Row label="Wrapper version" value={snapshot.wrapperVersion} />
          </CardContent>
        </Card>

        <Card className="bg-white/[0.04] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Permission</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Permission source" value={snapshot.permissionSource} />
            <Row label="Permission status" value={snapshot.permissionStatus} />
            <Row label="Permission API used" value={snapshot.permissionApiUsed} />
          </CardContent>
        </Card>

        <Card className="bg-white/[0.04] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Campaign eligible" value={snapshot.campaignEligible} />
            <Row label="Block reason" value={snapshot.campaignBlockReason} />
            <Row label="Campaign active" value={snapshot.campaignActive} />
            <Row label="Scheduled notifications" value={snapshot.scheduledNotifications} />
            <Row label="Pending alarm count" value={snapshot.pendingAlarmCount} />
            <Row label="Exit reason (stored)" value={campaign?.exitReason} />
            <Row label="Variant" value={campaign?.variant} />
            <Row label="Install at" value={campaign?.installAtMs ? new Date(campaign.installAtMs).toISOString() : null} />
          </CardContent>
        </Card>

        <Card className="bg-white/[0.04] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Native Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Native schedule result" value={snapshot.nativeScheduleResult} />
            <Row label="Schedule failure reason" value={snapshot.scheduleFailureReason} />
          </CardContent>
        </Card>

        <Card className="bg-white/[0.04] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Queue pending" value={queuePending} />
            <Row label="Last diagnostic event" value={snapshot.lastDiagnosticEvent} />
            <Row label="Last diagnostic at" value={snapshot.lastDiagnosticAt} />
          </CardContent>
        </Card>

        {campaign?.scheduled && campaign.scheduled.length > 0 && (
          <Card className="bg-white/[0.04] border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Milestones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {campaign.scheduled.map((s) => (
                <div key={s.id} className="text-xs font-mono text-muted-foreground border border-white/5 rounded p-2">
                  {s.milestone} · id={s.id} · {new Date(s.fireAtMs).toLocaleString()} · {s.status}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
