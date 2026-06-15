import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { ProgressRing, AudioWaveBars } from "../cinematic-landing/primitives";
import { GAMING_STATS, type ShowcaseScene } from "./constants";

const ACCENT_CLASS: Record<ShowcaseScene["accent"], string> = {
  purple: "hs-accent-purple",
  magenta: "hs-accent-magenta",
  orange: "hs-accent-orange",
  green: "hs-accent-green",
  cyan: "hs-accent-cyan",
  gold: "hs-accent-gold",
};

const GOAL_PROGRESS = [68, 54, 72, 61, 45];

function PhoneFrame({ src, alt, accent }: { src: string; alt: string; accent: ShowcaseScene["accent"] }) {
  return (
    <motion.div
      className={`hs-phone ${ACCENT_CLASS[accent]}`}
      initial={{ scale: 0.92, opacity: 0.6 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: false, amount: 0.4 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="hs-phone-notch" />
      <img src={src} alt={alt} loading="lazy" />
    </motion.div>
  );
}

function HighlightsList({ items, variant }: { items: string[]; variant?: ShowcaseScene["variant"] }) {
  if (variant === "gaming") {
    return (
      <div className="mt-6 flex flex-wrap gap-4">
        {GAMING_STATS.map((stat) => (
          <ProgressRing key={stat.label} value={stat.value} color={stat.color} label={stat.label} size={64} />
        ))}
      </div>
    );
  }

  if (variant === "goals") {
    return (
      <div className="mt-6 space-y-3">
        {items.map((item, i) => (
          <div key={item} className="hs-highlight">
            <div className="mb-1.5 flex justify-between text-sm">
              <span>{item}</span>
              <span className="text-purple-300">{GOAL_PROGRESS[i] ?? 50}%</span>
            </div>
            <div className="hs-goal-bar">
              <motion.div
                className="hs-goal-fill"
                initial={{ width: 0 }}
                whileInView={{ width: `${GOAL_PROGRESS[i] ?? 50}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.08 }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="mt-6 grid gap-2 sm:grid-cols-2">
      {items.map((item, i) => (
        <motion.li
          key={item}
          className="hs-highlight"
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.45 }}
        >
          {item}
        </motion.li>
      ))}
    </ul>
  );
}

export function ShowcasePanel({ scene }: { scene: ShowcaseScene }) {
  const isSplash = scene.variant === "splash";
  const isAudio = scene.variant === "audio";

  return (
    <article className={`hs-panel ${ACCENT_CLASS[scene.accent]}`} data-scene={scene.id}>
      <div className={`hs-panel-inner ${isSplash ? "lg:grid-cols-1 !max-w-3xl text-center" : ""}`}>
        <div className={isSplash ? "order-2 lg:order-1" : ""}>
          <motion.p
            className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/80"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {scene.id.replace(/-/g, " ")}
          </motion.p>
          <motion.h3
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {scene.headline}
          </motion.h3>
          <motion.p
            className="mt-3 max-w-lg text-base text-white/65 sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {scene.subtitle}
          </motion.p>
          {isAudio ? <div className="mt-6"><AudioWaveBars /></div> : null}
          {scene.highlights.length > 0 ? (
            <HighlightsList items={scene.highlights} variant={scene.variant} />
          ) : null}
        </div>

        {scene.screenshot ? (
          <div className={isSplash ? "order-1 lg:order-2 flex justify-center" : "flex justify-center lg:justify-end"}>
            <PhoneFrame src={scene.screenshot} alt={scene.headline} accent={scene.accent} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ShowcaseFinalPanel() {
  return (
    <article className="hs-panel hs-final-panel hs-accent-purple" data-scene="final">
      <div className="mx-auto max-w-2xl text-center">
        <motion.h3
          className="whitespace-pre-line text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          Everything Your Family Needs.{"\n"}One App.
        </motion.h3>
        <motion.p
          className="mt-5 whitespace-pre-line text-lg text-white/65"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
        >
          From infancy to teenage years,{"\n"}Amy grows with your child.
        </motion.p>
        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
        >
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white sm:text-base"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #e022ff 55%, #ff6b9d)",
              boxShadow: "0 12px 40px rgba(224, 34, 255, 0.35)",
            }}
          >
            Start Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white/90 backdrop-blur-sm sm:text-base"
          >
            Get Premium
          </Link>
        </motion.div>
      </div>
    </article>
  );
}

export function MobileShowcaseCard({ scene }: { scene: ShowcaseScene }) {
  return (
    <div className={`hs-mobile-panel ${ACCENT_CLASS[scene.accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-purple-300/70">{scene.headline}</p>
      <p className="mt-1 text-sm text-white/60">{scene.subtitle}</p>
      {scene.screenshot ? (
        <div className="mt-4">
          <PhoneFrame src={scene.screenshot} alt={scene.headline} accent={scene.accent} />
        </div>
      ) : null}
      {scene.highlights.length > 0 && scene.variant !== "gaming" ? (
        <ul className="mt-4 space-y-1.5 text-sm text-white/75">
          {scene.highlights.map((h) => (
            <li key={h}>• {h}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
