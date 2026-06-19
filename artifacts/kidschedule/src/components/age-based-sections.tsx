import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Brain, CheckCircle2, Clock, Gauge, MessageCircleHeart, Sparkles, Star, Trophy, Volume2, VolumeX, Zap } from "lucide-react";
import { AgeGroup, SKILL_FOCUS_BY_GROUP, STORIES_BY_GROUP, PARENT_TASKS_BY_GROUP } from "@/lib/age-groups";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { buildAgeGroupStorySpeakText } from "@workspace/parent-hub-speak";
import { ConfettiBurst, XpPopup } from "@/components/study-engagement";
import {
  createParentHubAudioIdentity,
  PARENT_HUB_SECTIONS,
} from "@/lib/parent-hub-audio-identity";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Skill Focus Section
// ─────────────────────────────────────────────────────────────
interface SkillFocusSectionProps {
 group: AgeGroup;
 childName: string;
}

export function SkillFocusSection({ group, childName }: SkillFocusSectionProps) {
 const skills = SKILL_FOCUS_BY_GROUP[group];
 const missionKey = `amynest:growth-mission:${group}:${childName}:${new Date().toISOString().slice(0, 10)}`;
 const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
   try {
     return JSON.parse(localStorage.getItem(missionKey) ?? "{}");
   } catch {
     return {};
   }
 });
 const [celebration, setCelebration] = useState({ trigger: 0, amount: 0 });
 const missions = useMemo(() => skills.map((skill, index) => buildGrowthMission(skill, index)), [skills]);
 const insight = missions.find((m) => /critical|thinking|focus|discipline/i.test(m.skill)) ?? missions[0];
 const completedCount = missions.filter((m) => completed[m.skill]).length;
 const totalXp = missions.reduce((sum, m) => completed[m.skill] ? sum + m.xp : sum, 0);
 const pct = missions.length > 0 ? Math.round((completedCount / missions.length) * 100) : 0;

 const completeMission = (skill: string, xp: number) => {
   if (completed[skill]) return;
   setCompleted((prev) => {
     const next = { ...prev, [skill]: true };
     try {
       localStorage.setItem(missionKey, JSON.stringify(next));
     } catch {
       // Local progress persistence is best-effort only.
     }
     return next;
   });
   setCelebration((prev) => ({ trigger: prev.trigger + 1, amount: xp }));
 };

 return (
   <Card className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.30),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.86))] text-white shadow-[0_24px_70px_-32px_rgba(124,58,237,0.85)]">
     <CardContent className="relative p-4 sm:p-5">
       <ConfettiBurst trigger={celebration.trigger} />
       <XpPopup amount={celebration.amount} trigger={celebration.trigger} />

       <div className="mb-5 flex items-start gap-3">
         <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400 shadow-[0_0_30px_rgba(168,85,247,0.45)]">
           <Brain className="h-6 w-6 text-white" />
         </div>
         <div className="min-w-0 flex-1">
           <div className="flex flex-wrap items-center gap-2">
             <h3 className="font-quicksand text-xl font-black leading-tight text-white">
               Today&apos;s Growth Mission
             </h3>
             <span className="rounded-full border border-amber-300/30 bg-amber-300/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-100">
               Premium
             </span>
           </div>
           <p className="mt-1 text-sm font-semibold text-white/68">
             These skills matter most for {childName} today
           </p>
         </div>
         <GrowthProgressRing pct={pct} label={`${completedCount}/${missions.length}`} />
       </div>

       <div className="mb-4 rounded-3xl border border-white/12 bg-white/[0.08] p-4 shadow-inner backdrop-blur-xl">
         <div className="flex items-start gap-3">
           <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-xl shadow-[0_0_24px_rgba(251,191,36,0.35)]">
             ✨
           </div>
           <div className="min-w-0">
             <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-100/90">
               AI Recommendation
             </p>
             <p className="mt-1 text-sm font-bold leading-relaxed text-white">
               {insight.skill} is currently the highest growth opportunity.
             </p>
           </div>
         </div>
       </div>

       <div className="mb-4 grid grid-cols-2 gap-2">
         <MissionMetric icon={Trophy} label="Growth Score" value={`${totalXp} XP`} tone="amber" />
         <MissionMetric icon={Zap} label="Completed" value={`${completedCount}/${missions.length}`} tone="violet" />
       </div>

       <div className="grid gap-3">
         {missions.map((mission, index) => {
           const done = !!completed[mission.skill];
           return (
             <div
               key={mission.skill}
               className={cn(
                 "group relative overflow-hidden rounded-3xl border p-4 backdrop-blur-xl transition-all duration-300",
                 done
                   ? "border-emerald-300/30 bg-emerald-400/10 shadow-[0_0_28px_rgba(52,211,153,0.12)]"
                   : "border-white/12 bg-white/[0.07] hover:border-violet-300/35 hover:bg-white/[0.10]",
               )}
             >
               <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
               <div className="flex items-start gap-3">
                 <div className={cn(
                   "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-lg",
                   index % 3 === 0 && "bg-gradient-to-br from-violet-400 to-fuchsia-500",
                   index % 3 === 1 && "bg-gradient-to-br from-cyan-400 to-blue-500",
                   index % 3 === 2 && "bg-gradient-to-br from-amber-300 to-orange-500",
                 )}>
                   {mission.emoji}
                 </div>
                 <div className="min-w-0 flex-1">
                   <div className="flex items-start justify-between gap-3">
                     <div>
                       <h4 className="font-quicksand text-lg font-black leading-tight text-white">
                         {mission.skill}
                       </h4>
                       <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/45">
                         Mission {index + 1}
                       </p>
                     </div>
                     {done ? (
                       <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-300/15 px-2 py-1 text-[11px] font-black text-emerald-100">
                         <CheckCircle2 className="h-3.5 w-3.5" />
                         Done
                       </span>
                     ) : null}
                   </div>

                   <div className="mt-4 grid gap-3">
                     <MissionCopyBlock label="Why" text={mission.why} />
                     <MissionCopyBlock label="Today's Mission" text={mission.challenge} />
                   </div>

                   <div className="mt-4 flex flex-wrap items-center gap-2">
                     <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-white/75">
                       <Clock className="h-3.5 w-3.5 text-cyan-200" />
                       {mission.time}
                     </span>
                     <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/12 px-3 py-1.5 text-xs font-black text-amber-100">
                       <Star className="h-3.5 w-3.5 fill-amber-200 text-amber-200" />
                       +{mission.xp} Growth XP
                     </span>
                   </div>

                   <button
                     type="button"
                     disabled={done}
                     onClick={() => completeMission(mission.skill, mission.xp)}
                     className={cn(
                       "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all active:scale-[0.98]",
                       done
                         ? "cursor-default border border-emerald-300/20 bg-emerald-300/12 text-emerald-100"
                         : "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 text-white shadow-[0_12px_28px_-14px_rgba(217,70,239,0.85)] hover:brightness-110",
                     )}
                   >
                     {done ? (
                       <>
                         <CheckCircle2 className="h-4 w-4" />
                         Mission Complete
                       </>
                     ) : (
                       <>
                         <Sparkles className="h-4 w-4" />
                         Mark Mission Complete
                       </>
                     )}
                   </button>
                 </div>
               </div>
             </div>
           );
         })}
       </div>
     </CardContent>
   </Card>
 );
}

