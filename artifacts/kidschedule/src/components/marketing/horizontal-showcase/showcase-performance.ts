import { useEffect, useState } from "react";

export type ShowcasePerformanceMode = {
  lite: boolean;
  reducedMotion: boolean;
};

function detectLiteMode(): boolean {
  if (typeof navigator === "undefined") return false;
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof dm === "number" && dm <= 4) return true;
  if (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4) {
    return true;
  }
  return false;
}

function detectReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

export function useShowcasePerformance(): ShowcasePerformanceMode {
  const [mode, setMode] = useState<ShowcasePerformanceMode>(() => ({
    lite: detectLiteMode(),
    reducedMotion: detectReducedMotion(),
  }));

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setMode({
        lite: detectLiteMode(),
        reducedMotion: mq.matches,
      });
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return mode;
}

export function showcaseScreenshotSources(
  basePath: string,
  lite: boolean,
): { src: string; srcSet: string; sizes: string; fallback: string } {
  const stem = basePath.replace(/\.(png|webp)$/i, "");
  return {
    src: lite ? `${stem}-450.webp` : `${stem}-800.webp`,
    srcSet: `${stem}-450.webp 450w, ${stem}-800.webp 800w`,
    sizes: "(max-width: 768px) 300px, 300px",
    fallback: `${stem}.png`,
  };
}
