import { createContext, useCallback, useContext, useEffect, useMemo } from "react";

/** App ships dark-only; light mode is not offered in the UI. */
export type ThemeMode = "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
};

export const THEME_STORAGE_KEY = "theme";
const LEGACY_STORAGE_KEY = "amynest:theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyDarkMode() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("dark");
  root.setAttribute("data-theme", "dark");
  root.style.colorScheme = "dark";
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", "#0b0b0b");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyDarkMode();
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const setMode = useCallback((_next: ThemeMode) => {
    applyDarkMode();
  }, []);

  const toggleTheme = useCallback(() => {
    applyDarkMode();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode: "dark", toggleTheme, setMode }),
    [toggleTheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
