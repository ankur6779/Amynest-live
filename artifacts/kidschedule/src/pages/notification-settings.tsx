import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Calendar, Sparkles, Heart, Moon, Apple, BarChart3, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Prefs = {
  routineEnabled: boolean;
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

type CategoryDef = {
  key: keyof Prefs;
  title: string;
  description: string;
  Icon: typeof Bell;
  testCategory:
    | "routine"
    | "nutrition"
    | "insights"
    | "weekly"
    | "engagement"
    | "good_night";
};

const CATEGORIES: CategoryDef[] = [
  {
    key: "routineEnabled",
    title: "Routine reminders",
    description: "Morning, evening and bedtime nudges to stay on track.",
    Icon: Calendar,
    testCategory: "routine",
  },
  {
    key: "nutritionEnabled",
    title: "Nutrition suggestions",
    description: "Snack ideas, dinner inspiration and meal tips.",
    Icon: Apple,
    testCategory: "nutrition",
  },
  {
    key: "insightsEnabled",
    title: "Amy AI insights",
    description: "Daily parenting tips tailored to your child's age.",
    Icon: Sparkles,
    testCategory: "insights",
  },
  {
    key: "weeklyEnabled",
    title: "Weekly report",
    description: "Sunday recap of your child's week.",
    Icon: BarChart3,
    testCategory: "weekly",
  },
  {
    key: "engagementEnabled",
    title: "Friendly nudges",
    description: "Re-engagement messages and streak rewards.",
    Icon: Heart,
    testCategory: "engagement",
  },
  {
    key: "goodNightEnabled",
    title: "Good night message",
    description: "Wind-down reminder at bedtime.",
    Icon: Moon,
    testCategory: "good_night",
  },
];

export default function NotificationSettingsPage() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery<Prefs>({
    queryKey: ["notification-prefs"],
    queryFn: async () => {
      const r = await authFetch("/api/notifications/categories");
      if (!r.ok) throw new Error("Failed to load preferences");
      return r.json();
    },
  });

  const [local, setLocal] = useState<Prefs | null>(null);
  useEffect(() => {
    if (data && !local) setLocal(data);
  }, [data, local]);

  const patch = useMutation({
    mutationFn: async (next: Partial<Prefs>) => {
      const r = await authFetch("/api/notifications/categories", {
        method: "PATCH",
        body: JSON.stringify(next),
      });
      if (!r.ok) throw new Error("Failed to save");
      return r.json() as Promise<Prefs>;
    },
    onSuccess: (saved) => {
      setLocal(saved);
      qc.setQueryData(["notification-prefs"], saved);
    },
    onError: (err: Error) =>
      toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const test = useMutation({
    mutationFn: async (category: CategoryDef["testCategory"]) => {
      const r = await authFetch("/api/notifications/test", {
        method: "POST",
        body: JSON.stringify({ category }),
      });
      return (await r.json()) as { status?: string; reason?: string };
    },
    onSuccess: (result) => {
      const status = result.status ?? "unknown";
      if (status === "sent") {
        toast({ title: "Test sent", description: "Check your device in a moment." });
      } else if (status === "no_tokens") {
        toast({
          title: "No device registered",
          description: "Open AmyNest on your phone first to register for push.",
        });
      } else {
        toast({
          title: "Not sent",
          description: `${status}${result.reason ? ` — ${result.reason}` : ""}`,
        });
      }
    },
    onError: (err: Error) =>
      toast({ title: "Test failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading || !local) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D0022] via-[#180040] to-[#0A001E]">
        <div className="h-8 w-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const toggle = (key: keyof Prefs, value: boolean) => {
    const next = { ...local, [key]: value } as Prefs;
    setLocal(next);
    patch.mutate({ [key]: value } as Partial<Prefs>);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0022] via-[#180040] to-[#0A001E] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1 text-purple-200/80 hover:text-white mb-6 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-purple-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
        </div>
        <p className="text-purple-200/70 text-sm mb-8 leading-relaxed">
          Choose which notifications you want from AmyNest. Maximum {local.dailyCap} per
          day, never during quiet hours.
        </p>

        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const enabled = Boolean(local[cat.key]);
            const Icon = cat.Icon;
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
                    <div className="font-semibold text-white">{cat.title}</div>
                    <div className="text-sm text-purple-200/70 mt-1">
                      {cat.description}
                    </div>
                    {enabled && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-7 text-purple-300 hover:text-white hover:bg-purple-500/20"
                        onClick={() => test.mutate(cat.testCategory)}
                        disabled={test.isPending}
                      >
                        {test.isPending ? "Sending…" : "Send test"}
                      </Button>
                    )}
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => toggle(cat.key, v)}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6 bg-white/[0.04] border-purple-500/20 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base text-white">Quiet hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-purple-300 font-bold text-lg">
              {local.quietHoursStart} → {local.quietHoursEnd}
            </div>
            <div className="text-purple-200/60 text-sm mt-1">
              Timezone: {local.timezone}. We never send notifications during this window.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
