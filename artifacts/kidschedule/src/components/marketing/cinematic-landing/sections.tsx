import { motion } from "framer-motion";
import {
  AmyPulseAvatar,
  AudioWaveBars,
  CtaButton,
  FeatureCheck,
  FloatingFeatureCard,
  GlassCard,
  GlowOrb,
  ParticleField,
  PhoneMockup,
  ProgressBarAnimated,
  ProgressRing,
  SectionHeading,
  AnimatedCounter,
  TypewriterQuestions,
} from "./primitives";
import {
  AMY_QUESTIONS,
  GAMING_STATS,
  SCREENSHOTS,
  STATS,
  TESTIMONIALS,
} from "./constants";

export function HeroSection({ onWatchDemo }: { onWatchDemo: () => void }) {
  return (
    <section
      id="hero"
      className="cl-section-pin relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 pb-16 pt-28"
    >
      <GlowOrb className="left-1/2 top-1/3 -translate-x-1/2" size={500} />
      <GlowOrb color="rgba(255,107,53,0.2)" className="right-[10%] top-[20%]" size={280} />
      <ParticleField count={56} />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <motion.div
          className="text-center lg:text-left"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-purple-300/70">
            Powered by patent-pending adaptive AI
          </p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Parenting Is Hard.
            <br />
            <span className="cl-gradient-text">Amy Makes It Easier.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg lg:mx-0">
            One AI companion for routines, learning, behavior, health, emotional support and family
            growth.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <CtaButton href="/sign-up">Start Parenting Smarter</CtaButton>
            <CtaButton variant="secondary" onClick={onWatchDemo}>
              Watch Demo
            </CtaButton>
          </div>
        </motion.div>

        <div className="relative flex flex-col items-center">
          <div className="mb-6">
            <AmyPulseAvatar size={110} />
          </div>
          <div data-parallax-phone className="relative w-full max-w-[300px]">
            <PhoneMockup src={SCREENSHOTS.dashboard} alt="AmyNest AI dashboard" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function MeetAmySection() {
  return (
    <section
      id="meet-amy"
      className="cl-section-pin relative overflow-hidden px-5 py-24 sm:py-32"
    >
      <ParticleField count={32} />
      <GlowOrb className="left-[15%] top-1/2" size={320} />
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div data-scene-phone>
          <PhoneMockup src={SCREENSHOTS.meetAmy} alt="Meet Amy splash screen" />
        </div>
        <SectionHeading
          eyebrow="Scene 1"
          title="Meet Amy"
          subtitle="The AI Parenting Companion Built For Modern Families"
        />
      </div>
    </section>
  );
}

export function DashboardSection() {
  const features = [
    "Weather-aware parenting",
    "Child-specific guidance",
    "Daily routines",
    "AI recommendations",
    "Family insights",
  ];

  return (
    <section id="dashboard" className="relative overflow-hidden px-5 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <SectionHeading
            eyebrow="Scene 2"
            title="Your Family's Command Center"
            subtitle="Everything your family needs — weather, routines, insights and AI guidance in one intelligent dashboard."
          />
          <ul className="mt-8 space-y-3">
            {features.map((f, i) => (
              <FeatureCheck key={f} delay={i * 0.1}>
                {f}
              </FeatureCheck>
            ))}
          </ul>
          <div className="mt-8 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm text-white/60">
                <span>7-Day Journey</span>
                <span>Day 4 · 43%</span>
              </div>
              <ProgressBarAnimated value={43} />
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-orange-400">
                  <AnimatedCounter value={34} suffix="°C" />
                </p>
                <p className="text-xs text-white/50">Live weather</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-300">
                  <AnimatedCounter value={2} />
                </p>
                <p className="text-xs text-white/50">Children tracked</p>
              </div>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2" data-slide-right>
          <PhoneMockup src={SCREENSHOTS.dashboard} alt="AmyNest family dashboard" float={false} />
        </div>
      </div>
    </section>
  );
}

export function ParentingHubSection() {
  const cards = [
    { title: "Parenting Articles", icon: "📚", accent: "#7B5CFF", pos: "left-[0%] top-[8%]" },
    { title: "Emotional Support", icon: "💜", accent: "#E022FF", pos: "right-[0%] top-[18%]" },
    { title: "Nutrition Hub", icon: "🥗", accent: "#00FF9C", pos: "left-[5%] bottom-[28%]" },
    { title: "Life Skills", icon: "🧭", accent: "#00D4FF", pos: "right-[2%] bottom-[38%]" },
    { title: "Activities & Learning", icon: "🎨", accent: "#FF6B35", pos: "left-[20%] bottom-[8%]" },
  ];

  return (
    <section id="parenting-hub" className="relative overflow-hidden px-5 py-24 sm:py-32">
      <GlowOrb color="rgba(224,34,255,0.25)" className="right-[5%] top-[30%]" size={360} />
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Scene 3"
          title="Science Meets Parenting"
          subtitle="Research-backed articles, emotional support, nutrition and life skills — personalized for every child."
          align="center"
        />
        <div className="relative mx-auto mt-16 max-w-[340px] lg:max-w-[400px]">
          <PhoneMockup src={SCREENSHOTS.parentingHub} alt="Parenting Hub" float={false} />
          {cards.map((card, i) => (
            <div key={card.title} className={`absolute z-20 hidden sm:block ${card.pos}`}>
              <FloatingFeatureCard title={card.title} icon={card.icon} accent={card.accent} delay={i * 0.15} />
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 sm:hidden">
          {cards.map((card) => (
            <GlassCard key={card.title} glow="magenta">
              <span className="text-lg">{card.icon}</span>
              <p className="mt-2 text-sm font-medium">{card.title}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GamingHubSection() {
  return (
    <section id="gaming-hub" className="relative overflow-hidden px-5 py-24 sm:py-32">
      <ParticleField count={24} />
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <PhoneMockup src={SCREENSHOTS.gamingHub} alt="Gaming Hub skills dashboard" />
        <div>
          <SectionHeading
            eyebrow="Scene 4"
            title="Screen Time That Builds Skills"
            subtitle="Games that develop brain, memory, math, focus and behavior — with Amy's daily picks."
          />
          <div className="mt-10 grid grid-cols-3 gap-4 sm:grid-cols-5">
            {GAMING_STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <ProgressRing value={stat.value} color={stat.color} label={stat.label} size={76} />
              </motion.div>
            ))}
          </div>
          <p className="mt-8 text-sm text-white/50">
            <AnimatedCounter value={501} /> points earned · Daily plays tracked
          </p>
        </div>
      </div>
    </section>
  );
}

export function LearningZoneSection() {
  const features = [
    { title: "Smart Math Tricks", gradient: "from-amber-500/30 to-orange-600/20" },
    { title: "Abacus Pro Zone", gradient: "from-cyan-500/30 to-teal-600/20" },
    { title: "Phonics Learning", gradient: "from-blue-500/30 to-indigo-600/20" },
    { title: "Smart Study Zone", gradient: "from-purple-500/30 to-fuchsia-600/20" },
    { title: "Spelling Mastery", gradient: "from-emerald-500/30 to-green-600/20" },
    { title: "Olympiad Zone", gradient: "from-yellow-500/30 to-amber-600/20" },
  ];

  return (
    <section id="learning-zone" className="relative overflow-hidden px-5 py-24 sm:py-32">
      <GlowOrb color="rgba(124,58,237,0.3)" className="left-[8%] bottom-[10%]" size={400} />
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Scene 5"
          title="An Entire Learning Ecosystem"
          subtitle="From phonics to olympiad prep — adaptive learning for every age and milestone."
          align="center"
        />
        <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
          <div data-horizontal-reveal className="flex gap-3 overflow-x-auto pb-4 lg:flex-col lg:overflow-visible">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className={`min-w-[200px] rounded-2xl border border-white/10 bg-gradient-to-r ${f.gradient} px-5 py-4 backdrop-blur-sm lg:min-w-0`}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ x: 8, boxShadow: "0 0 30px rgba(168,85,247,0.2)" }}
              >
                <p className="font-semibold">{f.title}</p>
              </motion.div>
            ))}
          </div>
          <PhoneMockup src={SCREENSHOTS.learningZone} alt="Learning Zone" float={false} />
        </div>
      </div>
    </section>
  );
}

export function AudioLessonsSection() {
  const features = [
    "Age-based audio lessons",
    "Daily Picks curated by Amy",
    "Quick Play for busy parents",
    "Premium library unlock",
  ];

  return (
    <section id="audio-lessons" className="relative overflow-hidden px-5 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Scene 6"
            title="Parenting Wisdom On Demand"
            subtitle="Listen while you multitask — expert guidance tailored to your child's age."
          />
          <AudioWaveBars />
          <ul className="mt-8 space-y-3">
            {features.map((f, i) => (
              <FeatureCheck key={f} delay={i * 0.1}>
                {f}
              </FeatureCheck>
            ))}
          </ul>
        </div>
        <PhoneMockup src={SCREENSHOTS.audioLessons} alt="Amy Audio Lessons" />
      </div>
    </section>
  );
}

export function HealthSection() {
  const features = [
    { title: "Nutrition Hub", desc: "Age-wise nutrients & meal plans", icon: "🥗", glow: "green" as const },
    { title: "Amy Health Lab™", desc: "Play, move & wellness activities", icon: "🧪", glow: "purple" as const },
    { title: "Wellness Activities", desc: "Breathe, move & discover", icon: "🌿", glow: "green" as const },
    { title: "WHO-backed Guidance", desc: "Trusted health resources", icon: "✨", glow: "orange" as const },
  ];

  return (
    <section id="health" className="relative overflow-hidden px-5 py-24 sm:py-32">
      <GlowOrb color="rgba(0,255,156,0.18)" className="right-[12%] top-[25%]" size={350} />
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Scene 7"
          title="Healthy Kids. Peaceful Parents."
          subtitle="Nutrition, wellness activities and WHO-backed guidance — all in one health zone."
          align="center"
        />
        <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
          <PhoneMockup src={SCREENSHOTS.healthZone} alt="Health Zone" float={false} />
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard glow={f.glow}>
                  <span className="text-2xl">{f.icon}</span>
                  <p className="mt-2 font-semibold">{f.title}</p>
                  <p className="mt-1 text-sm text-white/55">{f.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FamilyGoalsSection() {
  const goals = [
    { title: "Sleep", icon: "😴", progress: 68 },
    { title: "Eating", icon: "🍽️", progress: 54 },
    { title: "Screen Time", icon: "📱", progress: 72 },
    { title: "Behavior", icon: "🎯", progress: 61 },
    { title: "Self Care", icon: "💜", progress: 45 },
  ];

  return (
    <section id="family-goals" className="relative overflow-hidden px-5 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Scene 8"
            title="Because Parents Need Support Too"
            subtitle="Goals for sleep, eating, screen time, behavior — and parent self-care."
          />
          <div className="mt-10 space-y-4">
            {goals.map((g, i) => (
              <motion.div
                key={g.title}
                className="cl-glass-card rounded-xl p-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <span>{g.icon}</span> {g.title}
                  </span>
                  <span className="text-sm text-purple-300">{g.progress}%</span>
                </div>
                <ProgressBarAnimated value={g.progress} />
              </motion.div>
            ))}
          </div>
        </div>
        <PhoneMockup src={SCREENSHOTS.familyGoals} alt="Family Goals" />
      </div>
    </section>
  );
}

export function AskAmySection() {
  return (
    <section id="ask-amy" className="relative overflow-hidden px-5 py-28 sm:py-36">
      <GlowOrb className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" size={600} />
      <ParticleField count={40} />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <SectionHeading
          title="Ask Amy Anything"
          subtitle="Warm, practical parenting advice — available 24/7."
          align="center"
        />
        <div className="mt-10 flex justify-center">
          <AmyPulseAvatar size={140} />
        </div>
        <div className="mt-8 min-h-[3rem] text-xl sm:text-2xl">
          <TypewriterQuestions questions={AMY_QUESTIONS} />
        </div>
        <AudioWaveBars />
        <div className="mt-10">
          <CtaButton href="/assistant">Talk to Amy AI</CtaButton>
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  return (
    <section id="stats" className="relative px-5 py-20">
      <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="cl-glass-card rounded-2xl p-6 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <p className="text-3xl font-bold cl-gradient-text sm:text-4xl">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            </p>
            <p className="mt-2 text-sm text-white/60">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title="Loved by Modern Families"
          subtitle="Real stories from parents using AmyNest every day."
          align="center"
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
            >
              <GlassCard glow="purple" className="h-full">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-300/80">
                  {t.topic}
                </p>
                <p className="mt-4 text-base leading-relaxed text-white/85">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="font-semibold">{t.author}</p>
                  <p className="text-sm text-white/50">{t.role}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section
      id="final-cta"
      className="relative overflow-hidden px-5 py-28 sm:py-36"
      data-glow-burst
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(124,58,237,0.35), transparent), linear-gradient(180deg, #050B1F, #0a1030)",
        }}
      />
      <ParticleField count={64} />
      <motion.div
        className="relative z-10 mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          Raise Confident Kids With AI By Your Side
        </h2>
        <p className="mt-5 text-lg text-white/65">
          One App.
          <br />
          Every Age.
          <br />
          Every Milestone.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CtaButton href="/sign-up">Start Free Today</CtaButton>
          <CtaButton href="/pricing" variant="secondary">
            Explore Premium
          </CtaButton>
        </div>
      </motion.div>
    </section>
  );
}
