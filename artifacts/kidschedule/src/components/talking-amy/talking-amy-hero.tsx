import { useEffect, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { AmyAvatar } from "@/components/amy-3d/amy-avatar";
import {
  avatarInputsToAmyState,
  buildTalkingAmyAvatarInputs,
  type TalkingAmyPhase,
} from "@/lib/talking-amy-avatar-contract";
import { micLevelToParticleCount } from "@/lib/talking-amy-mic-visual";
import type { TalkingAmyMode } from "@/lib/talking-amy-modes";
import { useTalkingAmyMicVisual } from "@/hooks/use-talking-amy-mic-visual";

function useHeroSize() {
  const [size, setSize] = useState(300);
  useEffect(() => {
    const calc = () => {
      const s = Math.min(window.innerWidth * 0.68, 400);
      setSize(Math.max(220, Math.round(s)));
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
}: {
  phase: TalkingAmyPhase;
  mode: TalkingAmyMode;
  audioLevelRef: RefObject<number>;
  reducedMotion: boolean;
}) {
  const avatar = useHeroSize();
  const glass = Math.round(avatar * 1.16);
  const glow = Math.round(avatar * 1.5);
  const { theme } = mode;

  const listening = phase === "recording";
  const thinking = phase === "thinking";
  const speaking = phase === "echoing";
  const celebrating = phase === "celebrate";

  const micVisual = useTalkingAmyMicVisual(listening, audioLevelRef, reducedMotion, 6);
  const avatarInputs = buildTalkingAmyAvatarInputs(phase, micVisual.level);
  const amyState = avatarInputsToAmyState(avatarInputs);

  const glowClass = listening
    ? theme.listeningGlow
    : thinking
      ? theme.thinkingGlow
      : speaking || celebrating
        ? theme.speakingGlow
        : theme.thinkingGlow;

  const ringClass = listening
    ? theme.ringBorderListening
    : speaking || celebrating
      ? theme.ringBorderSpeaking
      : "border-white/20";

  const shouldBounce =
    !reducedMotion &&
    (speaking || celebrating) &&
    (theme.fastBounce || theme.gentleBounce || theme.giantBounce);

  const bounceScale = theme.giantBounce ? 1.12 : theme.fastBounce ? 1.08 : 1.04;
  const particleCount = listening
    ? micVisual.particleCount
    : micLevelToParticleCount(0.6, 6, reducedMotion);

  const haloScale = listening ? micVisual.haloScale : 1;
  const glowOpacity = listening ? micVisual.glowOpacity : 0.55;

  return (
    <motion.div
      className="relative flex flex-1 items-center justify-center"
      style={{ minHeight: glass + 24 }}
      data-testid="talking-amy-hero"
      animate={
        reducedMotion
          ? { y: 0, rotate: 0 }
          : theme.floatMotion && (speaking || listening || thinking)
            ? { y: [0, -6, 0] }
            : listening
              ? { rotate: [-2, 2, -2] }
              : { y: 0, rotate: 0 }
      }
      transition={
        reducedMotion
          ? { duration: 0.2 }
          : theme.floatMotion
            ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            : listening
              ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
      }
    >
      <div
        className={["absolute rounded-full blur-3xl transition-all duration-150", glowClass].join(" ")}
        style={{
          width: glow,
          height: glow,
          opacity: listening ? glowOpacity : 0.55,
          transform: listening ? `scale(${haloScale})` : undefined,
        }}
      />
      {(listening || speaking || celebrating || theme.brightPurplePulse) && (
        <div
          className={["absolute rounded-full border-2 transition-transform duration-100", ringClass].join(" ")}
          style={{
            width: glass,
            height: glass,
            opacity: listening ? glowOpacity : 0.75,
            transform: listening ? `scale(${haloScale})` : undefined,
          }}
        />
      )}
      <motion.div
        className={[
          "relative grid place-items-center rounded-full border bg-white/10 shadow-2xl backdrop-blur-xl transition-all duration-300",
          listening ? "scale-110" : "",
          ringClass,
        ].join(" ")}
        style={{ width: glass, height: glass }}
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
          active={theme.cosmicParticles && (speaking || celebrating || listening)}
          count={particleCount}
          className="absolute text-xs text-emerald-200/70"
          reducedMotion={reducedMotion}
        />
        <ReactiveParticles
          glyphs={["💜", "🦖", "✦", "💜", "·", "🦖"]}
          active={theme.monsterParticles && (speaking || celebrating || listening)}
          count={particleCount}
          className="absolute text-sm text-purple-200/80"
          reducedMotion={reducedMotion}
        />
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
        <AmyAvatar
          tier="hero"
          size={avatar}
          ring
          bounce={shouldBounce}
          state={amyState}
          audioLevelRef={audioLevelRef}
        />
      </motion.div>
    </motion.div>
  );
}
