import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@amynest_debug";

interface DebugCtx {
  debugMode: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

const Ctx = createContext<DebugCtx>({
  debugMode: false,
  toggle: () => {},
  enable: () => {},
  disable: () => {},
});

export function DebugProvider({ children }: { children: ReactNode }) {
  const [debugMode, setDebugMode] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "1") setDebugMode(true);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, debugMode ? "1" : "0").catch(() => {});
  }, [debugMode, ready]);

  const toggle = useCallback(() => setDebugMode((v) => !v), []);
  const enable = useCallback(() => setDebugMode(true), []);
  const disable = useCallback(() => setDebugMode(false), []);

  return <Ctx.Provider value={{ debugMode, toggle, enable, disable }}>{children}</Ctx.Provider>;
}

export function useDebugMode() {
  return useContext(Ctx);
}
