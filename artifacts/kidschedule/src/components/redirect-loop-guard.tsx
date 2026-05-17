import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import { recordBootError } from "@/lib/boot-store";

const WINDOW_MS = 2000;
const MAX_RENDERS = 5;

export function RedirectLoopGuard({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const hitsRef = useRef<{ path: string; times: number[] }>({ path: "", times: [] });
  const [loopBroken, setLoopBroken] = useState(false);

  useEffect(() => {
    const now = Date.now();
    const path = location;
    if (hitsRef.current.path !== path) {
      hitsRef.current = { path, times: [now] };
      return;
    }
    const recent = [...hitsRef.current.times, now].filter((t) => now - t < WINDOW_MS);
    hitsRef.current.times = recent;
    if (recent.length > MAX_RENDERS) {
      recordBootError("redirect-loop", new Error(`>${MAX_RENDERS} navigations to ${path} in ${WINDOW_MS}ms`));
      setLoopBroken(true);
    }
  }, [location]);

  if (loopBroken) {
    return (
      <AppFallbackUi
        title="Navigation loop detected"
        message="AmyNest stopped redirecting to prevent a blank screen. Tap retry to reload."
        onReload={() => window.location.reload()}
      />
    );
  }

  return <>{children}</>;
}
