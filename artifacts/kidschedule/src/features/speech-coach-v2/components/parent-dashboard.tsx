import { useEffect, useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { SPEECH_COACH_V2_BADGES, type SpeechCoachV2BadgeId, type SpeechCoachV2ParentDashboard } from "@workspace/speech-coach-v2";
import { fetchSpeechCoachV2Dashboard } from "../lib/api";

export function SpeechCoachV2ParentDashboardPanel(props: { childId: number }) {
  const authFetch = useAuthFetch();
  const [dashboard, setDashboard] = useState<SpeechCoachV2ParentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchSpeechCoachV2Dashboard(authFetch, props.childId)
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load progress");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, props.childId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !dashboard) {
    return <p className="text-sm text-muted-foreground">{error ?? "No data yet"}</p>;
  }

  const minutesToday = Math.floor(dashboard.todayPracticeSeconds / 60);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Practice</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{minutesToday} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Words Practiced</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard.wordsPracticed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Speech Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard.speechConfidence}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard.dailyStreak} days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Weekly improvement: {dashboard.weeklyImprovement >= 0 ? "+" : ""}{dashboard.weeklyImprovement}%</p>
          <p>Monthly improvement: {dashboard.monthlyImprovement >= 0 ? "+" : ""}{dashboard.monthlyImprovement}%</p>
          <p>Fluency trend (recent): {dashboard.fluencyTrend.join(" → ") || "—"}</p>
          <p>Pronunciation trend (recent): {dashboard.pronunciationTrend.join(" → ") || "—"}</p>
          <p>Confidence trend (recent): {dashboard.confidenceTrend.join(" → ") || "—"}</p>
          {dashboard.mostImprovedSkill && (
            <p>Most improved: {dashboard.mostImprovedSkill}</p>
          )}
        </CardContent>
      </Card>

      {dashboard.topStrengths.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {dashboard.topStrengths.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Strength Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {dashboard.strengthAreas.length > 0
                ? dashboard.strengthAreas.map((s) => <li key={s}>{s}</li>)
                : <li>Building foundations</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Needs Practice</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {dashboard.needsPracticeAreas.length > 0
                ? dashboard.needsPracticeAreas.map((s) => <li key={s}>{s}</li>)
                : <li>Looking great!</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      {dashboard.badges.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Speech Badges</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {dashboard.badges.map((id) => {
              const badge = SPEECH_COACH_V2_BADGES[id as SpeechCoachV2BadgeId];
              if (!badge) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium"
                >
                  {badge.emoji} {badge.label}
                </span>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
