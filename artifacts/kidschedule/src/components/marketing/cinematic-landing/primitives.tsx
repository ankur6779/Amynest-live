import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";

export function ParticleField({ count = 48 }: { count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 4,
    })),
  ).current;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-purple-400/40"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.15, 0.7, 0.15],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function GlowOrb({
  color = "rgba(224,34,255,0.35)",
  size = 400,
  className = "",
}: {
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={`cl-glow-orb ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
      }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    />
  );
}

interface PhoneMockupProps {
  src: string;
  alt: string;
  className?: string;
  float?: boolean;
}

export function PhoneMockup({ src, alt, className = "", float = true }: PhoneMockupProps) {
  return (
    <motion.div
      className={`cl-phone-frame relative mx-auto w-[min(300px,78vw)] overflow-hidden bg-[#0a0618] ${className}`}
      style={{ aspectRatio: "9/19.5" }}
      initial={{ opacity: 0, y: 60, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="cl-phone-notch" />
      <motion.div
        className="h-full w-full"
        animate={float ? { y: [0, -8, 0] } : undefined}
        transition={float ? { duration: 5, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <img src={src} alt={alt} className="h-full w-full object-cover object-top" loading="lazy" />
      </motion.div>
    </motion.div>
  );
}

export function GlassCard({
  children,
  className = "",
  glow = "purple",
}: {
  children: ReactNode;
  className?: string;
  glow?: "purple" | "green" | "orange" | "magenta";
}) {
  const glowMap = {
    purple: "hover:shadow-[0_0_40px_rgba(168,85,247,0.25)]",
    green: "hover:shadow-[0_0_40px_rgba(0,255,156,0.2)]",
    orange: "hover:shadow-[0_0_40px_rgba(255,107,53,0.25)]",
    magenta: "hover:shadow-[0_0_40px_rgba(224,34,255,0.25)]",
  };

  return (
    <motion.div
      className={`cl-glass-card rounded-2xl p-5 transition-shadow duration-500 ${glowMap[glow]} ${className}`}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <motion.div
      className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/80">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-relaxed text-white/65 sm:text-lg">{subtitle}</p>
      ) : null}
    </motion.div>
  );
}

export function AnimatedCounter({
  value,
  suffix = "",
  duration = 2,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    motionVal.set(value);
  }, [inView, motionVal, value]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      const rounded = value >= 1000 ? Math.floor(v).toLocaleString() : Math.round(v).toString();
      setDisplay(rounded);
    });
    return unsub;
  }, [spring, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

export function ProgressRing({
  value,
  color,
  label,
  size = 88,
}: {
  value: number;
  color: string;
  label: string;
  size?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg ref={ref} width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
          {value}%
        </div>
      </div>
      <span className="text-xs font-medium text-white/70">{label}</span>
    </motion.div>
  );
}

export function AudioWaveBars() {
  const heights = [12, 22, 16, 28, 14, 24, 18, 30, 12, 20];

  return (
    <div className="flex h-10 items-end justify-center gap-1" aria-hidden>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="cl-audio-bar"
          style={{ height: h }}
          animate={{ scaleY: [0.4, 1, 0.5, 0.9, 0.4] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function TypewriterQuestions({ questions }: { questions: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = questions[index];
    const timeout = setTimeout(
      () => {
        if (!deleting) {
          if (text.length < current.length) {
            setText(current.slice(0, text.length + 1));
          } else {
            setTimeout(() => setDeleting(true), 1800);
          }
        } else if (text.length > 0) {
          setText(text.slice(0, -1));
        } else {
          setDeleting(false);
          setIndex((i) => (i + 1) % questions.length);
        }
      },
      deleting ? 35 : 55,
    );
    return () => clearTimeout(timeout);
  }, [text, deleting, index, questions]);

  return (
    <span className="cl-gradient-text font-medium">
      &ldquo;{text}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-[2px] translate-y-[2px] bg-purple-400"
        style={{ height: "1.1em" }}
      />
      &rdquo;
    </span>
  );
}

export function CtaButton({
  href,
  children,
  variant = "primary",
  onClick,
}: {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}) {
  const className = `inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-all duration-300 sm:text-base ${
    variant === "primary" ? "cl-cta-primary text-white" : "cl-cta-secondary text-white/90"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  return (
    <Link href={href ?? "/sign-up"} className={className}>
      {children}
      {variant === "primary" ? <ArrowRight className="h-4 w-4" /> : null}
    </Link>
  );
}

export function FeatureCheck({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.li
      className="flex items-start gap-3 text-sm text-white/80 sm:text-base"
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-300">
        ✓
      </span>
      {children}
    </motion.li>
  );
}

export function AmyPulseAvatar({ size = 120 }: { size?: number }) {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(224,34,255,0.45) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <AmyMascotLogo size={size} className="relative z-10" />
    </motion.div>
  );
}

export function ProgressBarAnimated({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div ref={ref} className={`cl-progress-track ${className}`}>
      <motion.div
        className="cl-progress-fill"
        initial={{ width: "0%" }}
        animate={inView ? { width: `${value}%` } : { width: "0%" }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

export function FloatingFeatureCard({
  title,
  icon,
  delay = 0,
  accent,
}: {
  title: string;
  icon: string;
  delay?: number;
  accent: string;
}) {
  return (
    <motion.div
      className="cl-feature-pill rounded-xl px-4 py-3 text-sm font-medium shadow-lg"
      style={{
        borderColor: `${accent}44`,
        boxShadow: `0 8px 32px ${accent}22`,
      }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ scale: 1.05, boxShadow: `0 12px 40px ${accent}44` }}
    >
      <motion.span
        className="inline-flex items-center"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="mr-2">{icon}</span>
        {title}
      </motion.span>
    </motion.div>
  );
}
