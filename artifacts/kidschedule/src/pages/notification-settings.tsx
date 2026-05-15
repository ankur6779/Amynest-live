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
  isCapacitorIOS,
  openNativeAppSettings,
  registerNativePushToken,
  requestNativePushPermission,
  resetCapacitorIOSPushState,
} from "@/lib/native-push-bridge";
import { getApiUrl } from "@/lib/api";
type NotificationIntensity = "minimal" | "balanced" | "active" | "growth";

type Prefs = {
  routineEnabled: boolean;
  routineItemEnabled: boolean;
  nutritionEnabled: boolean;
  insightsEnabled: boolean;
  weeklyEnabled: boolean;
  engagementEnabled: boolean;
  goodNightEnabled: boolean;
  parentingTipsEnabled: boolean;
  storyTimeEnabled: boolean;
  phonicsEnabled: boolean;
  learningActivityEnabled: boolean;
  milestoneEnabled: boolean;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  dailyCap: number;
  notificationIntensity: NotificationIntensity;
  engagementScore: number;
};
type TestCategory =
  | "routine" | "routine_item" | "nutrition" | "insights" | "weekly"
  | "engagement" | "good_night" | "parenting_tips" | "story_time"
  | "phonics" | "learning_activity" | "milestone";
type CategoryDef = {
  key: keyof Prefs;
  title: string;
  description: string;
  Icon: typeof Bell;
  testCategory: TestCategory;
  badge?: "core" | "smart";
};
const CATEGORIES: CategoryDef[] = [
  { key: "routineEnabled",         title: "Routine reminders",       description: "Morning, evening and bedtime nudges to stay on track.",      Icon: Calendar,   testCategory: "routine",           badge: "core" },
  { key: "routineItemEnabled",     title: "Per-task reminders",      description: "A heads-up about 5 minutes before each routine item.",       Icon: Calendar,   testCategory: "routine_item",      badge: "core" },
  { key: "nutritionEnabled",       title: "Nutrition suggestions",   description: "Snack ideas, dinner inspiration and meal tips.",             Icon: Apple,      testCategory: "nutrition",         badge: "core" },
  { key: "insightsEnabled",        title: "Ask AMY / Insights",      description: "Daily parenting tips from Amy AI tailored to your child.",   Icon: Sparkles,   testCategory: "insights",          badge: "core" },
  { key: "engagementEnabled",      title: "Motivation & nudges",     description: "Re-engagement, streak rewards and encouragement.",           Icon: Heart,      testCategory: "engagement",        badge: "core" },
  { key: "goodNightEnabled",       title: "Sleep & health tips",     description: "Wind-down reminder with age-appropriate sleep tips.",        Icon: Moon,       testCategory: "good_night",        badge: "core" },
  { key: "weeklyEnabled",          title: "Weekly report",           description: "Sunday recap of your child's week.",                        Icon: BarChart3,  testCategory: "weekly",            badge: "core" },
  { key: "parentingTipsEnabled",   title: "Parenting tips",          description: "Daily micro-tip at 9 AM — evidence-based & age-specific.",   Icon: Sparkles,   testCategory: "parenting_tips",    badge: "smart" },
  { key: "storyTimeEnabled",       title: "Story time",              description: "Bedtime story reminder at 8 PM for a calm wind-down.",       Icon: Moon,       testCategory: "story_time",        badge: "smart" },
  { key: "phonicsEnabled",         title: "Phonics practice",        description: "After-school phonics nudge at 4 PM (preschool & school).",   Icon: Sparkles,   testCategory: "phonics",           badge: "smart" },
  { key: "learningActivityEnabled",title: "Learning activities",     description: "Mid-morning activity idea — weekday learning or weekend fun.",Icon: BarChart3,  testCategory: "learning_activity", badge: "smart" },
  { key: "milestoneEnabled",       title: "Milestone alerts",        description: "Monthly check-in on your child's developmental milestones.", Icon: Heart,      testCategory: "milestone",         badge: "smart" },
];
/**
 * Inside-the-wrapper state machine — drives WebPushCard rendering when
 * the page is loaded inside the AmyNest Android WebView wrapper.
 *
 *   "detecting"          — wrapper detected (UA / __AMYNEST_WRAPPER marker)
 *                          but neither window.AndroidPush nor
 *                          window.AmyNestPushNative is wired yet.
 *                          Shows a brief "Setting up notifications…" card
 *                          while [awaitNativePushBridge] polls for either.
 *   "ready"              — bridge is live (new or legacy APK); render the
 *                          full native push card backed by the bridge.
 *   "wrapper-no-bridge"  — wrapper detected but no bridge appeared within
 *                          the timeout. Show a recovery card.
 *   "browser"            — not inside the wrapper; card renders null
 *                          (web push is disabled — native FCM only).
 */
type WrapperState = "detecting" | "ready" | "wrapper-no-bridge" | "browser";

type TestOnlyPlatform = "ios" | "ios-capacitor" | "android" | "web";

