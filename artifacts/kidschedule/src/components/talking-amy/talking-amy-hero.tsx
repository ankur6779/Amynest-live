import { useEffect, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import {
  AmyAvatar,
  AMY_HERO_MODEL_SCALE,
  AMY_HERO_VERTICAL_OFFSET,
} from "@/components/amy-3d/amy-avatar";
import {
  avatarInputsToAmyState,
  buildTalkingAmyAvatarInputs,
  type TalkingAmyPhase,
} from "@/lib/talking-amy-avatar-contract";
import { micLevelToParticleCount } from "@/lib/talking-amy-mic-visual";
import type { TalkingAmyMoodProfile } from "@/lib/talking-amy-mood";
import type { TalkingAmyMode } from "@/lib/talking-amy-modes";
import {
  miniSurpriseEmoji,
  type TalkingAmyMiniSurpriseId,
} from "@/lib/talking-amy-surprises";
import { useTalkingAmyMicVisual } from "@/hooks/use-talking-amy-mic-visual";

function useHeroSize() {
  const [size, setSize] = useState(320);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1024) {
        setSize(460);
        return;
      }
      if (w >= 768) {
        setSize(Math.max(360, Math.min(420, Math.round(w * 0.46))));
        return;
      }
      setSize(Math.max(300, Math.min(340, Math.round(w * 0.82))));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return size;
}

function ReactiveParticles({
  glyphs,
  active,
  count,
  className,
  reducedMotion,
}: {
  glyphs: string[];
  active: boolean;
  count: number;
  className: string;
  reducedMotion: boolean;
}) {
  if (!active) return null;
  const visible = glyphs.slice(0, Math.max(1, count));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {visible.map((glyph, i) => (
        <motion.span
          key={`${glyph}-${i}`}
          className={className}
          style={{ left: `${10 + i * (80 / Math.max(visible.length, 1))}%`, top: `${16 + (i % 3) * 22}%` }}
          animate={
            reducedMotion
              ? { opacity: [0.35, 0.55, 0.35] }
              : { y: [0, -12, 0], opacity: [0.2, 0.9, 0.2], scale: [0.85, 1.1, 0.85] }
          }
          transition={{ duration: reducedMotion ? 2.4 : 1.5 + i * 0.12, repeat: Infinity, ease: "easeInOut" }}
        >
          {glyph}
        </motion.span>
      ))}
    </div>
  );
}

