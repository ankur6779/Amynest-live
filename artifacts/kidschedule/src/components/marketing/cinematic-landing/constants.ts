export const LANDING_BG = "#050B1F";

export const SCREENSHOTS = {
  meetAmy: "/landing/screenshots/meet-amy.png",
  dashboard: "/landing/screenshots/dashboard.png",
  parentingHub: "/landing/screenshots/parenting-hub.png",
  gamingHub: "/landing/screenshots/gaming-hub.png",
  learningZone: "/landing/screenshots/learning-zone.png",
  audioLessons: "/landing/screenshots/audio-lessons.png",
  healthZone: "/landing/screenshots/health-zone.png",
  familyGoals: "/landing/screenshots/family-goals.png",
} as const;

export const AMY_QUESTIONS = [
  "My child won't listen.",
  "How much screen time is okay?",
  "Create today's routine.",
  "My toddler won't sleep.",
  "How can I improve focus?",
] as const;

export const STATS = [
  { value: 10000, suffix: "+", label: "Parenting Recommendations" },
  { value: 95, suffix: "%", label: "Parent Satisfaction" },
  { value: 24, suffix: "/7", label: "AI Guidance" },
  { value: 100, suffix: "+", label: "Learning Experiences" },
] as const;

export const GAMING_STATS = [
  { label: "Brain", value: 72, color: "#E022FF" },
  { label: "Memory", value: 58, color: "#7B5CFF" },
  { label: "Math", value: 63, color: "#FF8C00" },
  { label: "Focus", value: 48, color: "#00D4FF" },
  { label: "Behavior", value: 75, color: "#00FF9C" },
] as const;

export const TESTIMONIALS = [
  {
    quote: "Routines finally stick — Amy nudges us at the right moment without feeling robotic.",
    topic: "Better routines",
    author: "Priya M.",
    role: "Mom of 2",
  },
  {
    quote: "The emotional support cards feel like a calm friend on hard parenting days.",
    topic: "Reduced parenting stress",
    author: "James R.",
    role: "Dad of 3",
  },
  {
    quote: "My daughter asks for phonics and math games — screen time that actually builds skills.",
    topic: "Improved learning habits",
    author: "Ananya K.",
    role: "Mom of 1",
  },
  {
    quote: "We log wins and tough moments — patterns help Amy guide us with real consistency.",
    topic: "Stronger consistency at home",
    author: "David L.",
    role: "Dad of 2",
  },
] as const;