type GrowthMission = {
  skill: string;
  emoji: string;
  why: string;
  challenge: string;
  time: string;
  xp: number;
};

const GROWTH_MISSION_DETAILS: Record<string, Partial<GrowthMission>> = {
  "Sensory Development": {
    why: "Builds early brain pathways through sound, color, touch, and connection.",
    challenge: "Create a 5-minute sensory moment with one color, one texture, and one gentle sound.",
    time: "5 mins",
    xp: 15,
  },
  "Motor Skills": {
    why: "Strengthens body control, balance, and confidence for daily movement.",
    challenge: "Complete one short movement practice with encouragement and no rush.",
    time: "10 mins",
    xp: 20,
  },
  "Language Foundation": {
    why: "Early conversation builds vocabulary, listening, and emotional connection.",
    challenge: "Name 10 things around the room and pause for your child to respond.",
    time: "7 mins",
    xp: 15,
  },
  Bonding: {
    why: "Secure bonding supports calm, trust, and emotional resilience.",
    challenge: "Share one distraction-free cuddle, massage, or eye-contact moment.",
    time: "10 mins",
    xp: 20,
  },
  Communication: {
    why: "Improves expression, listening, and confidence in daily conversations.",
    challenge: "Ask 3 simple questions and let your child answer without interruption.",
    time: "8 mins",
    xp: 20,
  },
  "Color & Shape": {
    why: "Builds visual recognition, sorting, and early math readiness.",
    challenge: "Sort 8 household items by color or shape together.",
    time: "10 mins",
    xp: 20,
  },
  Independence: {
    why: "Small choices help your child build ownership and self-confidence.",
    challenge: "Let your child choose and complete one tiny self-care task.",
    time: "8 mins",
    xp: 20,
  },
  Creativity: {
    why: "Strengthens imagination, flexible thinking, and self-expression.",
    challenge: "Create one drawing, story, or build with no fixed outcome.",
    time: "15 mins",
    xp: 25,
  },
  Imagination: {
    why: "Pretend play develops language, empathy, and flexible problem solving.",
    challenge: "Start a pretend story and let your child decide what happens next.",
    time: "12 mins",
    xp: 20,
  },
  "Numbers & Letters": {
    why: "Daily exposure builds early literacy, number sense, and school readiness.",
    challenge: "Count 10 objects and trace 3 letters in a playful way.",
    time: "10 mins",
    xp: 20,
  },
  "Social Skills": {
    why: "Practice with sharing and turn-taking improves confidence with peers.",
    challenge: "Play one turn-taking game and praise one kind choice.",
    time: "12 mins",
    xp: 20,
  },
  "Fine Motor": {
    why: "Hand control supports writing, dressing, drawing, and independent tasks.",
    challenge: "Do one cutting, threading, puzzle, or grip-strength activity.",
    time: "10 mins",
    xp: 20,
  },
  Discipline: {
    why: "Builds follow-through, patience, and the ability to finish important tasks.",
    challenge: "Complete one focused block with a timer and no distractions.",
    time: "30 mins",
    xp: 25,
  },
  Sports: {
    why: "Supports physical fitness, coordination, mood, and healthy energy release.",
    challenge: "Do one outdoor sport or movement session with a clear finish goal.",
    time: "30 mins",
    xp: 25,
  },
  "Critical Thinking": {
    why: "Strengthens problem solving and decision making.",
    challenge: "Solve 1 puzzle without hints.",
    time: "10 mins",
    xp: 20,
  },
  "Focus & Discipline": {
    why: "Improves attention stamina and helps your child start hard work calmly.",
    challenge: "Finish one Pomodoro block and write down what got completed.",
    time: "25 mins",
    xp: 30,
  },
  Leadership: {
    why: "Builds responsibility, planning, and confidence in taking initiative.",
    challenge: "Let your child plan one small family or school-related task.",
    time: "15 mins",
    xp: 25,
  },
  "Emotional Intelligence": {
    why: "Helps your child understand feelings and respond instead of reacting.",
    challenge: "Write 3 good things and 1 challenge from today.",
    time: "5 mins",
    xp: 20,
  },
  "Physical Fitness": {
    why: "Supports energy, confidence, sleep quality, and long-term healthy habits.",
    challenge: "Complete one short workout, yoga flow, or sport session.",
    time: "20 mins",
    xp: 25,
  },
};

