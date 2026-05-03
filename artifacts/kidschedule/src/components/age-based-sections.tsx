import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
 const { t } = useTranslation();
 const skills = SKILL_FOCUS_BY_GROUP[group];
 const colors = ["bg-muted border-border","bg-muted border-border","bg-muted border-border","bg-muted border-border"];

 return (
 <Card className="rounded-3xl border-2 border-border bg-card shadow-none">
 <CardContent className="p-5">
 <div className="flex items-center gap-3 mb-4">
 <span className="text-2xl">🧠</span>
 <div>
 <h3 className="font-quicksand text-base font-bold text-foreground">
 {t("parent_hub.age_sections.skill_focus.title", { name: childName })}
 </h3>
 <p className="text-xs text-foreground">{t("parent_hub.age_sections.skill_focus.desc")}</p>
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
 {t("parent_hub.age_sections.skill_focus.footer", { name: childName })}
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
 const { t } = useTranslation();
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
 onClick={() => { setActiveIdx(i); stop(); }}
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
 const { t } = useTranslation();
 const tasks = PARENT_TASKS_BY_GROUP[group];
 const [checked, setChecked] = useState<Record<number, boolean>>({});

 const toggle = (i: number) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
 const doneCount = Object.values(checked).filter(Boolean).length;

 return (
 <Card className="rounded-3xl border-2 border-border bg-muted shadow-none">
 <CardContent className="p-5">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <span className="text-2xl">💝</span>
 <div>
 <h3 className="font-quicksand text-base font-bold text-foreground">
 {t("parent_hub.age_sections.parent_tasks.title")}
 </h3>
 <p className="text-xs text-foreground">{t("parent_hub.age_sections.parent_tasks.desc", { name: childName })}</p>
 </div>
 </div>
 <div className="text-xs font-bold text-foreground bg-white rounded-full px-3 py-1 border border-border">
 {t("parent_hub.age_sections.parent_tasks.done_counter", { done: doneCount, total: tasks.length })}
 </div>
 </div>
 <div className="space-y-2">
 {tasks.map((t, i) => (
 <button
 key={t.task}
 onClick={() => toggle(i)}
 className={`w-full flex items-start gap-3 rounded-2xl p-3 border-2 transition-all text-left ${
 checked[i] ?"bg-muted border-border opacity-75" :"bg-white border-border hover:border-border"
 }`}
 >
 <div className={`mt-0.5 h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
 checked[i] ?"bg-primary border-primary" :"border-border"
 }`}>
 {checked[i] && <span className="text-white text-xs">✓</span>}
 </div>
 <span className="text-xl shrink-0 mt-0.5">{t.emoji}</span>
 <div className="flex-1">
 <p className={`text-sm font-medium ${checked[i] ?"line-through text-muted-foreground" :"text-foreground"}`}>{t.task}</p>
 <p className="text-xs text-foreground mt-0.5">⏱ {t.time}</p>
 </div>
 </button>
 ))}
 </div>
 {doneCount === tasks.length && doneCount > 0 && (
 <div className="mt-4 text-center">
 <p className="text-sm font-bold text-foreground">{t("parent_hub.age_sections.parent_tasks.celebration")}</p>
 </div>
 )}
 </CardContent>
 </Card>
 );
}
