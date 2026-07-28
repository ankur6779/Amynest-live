import type { WeekCalendar } from "../types/index.js";

/**
 * Default multi-video weekday calendar.
 * Example Monday: Astro + Parenting + App Feature.
 */
export const DEFAULT_WEEK_CALENDAR: WeekCalendar = {
  monday: [
    {
      slotId: "mon-astro",
      label: "Amy Astro",
      preferredCategories: ["Amy Astro"],
      preferredVideoStyles: ["astro", "short"],
      uploadOffsetMinutes: 0,
    },
    {
      slotId: "mon-parenting",
      label: "Parenting",
      preferredCategories: ["Parenting", "Child Psychology", "Emotional Intelligence"],
      preferredVideoStyles: ["short", "listicle", "talking-head"],
      uploadOffsetMinutes: 180,
    },
    {
      slotId: "mon-app",
      label: "App Feature",
      preferredCategories: ["Learning", "Routines", "Games", "Amy Astro"],
      preferredVideoStyles: ["app-feature", "demo", "short"],
      uploadOffsetMinutes: 360,
    },
  ],
  tuesday: [
    {
      slotId: "tue-routines",
      label: "Routines",
      preferredCategories: ["Routines", "Parenting"],
      preferredVideoStyles: ["short", "listicle"],
      uploadOffsetMinutes: 0,
    },
    {
      slotId: "tue-development",
      label: "Child Development",
      preferredCategories: ["Child Development", "Brain Development", "Milestones"],
      preferredVideoStyles: ["short", "talking-head"],
      uploadOffsetMinutes: 180,
    },
    {
      slotId: "tue-sleep",
      label: "Sleep",
      preferredCategories: ["Sleep", "Baby Care"],
      preferredVideoStyles: ["short", "listicle"],
      uploadOffsetMinutes: 360,
    },
  ],
  wednesday: [
    {
      slotId: "wed-speech",
      label: "Speech",
      preferredCategories: ["Speech", "Learning"],
      preferredVideoStyles: ["demo", "short", "app-feature"],
      uploadOffsetMinutes: 0,
    },
    {
      slotId: "wed-nutrition",
      label: "Nutrition",
      preferredCategories: ["Nutrition", "Baby Care"],
      preferredVideoStyles: ["short", "listicle"],
      uploadOffsetMinutes: 180,
    },
    {
      slotId: "wed-eq",
      label: "Emotional Intelligence",
      preferredCategories: ["Emotional Intelligence", "Child Psychology"],
      preferredVideoStyles: ["short", "story"],
      uploadOffsetMinutes: 360,
    },
  ],
  thursday: [
    {
      slotId: "thu-astro",
      label: "Amy Astro Story",
      preferredCategories: ["Amy Astro"],
      preferredVideoStyles: ["astro", "story"],
      uploadOffsetMinutes: 0,
    },
    {
      slotId: "thu-learning",
      label: "Learning",
      preferredCategories: ["Learning", "Brain Development", "Games"],
      preferredVideoStyles: ["short", "demo", "app-feature"],
      uploadOffsetMinutes: 180,
    },
    {
      slotId: "thu-safety",
      label: "Safety",
      preferredCategories: ["Safety", "Screen Time"],
      preferredVideoStyles: ["short", "listicle"],
      uploadOffsetMinutes: 360,
    },
  ],
  friday: [
    {
      slotId: "fri-motivation",
      label: "Daily Motivation",
      preferredCategories: ["Daily Motivation", "Parenting"],
      preferredVideoStyles: ["motivation", "short"],
      uploadOffsetMinutes: 0,
    },
    {
      slotId: "fri-adhd-autism",
      label: "Neurodiversity Support",
      preferredCategories: ["ADHD", "Autism", "Child Psychology"],
      preferredVideoStyles: ["short", "talking-head"],
      uploadOffsetMinutes: 180,
    },
    {
      slotId: "fri-app",
      label: "App Feature",
      preferredCategories: ["Speech", "Games", "Routines", "Learning"],
      preferredVideoStyles: ["app-feature", "demo"],
      uploadOffsetMinutes: 360,
    },
  ],
  saturday: [
    {
      slotId: "sat-family",
      label: "Family Activities",
      preferredCategories: ["Family Activities", "Games", "Learning"],
      preferredVideoStyles: ["short", "story", "demo"],
      uploadOffsetMinutes: 0,
    },
    {
      slotId: "sat-milestones",
      label: "Milestones",
      preferredCategories: ["Milestones", "Child Development", "Baby Care"],
      preferredVideoStyles: ["short", "listicle"],
      uploadOffsetMinutes: 240,
    },
  ],
  sunday: [
    {
      slotId: "sun-reset",
      label: "Weekend Reset",
      preferredCategories: ["Routines", "Parenting", "Daily Motivation"],
      preferredVideoStyles: ["short", "motivation"],
      uploadOffsetMinutes: 0,
    },
    {
      slotId: "sun-screen",
      label: "Screen Time & Balance",
      preferredCategories: ["Screen Time", "Family Activities", "Games"],
      preferredVideoStyles: ["short", "listicle"],
      uploadOffsetMinutes: 240,
    },
  ],
};
