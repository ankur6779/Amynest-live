import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useWebPush } from "@/hooks/use-web-push";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Calendar, Sparkles, Heart, Moon, Apple, BarChart3, ChevronLeft, Monitor, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
type Prefs = {
  routineEnabled: boolean;
  routineItemEnabled: boolean;
  nutritionEnabled: boolean;
  insightsEnabled: boolean;
  weeklyEnabled: boolean;
  engagementEnabled: boolean;
  goodNightEnabled: boolean;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  dailyCap: number;
};
type TestCategory = "routine" | "routine_item" | "nutrition" | "insights" | "weekly" | "engagement" | "good_night";
type CategoryDef = {
  key: keyof Prefs;
  title: string;
  description: string;
  Icon: typeof Bell;
  testCategory: TestCategory;
};
const CATEGORIES: CategoryDef[] = [{
  key: "routineEnabled",
  title: "Routine reminders",
  description: "Morning, evening and bedtime nudges to stay on track.",
  Icon: Calendar,
  testCategory: "routine"
}, {
  key: "routineItemEnabled",
  title: "Per-task reminders",
  description: "A heads-up about 5 minutes before each routine item.",
  Icon: Calendar,
  testCategory: "routine_item"
}, {
  key: "nutritionEnabled",
  title: "Nutrition suggestions",
  description: "Snack ideas, dinner inspiration and meal tips.",
  Icon: Apple,
  testCategory: "nutrition"
}, {
  key: "insightsEnabled",
  title: "Amy AI insights",
  description: "Daily parenting tips tailored to your child's age.",
  Icon: Sparkles,
  testCategory: "insights"
}, {
  key: "weeklyEnabled",
  title: "Weekly report",
  description: "Sunday recap of your child's week.",
  Icon: BarChart3,
  testCategory: "weekly"
}, {
  key: "engagementEnabled",
  title: "Friendly nudges",
  description: "Re-engagement messages and streak rewards.",
  Icon: Heart,
  testCategory: "engagement"
}, {
  key: "goodNightEnabled",
  title: "Good night message",
  description: "Wind-down reminder at bedtime.",
  Icon: Moon,
  testCategory: "good_night"
}];
function WebPushCard() {
  const {
    t
  } = useTranslation();
  const {
    status,
    enable,
    disable
  } = useWebPush();
  const label = status === "granted" ? "Enabled" : status === "denied" ? "Blocked in browser" : status === "unsupported" ? "Not supported in this browser" : status === "requesting" ? "Requesting permission…" : status === "error" ? "Setup failed — try again" : "Not enabled";
  const Icon = status === "granted" ? CheckCircle2 : status === "denied" || status === "error" ? XCircle : status === "requesting" ? Loader2 : Monitor;
  const iconColor = status === "granted" ? "text-green-400" : status === "denied" || status === "error" ? "text-red-400" : "text-purple-300";
  return <Card className="bg-white/[0.04] border-purple-500/20 backdrop-blur-md">
      <CardContent className="flex items-start gap-4 p-4">
        <div className="w-10 h-10 rounded-lg bg-purple-500/15 border border-purple-400/20 flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${iconColor} ${status === "requesting" ? "animate-spin" : ""}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white">{t("pages.notification_settings.browser_notifications")}</div>
          <div className="text-sm text-purple-200/70 mt-1">
            {t("pages.notification_settings.receive_amynest_alerts_directly_in_this_browser_even_when_th")}
          </div>
          <div className="text-xs text-purple-300/60 mt-1">{label}</div>
          {status !== "unsupported" && <div className="flex gap-2 mt-2">
              {status !== "granted" && <Button type="button" size="sm" variant="ghost" className="h-7 text-purple-300 hover:text-white hover:bg-purple-500/20" onClick={enable} disabled={status === "requesting" || status === "denied"}>
                  {status === "requesting" ? "Enabling…" : "Enable"}
                </Button>}
              {status === "granted" && <Button type="button" size="sm" variant="ghost" className="h-7 text-purple-300/60 hover:text-white hover:bg-purple-500/10" onClick={disable}>
                  {t("pages.notification_settings.disable")}
                </Button>}
              {status === "denied" && <span className="text-xs text-red-300/70 mt-1 self-center">
                  {t("pages.notification_settings.unblock_in_browser_settings_site_permissions_notifications")}
                </span>}
            </div>}
        </div>
      </CardContent>
    </Card>;
}
export default function NotificationSettingsPage() {
  const {
    t
  } = useTranslation();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const {
    toast
  } = useToast();
  const [, navigate] = useLocation();
  const {
    data,
    isLoading
  } = useQuery<Prefs>({
    queryKey: ["notification-prefs"],
    queryFn: async () => {
      const r = await authFetch("/api/notifications/categories");
      if (!r.ok) throw new Error("Failed to load preferences");
      return r.json();
    }
  });
  const [local, setLocal] = useState<Prefs | null>(null);
  useEffect(() => {
    if (data && !local) setLocal(data);
  }, [data, local]);
  const patch = useMutation({
    mutationFn: async (next: Partial<Prefs>) => {
      const r = await authFetch("/api/notifications/categories", {
        method: "PATCH",
        body: JSON.stringify(next)
      });
      if (!r.ok) throw new Error("Failed to save");
      return r.json() as Promise<Prefs>;
    },
    onSuccess: saved => {
      setLocal(saved);
      qc.setQueryData(["notification-prefs"], saved);
    },
    onError: (err: Error) => {
      const {
        t
      } = useTranslation();
      return toast({
        title: t("toasts.notification_settings.save_failed_title"),
        description: err.message,
        variant: "destructive"
      });
    }
  });

  // Recent delivery feed — drives the "Recent deliveries" section so users
  // can self-diagnose missed notifications.
  type HistoryRow = {
    id: number;
    category: string;
    title: string;
    body: string;
    status: string;
    platform: string | null;
    errorMessage: string | null;
    sentAt: string;
  };
  const history = useQuery<{
    items: HistoryRow[];
  }>({
    queryKey: ["notification-history"],
    queryFn: async () => {
      const r = await authFetch("/api/notifications/history?limit=20");
      if (!r.ok) throw new Error("Failed to load history");
      return r.json();
    }
  });
  const test = useMutation({
    mutationFn: async (category: CategoryDef["testCategory"]) => {
      const r = await authFetch("/api/notifications/test", {
        method: "POST",
        body: JSON.stringify({
          category
        })
      });
      return (await r.json()) as {
        status?: string;
        reason?: string;
      };
    },
    onSuccess: result => {
      const {
        t
      } = useTranslation();
      const status = result.status ?? "unknown";
      if (status === "sent") {
        toast({
          title: t("toasts.notification_settings.test_sent_title"),
          description: t("toasts.notification_settings.test_sent_body")
        });
      } else if (status === "no_tokens") {
        toast({
          title: "No device registered",
          description: "Enable browser notifications above, or open AmyNest on your phone first."
        });
      } else {
        toast({
          title: "Not sent",
          description: `${status}${result.reason ? ` — ${result.reason}` : ""}`
        });
      }
    },
    onError: (err: Error) => {
      const {
        t
      } = useTranslation();
      return toast({
        title: t("toasts.notification_settings.test_failed_title"),
        description: err.message,
        variant: "destructive"
      });
    }
  });
  if (isLoading || !local) {
    return <div data-on-dark className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D0022] via-[#180040] to-[#0A001E]">
        <div className="h-8 w-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
      </div>;
  }
  const toggle = (key: keyof Prefs, value: boolean) => {
    const next = {
      ...local,
      [key]: value
    } as Prefs;
    setLocal(next);
    patch.mutate({
      [key]: value
    } as Partial<Prefs>);
  };
  return <div data-on-dark className="min-h-screen bg-gradient-to-br from-[#0D0022] via-[#180040] to-[#0A001E] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button type="button" onClick={() => navigate("/dashboard")} className="flex items-center gap-1 text-purple-200/80 hover:text-white mb-6 text-sm">
          <ChevronLeft className="w-4 h-4" />
          {t("pages.notification_settings.back")}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-purple-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t("pages.notification_settings.notifications")}</h1>
        </div>
        <p className="text-purple-200/70 text-sm mb-8 leading-relaxed">
          {t("pages.notification_settings.choose_which_notifications_you_want_from_amynest_maximum")} {local.dailyCap} {t("pages.notification_settings.per_day_never_during_quiet_hours")}
        </p>

        <h2 className="text-xs uppercase tracking-widest text-purple-400/60 mb-3">
          {t("pages.notification_settings.this_browser")}
        </h2>
        <div className="mb-6">
          <WebPushCard />
        </div>

        <h2 className="text-xs uppercase tracking-widest text-purple-400/60 mb-3">
          {t("pages.notification_settings.notification_types")}
        </h2>
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const enabled = Boolean(local[cat.key]);
            const Icon = cat.Icon;
            const title =
              cat.testCategory === "routine_item"
                ? t("toasts.notification_settings_page.cat_routine_item_title")
                : cat.title;
            const description =
              cat.testCategory === "routine_item"
                ? t("toasts.notification_settings_page.cat_routine_item_desc")
                : cat.description;
            return (
              <Card
                key={cat.key}
                className="bg-white/[0.04] border-purple-500/20 backdrop-blur-md"
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/15 border border-purple-400/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{title}</div>
                    <div className="text-sm text-purple-200/70 mt-1">
                      {description}
                    </div>
                    {enabled && <Button type="button" size="sm" variant="ghost" className="mt-2 h-7 text-purple-300 hover:text-white hover:bg-purple-500/20" onClick={() => test.mutate(cat.testCategory)} disabled={test.isPending}>
                        {test.isPending ? "Sending…" : "Send test"}
                      </Button>}
                  </div>
                  <Switch checked={enabled} onCheckedChange={v => toggle(cat.key, v)} />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6 bg-white/[0.04] border-purple-500/20 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("pages.notification_settings.quiet_hours")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-purple-300 font-bold text-lg">
              {local.quietHoursStart} → {local.quietHoursEnd}
            </div>
            <div className="text-purple-200/60 text-sm mt-1">
              {t("pages.notification_settings.timezone")} {local.timezone}{t("pages.notification_settings.we_never_send_notifications_during_this_window")}
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xs uppercase tracking-widest text-purple-400/60 mt-8 mb-3">
          {t("toasts.notification_settings_page.recent_deliveries")}
        </h2>
        <Card className="bg-white/[0.04] border-purple-500/20 backdrop-blur-md">
          <CardContent className="p-2">
            {history.isLoading ? (
              <div className="p-4 text-purple-200/70 text-sm">{t("toasts.notification_settings_page.history_loading")}</div>
            ) : !history.data || history.data.items.length === 0 ? (
              <div className="p-4 text-purple-200/70 text-sm">
                {t("toasts.notification_settings_page.history_empty")}
              </div>
            ) : (
              <ul className="divide-y divide-purple-500/10">
                {history.data.items.slice(0, 10).map((row) => {
                  const ok = row.status === "sent";
                  return (
                    <li key={row.id} className="p-3 flex items-start gap-3">
                      {ok ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {row.title}
                        </div>
                        <div className="text-xs text-purple-200/60 truncate">
                          {row.category} · {row.status}
                          {row.errorMessage ? ` · ${row.errorMessage}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-purple-300/60 shrink-0">
                        {new Date(row.sentAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>;
}