import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const STORAGE_KEY = "__amynest_debug";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("debug")) return params.get("debug") !== "0";
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

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
  const [debugMode, setDebugMode] = useState(readInitial);

  useEffect(() => {
    try {
      if (debugMode) localStorage.setItem(STORAGE_KEY, "1");
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* quota */ }
  }, [debugMode]);

  const toggle = useCallback(() => setDebugMode((v) => !v), []);
  const enable = useCallback(() => setDebugMode(true), []);
  const disable = useCallback(() => setDebugMode(false), []);

  return <Ctx.Provider value={{ debugMode, toggle, enable, disable }}>{children}</Ctx.Provider>;
}

export function useDebugMode() {
  return useContext(Ctx);
}
