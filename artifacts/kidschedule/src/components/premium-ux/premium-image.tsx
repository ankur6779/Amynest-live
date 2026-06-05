import { useEffect, useRef, useState } from "react";
import { MOTION_MS } from "@/lib/experience-system";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Load immediately (hero / above fold). */
  priority?: boolean;
  onError?: () => void;
};

/**
 * Progressive image with blur-up reveal and below-fold lazy loading.
 * Prevents sudden image pop-in.
 */
export function PremiumImage({
  src,
  alt,
  className,
  priority = false,
  onError,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(priority);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (priority || inView) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, inView]);

  if (failed) return null;

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <div
        className={cn(
          "premium-skeleton absolute inset-0 transition-opacity",
          loaded ? "opacity-0" : "opacity-100",
        )}
        style={{ transitionDuration: `${MOTION_MS.normal}ms` }}
        aria-hidden
      />
      {inView ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            onError?.();
          }}
          className={cn(
            "h-full w-full object-cover transition-all will-change-[opacity,filter,transform]",
            loaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-[1.02]",
          )}
          style={{ transitionDuration: `${MOTION_MS.normal}ms` }}
        />
      ) : null}
    </div>
  );
}
