// Per-band stage milestones — small marketing/retention blurbs shown in
// "Explore Next Stage" when there are no exclusive next-band sections to
// preview. These are intentionally aspirational and content-agnostic so
// they always make sense regardless of which features ship later.

import type { AgeBand } from "./age-bands";

export type StageMilestone = {
  emoji: string;
  title: string;
  description: string;
};

export const STAGE_MILESTONES: Record<AgeBand, StageMilestone[]> = {
  "0-2": [
    { emoji: "🌱", title: "Sensory & motor",     description: "Tummy time, soft textures, first sounds." },
    { emoji: "🤱", title: "Bonding rituals",     description: "Eye contact, gentle massage, calm voices." },
    { emoji: "🍼", title: "Sleep & feed rhythms", description: "Predictable routines that reduce fussiness." },
  ],
  "2-4": [
    { emoji: "💬", title: "Language explosion",  description: "Picture books, naming games, two-word play." },
    { emoji: "🎨", title: "Creative play",       description: "Finger paints, play-doh, free drawing." },
    { emoji: "🌟", title: "Mini independence",   description: "Self-feed, choose clothes, simple chores." },
  ],
  "4-6": [
    { emoji: "🔤", title: "Phonics & reading",   description: "Sound blending, sight words, first books." },
    { emoji: "🧩", title: "Problem solving",     description: "Puzzles, sorting, simple board games." },
    { emoji: "🤝", title: "Social skills",       description: "Sharing, turn-taking, cooperative play." },
  ],
  "6-8": [
    { emoji: "📖", title: "School discipline",   description: "Focused study blocks, homework rhythm." },
    { emoji: "⚽", title: "Sports & teamwork",   description: "Daily outdoor sport and team values." },
    { emoji: "🧠", title: "Critical thinking",   description: "Chess, logic puzzles, brain games." },
  ],
  "8-10": [
    { emoji: "🏆", title: "Olympiad readiness",  description: "Daily MCQs, weekly tests, badges." },
    { emoji: "📝", title: "Independent study",   description: "Note-taking, summarising, self-quizzing." },
    { emoji: "🎤", title: "Public speaking",     description: "Presentations, debates, storytelling." },
  ],
  "10-12": [
    { emoji: "🎯", title: "Pomodoro focus",      description: "25-min deep-work blocks, no phone." },
    { emoji: "📔", title: "Emotional journaling", description: "Daily reflection on wins and challenges." },
    { emoji: "👑", title: "Leadership moments",  description: "Plan, organise, and lead small projects." },
  ],
  "12-15": [
    { emoji: "🚀", title: "Goal setting",        description: "Long-term goals broken into weekly steps." },
    { emoji: "💪", title: "Physical fitness",    description: "Workouts, yoga, sports they enjoy." },
    { emoji: "💡", title: "Career curiosity",    description: "Explore interests, mentors, side projects." },
  ],
};
