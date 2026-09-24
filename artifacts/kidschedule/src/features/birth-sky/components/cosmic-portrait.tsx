/**
 * Amy Astro cosmic portrait — complete square illustration in a role-based frame.
 * Hero / ceremony fill the stage; closing is a quieter keepsake seal.
 * The PNG is a full illustration (child + celestial ornaments), not a photo crop.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import {
  resolveAmyPortraitVariant,
  type AmyPortraitVariant,
} from "../lib/portrait-variant";
import { useLivingSky } from "../state/living-sky-context";
import {
  AMY_ASTRO_PORTRAIT_FALLBACK_SRC,
  AMY_ASTRO_PORTRAIT_SIZES,
  AMY_ASTRO_PORTRAIT_WEBP_SRCSET,
  AMY_ASTRO_TILE_PORTRAIT_SRC,
} from "../lib/branding";
import "../design/amy-astro.css";

export type AmyLookTarget = "left" | "right" | "center" | "up";

/** Explicit visual role — never size the same illustration identically everywhere. */
export type AmyAstroPortraitPresentation = "hero" | "closing" | "ceremony";

type Props = {
  childName: string;
  reducedMotion?: boolean;
  className?: string;
  variant?: AmyPortraitVariant;
  sunSign?: string | null;
  moonSign?: string | null;
  smileBoost?: boolean;
  lookTarget?: AmyLookTarget;
  orbPulse?: boolean;
  /** Play entrance wave once on mount */
  playEntranceWave?: boolean;
  onOrbTap?: () => void;
  presentation?: AmyAstroPortraitPresentation;
  /** When nested in a labeled control, hide duplicate accessible name. */
  nestedInControl?: boolean;
};

const ZODIAC_GLYPH: Record<string, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

export function AmyAstroCosmicPortrait({
  childName,
  reducedMotion = false,
  className,
  variant: variantProp,
  sunSign,
  moonSign,
  smileBoost = false,
  lookTarget = "center",
  orbPulse = false,
  playEntranceWave: _playEntranceWave = true,
  onOrbTap,
  presentation = "hero",
  nestedInControl = false,
}: Props) {
  const variant = useMemo(
    () => variantProp ?? resolveAmyPortraitVariant(childName),
    [variantProp, childName],
  );
  const sunGlyph = sunSign ? ZODIAC_GLYPH[sunSign] ?? "☉" : "☉";
  const moonGlyph = moonSign ? ZODIAC_GLYPH[moonSign] ?? "☽" : "☽";
  const livingSky = useLivingSky();
  const [tapPulse, setTapPulse] = useState(false);
  const [src, setSrc] = useState<string>(AMY_ASTRO_TILE_PORTRAIT_SRC);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [allowPicture, setAllowPicture] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    livingSky?.setAmyGazeUp(lookTarget === "up");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gaze only
  }, [lookTarget]);

  useEffect(() => {
    if (orbPulse || smileBoost) livingSky?.pulseOrb();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pulse on interaction edges
  }, [orbPulse, smileBoost]);

  useEffect(() => {
    setSrc(AMY_ASTRO_TILE_PORTRAIT_SRC);
    setStatus("loading");
    setAllowPicture(true);
  }, [childName]);

  useLayoutEffect(() => {
    const node = imgRef.current;
    if (node?.complete && node.naturalWidth > 0) {
      setStatus((prev) => (prev === "fallback" ? prev : "ready"));
    }
  }, [src]);

  const showSignRow = presentation !== "closing";
  const eager = presentation !== "closing";

  return (
    <div
      className={cn(
        "amy-astro-portrait-frame",
        `amy-astro-portrait-frame--${presentation}`,
        !reducedMotion && "amy-astro-amy-breathe",
        className,
      )}
      data-testid="amy-astro-cosmic-portrait"
      data-portrait-variant={variant}
      data-portrait-presentation={presentation}
      data-look={lookTarget}
      data-image-status={status}
      role={nestedInControl ? undefined : "img"}
      aria-hidden={nestedInControl || undefined}
      aria-label={nestedInControl ? undefined : `Cosmic portrait for ${childName}`}
    >
      <div className="amy-astro-portrait-frame__halo" aria-hidden />

      <div
        className={cn(
          "amy-astro-portrait-frame__art",
          (orbPulse || smileBoost || tapPulse) &&
            !reducedMotion &&
            "amy-astro-orb-react",
        )}
        onClick={(e) => {
          if (onOrbTap) {
            e.stopPropagation();
            onOrbTap();
          }
          if (!reducedMotion) {
            setTapPulse(true);
            window.setTimeout(() => setTapPulse(false), 700);
          }
        }}
        role={onOrbTap ? "presentation" : undefined}
      >
        {status === "loading" ? (
          <div
            className="amy-astro-portrait-frame__placeholder"
            data-testid="amy-astro-portrait-placeholder"
            aria-hidden
          />
        ) : null}
        <AmyAstroPortraitResponsiveImage
          src={src}
          presentation={presentation}
          eager={eager}
          reducedMotion={reducedMotion}
          allowPicture={allowPicture}
          imgRef={imgRef}
          onLoad={() => setStatus((prev) => (prev === "fallback" ? prev : "ready"))}
          onError={() => {
            if (allowPicture) {
              setAllowPicture(false);
              setStatus("loading");
              return;
            }
            if (src !== AMY_ASTRO_PORTRAIT_FALLBACK_SRC) {
              setSrc(AMY_ASTRO_PORTRAIT_FALLBACK_SRC);
              setStatus("fallback");
              return;
            }
            setStatus("fallback");
          }}
        />
      </div>

      {showSignRow ? (
        <p className="amy-astro-portrait-sign-row" aria-hidden>
          <span className="amy-astro-portrait-sign-chip">
            {sunGlyph}
            {sunSign ? ` ${sunSign}` : ""}
          </span>
          <span className="amy-astro-portrait-sign-chip">
            {moonGlyph}
            {moonSign ? ` ${moonSign}` : ""}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function AmyAstroPortraitResponsiveImage({
  src,
  presentation,
  eager,
  reducedMotion,
  allowPicture,
  imgRef,
  onLoad,
  onError,
}: {
  src: string;
  presentation: AmyAstroPortraitPresentation;
  eager: boolean;
  reducedMotion: boolean;
  allowPicture: boolean;
  imgRef: RefObject<HTMLImageElement | null>;
  onLoad: () => void;
  onError: () => void;
}) {
  const sizes = AMY_ASTRO_PORTRAIT_SIZES[presentation];
  const fallback = src === AMY_ASTRO_PORTRAIT_FALLBACK_SRC;
  const img = (
    <img
      src={src}
      alt=""
      width={768}
      height={768}
      draggable={false}
      className={cn(
        "amy-astro-portrait-illustration",
        !reducedMotion && "amy-astro-pulse-glow",
      )}
      decoding="async"
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      ref={imgRef}
      onLoad={onLoad}
      onError={onError}
    />
  );

  if (fallback || !allowPicture) return img;

  return (
    <picture data-testid="amy-astro-portrait-picture" data-portrait-sizes={sizes}>
      <source type="image/webp" srcSet={AMY_ASTRO_PORTRAIT_WEBP_SRCSET} sizes={sizes} />
      {img}
    </picture>
  );
}
