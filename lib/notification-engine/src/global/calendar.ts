import type { CulturalRegion } from "./locales.js";

export interface RegionalHoliday {
  id: string;
  name: string;
  regions: CulturalRegion[];
  /** MM-DD fixed date or lunar flag */
  month: number;
  day: number;
  /** Approximate lunar / moveable — matched by month window */
  approximate?: boolean;
}

export interface ActiveCalendarContext {
  holidayId: string | null;
  holidayName: string | null;
  isRamadanSeason: boolean;
  isSummerBreak: boolean;
  isExamSeason: boolean;
  isBackToSchool: boolean;
  schoolTerm: "term" | "break" | "exam";
}

/** Static major holidays — extend via CMS later. */
export const REGIONAL_HOLIDAYS: RegionalHoliday[] = [
  { id: "diwali", name: "Diwali", regions: ["south_asia"], month: 10, day: 20, approximate: true },
  { id: "holi", name: "Holi", regions: ["south_asia"], month: 3, day: 14, approximate: true },
  { id: "thanksgiving_us", name: "Thanksgiving", regions: ["north_america"], month: 11, day: 28, approximate: true },
  { id: "christmas", name: "Christmas", regions: ["europe", "north_america", "oceania", "latin_america"], month: 12, day: 25 },
  { id: "lunar_new_year", name: "Lunar New Year", regions: ["east_asia"], month: 2, day: 1, approximate: true },
  { id: "eid", name: "Eid", regions: ["middle_east", "south_asia"], month: 4, day: 10, approximate: true },
  { id: "ramadan", name: "Ramadan", regions: ["middle_east", "south_asia"], month: 3, day: 10, approximate: true },
];

/** Northern-hemisphere school patterns by region. */
const SUMMER_BREAK_MONTHS: Record<string, number[]> = {
  north_america: [6, 7, 8],
  europe: [7, 8],
  south_asia: [5, 6],
  east_asia: [7, 8],
  oceania: [12, 1, 2],
  latin_america: [12, 1, 2],
  middle_east: [7, 8],
  southeast_asia: [6, 7],
  africa: [12, 1],
};

const EXAM_SEASON_MONTHS: Record<string, number[]> = {
  south_asia: [2, 3],
  north_america: [5, 6],
  europe: [5, 6],
  east_asia: [1, 2],
  oceania: [10, 11],
};

const BACK_TO_SCHOOL_MONTHS: Record<string, number[]> = {
  north_america: [8, 9],
  europe: [9],
  south_asia: [6, 7],
  east_asia: [4, 9],
  oceania: [2],
};

export function resolveCalendarContext(
  region: CulturalRegion,
  localMonth: number,
  localDay: number,
): ActiveCalendarContext {
  const holiday = REGIONAL_HOLIDAYS.find((h) => {
    if (!h.regions.includes(region)) return false;
    if (h.approximate) {
      return Math.abs(localMonth - h.month) <= 1;
    }
    return h.month === localMonth && h.day === localDay;
  });

  const summerMonths = SUMMER_BREAK_MONTHS[region] ?? [7, 8];
  const examMonths = EXAM_SEASON_MONTHS[region] ?? [];
  const backMonths = BACK_TO_SCHOOL_MONTHS[region] ?? [9];

  const isSummerBreak = summerMonths.includes(localMonth);
  const isExamSeason = examMonths.includes(localMonth);
  const isBackToSchool = backMonths.includes(localMonth);
  const isRamadanSeason = region === "middle_east" && localMonth === 3;

  let schoolTerm: ActiveCalendarContext["schoolTerm"] = "term";
  if (isSummerBreak) schoolTerm = "break";
  else if (isExamSeason) schoolTerm = "exam";

  return {
    holidayId: holiday?.id ?? null,
    holidayName: holiday?.name ?? null,
    isRamadanSeason,
    isSummerBreak,
    isExamSeason,
    isBackToSchool,
    schoolTerm,
  };
}

export function localMonthDay(localDate: string): { month: number; day: number } {
  const [y, m, d] = localDate.split("-").map((x) => parseInt(x, 10));
  return { month: m ?? 1, day: d ?? 1 };
}
