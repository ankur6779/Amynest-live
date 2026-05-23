import colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Returns the design tokens for the current theme (light or dark).
 * Reads the active mode from ThemeContext so screens automatically reflow
 * when the user toggles the theme in the side drawer.
 */
export function useColors() {
  const { mode } = useTheme();
  const palette = mode === "light" ? colors.light : colors.dark;
  return { ...palette, radius: colors.radius };
}
