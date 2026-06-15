import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Baby,
  Mic,
  Moon,
  Syringe,
  TrendingUp,
  Share2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { trackMarketingAssetViewed } from "@/lib/infant-marketing-analytics";

const FEATURES = [
  {
    id: "cry_insight" as const,
    icon: Mic,
    titleKey: "landing.infant_parenting.cry_title",
    descKey: "landing.infant_parenting.cry_desc",
    mockAccent: "#f472b6",
    mockLabel: "Cry Insight",
  },
  {
    id: "baby_today" as const,
    icon: Moon,
    titleKey: "landing.infant_parenting.sleep_title",
    descKey: "landing.infant_parenting.sleep_desc",
    mockAccent: "#818cf8",
    mockLabel: "Baby Today",
  },
  {
    id: "vaccines" as const,
    icon: Syringe,
    titleKey: "landing.infant_parenting.vaccine_title",
    descKey: "landing.infant_parenting.vaccine_desc",
    mockAccent: "#34d399",
    mockLabel: "Vaccines",
  },
  {
    id: "growth" as const,
    icon: TrendingUp,
    titleKey: "landing.infant_parenting.growth_title",
    descKey: "landing.infant_parenting.growth_desc",
    mockAccent: "#fbbf24",
    mockLabel: "Growth",
  },
  {
    id: "weekly_share" as const,
    icon: Share2,
    titleKey: "landing.infant_parenting.weekly_title",
    descKey: "landing.infant_parenting.weekly_desc",
    mockAccent: "#fb923c",
    mockLabel: "Weekly Report",
  },
];

/** Hardcoded English for /get-app — marketing page stays English regardless of i18n locale. */
const GET_APP_INFANT_COPY = {
  freeBadge: "Full app · 100% free for infants",
  eyebrow: "0–24 months",
  heading: "Infant Parenting, Simplified",
  subheading:
    "From crying clues to sleep predictions, vaccines, growth charts, and shareable weekly reports — AmyNest supports you through the hardest months.",
  freeHeadline: "Full AmyNest app — 100% free for infants (0–24 months)",
  freeDetail:
    "Cry insight, sleep, vaccines, growth tracking — all included free. No premium required.",
  cta: "Start your infant journey — 100% free",
  features: {
    cry_insight: {
      title: "Cry Insight",
      desc: "Record a few seconds — get instant guidance on hunger, sleep, or discomfort.",
    },
    baby_today: {
      title: "Sleep Predictions",
      desc: "Know the next nap and feed before they happen with Baby Today.",
    },
    vaccines: {
      title: "Vaccine Timeline",
      desc: "Never miss a dose with age-based schedules and reminders.",
    },
    growth: {
      title: "Growth Tracking",
      desc: "Log weight and height, track milestones, and see progress charts.",
    },
    weekly_share: {
      title: "Weekly Reports",
      desc: "Share beautiful progress cards with family every week.",
    },
  },
} as const;

const SCREENSHOTS: Record<string, string> = {
  cry_insight: "/promo/infant-parenting/appstore-01-cry-insight.jpg",
  baby_today: "/promo/infant-parenting/appstore-02-baby-today.jpg",
  growth: "/promo/infant-parenting/appstore-03-growth.jpg",
  vaccines: "/promo/infant-parenting/appstore-04-vaccines.jpg",
  weekly_share: "/promo/infant-parenting/appstore-05-weekly-share.jpg",
};

function PhoneMockup({
  featureId,
  accent,
  label,
}: {
  featureId: string;
  accent: string;
  label: string;
}) {
  const screenshot = SCREENSHOTS[featureId];

  return (
    <div
      className="relative mx-auto w-[260px] sm:w-[280px]"
      style={{ animation: "infantMockFloat 4s ease-in-out infinite" }}
    >
      <div
        className="absolute -inset-4 rounded-[2.5rem] opacity-40 blur-2xl pointer-events-none"
        style={{ background: accent }}
      />
      <div className="relative rounded-[2.2rem] border-[3px] border-white/20 bg-[#0b0b1a] shadow-2xl overflow-hidden">
        <div className="h-6 flex items-center justify-center">
          <div className="w-16 h-3 rounded-full bg-black/80" />
        </div>
        {screenshot ? (
          <img
            src={screenshot}
            alt={label}
            className="w-full aspect-[9/16] object-cover object-top"
            loading="lazy"
          />
        ) : (
          <AnimatedMockScreen featureId={featureId} accent={accent} label={label} />
        )}
      </div>
    </div>
  );
}

