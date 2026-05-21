import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  CheckCircle2,
  Flame,
  Play,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePhonicsCurriculum } from "@/hooks/use-phonics-curriculum";
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import type { PlanActivity } from "@workspace/phonics-curriculum";

type PhonicsCurriculumDashboardProps = {
  childId: number;
  childQuery: string;
};

function ActivityRow({
  activity,
  onStart,
  onComplete,
}: {
  activity: PlanActivity;
  onStart: () => void;
  onComplete?: () => void;
}) {
  const done = activity.completed;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 transition-all",
        done
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-border bg-white/50 dark:bg-white/[0.04]",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{activity.label}</p>
        <p className="text-[10px] text-muted-foreground capitalize">
          {activity.gameMode.replace(/_/g, " ")}
        </p>
      </div>
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      ) : (
        <Button type="button" size="sm" className="rounded-full shrink-0" onClick={onStart}>
          <Play className="h-3.5 w-3.5 mr-1" />
          Start
        </Button>
      )}
      {!done && onComplete && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="rounded-full text-[10px]"
          onClick={onComplete}
        >
          Done
        </Button>
      )}
    </div>
  );
}

export function PhonicsCurriculumDashboard({
  childId,
  childQuery,
}: PhonicsCurriculumDashboardProps) {
  const navigate = useNavigate();
  const { data, loading, error, completeActivity } = usePhonicsCurriculum(childId);

  const plan = data?.plan;
  const progress = data?.progress;

  const continueTarget = useMemo(() => {
    if (!plan) return null;
    const pending = [...plan.practice, ...plan.revision, plan.test].find(
      (a) => !a.completed,
    );
    return pending ?? plan.practice[0] ?? null;
  }, [plan]);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams(childQuery.replace(/^\?/, ""));
    p.set("childId", String(childId));
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `?${p.toString()}`;
  };

  const openActivity = (activity: PlanActivity) => {
    if (activity.kind === "daily_test") {
      navigate(`/phonics/test${qs({ type: "daily" })}`);
      return;
    }
    if (activity.kind === "blend_word" && getCvcWordEntry(activity.target)) {
      navigate(`/phonics${qs({ blend: activity.target })}`);
      return;
    }
    navigate(`/phonics${qs({})}`);
  };

  if (loading && !plan) {
    return (
      <Card className="rounded-3xl border border-white/50">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Building today&apos;s plan…
        </CardContent>
      </Card>
    );
  }

  if (error || !plan || !progress) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="phonics-curriculum-dashboard">
      <Card className="rounded-3xl bg-gradient-to-br from-violet-500/10 via-primary/5 to-transparent border border-primary/20">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-quicksand text-base font-bold">Today&apos;s Activity</h3>
              <p className="text-xs text-muted-foreground">
                Level {plan.currentLevel}: {plan.levelName}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Target className="h-3 w-3" />
                  Mastery {plan.masteryScore}%
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Flame className="h-3 w-3" />
                  {plan.streak} day streak
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Daily plan</span>
              <span>{data.completionPct}%</span>
            </div>
            <Progress value={data.completionPct} className="h-2" />
          </div>

          {continueTarget && (
            <Button
              type="button"
              className="w-full rounded-2xl font-bold"
              onClick={() => openActivity(continueTarget)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Continue learning — {continueTarget.label}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-white/50">
        <CardContent className="p-5 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Practice
          </p>
          {plan.practice.map((a) => (
            <ActivityRow
              key={a.id}
              activity={a}
              onStart={() => openActivity(a)}
              onComplete={() => void completeActivity(a.id)}
            />
          ))}

          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2">
            Revision
          </p>
          {plan.revision.map((a) => (
            <ActivityRow
              key={a.id}
              activity={a}
              onStart={() => openActivity(a)}
              onComplete={() => void completeActivity(a.id)}
            />
          ))}

          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2">
            Daily test
          </p>
          <ActivityRow
            activity={plan.test}
            onStart={() => openActivity(plan.test)}
            onComplete={() => void completeActivity(plan.test.id)}
          />

          {plan.weakPhonemes.length > 0 && (
            <p className="text-[10px] text-muted-foreground pt-1">
              Extra focus: {plan.weakPhonemes.join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      <Button
        type="button"
        variant="outline"
        className="w-full rounded-2xl border-amber-500/40 text-amber-700 dark:text-amber-300"
        onClick={() => navigate(`/phonics/test${qs({ type: "weekly" })}`)}
      >
        <Trophy className="h-4 w-4 mr-2" />
        Weekly test (20 questions)
      </Button>
    </div>
  );
}
