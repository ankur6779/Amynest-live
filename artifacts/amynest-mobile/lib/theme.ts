import { brand } from "@/constants/colors";

export type ThemeMode = "light" | "dark";

export type ThemePalette = {
  mode: ThemeMode;
  bg: { primary: string; secondary: string; tertiary: string };
  card: { bg: string; bgElevated: string; border: string };
  text: { primary: string; secondary: string; muted: string };
  brand: { primary: string; accent: string; gradientStart: string; gradientEnd: string };
  status: { success: string; warning: string; danger: string; info: string };
  glow: { color: string; opacity: number };
  gradient: readonly [string, string, string];
  borderMuted: string;
  dividerMuted: string;
};

export const darkTheme: ThemePalette = {
  mode: "dark",
  bg: {
    primary: "#0f0c29",
    secondary: "#13102e",
    tertiary: "#1c1240",
  },
  card: {
    bg: "rgba(255,255,255,0.05)",
    bgElevated: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.10)",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "rgba(255,255,255,0.70)",
    muted: "rgba(255,255,255,0.45)",
  },
  brand: {
    primary: brand.primary,
    accent: "#FF4ECD",
    gradientStart: brand.primary,
    gradientEnd: "#FF4ECD",
  },
  status: {
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#06B6D4",
  },
  glow: { color: brand.primary, opacity: 0.5 },
  gradient: ["#0f0c29", "#302b63", "#24243e"] as const,
  borderMuted: "rgba(255,255,255,0.20)",
  dividerMuted: "rgba(255,255,255,0.15)",
};

export const lightTheme: ThemePalette = {
  mode: "light",
  bg: {
    primary: "#F8FAFC",
    secondary: "#FFFFFF",
    tertiary: "#F1F5F9",
  },
  card: {
    bg: "#FFFFFF",
    bgElevated: "#FFFFFF",
    border: "rgba(15,23,42,0.10)",
  },
  text: {
    primary: "#0F172A",
    secondary: "rgba(15,23,42,0.70)",
    muted: "rgba(15,23,42,0.45)",
  },
  brand: {
    primary: brand.primary,
    accent: "#FF4ECD",
    gradientStart: brand.primary,
    gradientEnd: "#FF4ECD",
  },
  status: {
    success: "#059669",
    warning: "#D97706",
    danger: "#DC2626",
    info: "#0891B2",
  },
  glow: { color: brand.primary, opacity: 0.35 },
  gradient: ["#F8FAFC", "#EEF2FF", brand.violet50] as const,
  borderMuted: "#D4D4D8",
  dividerMuted: "#E4E4E7",
};

export function paletteFor(mode: ThemeMode): ThemePalette {
  return mode === "light" ? lightTheme : darkTheme;
}
