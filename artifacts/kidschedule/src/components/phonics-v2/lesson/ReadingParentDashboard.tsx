import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  getLetterGroup,
  LETTER_INTRODUCTION_GROUPS,
} from "@workspace/phonics-curriculum";
import {
  BADGE_LABELS,
  fluencyLabel,
  SKILL_LABELS,
  type ReadingSkillsState,
} from "@/lib/phonics-v3/reading-skills";
import { canUnlockNextLetterGroup } from "@/lib/phonics-v3/reading-lesson-engine";
import type { CoachConfusionState } from "@/lib/phonics-v3/coach-confusions";
import { topConfusionLabels } from "@/lib/phonics-v3/coach-confusions";
import {
  estimateReadingReadiness,
  fluencyBandFromMetrics,
  fluencyBandLabel,
} from "@/lib/phonics-v3/ai-reading-coach";
import { BookOpen, Sparkles, Star, Target } from "lucide-react";

type ReadingParentDashboardProps = {
  letterGroupIndex: number;
  skills: ReadingSkillsState;
  coachConfusions?: CoachConfusionState;
  storiesCompleted?: number;
  pronunciationAvg?: number;
  className?: string;
};

export function ReadingParentDashboard({
  letterGroupIndex,
  skills,
  coachConfusions,
  storiesCompleted = 0,
  pronunciationAvg,
  className,
}: ReadingParentDashboardProps) {
  const group = getLetterGroup(letterGroupIndex);
  const phonemesMastered = useMemo(() => {
    // Count graphemes through current group as "available"; mastery from letter skill proxy.
    let total = 0;
    for (const g of LETTER_INTRODUCTION_GROUPS) {
      if (g.id > letterGroupIndex) break;
      total += g.graphemes.length;
    }
    const letterScore = skills.skills.letter_recognition?.score ?? 0;
    const mastered = Math.round((total * letterScore) / 100);
    return { mastered, total: Math.max(total, 1) };
  }, [letterGroupIndex, skills.skills.letter_recognition?.score]);

  const blending = skills.skills.blending?.score ?? 0;
  const segmenting = skills.skills.segmenting?.score ?? 0;
  const reading = skills.skills.reading?.score ?? 0;
  const fluency = skills.skills.fluency?.score ?? reading;
  const pronAvg = pronunciationAvg ?? coachConfusions?.pronunciationAvg ?? 0;
  const fluencyBand = fluencyBandFromMetrics({ accuracyPct: Math.max(fluency, pronAvg) });

  const gate = canUnlockNextLetterGroup({
    letterGroupIndex,
    skillScores: {
      letter_recognition: skills.skills.letter_recognition?.score ?? 0,
      beginning_sounds: skills.skills.beginning_sounds?.score ?? 0,
      blending,
      reading,
    },
    blendingAccuracy: blending,
    readingAccuracy: reading,
  });

  const strengths = Object.values(skills.skills)
    .filter((s) => s.score >= 70 && s.attempts > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((s) => SKILL_LABELS[s.skill]);

  const needs = Object.values(skills.skills)
    .filter((s) => s.attempts > 0 && s.score < 60)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map((s) => SKILL_LABELS[s.skill]);

  const confusionNeeds = coachConfusions
    ? topConfusionLabels(coachConfusions, 3)
    : [];

  const readiness = estimateReadingReadiness({
    wordsRead: skills.wordsRead.length,
    pronunciationAvg: pronAvg,
    fluencyBand,
    letterGroupIndex,
  });

  return (
    <Card
      id="phonics-reading-parent-dashboard"
      data-testid="phonics-reading-parent-dashboard"
      className={className}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-quicksand text-base font-bold">AI Reading Coach Report</h3>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            Group {group.id} · {group.name}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">{group.description}</p>
        <p
          className="text-[10px] leading-snug text-muted-foreground"
          data-testid="phonics-parent-privacy-note"
        >
          Voice practice scores pronunciation from a short listen. AmyNest stores scores and tips
          on this device — not your child&apos;s voice recordings in the app.
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Phonemes path"
            value={`${phonemesMastered.mastered}/${phonemesMastered.total}`}
          />
          <Stat label="Words read" value={String(skills.wordsRead.length)} />
          <Stat label="Stories" value={String(storiesCompleted)} />
          <Stat label="Pronunciation" value={`${Math.round(pronAvg)}%`} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat label="Blending" value={`${blending}%`} />
          <Stat label="Segmenting" value={`${segmenting}%`} />
        </div>

        <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">Reading fluency</span>
            <span className="text-muted-foreground">
              {fluencyBandLabel(fluencyBand)} · {fluencyLabel(fluency)}
            </span>
          </div>
          <Progress value={fluency} className="h-1.5" />
        </div>

        <p className="rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-2 text-[11px] leading-relaxed text-foreground">
          <span className="font-semibold">Reading readiness: </span>
          {readiness}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-emerald-600">
              Strengths
            </p>
            {strengths.length === 0 ? (
              <p className="text-xs text-muted-foreground">Complete a reading lesson to see strengths.</p>
            ) : (
              <ul className="space-y-0.5 text-xs font-medium">
                {strengths.map((s) => (
                  <li key={s}>✓ {s}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Needs practice
            </p>
            {needs.length === 0 && confusionNeeds.length === 0 ? (
              <p className="text-xs text-muted-foreground">Looking balanced — keep the streak going!</p>
            ) : (
              <ul className="space-y-0.5 text-xs font-medium">
                {confusionNeeds.map((s) => (
                  <li key={s}>○ Sound mix-up {s}</li>
                ))}
                {needs.map((s) => (
                  <li key={s}>○ {s}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] p-3">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              {gate.ok ? "Ready for the next group" : "Keep practising this group"}
            </p>
            <p className="text-[11px] text-muted-foreground">{gate.reason}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {skills.readingStars} reading stars
          </span>
          {skills.badges.slice(0, 4).map((b) => (
            <Badge key={b} variant="outline" className="gap-1 text-[10px]">
              <Sparkles className="h-3 w-3" />
              {BADGE_LABELS[b] ?? b}
            </Badge>
          ))}
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Tip: Short daily sessions beat long ones. Celebrate every word your child reads
          aloud — confidence grows faster than perfect accuracy.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-primary/5 p-2 text-center">
      <p className="font-quicksand text-lg font-bold">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