function AnimatedMockScreen({
  featureId,
  accent,
  label,
}: {
  featureId: string;
  accent: string;
  label: string;
}) {
  return (
    <div
      className="aspect-[9/16] p-4 flex flex-col gap-3"
      style={{
        background: "linear-gradient(165deg,#1a0f2e,#2d1b4e)",
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
      {featureId === "cry_insight" && (
        <>
          <div
            className="rounded-2xl p-4 text-center space-y-2"
            style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}
          >
            <div
              className="mx-auto h-16 w-16 rounded-full flex items-center justify-center text-2xl"
              style={{ background: `${accent}33`, animation: "infantPulse 1.5s ease-in-out infinite" }}
            >
              🎙️
            </div>
            <p className="text-xs font-bold text-white">Listening…</p>
            <p className="text-[10px] text-white/60">Hunger · Sleep · Discomfort</p>
          </div>
          <div className="rounded-xl bg-white/8 p-3 text-[10px] text-white/80 leading-snug">
            <span style={{ color: accent }}>Amy:</span> Likely hungry — last feed was 2h ago.
          </div>
        </>
      )}
      {featureId === "baby_today" && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { e: "😴", t: "Next nap", v: "2:30 PM" },
            { e: "🍼", t: "Next feed", v: "1:15 PM" },
            { e: "💉", t: "Vaccines", v: "Up to date" },
            { e: "⭐", t: "Sleep", v: "Good" },
          ].map((row) => (
            <div key={row.t} className="rounded-xl bg-white/8 p-2.5">
              <p className="text-sm">{row.e}</p>
              <p className="text-[9px] text-white/50">{row.t}</p>
              <p className="text-[11px] font-bold text-white">{row.v}</p>
            </div>
          ))}
        </div>
      )}
      {featureId === "vaccines" && (
        <div className="space-y-2">
          {["Birth · Done", "6 weeks · Due soon", "10 weeks · Upcoming"].map((v, i) => (
            <div
              key={v}
              className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-2"
              style={{ opacity: i === 0 ? 1 : 0.85 - i * 0.15 }}
            >
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: i === 0 ? accent : "rgba(255,255,255,0.3)" }}
              />
              <p className="text-[11px] text-white/90">{v}</p>
            </div>
          ))}
        </div>
      )}
      {featureId === "growth" && (
        <>
          <div className="rounded-xl bg-white/8 p-3">
            <p className="text-[10px] text-white/50 mb-1">Weight · On track</p>
            <div className="h-16 flex items-end gap-1">
              {[40, 55, 48, 62, 70, 78].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${h}%`,
                    background: `linear-gradient(to top, ${accent}, ${accent}88)`,
                    animation: `infantBarGrow 0.6s ease-out ${i * 0.08}s both`,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-white/8 p-3 text-[10px] text-white/80">
            🏆 Rolled over — new milestone!
          </div>
        </>
      )}
      {featureId === "weekly_share" && (
        <div
          className="rounded-2xl p-4 text-center space-y-2 flex-1"
          style={{ background: "linear-gradient(165deg,#1a0f2e,#4a2c6a)" }}
        >
          <p className="text-xs font-bold text-amber-300">Emma&apos;s Week</p>
          <p className="text-[10px] text-white/70">Sleep Score: 87</p>
          <p className="text-[10px] text-white/70">Feeds: 32 · Growth: On Track</p>
          <p className="text-[10px] italic text-white/55">&quot;Great progress this week.&quot;</p>
          <p className="text-[9px] text-white/40 mt-auto">Powered by AmyNest</p>
        </div>
      )}
    </div>
  );
}

export type InfantFreePromo = string | { headline: string; detail: string };

export function InfantParentingSection({
  page = "landing",
  freePromo,
}: {
  page?: "landing" | "get-app";
  freePromo?: InfantFreePromo;
}) {
  const { t } = useTranslation();
  const isGetApp = page === "get-app";
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const trackedRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !trackedRef.current) {
          trackedRef.current = true;
          trackMarketingAssetViewed("landing_infant_section", { page });
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [page]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIdx((i) => (i + 1) % FEATURES.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  const active = FEATURES[activeIdx]!;
  const ActiveIcon = active.icon;

  return (
    <section
      ref={sectionRef}
      id="infant-parenting"
      className="relative z-10 px-5 py-20 overflow-hidden"
      data-testid="infant-parenting-section"
    >
      <style>{`
        @keyframes infantMockFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes infantPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.85; }
        }
        @keyframes infantBarGrow {
          from { transform: scaleY(0); transform-origin: bottom; }
          to { transform: scaleY(1); transform-origin: bottom; }
        }
      `}</style>

      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(251,191,36,0.12), transparent 60%)",
        }}
      />

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div
            className="inline-flex items-center gap-1.5 mb-3 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full text-white"
            style={{
              background: "linear-gradient(135deg,rgba(16,185,129,0.28),rgba(52,211,153,0.15))",
              border: "1px solid rgba(52,211,153,0.4)",
            }}
          >
            <Sparkles className="h-3 w-3 text-emerald-300" />
            {isGetApp
              ? GET_APP_INFANT_COPY.freeBadge
              : t("landing.infant_parenting.free_badge", "Full app · 100% free for infants")}
          </div>
          <div
            className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full text-white"
            style={{
              background: "linear-gradient(135deg,rgba(251,191,36,0.25),rgba(236,72,153,0.18))",
              border: "1px solid rgba(251,191,36,0.35)",
            }}
          >
            <Baby className="h-3 w-3" />
            {isGetApp ? GET_APP_INFANT_COPY.eyebrow : t("landing.infant_parenting.eyebrow", "0–24 months")}
          </div>
          <h2 className="font-quicksand font-bold text-3xl md:text-5xl text-white mb-4 leading-tight">
            {isGetApp
              ? GET_APP_INFANT_COPY.heading
              : t("landing.infant_parenting.heading", "Infant Parenting, Simplified")}
          </h2>
          <p className="text-white/65 text-base md:text-lg leading-relaxed mb-4 max-w-xl">
            {isGetApp
              ? GET_APP_INFANT_COPY.subheading
              : t(
                  "landing.infant_parenting.subheading",
                  "From crying clues to sleep predictions, vaccines, growth charts, and shareable weekly reports — AmyNest supports you through the hardest months.",
                )}
          </p>
          <div className="text-emerald-200/90 text-sm md:text-base leading-relaxed mb-8 max-w-xl font-medium space-y-2">
            {isGetApp ? (
              <>
                <p>{GET_APP_INFANT_COPY.freeHeadline}</p>
                <p>{GET_APP_INFANT_COPY.freeDetail}</p>
              </>
            ) : typeof freePromo === "object" ? (
              <>
                <p>{freePromo.headline}</p>
                <p>{freePromo.detail}</p>
              </>
            ) : (
              <p>
                {freePromo ??
                  t(
                    "landing.infant_parenting.free_note",
                    "The entire AmyNest app is free for infants — cry insight, sleep predictions, vaccines, growth tracking and more. No premium required.",
                  )}
              </p>
            )}
          </div>

          <div className="space-y-2 mb-8">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const isActive = i === activeIdx;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setActiveIdx(i);
                    trackMarketingAssetViewed("landing_infant_mockup", {
                      feature: f.id,
                      page,
                    });
                  }}
                  className="w-full flex items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                    border: isActive
                      ? "1px solid rgba(251,191,36,0.35)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: isActive ? f.mockAccent : "rgba(255,255,255,0.08)",
                      color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">
                      {isGetApp
                        ? GET_APP_INFANT_COPY.features[f.id].title
                        : t(f.titleKey)}
                    </p>
                    <p className="text-xs text-white/55 leading-snug mt-0.5">
                      {isGetApp
                        ? GET_APP_INFANT_COPY.features[f.id].desc
                        : t(f.descKey)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <Link href="/sign-up">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-bold px-7 py-4 rounded-2xl text-white transition-transform hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg,#f59e0b,#ea580c)",
                boxShadow: "0 12px 40px rgba(245,158,11,0.35)",
              }}
            >
              <Sparkles className="h-4 w-4" />
              {isGetApp
                ? GET_APP_INFANT_COPY.cta
                : t("landing.infant_parenting.cta", "Start your infant journey — 100% free")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        <div className="relative flex flex-col items-center">
          <div
            key={active.id}
            className="w-full flex flex-col items-center gap-4"
            style={{ animation: "infantFadeIn 0.5s ease both" }}
          >
            <div className="flex items-center gap-2 text-amber-300/90">
              <ActiveIcon className="h-4 w-4" />
              <p className="text-xs font-bold uppercase tracking-widest">
                {isGetApp
                  ? GET_APP_INFANT_COPY.features[active.id].title
                  : t(active.titleKey)}
              </p>
            </div>
            <PhoneMockup
              featureId={active.id}
              accent={active.mockAccent}
              label={active.mockLabel}
            />
          </div>
          <div className="flex gap-2 mt-6">
            {FEATURES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Feature ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === activeIdx ? 24 : 8,
                  background: i === activeIdx ? "#fbbf24" : "rgba(255,255,255,0.2)",
                }}
                onClick={() => setActiveIdx(i)}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes infantFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
