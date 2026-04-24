import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { AgeGroup, SKILL_FOCUS_BY_GROUP, STORIES_BY_GROUP, PARENT_TASKS_BY_GROUP } from "@/lib/age-groups";
import { useAmyVoice } from "@/hooks/use-amy-voice";

// ─────────────────────────────────────────────────────────────
// Skill Focus Section
// ─────────────────────────────────────────────────────────────
interface SkillFocusSectionProps {
  group: AgeGroup;
  childName: string;
}

export function SkillFocusSection({ group, childName }: SkillFocusSectionProps) {
  const skills = SKILL_FOCUS_BY_GROUP[group];
  const colors = ["bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-400/30", "bg-purple-50 dark:bg-purple-500/15 border-purple-200 dark:border-purple-400/30", "bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-400/30", "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-400/30"];

  return (
    <Card className="rounded-3xl border-2 border-violet-200 dark:border-violet-400/30 bg-gradient-to-br from-violet-50 dark:from-violet-500/15 to-purple-50 dark:to-purple-500/15 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🧠</span>
          <div>
            <h3 className="font-quicksand text-base font-bold text-violet-900 dark:text-violet-100">
              Skills to Focus on for {childName}
            </h3>
            <p className="text-xs text-violet-700 dark:text-violet-200">Age-appropriate development activities for today</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {skills.map((s, i) => (
            <div key={s.skill} className={`rounded-2xl border-2 p-3 ${colors[i % colors.length]}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{s.emoji}</span>
                <span className="font-bold text-sm">{s.skill}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.activity}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          ✨ The AI will incorporate these focus areas when generating {childName}'s routine
        </p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Story Section
// ─────────────────────────────────────────────────────────────
interface StorySectionProps {
  group: AgeGroup;
  childName: string;
}


export function StorySection({ group, childName }: StorySectionProps) {
  const stories = STORIES_BY_GROUP[group];
  const [activeIdx, setActiveIdx] = useState(0);
  const { speak, stop, speaking, loading } = useAmyVoice();
  const story = stories[activeIdx];

  const handleSpeak = () => {
    if (!story) return;
    if (speaking || loading) { stop(); return; }
    const text = `${story.title}. ${story.story}. Moral: ${story.moral}`;
    speak(text);
  };

  if (!story) return null;

  return (
    <Card className="rounded-3xl border-2 border-amber-200 dark:border-amber-400/30 bg-gradient-to-br from-amber-50 dark:from-amber-500/15 to-orange-50 dark:to-orange-500/15 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📖</span>
          <div>
            <h3 className="font-quicksand text-base font-bold text-amber-900 dark:text-amber-100">
              Story Time for {childName}
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-200">Age-appropriate moral stories</p>
          </div>
        </div>

        {/* Story selector tabs */}
        {stories.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {stories.map((s, i) => (
              <button
                key={s.title}
                onClick={() => { setActiveIdx(i); stop(); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                  i === activeIdx
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white dark:bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-400/30 hover:border-amber-400"
                }`}
              >
                {s.emoji} {s.title}
              </button>
            ))}
          </div>
        )}

        {/* Story content */}
        <div className="bg-white dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-100 dark:border-amber-400/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-lg text-amber-900 dark:text-amber-100">
              {story.emoji} {story.title}
            </h4>
            <Button
              size="sm"
              variant="outline"
              className={`rounded-full h-8 px-3 transition-all ${(speaking || loading) ? "bg-amber-100 dark:bg-amber-500/20 border-amber-400 text-amber-700 dark:text-amber-200" : "border-amber-200 dark:border-amber-400/30 text-amber-700 dark:text-amber-200 hover:bg-amber-50 dark:bg-amber-500/15"}`}
              onClick={handleSpeak}
            >
              {(speaking || loading) ? (
                <><VolumeX className="h-3.5 w-3.5 mr-1" />{loading ? "…" : "Stop"}</>
              ) : (
                <><Volume2 className="h-3.5 w-3.5 mr-1" /> Read Aloud</>
              )}
            </Button>
          </div>
          <p className="text-sm text-foreground leading-relaxed mb-4 italic">
            "{story.story}"
          </p>
          <div className="bg-amber-50 dark:bg-amber-500/15 rounded-xl p-3 border border-amber-200 dark:border-amber-400/30">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200 mb-1">💡 Moral of the Story</p>
            <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">{story.moral}</p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          📚 Read this story to {childName} tonight for a meaningful bedtime moment
        </p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Parent Tasks Section
// ─────────────────────────────────────────────────────────────
interface ParentTasksSectionProps {
  group: AgeGroup;
  childName: string;
}

export function ParentTasksSection({ group, childName }: ParentTasksSectionProps) {
  const tasks = PARENT_TASKS_BY_GROUP[group];
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <Card className="rounded-3xl border-2 border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-500/15 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💝</span>
            <div>
              <h3 className="font-quicksand text-base font-bold text-rose-900 dark:text-rose-100">
                Your Parent Tasks
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-200">Things you can do for {childName} today</p>
            </div>
          </div>
          <div className="text-xs font-bold text-rose-800 dark:text-rose-200 bg-white dark:bg-rose-500/10 rounded-full px-3 py-1 border border-rose-200 dark:border-rose-400/30">
            {doneCount}/{tasks.length} done
          </div>
        </div>
        <div className="space-y-2">
          {tasks.map((t, i) => (
            <button
              key={t.task}
              onClick={() => toggle(i)}
              className={`w-full flex items-start gap-3 rounded-2xl p-3 border-2 transition-all text-left ${
                checked[i] ? "bg-rose-100 dark:bg-rose-500/20 border-rose-300 opacity-75" : "bg-white dark:bg-rose-500/10 border-rose-100 dark:border-rose-400/30 hover:border-rose-300"
              }`}
            >
              <div className={`mt-0.5 h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                checked[i] ? "bg-rose-500 border-rose-500" : "border-rose-300"
              }`}>
                {checked[i] && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-xl shrink-0 mt-0.5">{t.emoji}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${checked[i] ? "line-through text-muted-foreground" : "text-rose-900 dark:text-rose-100"}`}>{t.task}</p>
                <p className="text-xs text-rose-600 mt-0.5">⏱ {t.time}</p>
              </div>
            </button>
          ))}
        </div>
        {doneCount === tasks.length && doneCount > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm font-bold text-rose-700 dark:text-rose-200">🌟 Amazing! You're a star parent today!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
