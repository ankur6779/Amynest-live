import { useEffect, useState } from "react";
import { isPageVisible } from "@/lib/game-perf";

/** True when the document tab is visible — pause timers when false (battery). */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => isPageVisible());

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => setVisible(isPageVisible());
    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("pagehide", onChange);
    window.addEventListener("pageshow", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("pagehide", onChange);
      window.removeEventListener("pageshow", onChange);
    };
  }, []);

  return visible;
}
