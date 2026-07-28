/**
 * Music mood classification for background tracks.
 */

import type { MusicMoodProfile, StudioEmotion, StudioTopicIdea } from "../types.js";

export function classifyMusicMood(idea: StudioTopicIdea): MusicMoodProfile {
  const mood = moodFrom(idea);
  return {
    mood,
    energy: energyFor(mood, idea.emotion),
    trackHint: hintFor(mood),
  };
}

function moodFrom(idea: StudioTopicIdea): MusicMoodProfile["mood"] {
  if (/Games|Creativity|Weekend/i.test(idea.category)) return "happy";
  if (/Astro|Adventure/i.test(idea.category)) return "adventure";
  if (/Health|Routine|Nutrition|Calm|Focus/i.test(idea.category)) return "relaxed";
  if (/Premium|Milestone|Feature Updates/i.test(idea.category)) return "celebration";
  if (/Parent Tips|Amy Coach|Daily/i.test(idea.category)) return "motivation";
  return "learning";
}

function energyFor(mood: MusicMoodProfile["mood"], emotion: StudioEmotion): number {
  const base =
    mood === "celebration" ? 0.85 :
    mood === "adventure" ? 0.75 :
    mood === "happy" ? 0.7 :
    mood === "motivation" ? 0.65 :
    mood === "learning" ? 0.55 :
    0.4;
  const bump =
    emotion === "achievement" || emotion === "pride" ? 0.08 :
    emotion === "calm" ? -0.1 :
    0;
  return Math.round(Math.min(1, Math.max(0.25, base + bump)) * 100) / 100;
}

function hintFor(mood: MusicMoodProfile["mood"]): string {
  switch (mood) {
    case "happy":
      return "Light plucky melody, soft claps, child-safe joy — no harsh EDM.";
    case "learning":
      return "Gentle piano + soft pads; curious motif that resolves warmly.";
    case "adventure":
      return "Soft cosmic arpeggios; wonder without tension spikes.";
    case "relaxed":
      return "Breathing tempo, ambient warmth, low percussion.";
    case "celebration":
      return "Uplifting swell into end card; keep tasteful and brand-safe.";
    case "motivation":
      return "Steady hopeful pulse; encourage without hype.";
  }
}

export function formatMusicForPrompt(profile: MusicMoodProfile): string {
  return `MUSIC: mood=${profile.mood}; energy=${profile.energy}; ${profile.trackHint}`;
}
