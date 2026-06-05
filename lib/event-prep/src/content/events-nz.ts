import type { SchoolEvent } from "../eventTypes";
import { TIMELINE_STANDARD } from "./event-content-shared";

export const EVENTS_NZ: SchoolEvent[] = [
  {
    id: "nz-waitangi-day",
    countries: ["NZ"],
    name: "Waitangi Day",
    emoji: "🇳🇿",
    dateLabel: "6 Feb",
    month: 1,
    day: 6,
    category: "Holiday",
    ageGroups: ["3-5", "6-8", "8-12"],
    tags: ["patriotic", "nz", "culture", "school"],
    overview:
      "New Zealand's national day — cultural dress, Māori greetings, and speeches about unity.",
    whatToPrepare: [
      "NZ-themed outfit or cultural dress",
      "Small flag or silver fern badge",
      "Short speech about New Zealand",
      "Sun hat for outdoor ceremony",
    ],
    speechIdeas: [
      "Happy Waitangi Day! We celebrate the treaty that brought us together as one nation.",
      "I am proud to be a Kiwi. Today we honour our history and our future.",
    ],
    activities: [
      "Draw the silver fern symbol",
      "Learn Kia ora and a waiata snippet",
      "Map activity — find North and South Island",
    ],
    prepTimeline: TIMELINE_STANDARD,
    checklist: ["Outfit ready", "Badge packed", "Speech practiced", "Sun hat in bag"],
    costumeCategory: "fancy-dress",
    accent: ["#1d4ed8", "#1e293b"],
  },
  {
    id: "nz-matariki",
    countries: ["NZ"],
    name: "Matariki",
    emoji: "⭐",
    dateLabel: "Jun–Jul (Māori New Year)",
    approxMonth: 6,
    category: "Festival",
    ageGroups: ["3-5", "6-8", "8-12"],
    tags: ["maori", "stars", "culture", "school"],
    overview:
      "Star cluster celebrations — kites, storytelling, and learning about Māori new year traditions.",
    whatToPrepare: [
      "Star craft or constellation drawing",
      "Traditional or cultural dress (optional)",
      "Short story about new beginnings",
      "Kite materials if school activity",
    ],
    speechIdeas: [
      "Matariki is the Māori new year. We look to the stars and set new goals!",
      "When Matariki rises, we remember the past and hope for the future.",
    ],
    activities: [
      "Paper star mobile craft",
      "Learn a Māori greeting — Kia ora!",
      "Write a wish for the new year",
    ],
    prepTimeline: TIMELINE_STANDARD,
    checklist: ["Star craft done", "Story ready", "Cultural item packed", "Kite ready"],
    costumeCategory: "fancy-dress",
    accent: ["#1e40af", "#a855f7"],
  },
  {
    id: "nz-languages-week",
    countries: ["NZ"],
    name: "NZ Sign Language Week / Languages Week",
    emoji: "🤟",
    dateLabel: "May",
    approxMonth: 4,
    category: "School Event",
    ageGroups: ["3-5", "6-8", "8-12"],
    tags: ["language", "culture", "school", "inclusion"],
    overview:
      "Celebrate te reo Māori and NZSL — dress-up, signs, and sharing words from many cultures.",
    whatToPrepare: [
      "Word or sign to teach the class",
      "Cultural accessory",
      "Poster with hello in 3 languages",
      "Practice NZSL greeting",
    ],
    speechIdeas: [
      "Kia ora! I can say hello in three languages. Languages connect us!",
      "I learned to sign 'thank you'. Inclusion makes school better for everyone.",
    ],
    activities: [
      "NZSL alphabet finger-spelling",
      "Poster: hello in te reo, Hindi, Samoan",
      "Dress in colours of a culture you love",
    ],
    prepTimeline: TIMELINE_STANDARD,
    checklist: ["Sign practiced", "Poster done", "Accessory ready", "Words memorised"],
    costumeCategory: "fancy-dress",
    accent: ["#0d9488", "#6366f1"],
  },
];
