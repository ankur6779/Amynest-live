import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  Monitor,
  Clock,
  Moon,
  CalendarClock,
  Inbox,
} from "lucide-react";

type DiagToken = {
  id: number;
  platform: string;
  deviceName: string | null;
  tokenPrefix: string;
  createdAt: string;
  lastSeenAt: string;
};

type DiagHistoryRow = {
  id: number;
  category: string;
  title: string;
  body: string;
  status: string;
  platform: string | null;
  errorMessage: string | null;
  sentAt: string;
};

type Diagnostics = {
  userId: string;
  timezone: string;
  localTime: string;
  inQuietHours: boolean;
  dailyCap: number;
  nextScheduled: {
    category: string;
    localTime: string;
    minutesFromNow: number;
    activity?: string;
  } | null;
  tokens: DiagToken[];
  recent: DiagHistoryRow[];
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatMinutesUntil(min: number): string {
  if (min < 1) return "in less than a minute";
  if (min < 60) return `in ${min} minute${min === 1 ? "" : "s"}`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `in ${h} hour${h === 1 ? "" : "s"}`;
  return `in ${h}h ${m}m`;
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case "routine": return "Routine reminders";
    case "routine_item": return "Per-task reminder";
    case "nutrition": return "Nutrition";
    case "insights": return "Amy AI insights";
    case "weekly": return "Weekly report";
    case "engagement": return "Friendly nudge";
    case "good_night": return "Good night";
    default: return cat;
  }
}

export default function NotificationDiagnosticsPage() {
  const authFetch = useAuthFetch();
  const [, navigate] = useLocation();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<Diagnostics>({
    queryKey: ["notification-diagnostics"],
    queryFn: async () => {
      const r = await authFetch("/api/notifications/diagnostics");
      if (!r.ok) throw new Error("Failed to load diagnostics");
      return r.json();
    },
  });

  if (isLoading) {
    return (
      <div data-on-dark className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D0022] via-[#180040] to-[#0A001E]">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div data-on-dark className="min-h-screen bg-gradient-to-br from-[#0D0022] via-[#180040] to-[#0A001E] py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => navigate("/notification-settings")}
            className="flex items-center gap-1 text-muted-foreground hover:text-white mb-6 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <Card className="bg-white/[0.04] border-primary backdrop-blur-md">
            <CardContent className="p-6 text-muted-foreground">
              We couldn't load your diagnostics right now.{" "}
              <button
                type="button"
                className="underline text-muted-foreground"
                onClick={() => refetch()}
              >
                Try again
              </button>
              .
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const failures = data.recent.filter((r) => r.status !== "sent");
  const hasTokens = data.tokens.length > 0;

  return (
    <div data-on-dark className="min-h-screen bg-gradient-to-br from-[#0D0022] via-[#180040] to-[#0A001E] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/notification-settings")}
          className="flex items-center gap-1 text-muted-foreground hover:text-white mb-6 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to notification settings
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary border border-border flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Why didn't I get my notification?
          </h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          A quick health check of your devices, recent deliveries and quiet
          hours. Most missed notifications fall into one of the buckets below.
        </p>

        <div className="flex justify-end mb-4">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground hover:text-white hover:bg-primary"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {/* ── Devices / tokens ─────────────────────────────────────── */}
        <Card className="bg-white/[0.04] border-primary backdrop-blur-md mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              {hasTokens ? (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-primary" />
              )}
              Your devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasTokens ? (
              <div className="text-muted-foreground text-sm leading-relaxed">
                <p className="mb-2">
                  No devices are registered for push notifications yet — that's
                  almost always why nothing arrives.
                </p>
                <p className="text-muted-foreground">
                  Open the AmyNest app on your phone and grant notification
                  permission, or enable browser notifications from the
                  notification settings page.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {data.tokens.map((tok) => {
                  const Icon =
                    tok.platform === "ios" || tok.platform === "android"
                      ? Smartphone
                      : Monitor;
                  return (
                    <li key={tok.id} className="py-3 flex items-start gap-3">
                      <Icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white">
                          {tok.deviceName ?? tok.platform}
                          <span className="text-muted-foreground ml-2 text-xs uppercase">
                            {tok.platform}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Last active {formatRelative(tok.lastSeenAt)} · added{" "}
                          {formatRelative(tok.createdAt)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Quiet hours / local time / cap ───────────────────────── */}
        <Card className="bg-white/[0.04] border-primary backdrop-blur-md mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              {data.inQuietHours ? (
                <Moon className="w-4 h-4 text-primary" />
              ) : (
                <Clock className="w-4 h-4 text-primary" />
              )}
              Quiet hours & timing
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>
              <span className="text-muted-foreground">Your local time: </span>
              <span className="text-white font-semibold">{data.localTime}</span>
              <span className="text-muted-foreground"> ({data.timezone})</span>
            </div>
            {data.inQuietHours ? (
              <div className="text-muted-foreground">
                You're currently inside quiet hours, so AmyNest won't send any
                push notifications until quiet hours end.
              </div>
            ) : (
              <div className="text-muted-foreground">
                You're outside quiet hours — notifications can be delivered now.
              </div>
            )}
            <div className="text-muted-foreground">
              Daily cap: up to {data.dailyCap} notifications per day.
            </div>
          </CardContent>
        </Card>

        {/* ── Next scheduled ───────────────────────────────────────── */}
        <Card className="bg-white/[0.04] border-primary backdrop-blur-md mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-muted-foreground" />
              Next scheduled notification
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {data.nextScheduled ? (
              <div>
                <div className="text-white font-semibold">
                  {categoryLabel(data.nextScheduled.category)}
                  {data.nextScheduled.activity ? (
                    <span className="text-muted-foreground font-normal">
                      {" "}— {data.nextScheduled.activity}
                    </span>
                  ) : null}
                </div>
                <div className="text-muted-foreground mt-1">
                  At {data.nextScheduled.localTime} ·{" "}
                  {formatMinutesUntil(data.nextScheduled.minutesFromNow)}.
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                Nothing more is scheduled for today. New notifications will be
                queued tomorrow morning.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Recent failures ──────────────────────────────────────── */}
        <Card className="bg-white/[0.04] border-primary backdrop-blur-md mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              {failures.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              ) : (
                <XCircle className="w-4 h-4 text-primary" />
              )}
              Recent issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Inbox className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  We haven't tried to send you anything recently. Use{" "}
                  <span className="text-muted-foreground">Send test</span> on the {/* i18n-ok: refers to literal label of the Send-test button on the settings page */}
                  settings page to confirm your device is wired up.
                </div>
              </div>
            ) : failures.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Your last {data.recent.length} notification
                {data.recent.length === 1 ? "" : "s"} all delivered
                successfully.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {failures.map((row) => (
                  <li key={row.id} className="py-3 flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {row.title || categoryLabel(row.category)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {categoryLabel(row.category)} · {row.status}
                        {row.errorMessage ? ` · ${row.errorMessage}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {formatRelative(row.sentAt)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-6 leading-relaxed">
          Still missing notifications? Check your phone's system settings to
          make sure AmyNest is allowed to show notifications and isn't muted
          by Focus / Do Not Disturb.
        </p>
      </div>
    </div>
  );
}
