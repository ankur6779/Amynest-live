import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Headphones, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const AMY_HERO_SRC = "/illustrations/amy-audio-lessons-hero.png";
const MIC_SRC = "/illustrations/amy-audio-lessons-mic.png";

type AmyAudioLessonsCardProps = {
  onClick: () => void;
};

function FloatingMusicNote({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn("amy-audio-note-float pointer-events-none absolute", className)}
      style={{ animationDelay: `${delay}s` }}
    >
      <defs>
        <linearGradient id="amyAudioNoteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <path
        d="M9 18V6l10-2v12"
        fill="none"
        stroke="url(#amyAudioNoteGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="7" cy="18" r="3" fill="url(#amyAudioNoteGrad)" opacity="0.9" />
      <circle cx="17" cy="16" r="3" fill="url(#amyAudioNoteGrad)" opacity="0.9" />
    </svg>
  );
}

function SoundWaveBars({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-end gap-[3px]", className)}>
      {[0.45, 0.75, 1, 0.6, 0.85].map((h, i) => (
        <span
          key={i}
          className="amy-audio-wave-bar w-[3px] rounded-full bg-gradient-to-t from-violet-400/40 to-fuchsia-300/80"
          style={{
            height: `${h * 14}px`,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

function GlassChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
      <span className="text-violet-200/90">{icon}</span>
      {label}
    </span>
  );
}

/** Premium glassmorphic promo card for Amy Audio Lessons on the coach goals screen. */
export function AmyAudioLessonsCard({ onClick }: AmyAudioLessonsCardProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      data-on-dark
      data-testid="amy-audio-lessons-card"
      onClick={onClick}
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -3 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "amy-audio-card group relative w-full overflow-visible rounded-[30px] text-left",
        "transition-[box-shadow,border-color] duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50",
      )}
    >
      {/* Ambient glow layers */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-[32px] opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(168,85,247,0.35), transparent 60%), radial-gradient(ellipse 70% 80% at 85% 40%, rgba(99,102,241,0.3), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[30px] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: "0 0 40px rgba(139,92,246,0.45), 0 0 80px rgba(99,102,241,0.2)" }}
      />

      {/* Frosted glass surface */}
      <div
        className={cn(
          "relative min-h-[108px] overflow-hidden rounded-[30px]",
          "border border-white/[0.14]",
          "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset]",
          "transition-[box-shadow,border-color] duration-300",
          "group-hover:border-violet-300/25",
          "group-hover:shadow-[0_16px_48px_-12px_rgba(139,92,246,0.45),0_0_0_1px_rgba(255,255,255,0.08)_inset]",
        )}
        style={{
          background:
            "linear-gradient(135deg, rgba(88,28,135,0.55) 0%, rgba(49,46,129,0.48) 45%, rgba(67,56,202,0.42) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 38%), radial-gradient(ellipse 50% 80% at 0% 50%, rgba(168,85,247,0.15), transparent 55%)",
          }}
        />

        <div className="relative flex min-h-[108px] items-stretch pr-[34%] sm:pr-[32%]">
          {/* Left — 3D mic icon container */}
          <div className="flex shrink-0 items-center p-3.5 sm:p-4">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-1 rounded-[22px] bg-violet-400/25 blur-md"
              />
              <div
                className={cn(
                  "relative flex h-[60px] w-[60px] items-center justify-center rounded-[20px] sm:h-[64px] sm:w-[64px]",
                  "border border-white/15 bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_16px_rgba(0,0,0,0.2)]",
                  "backdrop-blur-xl",
                )}
              >
                <img
                  src={MIC_SRC}
                  alt=""
                  aria-hidden
                  className="h-[46px] w-[46px] object-contain drop-shadow-[0_4px_12px_rgba(139,92,246,0.5)] sm:h-[50px] sm:w-[50px]"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <FloatingMusicNote className="right-[-6px] top-[-2px] h-5 w-5 opacity-90" delay={0} />
            </div>
          </div>

          {/* Center — copy + tags */}
          <div className="flex min-w-0 flex-1 flex-col justify-center py-3.5 pr-2 sm:py-4">
            <p className="font-quicksand text-[16px] font-bold leading-tight tracking-tight text-white sm:text-[17px]">
              {t("pages.ai_coach.amy_audio_lessons")}
            </p>
            <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-white/70 sm:text-[12.5px]">
              {t("pages.ai_coach.hands_full_listen_to_age_curated_parenting_lessons_3_5_min_e")}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <GlassChip
                icon={<Headphones className="h-3 w-3" strokeWidth={2.25} />}
                label={t("pages.ai_coach.audio_lessons_tag_audio", "Audio")}
              />
              <GlassChip
                icon={<Sparkles className="h-3 w-3" strokeWidth={2.25} />}
                label={t("pages.ai_coach.audio_lessons_tag_age_curated", "Age Curated")}
              />
            </div>
          </div>

          {/* Right — Amy 3D hero illustration */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 top-0 w-[38%] sm:w-[35%]"
          >
            <div
              className="absolute inset-y-0 right-0 w-[130%]"
              style={{
                background:
                  "radial-gradient(ellipse 70% 70% at 65% 45%, rgba(168,85,247,0.35), transparent 65%)",
              }}
            />
            <motion.img
              src={AMY_HERO_SRC}
              alt=""
              className={cn(
                "amy-audio-amy-idle absolute bottom-0 right-[-8%] h-[108%] max-w-none object-contain object-bottom",
                "drop-shadow-[0_8px_24px_rgba(139,92,246,0.35)]",
              )}
              animate={reducedMotion ? undefined : { y: [0, -5, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              loading="lazy"
              decoding="async"
            />
            <FloatingMusicNote className="right-[18%] top-[12%] h-4 w-4 opacity-80" delay={0.6} />
            <FloatingMusicNote className="right-[8%] top-[28%] h-3.5 w-3.5 opacity-60" delay={1.2} />
            <SoundWaveBars className="absolute bottom-[22%] right-[6%] opacity-70" />
            <span
              className="amy-audio-sparkle absolute right-[22%] top-[20%] h-1.5 w-1.5 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            />
            <span
              className="amy-audio-sparkle absolute right-[12%] top-[38%] h-1 w-1 rounded-full bg-fuchsia-200/90 shadow-[0_0_6px_rgba(244,114,182,0.8)]"
              style={{ animationDelay: "0.8s" }}
            />
            {/* Headphones glow */}
            <div
              className="amy-audio-headphones-glow absolute right-[28%] top-[18%] h-8 w-10 rounded-full opacity-60 blur-md"
              style={{ background: "radial-gradient(circle, rgba(168,85,247,0.7), transparent 70%)" }}
            />
          </div>

          {/* Bottom-right glass CTA */}
          <div className="absolute bottom-3 right-3 z-10 sm:bottom-3.5 sm:right-3.5">
            <div
              aria-hidden
              className="amy-audio-cta-glow absolute inset-0 rounded-full bg-violet-400/30 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100"
            />
            <motion.span
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-full",
                "border border-white/20 bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,0,0,0.25)]",
                "backdrop-blur-xl transition-transform duration-300",
                "group-hover:scale-[1.08]",
              )}
              whileHover={reducedMotion ? undefined : { scale: 1.08 }}
            >
              <ChevronRight className="h-[18px] w-[18px] text-white/90" strokeWidth={2.25} />
            </motion.span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
