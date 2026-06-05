import type { SchoolEvent } from "../eventTypes";
import { TIMELINE_STANDARD } from "./event-content-shared";

export const EVENTS_CA: SchoolEvent[] = [
  {
    id: "ca-canada-day",
    countries: ["CA"],
    name: "Canada Day",
    emoji: "🇨🇦",
    dateLabel: "1 Jul",
    month: 6,
    day: 1,
    category: "Holiday",
    ageGroups: ["3-5", "6-8", "8-12"],
    tags: ["patriotic", "canada", "july1", "school"],
    overview:
      "Red-and-white dress-up, maple leaf crafts, and proud speeches about Canada.",
    whatToPrepare: [
      "Red & white outfit",
      "Maple leaf pin or face paint",
      "Patriotic speech (2 lines)",
      "Sunscreen for outdoor events",
    ],
    speechIdeas: [
      "Happy Canada Day! I am proud to live in a kind, diverse country.",
      "On July first we celebrate Canada from coast to coast. O Canada!",
    ],
    activities: [
      "Cut a paper maple leaf garland",
      "Draw provincial flags matching game",
      "Learn opening line of O Canada",
    ],
    prepTimeline: TIMELINE_STANDARD,
    checklist: ["Outfit ready", "Leaf craft done", "Speech practiced", "Sunscreen packed"],
    costumeCategory: "fancy-dress",
    accent: ["#dc2626", "#ffffff"],
  },
  {
    id: "ca-victoria-day",
    countries: ["CA"],
    name: "Victoria Day",
    emoji: "👑",
    dateLabel: "May (Monday before 25 May)",
    approxMonth: 4,
    category: "Holiday",
    ageGroups: ["3-5", "6-8", "8-12"],
    tags: ["may", "parade", "spring", "school"],
    overview:
      "Long weekend kick-off to summer — parades, fireworks crafts, and spring costumes.",
    whatToPrepare: [
      "Spring parade outfit",
      "Firework safety poster",
      "Short spring poem",
      "Jacket for cool evenings",
    ],
    speechIdeas: [
      "Victoria Day welcomes spring and summer fun with family and friends!",
      "We celebrate safely and cheer at the parade. Happy Victoria Day!",
    ],
    activities: [
      "Firework chalk art on pavement",
      "Make a crown craft",
      "Spring flower crown",
    ],
    prepTimeline: TIMELINE_STANDARD,
    checklist: ["Parade outfit ready", "Poster finished", "Poem learnt", "Jacket packed"],
    costumeCategory: "fancy-dress",
    accent: ["#a855f7", "#ec4899"],
  },
];
