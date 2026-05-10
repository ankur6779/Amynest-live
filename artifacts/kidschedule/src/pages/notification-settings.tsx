import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Calendar, Sparkles, Heart, Moon, Apple, BarChart3, ChevronLeft, CheckCircle2, XCircle, Loader2, Send, Smartphone, RefreshCw, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  awaitNativePushBridge,
  ensureNativePushReady,
  getNativePushBridge,
  isAmyNestWrapper,
  registerNativePushToken,
  requestNativePushPermission,
} from "@/lib/native-push-bridge";
import { getApiUrl } from "@/lib/api";
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
/**
 * Inside-the-wrapper state machine — drives WebPushCard rendering when
 * the page is loaded inside the AmyNest Android WebView wrapper.
 *
 *   "detecting"          — wrapper detected (UA / __AMYNEST_WRAPPER marker)
 *                          but `window.AmyNestPushNative` not wired yet.
 *                          Showing a brief "Setting up notifications…" card
 *                          while [awaitNativePushBridge] polls.
 *   "ready"              — `window.AmyNestPushNative` is live; render the
 *                          full native push card backed by the bridge.
 *   "wrapper-no-bridge"  — wrapper detected but the bridge never appeared
 *                          (very old WebView lacking WEB_MESSAGE_LISTENER,
 *                          or addWebMessageListener throw). Show a recovery
 *                          card with a Reload-app button.
 *   "browser"            — not inside the wrapper; card renders null
 *                          (web push is disabled — native FCM only).
 */
type WrapperState = "detecting" | "ready" | "wrapper-no-bridge" | "browser";

function initialWrapperState(): WrapperState {
  if (typeof window === "undefined") return "browser";
  if (getNativePushBridge()) return "ready";
  if (isAmyNestWrapper()) return "detecting";
  return "browser";
}

function WebPushCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const authFetch = useAuthFetch();

  // Wrapper-aware state machine (see [WrapperState] doc above).
  const [wrapperState, setWrapperState] = useState<WrapperState>(initialWrapperState);
  const [, forceTick] = useState(0);
  const rerender = useCallback(() => forceTick((n) => n + 1), []);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (wrapperState === "browser") return;
    let cancelled = false;

    // Hydrate the cache so subsequent renders see the real
    // permission/token instead of the "default" placeholder.
    void ensureNativePushReady().then(() => {
      if (!cancelled) rerender();
    });

    if (wrapperState === "detecting") {
      // Poll up to 8s for window.AmyNestPushNative to appear. On the rare
      // device where the bridge never wires up, fall through to the
      // recovery card so the user has an actionable next step.
      void awaitNativePushBridge(8_000).then((facade) => {
        if (cancelled) return;
        setWrapperState(facade ? "ready" : "wrapper-no-bridge");
      });
    }

    // Re-render on out-of-band push events (token rotation, permission grant).
    const onEvt = () => rerender();
    window.addEventListener("amynest-push-permission", onEvt);
    window.addEventListener("amynest-push-token", onEvt);
    return () => {
      cancelled = true;
      window.removeEventListener("amynest-push-permission", onEvt);
      window.removeEventListener("amynest-push-token", onEvt);
    };
  }, [wrapperState, rerender]);

  // ── Wrapper, bridge ready: drive the native push UI ─────────────────────
  if (wrapperState === "ready") {
    const native = getNativePushBridge();
    if (native) {
      const nativePerm = native.getPermissionStatus();
      const nativeGranted = nativePerm === "granted";
      const nativeDenied = nativePerm === "denied";
      const NativeIcon = nativeGranted ? CheckCircle2 : nativeDenied ? XCircle : Bell;
      const nativeColor = nativeGranted ? "text-primary" : nativeDenied ? "text-destructive" : "text-muted-foreground";

      const handleEnableNative = async () => {
        setEnabling(true);
        try {
          const perm = await requestNativePushPermission(native);
          if (perm !== "granted") {
            toast({
              title: t("toasts.use_web_push.blocked_title"),
              description: t("toasts.use_web_push.blocked_body"),
              variant: "destructive",
            });
            return;
          }
          const ok = await registerNativePushToken(authFetch, getApiUrl("/api/push/register"));
          if (ok) {
            toast({ title: t("toasts.use_web_push.enabled") });
          } else {
            toast({
              title: t("toasts.use_web_push.enable_failed_title"),
              description: t("toasts.use_web_push.enable_failed_body_default"),
              variant: "destructive",
            });
          }
        } finally {
          setEnabling(false);
        }
      };

      return (
        <Card className="bg-white/[0.04] border-primary backdrop-blur-md">
          <CardContent className="flex items-start gap-4 p-4">
            <div className="w-10 h-10 rounded-lg bg-primary border border-border flex items-center justify-center shrink-0">
              <NativeIcon className={`w-5 h-5 ${nativeColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              {/* i18n-ignore-start: native-wrapper-only labels (not exposed on web) */}
              <div className="font-semibold text-white">App Notifications</div>
              <div className="text-sm text-muted-foreground mt-1">
                Notifications are managed directly by the AmyNest app via Firebase.
              </div>
              <div className="text-xs mt-1 font-medium" style={{ color: nativeGranted ? "hsl(var(--brand-green-500))" : nativeDenied ? "hsl(var(--brand-red-500))" : "hsl(var(--muted-foreground))" }}>
                {nativeGranted ? "Active — notifications enabled" : nativeDenied ? "Blocked — enable in Phone Settings → Apps → AmyNest → Notifications" : "Not yet enabled — tap Allow to set up notifications on this device"}
              </div>
              {!nativeGranted && !nativeDenied && (
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-muted-foreground hover:text-white hover:bg-primary"
                    onClick={handleEnableNative}
                    disabled={enabling}
                  >
                    {enabling ? "Enabling…" : "Allow"}
                  </Button>
                </div>
              )}
              {/* i18n-ignore-end */}
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  // ── Wrapper, bridge not yet ready: brief loading card ───────────────────
  if (wrapperState === "detecting") {
    return (
      <Card className="bg-white/[0.04] border-primary backdrop-blur-md">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="w-10 h-10 rounded-lg bg-primary border border-border flex items-center justify-center shrink-0">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            {/* i18n-ignore-start: native-wrapper-only loading label */}
            <div className="font-semibold text-white">App Notifications</div>
            <div className="text-sm text-muted-foreground mt-1">
              Setting up notifications inside the AmyNest app…
            </div>
            {/* i18n-ignore-end */}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Wrapper detected but bridge never appeared: recovery card ───────────
  if (wrapperState === "wrapper-no-bridge") {
    const handleReload = () => {
      try {
        window.location.reload();
      } catch {
        /* ignore */
      }
    };
    return (
      <Card className="bg-white/[0.04] border-primary backdrop-blur-md">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="w-10 h-10 rounded-lg bg-primary border border-border flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            {/* i18n-ignore-start: native-wrapper-only recovery label */}
            <div className="font-semibold text-white">App Notifications</div>
            <div className="text-sm text-muted-foreground mt-1">
              The AmyNest app's native notification bridge could not start on
              this device. Reload the app to try again — if the issue persists,
              update Android System WebView from the Play Store and reopen the app.
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-muted-foreground hover:text-white hover:bg-primary"
                onClick={handleReload}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reload app
              </Button>
            </div>
            {/* i18n-ignore-end */}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not inside the native wrapper — web push is disabled, render nothing.
  return null;
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
  const testDelivery = useMutation({
    mutationFn: async () => {
      const attempt = async () => {
        const r = await authFetch("/api/notifications/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: "insights" }),
        });
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return (await r.json()) as { status?: string; reason?: string };
      };

      return await attempt();
    },
    onSuccess: (result) => {
      const status = result.status ?? "unknown";
      if (status === "sent") {
        toast({
          title: "Test notification sent!",
          description:
            "Check your Android system tray — it should appear within a few seconds.",
        });
      } else if (status === "no_tokens") {
        toast({
          title: "No device registered",
          description:
            "Open AmyNest on your Android device first to register for push notifications.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Not sent",
          description: `${status}${result.reason ? ` — ${result.reason}` : ""}`,
          variant: "destructive",
        });
      }
    },
    onError: (err: Error) => {
      return toast({
        title: "Could not send test",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const test = useMutation({
    mutationFn: async (category: CategoryDef["testCategory"]) => {
      const r = await authFetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      return (await r.json()) as {
        status?: string;
        reason?: string;
      };
    },
    onSuccess: result => {
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
      return toast({
        title: t("toasts.notification_settings.test_failed_title"),
        description: err.message,
        variant: "destructive"
      });
    }
  });
  if (isLoading || !local) {
    return <div data-on-dark className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D0022] via-[#180040] to-[#0A001E]">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-transparent animate-spin" />
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
        <button type="button" onClick={() => navigate("/dashboard")} className="flex items-center gap-1 text-muted-foreground hover:text-white mb-6 text-sm">
          <ChevronLeft className="w-4 h-4" />
          {t("pages.notification_settings.back")}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary border border-border flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t("pages.notification_settings.notifications")}</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          {t("pages.notification_settings.choose_which_notifications_you_want_from_amynest_maximum")} {local.dailyCap} {t("pages.notification_settings.per_day_never_during_quiet_hours")}
        </p>

        {isAmyNestWrapper() && (
          <>
            <h2 className="text-xs uppercase tracking-widest text-primary mb-3">
              {t("pages.notification_settings.this_browser")}
            </h2>
            <div className="mb-6">
              <WebPushCard />
            </div>
          </>
        )}

        <h2 className="text-xs uppercase tracking-widest text-primary mb-3">
          Test Delivery
        </h2>
        <div className="mb-6">
          <Card className="bg-white/[0.04] border-primary backdrop-blur-md">
            <CardContent className="flex items-start gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-primary border border-border flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                {/* i18n-ok: push test feature label — debug/settings tool, intentionally untranslated */}
                <div className="font-semibold text-white">Test Push Notification</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Send a test notification to all your registered devices right now. Bypasses quiet hours, daily limits, and category settings so you can always verify delivery.
                  Check your Android system tray to confirm it arrived.
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 gap-2 bg-primary hover:bg-primary/80 text-white border border-border"
                  onClick={() => testDelivery.mutate()}
                  disabled={testDelivery.isPending}
                >
                  {testDelivery.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Test Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xs uppercase tracking-widest text-primary mb-3">
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
                className="bg-white/[0.04] border-primary backdrop-blur-md"
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary border border-border flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {description}
                    </div>
                    {enabled && <Button type="button" size="sm" variant="ghost" className="mt-2 h-7 text-muted-foreground hover:text-white hover:bg-primary" onClick={() => test.mutate(cat.testCategory)} disabled={test.isPending}>
                        {test.isPending ? "Sending…" : "Send test"}
                      </Button>}
                  </div>
                  <Switch checked={enabled} onCheckedChange={v => toggle(cat.key, v)} />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6 bg-white/[0.04] border-primary backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("pages.notification_settings.quiet_hours")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground font-bold text-lg">
              {local.quietHoursStart} → {local.quietHoursEnd}
            </div>
            <div className="text-muted-foreground text-sm mt-1">
              {t("pages.notification_settings.timezone")} {local.timezone}{t("pages.notification_settings.we_never_send_notifications_during_this_window")}
            </div>
          </CardContent>
        </Card>

        <button
          type="button"
          onClick={() => navigate("/notification-diagnostics")}
          className="mt-6 w-full flex items-center gap-3 rounded-xl border border-border bg-primary hover:bg-primary px-4 py-3 text-left transition"
        >
          <HelpCircle className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">
              Why didn't I get my notification?
            </div>
            <div className="text-xs text-muted-foreground">
              Check token health, quiet hours and recent failures.
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0" />
        </button>

        <h2 className="text-xs uppercase tracking-widest text-primary mt-8 mb-3">
          {t("toasts.notification_settings_page.recent_deliveries")}
        </h2>
        <Card className="bg-white/[0.04] border-primary backdrop-blur-md">
          <CardContent className="p-2">
            {history.isLoading ? (
              <div className="p-4 text-muted-foreground text-sm">{t("toasts.notification_settings_page.history_loading")}</div>
            ) : !history.data || history.data.items.length === 0 ? (
              <div className="p-4 text-muted-foreground text-sm">
                {t("toasts.notification_settings_page.history_empty")}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {history.data.items.slice(0, 10).map((row) => {
                  const ok = row.status === "sent";
                  return (
                    <li key={row.id} className="p-3 flex items-start gap-3">
                      {ok ? (
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {row.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {row.category} · {row.status}
                          {row.errorMessage ? ` · ${row.errorMessage}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
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