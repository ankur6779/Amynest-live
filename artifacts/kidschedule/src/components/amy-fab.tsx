import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { AmyBlinkFace } from "@/components/amy-3d/amy-blink-face";
import { AMY_FULL_ASPECT } from "@/lib/amy/amy-stage-assets";
import { useElementSize } from "@/hooks/use-element-size";
import { useTranslation } from "react-i18next";
import { safePathStartsWith } from "@/lib/safe-route";

type AmyFabProps = {
  /** Render inside `.app-footer` (anchored above tab bar). */
  embedded?: boolean;
};

/**
 * Mascot bounding box on the 720×900 full-body render (UV fractions,
 * measured from amy-idle.webp alpha). Everything outside is transparent
 * padding — cropping to it makes the FAB avatar visually fill its box
 * instead of rendering the mascot at ~43% of the container height.
 */
const AMY_FAB_CROP = {
  x0: 65 / 720,
  x1: 655 / 720,
  y0: 459 / 900,
  y1: 846 / 900,
} as const;

/**
 * Responsive Amy avatar for the FAB: a square crop window (sized via the
 * `.amy-fab-avatar` clamp) over an enlarged AmyBlinkFace, so the visible
 * mascot fills the window while blink/float/glow animations stay intact.
 */
function AmyFabAvatar() {
  const [cropRef, cropSize] = useElementSize<HTMLDivElement>();
  const side = cropSize.width || 46;

  // Mascot extents as fractions of the blink-face box height (box width = AMY_FULL_ASPECT × height).
  const mascotWFrac = (AMY_FAB_CROP.x1 - AMY_FAB_CROP.x0) * AMY_FULL_ASPECT;
  const mascotHFrac = AMY_FAB_CROP.y1 - AMY_FAB_CROP.y0;
  const faceSize = side / Math.max(mascotWFrac, mascotHFrac);
  const mascotW = mascotWFrac * faceSize;
  const mascotH = mascotHFrac * faceSize;
  const offsetLeft = (side - mascotW) / 2 - AMY_FAB_CROP.x0 * AMY_FULL_ASPECT * faceSize;
  const offsetTop = (side - mascotH) / 2 - AMY_FAB_CROP.y0 * faceSize;

  return (
    <div className="amy-fab-avatar amy-mascot-outer" aria-hidden>
      <div
        className="amy-mascot-float"
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        <div
          className="amy-mascot-hover-ring"
          style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none", zIndex: 4 }}
        />
        <div
          className="amy-mascot-glow"
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          <div
            ref={cropRef}
            style={{ position: "absolute", inset: 0, overflow: "hidden" }}
          >
            <div style={{ position: "absolute", left: offsetLeft, top: offsetTop }}>
              <AmyBlinkFace size={faceSize} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Only floating Ask Amy control — portaled to body for Android WebView. */
export function AmyFab({ embedded = false }: AmyFabProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (
    !mounted ||
    safePathStartsWith(location, "/assistant") ||
    safePathStartsWith(location, "/sign-in") ||
    safePathStartsWith(location, "/sign-up")
  ) {
    return null;
  }

  const fab = (
    <div
      id="amy-fab-floating"
      data-tour="amy-fab"
      data-amynest-fab="active"
      className={embedded ? "amy-fab-floating amy-fab-in-footer" : "amy-fab-floating"}
    >
      <div className="amy-fade-in">
        <Link
          href="/assistant"
          aria-label={t("components.amy_fab.ask_amy_ai")}
          className="group relative flex min-h-14 min-w-14 items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none"
        >
          <AmyFabAvatar />
          <span className="absolute -top-2 -right-1 bg-white text-[9px] font-black text-primary dark:text-muted-foreground px-1.5 py-0.5 rounded-full shadow border border-border dark:border-border pointer-events-none">
            {t("components.amy_fab.amy_ai")}
          </span>
        </Link>
      </div>
    </div>
  );

  if (embedded) return fab;
  return createPortal(fab, document.body);
}
