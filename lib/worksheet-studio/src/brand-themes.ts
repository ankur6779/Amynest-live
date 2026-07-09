import { LPS_FOUNDATION, LPS_SCHOOL_NAME } from "./constants.js";

export type BrandThemeId =
  | "classic_blue"
  | "green_campus"
  | "modern_purple"
  | "minimal_black"
  | "lps_default"
  | "custom";

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  headerBackground: string;
  footerBackground: string;
  border: string;
  title: string;
  text: string;
  button: string;
}

export const BRAND_THEME_LABELS: Record<BrandThemeId, string> = {
  classic_blue: "Classic Blue",
  green_campus: "Green Campus",
  modern_purple: "Modern Purple",
  minimal_black: "Minimal Black",
  lps_default: "LPS Default",
  custom: "Custom Theme",
};

export const THEME_COLORS: Record<Exclude<BrandThemeId, "custom">, BrandColors> = {
  classic_blue: {
    primary: "#1e3a5f",
    secondary: "#2a5a8a",
    accent: "#c9a227",
    headerBackground: "#f0f4f8",
    footerBackground: "#f8fafc",
    border: "#334155",
    title: "#1e3a5f",
    text: "#111827",
    button: "#1e3a5f",
  },
  green_campus: {
    primary: "#14532d",
    secondary: "#166534",
    accent: "#84cc16",
    headerBackground: "#f0fdf4",
    footerBackground: "#f7fee7",
    border: "#166534",
    title: "#14532d",
    text: "#052e16",
    button: "#15803d",
  },
  modern_purple: {
    primary: "#5b21b6",
    secondary: "#7c3aed",
    accent: "#f59e0b",
    headerBackground: "#faf5ff",
    footerBackground: "#f5f3ff",
    border: "#6d28d9",
    title: "#4c1d95",
    text: "#1f2937",
    button: "#6d28d9",
  },
  minimal_black: {
    primary: "#111827",
    secondary: "#374151",
    accent: "#6b7280",
    headerBackground: "#ffffff",
    footerBackground: "#f9fafb",
    border: "#111827",
    title: "#111827",
    text: "#1f2937",
    button: "#111827",
  },
  lps_default: {
    primary: "#1e3a5f",
    secondary: "#2a5a8a",
    accent: "#c9a227",
    headerBackground: "#f0f4f8",
    footerBackground: "#f8fafc",
    border: "#333333",
    title: "#1e3a5f",
    text: "#111111",
    button: "#1e3a5f",
  },
};

export function applyThemeColors(themeId: BrandThemeId, current?: BrandColors): BrandColors {
  if (themeId === "custom" && current) return current;
  if (themeId === "custom") return THEME_COLORS.lps_default;
  return THEME_COLORS[themeId];
}

export const PRESET_SCHOOL_NAMES: Array<{
  id: string;
  name: string;
  schoolName: string;
  tagline: string;
  foundation: string;
  themeId: BrandThemeId;
}> = [
  {
    id: "lps-default",
    name: "Lucknow Public School",
    schoolName: LPS_SCHOOL_NAME,
    tagline: "Excellence in Education",
    foundation: LPS_FOUNDATION,
    themeId: "lps_default",
  },
  {
    id: "dps-delhi",
    name: "Delhi Public School",
    schoolName: "DELHI PUBLIC SCHOOL",
    tagline: "Service Before Self",
    foundation: "(DPS Society)",
    themeId: "classic_blue",
  },
  {
    id: "cms-lucknow",
    name: "City Montessori School",
    schoolName: "CITY MONTESSORI SCHOOL",
    tagline: "Jai Jagat",
    foundation: "(CMS Society)",
    themeId: "green_campus",
  },
  {
    id: "spring-dale",
    name: "Spring Dale School",
    schoolName: "SPRING DALE SCHOOL",
    tagline: "Learning for Life",
    foundation: "",
    themeId: "modern_purple",
  },
  {
    id: "custom-school",
    name: "Custom School",
    schoolName: "YOUR SCHOOL NAME",
    tagline: "Your Tagline",
    foundation: "",
    themeId: "custom",
  },
];
