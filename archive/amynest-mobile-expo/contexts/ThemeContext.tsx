import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import { paletteFor, ThemeMode, ThemePalette } from "@/lib/theme";

const STORAGE_KEY = "@amynest:theme";

type ThemeContextValue = {
  mode: ThemeMode;
  theme: ThemePalette;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [isReady, setIsReady] = useState(false);
  const userTouchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (userTouchedRef.current) return;
        if (stored === "light" || stored === "dark") setModeState(stored);
      })
      .catch(() => { /* ignore */ })
      .finally(() => {
        if (cancelled) return;
        setIsReady(true);
        SplashScreen.hideAsync().catch(() => { /* ignore */ });
      });
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((next: ThemeMode) => {
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => { /* ignore */ });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    userTouchedRef.current = true;
    setModeState(next);
    persist(next);
  }, [persist]);

  const toggleTheme = useCallback(() => {
    userTouchedRef.current = true;
    setModeState((cur) => {
      const next: ThemeMode = cur === "dark" ? "light" : "dark";
      persist(next);
      return next;
    });
  }, [persist]);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    theme: paletteFor(mode),
    toggleTheme,
    setMode,
    isReady,
  }), [mode, toggleTheme, setMode, isReady]);

  if (!isReady) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
