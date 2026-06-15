export type PhoneShowcaseSlide = {
  id: string;
  eyebrow: string;
  headline: string;
  description: string;
  bullets: string[];
  screenshot: string;
  glow: string;
};

export const PHONE_SHOWCASE_SLIDES: PhoneShowcaseSlide[] = [
  {
    id: "meet-amy",
    eyebrow: "Meet Amy",
    headline: "Meet Amy",
    description: "Your AI parenting companion — warm, smart, and always ready to help.",
    bullets: ["Patent-pending adaptive AI", "Personalized for your family", "Available 24/7"],
    screenshot: "/landing/screenshots/meet-amy.png",
    glow: "rgba(224, 34, 255, 0.4)",
  },
  {
    id: "dashboard",
    eyebrow: "Dashboard",
    headline: "Your Family Command Center",
    description:
      "Weather-aware insights, routines and personalized guidance for every child.",
    bullets: ["Live weather & safety alerts", "7-day parenting journey", "Child-specific AI insights"],
    screenshot: "/landing/screenshots/dashboard.png",
    glow: "rgba(255, 107, 53, 0.35)",
  },
  {
    id: "parenting-hub",
    eyebrow: "Parenting Hub",
    headline: "Science Meets Parenting",
    description: "Articles, emotional support, nutrition and life skills in one place.",
    bullets: ["Research-backed articles", "Emotional support", "Life skills mode"],
    screenshot: "/landing/screenshots/parenting-hub.png",
    glow: "rgba(224, 34, 255, 0.35)",
  },
  {
    id: "gaming-hub",
    eyebrow: "Gaming Hub",
    headline: "Screen Time That Builds Skills",
    description: "Fun educational games that improve focus, memory and problem solving.",
    bullets: ["Brain & logic games", "Skill progress tracking", "Amy's daily picks"],
    screenshot: "/landing/screenshots/gaming-hub.png",
    glow: "rgba(255, 140, 0, 0.35)",
  },
  {
    id: "health-zone",
    eyebrow: "Health Zone",
    headline: "Healthy Kids. Peaceful Parents.",
    description: "Nutrition plans, wellness activities and WHO-backed health guidance.",
    bullets: ["Nutrition Hub", "Amy Health Lab™", "Age-wise meal guidance"],
    screenshot: "/landing/screenshots/health-zone.png",
    glow: "rgba(0, 255, 156, 0.3)",
  },
  {
    id: "creativity",
    eyebrow: "Creativity",
    headline: "Creativity & Activities",
    description: "Art, crafts, worksheets, coloring books and curiosity-driven learning.",
    bullets: ["Art & craft videos", "Printable worksheets", "Curiosity library"],
    screenshot: "/landing/screenshots/creativity.png",
    glow: "rgba(168, 85, 247, 0.35)",
  },
  {
    id: "learning-zone",
    eyebrow: "Learning Zone",
    headline: "An Entire Learning Ecosystem",
    description: "Phonics, abacus, study zone, spelling and olympiad prep — all adaptive.",
    bullets: ["Smart Study Zone", "Phonics learning", "Olympiad prep"],
    screenshot: "/landing/screenshots/learning-zone.png",
    glow: "rgba(0, 212, 255, 0.3)",
  },
  {
    id: "goals",
    eyebrow: "Goals",
    headline: "Because Parents Need Support Too",
    description: "Track sleep, eating, screen time, behavior — plus parent self-care goals.",
    bullets: ["Child development goals", "Parent self-care plans", "Progress tracking"],
    screenshot: "/landing/screenshots/family-goals.png",
    glow: "rgba(236, 72, 153, 0.35)",
  },
  {
    id: "audio-lessons",
    eyebrow: "Audio Lessons",
    headline: "Parenting Wisdom On Demand",
    description: "Age-based audio lessons, daily picks and quick play for busy parents.",
    bullets: ["Age-based lessons", "Daily picks by Amy", "Quick play mode"],
    screenshot: "/landing/screenshots/audio-lessons.png",
    glow: "rgba(124, 58, 237, 0.4)",
  },
];

export const AUTOPLAY_MS = 4500;