function buildGrowthMission(
  skill: { skill: string; activity: string; emoji: string },
  index: number,
): GrowthMission {
  const detail = GROWTH_MISSION_DETAILS[skill.skill] ?? {};
  return {
    skill: skill.skill,
    emoji: skill.emoji,
    why: detail.why ?? "Builds an important developmental skill through one focused daily practice.",
    challenge: detail.challenge ?? skill.activity,
    time: detail.time ?? estimateMissionTime(skill.activity),
    xp: detail.xp ?? 20 + (index % 2) * 5,
  };
}

function estimateMissionTime(activity: string): string {
  const match = activity.match(/(\d+)\s*[–-]?\s*(\d+)?\s*min/i);
  if (!match) return "10 mins";
  return `${match[2] ?? match[1]} mins`;
}

function GrowthProgressRing({ pct, label }: { pct: number; label: string }) {
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * pct) / 100;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 56 56" aria-hidden>
        <circle cx="28" cy="28" r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="5" fill="none" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          stroke="url(#growthMissionRing)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id="growthMissionRing" x1="8" x2="48" y1="8" y2="48">
            <stop stopColor="#22d3ee" />
            <stop offset="0.5" stopColor="#a855f7" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-quicksand text-sm font-black text-white">{label}</span>
        <span className="text-[9px] font-bold uppercase tracking-wide text-white/45">skills</span>
      </div>
    </div>
  );
}

function MissionMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  tone: "amber" | "violet";
}) {
  return (
    <div className={cn(
      "rounded-2xl border px-3 py-2.5",
      tone === "amber"
        ? "border-amber-300/20 bg-amber-300/10"
        : "border-violet-300/20 bg-violet-300/10",
    )}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", tone === "amber" ? "text-amber-200" : "text-violet-200")} />
        <span className="text-[10px] font-black uppercase tracking-wide text-white/45">{label}</span>
      </div>
      <p className="mt-1 font-quicksand text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MissionCopyBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-white/78">{text}</p>
    </div>
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
 const { t } = useTranslation();
 const stories = STORIES_BY_GROUP[group];
 const [activeIdx, setActiveIdx] = useState(0);
 const { speak, pause, speaking, loading, primeSpeakGesture } = useAmyVoice();
 const story = stories[activeIdx];

 const storyText = story ? buildAgeGroupStorySpeakText(story) : "";
 const handleSpeak = () => {
 if (!story) return;
 if (speaking || loading) { pause(); return; }
 const text = storyText;
 const identity = createParentHubAudioIdentity({
   sectionId: PARENT_HUB_SECTIONS.AGE_STORIES,
   itemId: `${group}:${activeIdx}`,
   text,
 });
 void speak(identity.text, {
   parentHub: true,
   audioIdentity: identity,
   waitUntilEnd: true,
   narration: true,
 });
 };

 if (!story) return null;

 return (
 <Card className="rounded-3xl border-2 border-border bg-card shadow-none">
 <CardContent className="p-5">
 <div className="flex items-center gap-3 mb-4">
 <span className="text-2xl">📖</span>
 <div>
 <h3 className="font-quicksand text-base font-bold text-foreground">
 {t("parent_hub.age_sections.story.title", { name: childName })}
 </h3>
 <p className="text-xs text-foreground">{t("parent_hub.age_sections.story.desc")}</p>
 </div>
 </div>

 {/* Story selector tabs */}
 {stories.length > 1 && (
 <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
 {stories.map((s, i) => (
 <button
 key={s.title}
 onClick={() => { setActiveIdx(i); pause(); }}
 className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
 i === activeIdx
 ?"bg-primary text-white border-primary"
 :"bg-white text-foreground border-border hover:border-primary"
 }`}
 >
 {s.emoji} {s.title}
 </button>
 ))}
 </div>
 )}

 {/* Story content */}
 <div className="bg-white rounded-2xl p-4 border border-border">
 <div className="flex items-center justify-between mb-3">
 <h4 className="font-bold text-lg text-foreground">
 {story.emoji} {story.title}
 </h4>
 <Button
 size="sm"
 variant="outline"
 className={`rounded-full h-8 px-3 transition-all ${(speaking || loading) ?"bg-muted border-primary text-foreground" :"border-border text-foreground hover:bg-muted"}`}
 onPointerDown={() => { if (storyText) primeSpeakGesture(storyText); }}
 onClick={handleSpeak}
 >
 {(speaking || loading) ? (
 <><VolumeX className="h-3.5 w-3.5 mr-1" />{loading ?"…" : t("parent_hub.age_sections.story.stop")}</>
 ) : (
 <><Volume2 className="h-3.5 w-3.5 mr-1" /> {t("parent_hub.age_sections.story.read_aloud")}</>
 )}
 </Button>
 </div>
 <p className="text-sm text-foreground leading-relaxed mb-4 italic">
"{story.story}"
 </p>
 <div className="bg-muted rounded-xl p-3 border border-border">
 <p className="text-xs font-bold text-foreground mb-1">{t("parent_hub.age_sections.story.moral_label")}</p>
 <p className="text-sm text-foreground font-medium">{story.moral}</p>
 </div>
 </div>

 <p className="text-[10px] text-muted-foreground mt-3 text-center">
 {t("parent_hub.age_sections.story.footer", { name: childName })}
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
 const [celebration, setCelebration] = useState({ trigger: 0, amount: 0 });

 const toggle = (i: number) => setChecked((prev) => {
   const nextValue = !prev[i];
   if (nextValue) {
     setCelebration((current) => ({ trigger: current.trigger + 1, amount: 10 }));
   }
   return { ...prev, [i]: nextValue };
 });
 const doneCount = Object.values(checked).filter(Boolean).length;
 const impactScore = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
 const parentXp = doneCount * 10;
 const allDone = doneCount === tasks.length && doneCount > 0;
 const coachingTasks = tasks.map((task, index) => buildParentCoachingTask(task, index));

 return (
   <Card className="relative w-full min-w-0 overflow-hidden rounded-[2rem] border border-white/12 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.30),transparent_30%),radial-gradient(circle_at_90%_8%,rgba(168,85,247,0.28),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.90))] text-white shadow-[0_24px_70px_-34px_rgba(20,184,166,0.8)]">
     <CardContent className="relative p-4 sm:p-5">
       <ConfettiBurst trigger={celebration.trigger + (allDone ? 1 : 0)} />
       <XpPopup amount={celebration.amount} trigger={celebration.trigger} />

       <div className="mb-5 flex items-start gap-3">
         <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-400 text-2xl shadow-[0_0_30px_rgba(45,212,191,0.42)]">
           👨‍👩‍👧
         </div>
         <div className="min-w-0 flex-1">
           <div className="flex flex-wrap items-center gap-2">
             <h3 className="font-quicksand text-xl font-black leading-tight text-white">
               Today&apos;s Parent Coaching
             </h3>
             <span className="rounded-full border border-amber-200/30 bg-amber-200/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-100">
               AI Coach
             </span>
           </div>
           <p className="mt-1 text-sm font-semibold leading-relaxed text-white/66">
             These {tasks.length} actions can improve {childName}&apos;s confidence and communication today.
           </p>
         </div>
       </div>

       <div className="mb-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
         <ParentImpactGauge score={impactScore} />
         <div className="grid grid-cols-2 gap-2">
           <ParentCoachMetric icon={Gauge} label="Parent Impact Score" value={`${impactScore}/100`} tone="cyan" />
           <ParentCoachMetric icon={Star} label="Parent XP" value={`${parentXp} XP`} tone="amber" />
         </div>
       </div>

       <div className="mb-4 rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-xl">
         <div className="flex items-start gap-3">
           <MessageCircleHeart className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
           <div>
             <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/80">AI Message</p>
             <p className="mt-1 text-sm font-bold leading-relaxed text-white/82">
               Focus on connection first. Small, intentional actions today can create a calmer, more confident child.
             </p>
           </div>
         </div>
       </div>

       <div className="grid gap-3">
         {coachingTasks.map((task, index) => {
           const done = !!checked[index];
           return (
             <article
               key={task.task}
               className={cn(
                 "relative overflow-hidden rounded-3xl border p-4 backdrop-blur-xl transition-all duration-300",
                 done
                   ? "border-emerald-300/30 bg-emerald-300/12 shadow-[0_0_30px_rgba(52,211,153,0.13)]"
                   : "border-white/12 bg-white/[0.07] hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-white/[0.10]",
               )}
             >
               <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
               <div className="flex items-start gap-3">
                 <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/90 to-violet-500/90 text-2xl shadow-[0_16px_34px_-20px_rgba(34,211,238,0.8)]">
                   {task.emoji}
                 </div>
                 <div className="min-w-0 flex-1">
                   <div className="flex items-start justify-between gap-3">
                     <div>
                       <h4 className="font-quicksand text-lg font-black leading-tight text-white">
                         {task.title}
                       </h4>
                       <p className="mt-1 text-sm font-semibold leading-relaxed text-white/62">
                         {task.task}
                       </p>
                     </div>
                     {done ? (
                       <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-300/15 px-2 py-1 text-[11px] font-black text-emerald-100">
                         <CheckCircle2 className="h-3.5 w-3.5" />
                         Done
                       </span>
                     ) : null}
                   </div>

                   <div className="mt-4 grid gap-2">
                     <ParentCoachInfo label="Why this matters" text={task.why} />
                     <ParentCoachInfo label="Child benefit" text={task.benefit} />
                   </div>

                   <div className="mt-4 flex flex-wrap items-center gap-2">
                     <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-white/74">
                       <Clock className="h-3.5 w-3.5 text-cyan-200" />
                       {task.time}
                     </span>
                     <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/20 bg-amber-200/12 px-3 py-1.5 text-xs font-black text-amber-100">
                       <Zap className="h-3.5 w-3.5 text-amber-200" />
                       +10 Parent XP
                     </span>
                   </div>

                   <button
                     type="button"
                     onClick={() => toggle(index)}
                     className={cn(
                       "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all active:scale-[0.98]",
                       done
                         ? "border border-emerald-300/20 bg-emerald-300/12 text-emerald-100"
                         : "bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 shadow-[0_14px_34px_-20px_rgba(45,212,191,0.9)] hover:brightness-110",
                     )}
                   >
                     {done ? (
                       <>
                         <CheckCircle2 className="h-4 w-4" />
                         Completed
                       </>
                     ) : (
                       <>
                         <Sparkles className="h-4 w-4" />
                         Mark Coaching Complete
                       </>
                     )}
                   </button>
                 </div>
               </div>
             </article>
           );
         })}
       </div>

       {allDone ? (
         <div className="mt-4 rounded-3xl border border-amber-200/25 bg-[linear-gradient(135deg,rgba(251,191,36,0.20),rgba(34,197,94,0.12))] p-4 text-center shadow-[0_0_34px_rgba(251,191,36,0.14)]">
           <Award className="mx-auto h-9 w-9 text-amber-200" />
           <p className="mt-2 font-quicksand text-xl font-black text-white">🎉 Amazing parenting today!</p>
           <p className="mt-1 text-sm font-semibold text-white/68">You completed all coaching actions.</p>
           <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/15 px-4 py-2 text-sm font-black text-amber-100">
             <Trophy className="h-4 w-4" />
             Parent Hero Badge Unlocked
           </div>
         </div>
       ) : null}
     </CardContent>
   </Card>
 );
}

type ParentTask = { task: string; time: string; emoji: string };

type ParentCoachingTask = ParentTask & {
  title: string;
  why: string;
  benefit: string;
};

const PARENT_COACHING_DETAILS: Record<string, { title: string; why: string; benefit: string }> = {
  "Spend 15 minutes talking about their school day — really listen": {
    title: "School Conversation",
    why: "Children build emotional security when parents actively listen.",
    benefit: "Improves communication skills and helps your child feel understood.",
  },
  "Do an outdoor activity together (walk, cycle, play catch)": {
    title: "Outdoor Connection",
    why: "Shared movement lowers stress and makes connection feel natural.",
    benefit: "Builds confidence, cooperation, and healthy energy release.",
  },
  "Help with homework — guide, don't do it for them": {
    title: "Homework Coaching",
    why: "Guided help teaches persistence without taking away ownership.",
    benefit: "Strengthens problem solving and independent learning habits.",
  },
  "Share a meal together with no screens — just conversation": {
    title: "Screen-Free Meal",
    why: "Undistracted meals create space for trust and everyday sharing.",
    benefit: "Improves family bonding and emotional communication.",
  },
  "Have a 10-minute open conversation — no judgment zone": {
    title: "No-Judgment Talk",
    why: "Pre-teens open up when they feel safe from quick correction.",
    benefit: "Builds trust, self-expression, and emotional safety.",
  },
  "Watch something they like — show genuine interest": {
    title: "Interest Bridge",
    why: "Joining their world communicates respect for who they are becoming.",
    benefit: "Improves connection and makes future conversations easier.",
  },
  "Give them one meaningful responsibility today": {
    title: "Responsibility Boost",
    why: "Real responsibility shows your child that you trust their abilities.",
    benefit: "Builds independence, leadership, and self-belief.",
  },
  "Ask about their dreams and goals — write them down together": {
    title: "Dream Mapping",
    why: "Naming goals helps children feel seen and take their ambitions seriously.",
    benefit: "Strengthens motivation, planning, and confidence.",
  },
};

function buildParentCoachingTask(task: ParentTask, index: number): ParentCoachingTask {
  const detail = PARENT_COACHING_DETAILS[task.task];
  if (detail) return { ...task, ...detail };
  return {
    ...task,
    title: deriveParentTaskTitle(task.task, index),
    why: "Small parent actions compound into emotional security, confidence, and better daily communication.",
    benefit: "Supports confidence, connection, and cooperative behavior.",
  };
}

function deriveParentTaskTitle(task: string, index: number): string {
  const compact = task
    .replace(/—.+$/, "")
    .replace(/\(.+\)/, "")
    .trim();
  if (compact.length <= 24) return compact;
  const fallback = ["Connection Moment", "Confidence Builder", "Communication Coach", "Family Bonding"][index % 4];
  return fallback ?? "Parent Coaching";
}

function ParentImpactGauge({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * score) / 100;
  return (
    <div className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-white/12 bg-white/[0.07] shadow-inner backdrop-blur-xl">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72" aria-hidden>
          <circle cx="36" cy="36" r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" />
          <circle
            cx="36"
            cy="36"
            r={radius}
            stroke="url(#parentImpactGauge)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
          <defs>
            <linearGradient id="parentImpactGauge" x1="10" x2="62" y1="10" y2="62">
              <stop stopColor="#22d3ee" />
              <stop offset="0.55" stopColor="#2dd4bf" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-quicksand text-xl font-black text-white">{score}</span>
          <span className="text-[9px] font-black uppercase tracking-wide text-white/45">/100</span>
        </div>
      </div>
    </div>
  );
}

function ParentCoachMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  tone: "cyan" | "amber";
}) {
  return (
    <div className={cn(
      "rounded-2xl border px-3 py-2.5 backdrop-blur-xl",
      tone === "cyan"
        ? "border-cyan-200/20 bg-cyan-200/10"
        : "border-amber-200/20 bg-amber-200/10",
    )}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", tone === "cyan" ? "text-cyan-200" : "text-amber-200")} />
        <span className="text-[10px] font-black uppercase tracking-wide text-white/40">{label}</span>
      </div>
      <p className="mt-1 font-quicksand text-lg font-black text-white">{value}</p>
    </div>
  );
}

function ParentCoachInfo({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-white/76">{text}</p>
    </div>
  );
}
