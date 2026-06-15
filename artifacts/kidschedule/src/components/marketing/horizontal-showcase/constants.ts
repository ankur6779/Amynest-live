import { SCREENSHOTS, GAMING_STATS } from "../cinematic-landing/constants";

export type ShowcaseScene = {
  id: string;
  headline: string;
  subtitle: string;
  screenshot?: string;
  highlights: string[];
  accent: "purple" | "magenta" | "orange" | "green" | "cyan" | "gold";
  variant?: "splash" | "gaming" | "audio" | "goals" | "final";
};

export const SHOWCASE_SCENES: ShowcaseScene[] = [
  {
    id: "meet-amy",
    headline: "Meet Amy",
    subtitle: "Your AI parenting companion.",
    screenshot: SCREENSHOTS.meetAmy,
    highlights: [],
    accent: "purple",
    variant: "splash",
  },
  {
    id: "dashboard",
    headline: "Your Family Command Center",
    subtitle: "Weather, routines, and AI guidance in one place.",
    screenshot: SCREENSHOTS.dashboard,
    highlights: [
      "Weather-aware guidance",
      "Child-specific recommendations",
      "AI insights",
      "Daily routines",
    ],
    accent: "orange",
  },
  {
    id: "parenting-hub",
    headline: "Science Meets Parenting",
    subtitle: "Research-backed support for every parenting moment.",
    screenshot: SCREENSHOTS.parentingHub,
    highlights: [
      "Parenting articles",
      "Emotional support",
      "Nutrition guidance",
      "Life skills",
    ],
    accent: "magenta",
  },
  {
    id: "gaming-hub",
    headline: "Screen Time That Builds Skills",
    subtitle: "Games that grow brain, memory, focus, and behavior.",
    screenshot: SCREENSHOTS.gamingHub,
    highlights: ["Brain", "Memory", "Focus", "Math", "Behavior"],
    accent: "orange",
    variant: "gaming",
  },
  {
    id: "learning-zone",
    headline: "An Entire Learning Ecosystem",
    subtitle: "Phonics to olympiad prep — adaptive for every age.",
    screenshot: SCREENSHOTS.learningZone,
    highlights: ["Phonics", "Abacus", "Study Zone", "Spelling", "Olympiad"],
    accent: "cyan",
  },
  {
    id: "audio-lessons",
    headline: "Parenting Wisdom On Demand",
    subtitle: "Listen while you multitask — expert guidance on tap.",
    screenshot: SCREENSHOTS.audioLessons,
    highlights: ["Daily picks", "Age-based lessons", "Quick play", "Premium content"],
    accent: "purple",
    variant: "audio",
  },
  {
    id: "health",
    headline: "Healthy Kids. Peaceful Parents.",
    subtitle: "Nutrition, wellness, and WHO-backed guidance.",
    screenshot: SCREENSHOTS.healthZone,
    highlights: [
      "Nutrition Hub",
      "Health Lab",
      "Wellness activities",
      "WHO-backed guidance",
    ],
    accent: "green",
  },
  {
    id: "goals",
    headline: "Because Parents Need Support Too",
    subtitle: "Goals for your child — and for you.",
    screenshot: SCREENSHOTS.familyGoals,
    highlights: ["Sleep", "Eating", "Screen time", "Behavior", "Parent self-care"],
    accent: "magenta",
    variant: "goals",
  },
];

export const SHOWCASE_FINAL = {
  headline: "Everything Your Family Needs.\nOne App.",
  subtitle:
    "From infancy to teenage years,\nAmy grows with your child.",
};

export { GAMING_STATS };