/** Test push should hit this shell only — avoids fan-out to every device on the account. */
function testNotificationOnlyPlatforms(): TestOnlyPlatform[] {
  if (typeof window === "undefined") return ["web"];
  if (isCapacitorIOS()) return ["ios-capacitor"];
  if (isAmyNestWrapper()) return ["android"];
  return ["web"];
}

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
          if (isCapacitorIOS()) {
            resetCapacitorIOSPushState();
          }
          const perm = await requestNativePushPermission(native);
          if (isCapacitorIOS() && perm !== "granted") {
            const after = getNativePushBridge()?.getPermissionStatus();
            if (after === "denied") {
              toast({
                title: "Notifications blocked",
                description:
                  "Go to iOS Settings → AmyNest → Notifications and enable them, then return to the app.",
                variant: "destructive",
              });
            }
          }
          if (perm !== "granted") {
            if (!isCapacitorIOS()) {
              toast({
                title: t("toasts.use_web_push.blocked_title"),
                description: t("toasts.use_web_push.blocked_body"),
                variant: "destructive",
              });
            }
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
                {nativeGranted
                  ? "Active — notifications enabled"
                  : nativeDenied
                    ? isCapacitorIOS()
                      ? "Blocked — open iOS Settings → AmyNest → Notifications, then return and tap Retry."
                      : "Blocked — enable in Phone Settings → Apps → AmyNest → Notifications"
                    : "Not yet enabled — tap Allow to set up notifications on this device"}
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
              {nativeDenied && isCapacitorIOS() && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-muted-foreground hover:text-white hover:bg-primary"
                    onClick={() => openNativeAppSettings()}
                  >
                    Open Settings
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-muted-foreground hover:text-white hover:bg-primary"
                    onClick={handleEnableNative}
                    disabled={enabling}
                  >
                    {enabling ? "Retrying…" : "Retry"}
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
          body: JSON.stringify({
            category: "insights",
            onlyPlatforms: testNotificationOnlyPlatforms(),
          }),
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
          description: isCapacitorIOS()
            ? "Check this iOS Simulator — it should appear within a few seconds."
            : isAmyNestWrapper()
              ? "Check your Android system tray — it should appear within a few seconds."
              : "Check this browser for the notification.",
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
        body: JSON.stringify({ category, onlyPlatforms: testNotificationOnlyPlatforms() }),
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
  const toggle = (key: keyof Prefs, value: boolean | string) => {
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
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          {t("pages.notification_settings.smart_subtitle")}
        </p>

        {/* ── Intensity Mode Picker ─────────────────────────────── */}
        <h2 className="text-xs uppercase tracking-widest text-primary mb-3">
          {t("pages.notification_settings.intensity_heading")}
        </h2>
        <div className="grid grid-cols-2 gap-2 mb-6 sm:grid-cols-4">
          {(["minimal", "balanced", "active", "growth"] as const).map((mode) => {
            const caps: Record<typeof mode, number> = { minimal: 3, balanced: 6, active: 9, growth: 12 };
            const labels: Record<typeof mode, string> = {
              minimal: t("pages.notification_settings.intensity_minimal"),
              balanced: t("pages.notification_settings.intensity_balanced"),
              active: t("pages.notification_settings.intensity_active"),
              growth: t("pages.notification_settings.intensity_growth"),
            };
            const descs: Record<typeof mode, string> = {
              minimal: t("pages.notification_settings.intensity_minimal_desc"),
              balanced: t("pages.notification_settings.intensity_balanced_desc"),
              active: t("pages.notification_settings.intensity_active_desc"),
              growth: t("pages.notification_settings.intensity_growth_desc"),
            };
            const active = local.notificationIntensity === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => toggle("notificationIntensity" as keyof Prefs, mode as unknown as boolean)}
                className={`rounded-xl border p-3 text-left transition-all ${active ? "border-primary bg-primary/20" : "border-border bg-white/[0.04] hover:bg-white/[0.08]"}`}
              >
                <div className={`text-sm font-bold mb-0.5 ${active ? "text-white" : "text-muted-foreground"}`}>
                  {labels[mode]}
                  {mode === "growth" && <span className="ml-1 text-xs">🚀</span>}
                </div>
                <div className="text-xs text-muted-foreground">{descs[mode]}</div>
                <div className={`text-xs font-semibold mt-1.5 ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {t("pages.notification_settings.intensity_cap", { cap: caps[mode] })}
                </div>
              </button>
            );
          })}
        </div>

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

        {/* Core categories */}
        <h2 className="text-xs uppercase tracking-widest text-primary mb-3">
          {t("pages.notification_settings.notification_types")}
        </h2>
        <div className="space-y-3 mb-6">
          {CATEGORIES.filter((c) => c.badge === "core").map((cat) => {
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
              <Card key={cat.key} className="bg-white/[0.04] border-primary backdrop-blur-md">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary border border-border flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{title}</div>
                    <div className="text-sm text-muted-foreground mt-1">{description}</div>
                    {enabled && (
                      <Button type="button" size="sm" variant="ghost"
                        className="mt-2 h-7 text-muted-foreground hover:text-white hover:bg-primary"
                        onClick={() => test.mutate(cat.testCategory)} disabled={test.isPending}>
                        {test.isPending ? t("pages.notification_settings.sending") : t("pages.notification_settings.send_test")}
                      </Button>
                    )}
                  </div>
                  <Switch checked={enabled} onCheckedChange={v => toggle(cat.key, v)} />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Smart engine categories */}
        <h2 className="text-xs uppercase tracking-widest text-primary mb-1">
          {t("pages.notification_settings.smart_categories_heading")}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {t("pages.notification_settings.smart_categories_desc")}
        </p>
        <div className="space-y-3">
          {CATEGORIES.filter((c) => c.badge === "smart").map((cat) => {
            const enabled = Boolean(local[cat.key]);
            const Icon = cat.Icon;
            return (
              <Card key={cat.key} className="bg-white/[0.04] border-primary/50 backdrop-blur-md">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/30 border border-border flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{cat.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold border border-primary/30">
                        {t("pages.notification_settings.smart_badge")}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{cat.description}</div>
                    {enabled && (
                      <Button type="button" size="sm" variant="ghost"
                        className="mt-2 h-7 text-muted-foreground hover:text-white hover:bg-primary"
                        onClick={() => test.mutate(cat.testCategory)} disabled={test.isPending}>
                        {test.isPending ? t("pages.notification_settings.sending") : t("pages.notification_settings.send_test")}
                      </Button>
                    )}
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