export function TalkingAmyHero({
  phase,
  mode,
  audioLevelRef,
  reducedMotion,
  featured = false,
  secretActive = false,
  mood,
  bedtime = false,
  glowOpacityScale = 1,
  animationSpeedScale = 1,
  miniSurprise = null,
  living = false,
}: {
  phase: TalkingAmyPhase;
  mode: TalkingAmyMode;
  audioLevelRef: RefObject<number>;
  reducedMotion: boolean;
  featured?: boolean;
  secretActive?: boolean;
  mood?: TalkingAmyMoodProfile;
  bedtime?: boolean;
  glowOpacityScale?: number;
  animationSpeedScale?: number;
  miniSurprise?: TalkingAmyMiniSurpriseId | null;
  /** Phase 2 living room — warm rings, never neon planet */
  living?: boolean;
}) {
  const avatar = useHeroSize();
  const glass = Math.round(avatar * 1.24);
  const glow = Math.round(avatar * 1.62);
  const { theme } = mode;

  const listening = phase === "recording";
  const thinking = phase === "thinking";
  const speaking = phase === "echoing";
  const celebrating = phase === "celebrate";

  const micVisual = useTalkingAmyMicVisual(listening, audioLevelRef, reducedMotion, 6);
  const avatarInputs = buildTalkingAmyAvatarInputs(phase, micVisual.level);
  const amyState = avatarInputsToAmyState(avatarInputs);

  const livingGlow = listening
    ? "bg-amber-200/25"
    : thinking
      ? "bg-stone-200/18"
      : speaking || celebrating
        ? "bg-rose-200/22"
        : "bg-amber-100/14";

  const glowClass = living
    ? livingGlow
    : listening
      ? theme.listeningGlow
      : thinking
        ? theme.thinkingGlow
        : speaking || celebrating
          ? theme.speakingGlow
          : theme.thinkingGlow;

  const ringClass = living
    ? listening
      ? "border-[rgba(232,212,184,0.55)]"
      : speaking || celebrating
        ? "border-[rgba(232,212,184,0.45)]"
        : "border-[rgba(232,212,184,0.28)]"
    : listening
      ? theme.ringBorderListening
      : speaking || celebrating
        ? theme.ringBorderSpeaking
        : "border-white/20";

  const shouldBounce =
    !reducedMotion &&
    (speaking || celebrating) &&
    (theme.fastBounce || theme.gentleBounce || theme.giantBounce);

  const shouldHop =
    !reducedMotion && theme.hopAnimation && (speaking || celebrating || listening);

  const bounceScale = theme.giantBounce ? 1.12 : theme.fastBounce ? 1.08 : 1.04;
  const particleActive = speaking || celebrating || listening;
  const particleCount = listening
    ? micVisual.particleCount
    : micLevelToParticleCount(0.6, 6, reducedMotion);

  const haloScale = listening ? micVisual.haloScale : 1;
  const baseGlowOpacity = (listening ? micVisual.glowOpacity : 0.55) * glowOpacityScale;
  const idle = phase === "idle";
  const ringOpacity = listening ? baseGlowOpacity : idle ? 0.62 : 0.78;
  const moodPulseSec = (mood?.idlePulseSec ?? 2.2) * animationSpeedScale;

  const surpriseMotion =
    miniSurprise === "spin"
      ? { rotate: [0, 360], scale: [1, 1.05, 1] }
      : miniSurprise === "happy_jump"
        ? { y: [0, -28, 0], scale: [1, 1.1, 1] }
        : miniSurprise === "rainbow_wave"
          ? { scale: [1, 1.14, 1], rotate: [-4, 4, -4] }
          : miniSurprise === "sparkle_burst"
            ? { scale: [1, 1.18, 1], opacity: [1, 1, 0.95] }
            : null;

  return (
    <motion.div
      className="relative flex flex-1 items-center justify-center overflow-visible"
      style={{ minHeight: glass + 40, padding: "12px 0" }}
      data-testid="talking-amy-hero"
      animate={
        reducedMotion
          ? { y: 0, rotate: 0 }
          : surpriseMotion
            ? surpriseMotion
            : shouldHop
              ? { y: [0, -14, 0, -8, 0] }
              : theme.floatMotion && (speaking || listening || thinking)
                ? { y: [0, -6, 0] }
                : idle && mood && !bedtime
                  ? { y: [0, -5, 0], scale: [1, 1.02, 1] }
                  : idle && bedtime
                    ? { y: [0, -3, 0] }
                    : listening
                      ? { rotate: [-2, 2, -2] }
                      : { y: 0, rotate: 0 }
      }
      transition={
        reducedMotion
          ? { duration: 0.2 }
          : surpriseMotion
            ? { duration: 1.2 * animationSpeedScale, ease: "easeOut" }
            : shouldHop
              ? { duration: 0.9 * animationSpeedScale, repeat: Infinity, ease: "easeOut" }
              : idle && (mood || bedtime)
                ? { duration: moodPulseSec, repeat: Infinity, ease: "easeInOut" }
                : theme.floatMotion
                  ? { duration: 2.2 * animationSpeedScale, repeat: Infinity, ease: "easeInOut" }
                  : listening
                    ? { duration: 2.5 * animationSpeedScale, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.3 }
      }
    >
      {mood ? (
        <div
          className={["pointer-events-none absolute rounded-full blur-3xl", mood.glowOverlay].join(" ")}
          style={{ width: glow * 0.92, height: glow * 0.92, opacity: baseGlowOpacity * 0.65 }}
        />
      ) : null}
      <div
        className={["absolute rounded-full blur-3xl transition-all duration-150", glowClass].join(" ")}
        style={{
          width: glow,
          height: glow,
          opacity: baseGlowOpacity,
          transform: listening ? `scale(${haloScale})` : undefined,
        }}
      />
      <motion.div
        className={[
          "pointer-events-none absolute rounded-full border-2 transition-transform duration-100",
          idle && !listening
            ? living
              ? "border-[rgba(232,212,184,0.4)]"
              : "border-purple-400/55"
            : ringClass,
        ].join(" ")}
        style={{
          width: glass,
          height: glass,
          opacity: ringOpacity,
          transform: listening ? `scale(${haloScale})` : undefined,
        }}
        animate={
          reducedMotion || !idle
            ? undefined
            : { scale: [1, 1.035, 1], opacity: [ringOpacity * 0.75, ringOpacity, ringOpacity * 0.75] }
        }
        transition={
          reducedMotion || !idle
            ? undefined
            : { duration: 3.2 * animationSpeedScale, repeat: Infinity, ease: "easeInOut" }
        }
      />
      {!reducedMotion && (idle || listening || speaking || celebrating) ? (
        <motion.div
          className={
            living
              ? "pointer-events-none absolute rounded-full border border-[rgba(232,212,184,0.18)]"
              : "pointer-events-none absolute rounded-full border border-purple-300/25"
          }
          style={{ width: glass + 18, height: glass + 18 }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 4 * animationSpeedScale, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
      <motion.div
        className={[
          "relative grid place-items-center overflow-visible rounded-full border shadow-2xl backdrop-blur-xl transition-all duration-300",
          theme.transparentEffect ? "bg-white/5" : living ? "bg-white/[0.07]" : "bg-white/10",
          !living && theme.rainbowGlow ? "border-pink-300/40" : "",
          living ? "" : (mood?.ringAccent ?? ""),
          featured ? (living ? "ring-1 ring-[rgba(232,212,184,0.35)]" : "ring-2 ring-amber-200/50") : "",
          secretActive
            ? living
              ? "ring-1 ring-[rgba(232,212,184,0.4)]"
              : "ring-2 ring-fuchsia-300/60"
            : "",
          bedtime ? (living ? "ring-1 ring-[rgba(232,212,184,0.28)]" : "ring-1 ring-indigo-300/35") : "",
          listening ? "scale-110" : "",
          ringClass,
        ].join(" ")}
        style={{ width: glass, height: glass, opacity: theme.transparentEffect ? 0.88 : 1 }}
        animate={
          reducedMotion
            ? { scale: speaking ? 1.03 : 1 }
            : shouldBounce
              ? { scale: [1, bounceScale, 1] }
              : { scale: speaking ? 1.05 : listening ? 1.02 + micVisual.level * 0.06 : 1 }
        }
        transition={
          shouldBounce
            ? { duration: theme.giantBounce ? 0.45 : theme.fastBounce ? 0.35 : 0.9, repeat: Infinity }
            : { duration: listening ? 0.1 : 0.3 }
        }
      >
        <ReactiveParticles
          glyphs={["✦", "·", "✧", "·", "✦", "·"]}
          active={theme.cosmicParticles && particleActive}
          count={particleCount}
          className="absolute text-xs text-emerald-200/70"
          reducedMotion={reducedMotion}
        />
        <ReactiveParticles
          glyphs={["💜", "🦖", "✦", "💜", "·", "🦖"]}
          active={theme.monsterParticles && particleActive}
          count={particleCount}
          className="absolute text-sm text-purple-200/80"
          reducedMotion={reducedMotion}
        />
        <ReactiveParticles
          glyphs={["👻", "·", "○", "·", "👻", "·"]}
          active={theme.ghostParticles && particleActive}
          count={particleCount}
          className="absolute text-sm text-white/75"
          reducedMotion={reducedMotion}
        />
        <ReactiveParticles
          glyphs={["🚀", "⭐", "·", "🪐", "⭐", "·"]}
          active={theme.spaceParticles && particleActive}
          count={particleCount}
          className="absolute text-xs text-indigo-200/80"
          reducedMotion={reducedMotion}
        />
        <ReactiveParticles
          glyphs={["✨", "🌟", "·", "✨", "💫", "·"]}
          active={theme.magicParticles && particleActive}
          count={particleCount}
          className="absolute text-sm text-pink-200/85"
          reducedMotion={reducedMotion}
        />
        <ReactiveParticles
          glyphs={["🐸", "🍃", "·", "🐸", "💧", "·"]}
          active={theme.frogParticles && particleActive}
          count={particleCount}
          className="absolute text-sm text-emerald-200/85"
          reducedMotion={reducedMotion}
        />
        {!reducedMotion && theme.orbitingStars && particleActive
          ? ["⭐", "✦", "·"].map((glyph, i) => (
              <motion.span
                key={`orbit-${glyph}-${i}`}
                className="pointer-events-none absolute left-1/2 top-1/2 text-xs text-sky-200/80"
                animate={{ rotate: 360 }}
                transition={{ duration: 4 + i, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: `${36 + i * 8}px 0` }}
              >
                {glyph}
              </motion.span>
            ))
          : null}
        {!reducedMotion && (theme.featuredGlow || featured) ? (
          <motion.div
            className="pointer-events-none absolute inset-2 rounded-full border border-amber-200/40"
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.85, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}
        {!reducedMotion && theme.digitalPulse && (speaking || thinking) ? (
          <motion.div
            className="pointer-events-none absolute inset-6 rounded-full border border-cyan-300/30"
            animate={{ scale: [1, 1.06, 1], opacity: [0.35, 0.75, 0.35] }}
            transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
          />
        ) : null}
        {!reducedMotion && theme.eyeSparkle && (speaking || celebrating || phase === "idle") ? (
          <>
            <motion.span
              className="pointer-events-none absolute left-[38%] top-[36%] text-lg"
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            >
              ✨
            </motion.span>
            <motion.span
              className="pointer-events-none absolute right-[38%] top-[36%] text-lg"
              animate={{ scale: [1.1, 0.85, 1.1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.15 }}
            >
              ✨
            </motion.span>
          </>
        ) : null}
        {miniSurprise && !reducedMotion ? (
          <motion.span
            className="pointer-events-none absolute -top-2 text-3xl"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 0.8], y: [0, -20, -36] }}
            transition={{ duration: 1.4 * animationSpeedScale, ease: "easeOut" }}
          >
            {miniSurpriseEmoji(miniSurprise)}
          </motion.span>
        ) : null}
        <AmyAvatar
          tier="hero"
          size={avatar}
          ring
          bounce={shouldBounce}
          state={amyState}
          audioLevelRef={audioLevelRef}
          // Match Speech Coach hero framing — without this the Tripo head
          // sits too high and clips against the top of the canvas/circle.
          modelScale={AMY_HERO_MODEL_SCALE}
          verticalOffset={AMY_HERO_VERTICAL_OFFSET}
        />
      </motion.div>
    </motion.div>
  );
}
