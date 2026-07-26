/**
 * My Child's Cosmic Portrait — Disney/Pixar storybook experience.
 * Preserves props & portrait bindings; elevates UI, motion, storytelling only.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AmyAstroCosmicPortrait,
  type AmyLookTarget,
} from "./cosmic-portrait";
import {
  PortraitIllustration,
  illustrationForQuality,
  illustrationForReminder,
} from "./portrait-illustrations";
import { AmyAstroIcon } from "./icons/amy-astro-icons";
import type { CosmicPortraitContent } from "../lib/signature-insight";
import {
  buildCosmicInsightCards,
  enrichQuality,
  enrichReminder,
  storyBeatsFromParagraph,
} from "../lib/portrait-card-copy";
import { resolvePortraitWorldTheme } from "../lib/portrait-world-theme";
import {
  buildContinuityAmyOpener,
  type ContinuityFacts,
} from "../lib/emotional-continuity";
import {
  loadReplyMemory,
  rememberReplyOpening,
} from "../lib/reply-memory";
import { softHaptic } from "../lib/soft-haptic";
import { AMY_ASTRO_DISCLAIMER } from "../lib/branding";
import { useLivingSky } from "../state/living-sky-context";
import { cn } from "@/lib/utils";
import "../design/amy-astro.css";

type Props = {
  childName: string;
  portrait: CosmicPortraitContent;
  reducedMotion?: boolean;
  onAskAmy?: () => void;
  onContinue?: () => void;
  /** Real journey facts only — never fabricated */
  continuity?: ContinuityFacts | null;
  /** Persist Save Memory into cosmic memory */
  onPortraitSaved?: () => void;
  /** Seed for rotating continuity openers */
  continuitySeed?: number;
  profileId?: string;
};

type CinemaPhase =
  | "void"
  | "stars"
  | "nebula"
  | "amy"
  | "name"
  | "story"
  | "live";

export function AmyAstroCosmicPortraitCard({
  childName,
  portrait,
  reducedMotion = false,
  onAskAmy,
  onContinue,
  continuity = null,
  onPortraitSaved,
  continuitySeed = 0,
  profileId,
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const livingSky = useLivingSky();
  const rememberedOpener = useRef(false);
  const [phase, setPhase] = useState<CinemaPhase>(reducedMotion ? "live" : "void");
  const [typedName, setTypedName] = useState(reducedMotion ? childName : "");
  const [burstKey, setBurstKey] = useState(0);
  const [smileBoost, setSmileBoost] = useState(false);
  const [orbPulse, setOrbPulse] = useState(false);
  const [lookTarget, setLookTarget] = useState<AmyLookTarget>("center");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [memorySaved, setMemorySaved] = useState(
    () => Boolean(continuity?.portraitSaved),
  );
  const [parallax, setParallax] = useState({ y: 0, stars: 0 });

  const world = useMemo(
    () =>
      resolvePortraitWorldTheme({
        childName,
        sunSign: portrait.sunSign,
        moonSign: portrait.moonSign,
        qualities: portrait.qualities,
      }),
    [childName, portrait.sunSign, portrait.moonSign, portrait.qualities],
  );

  const amyOpener = useMemo(() => {
    if (!continuity || continuity.familiarity === "new") return world.amyOpener;
    const avoid = profileId
      ? loadReplyMemory(profileId).lastOpenings
      : undefined;
    return (
      buildContinuityAmyOpener(childName, continuity, continuitySeed, avoid) ??
      world.amyOpener
    );
  }, [childName, continuity, continuitySeed, profileId, world.amyOpener]);

  useEffect(() => {
    if (!profileId || !continuity || continuity.familiarity === "new") return;
    if (rememberedOpener.current) return;
    if (amyOpener === world.amyOpener) return;
    rememberedOpener.current = true;
    rememberReplyOpening(profileId, amyOpener);
  }, [amyOpener, continuity, profileId, world.amyOpener]);

  const qualities = useMemo(
    () => portrait.qualities.map(enrichQuality),
    [portrait.qualities],
  );
  const reminders = useMemo(
    () => portrait.parentingReminders.map(enrichReminder),
    [portrait.parentingReminders],
  );
  const insights = useMemo(
    () =>
      buildCosmicInsightCards({
        childName,
        sunSign: portrait.sunSign,
        moonSign: portrait.moonSign,
        qualities: portrait.qualities,
        amyReflection: portrait.amyReflection,
      }),
    [childName, portrait],
  );
  const beats = useMemo(
    () => storyBeatsFromParagraph(portrait.signatureParagraph).slice(0, 4),
    [portrait.signatureParagraph],
  );

  // Cinematic open sequence
  useEffect(() => {
    if (reducedMotion) {
      setPhase("live");
      setTypedName(childName);
      return;
    }
    const steps: Array<{ at: number; phase: CinemaPhase }> = [
      { at: 120, phase: "stars" },
      { at: 480, phase: "nebula" },
      { at: 980, phase: "amy" },
      { at: 1480, phase: "name" },
      { at: 2200, phase: "story" },
      { at: 2800, phase: "live" },
    ];
    const timers = steps.map(({ at, phase: p }) =>
      window.setTimeout(() => setPhase(p), at),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reducedMotion, childName]);

  // Typewriter name
  useEffect(() => {
    if (reducedMotion) {
      setTypedName(childName);
      return undefined;
    }
    if (phase === "name") {
      setTypedName("");
      let i = 0;
      const id = window.setInterval(() => {
        i += 1;
        setTypedName(childName.slice(0, i));
        if (i >= childName.length) window.clearInterval(id);
      }, 55);
      return () => window.clearInterval(id);
    }
    if (phase === "story" || phase === "live") {
      setTypedName(childName);
    }
    return undefined;
  }, [phase, childName, reducedMotion]);

  // Scroll parallax (throttled via rAF)
  useEffect(() => {
    if (reducedMotion) return;
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const viewH = window.innerHeight || 1;
        const progress = Math.max(-1, Math.min(1, (viewH / 2 - rect.top) / viewH));
        setParallax({ y: progress * 18, stars: progress * 10 });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const sparkMagic = useCallback(
    (id: string, look: AmyLookTarget = "center") => {
      softHaptic(reducedMotion);
      setLookTarget(look);
      setExpandedId((prev) => (prev === id ? null : id));
      if (reducedMotion) return;
      setBurstKey((k) => k + 1);
      setSmileBoost(true);
      setOrbPulse(true);
      window.setTimeout(() => setSmileBoost(false), 1400);
      window.setTimeout(() => setOrbPulse(false), 900);
      window.setTimeout(() => setLookTarget("center"), 2200);
    },
    [reducedMotion],
  );

  const saveMemory = useCallback(async () => {
    softHaptic(reducedMotion);
    setSmileBoost(true);
    setBurstKey((k) => k + 1);
    setOrbPulse(true);
    livingSky?.pulseOrb();
    const text = `${childName}'s Cosmic Portrait\n\n${portrait.signatureSentence}\n\n— AmyNest`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${childName} · Cosmic Portrait`, text });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* user cancelled share */
    }
    setMemorySaved(true);
    onPortraitSaved?.();
    window.setTimeout(() => setSmileBoost(false), 1400);
    window.setTimeout(() => setOrbPulse(false), 900);
  }, [
    childName,
    portrait.signatureSentence,
    reducedMotion,
    onPortraitSaved,
    livingSky,
  ]);

  const stageStyle = {
    ...world.cssVars,
    ...(livingSky?.theme.cssVars ?? {}),
    ["--cp-parallax" as string]: `${parallax.y}px`,
    ["--cp-stars-shift" as string]: `${parallax.stars}px`,
  } as CSSProperties;

  const showAmy = phase !== "void" && phase !== "stars";
  const showName = phase === "name" || phase === "story" || phase === "live";
  const showStory = phase === "story" || phase === "live";
  const showRest = phase === "live";

  return (
    <section
      ref={rootRef}
      className={cn(
        "amy-astro-portrait-stage amy-astro-portrait-story relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6",
        `amy-astro-world-${world.id}`,
        `amy-astro-light-${world.lighting}`,
        phase === "void" && "amy-astro-cinema-void",
        phase !== "void" && "amy-astro-cinema-lit",
      )}
      style={stageStyle}
      aria-label={`${childName}'s cosmic portrait — guided by Amy`}
      data-testid="amy-astro-cosmic-portrait-card"
      data-world={world.id}
      data-cinema-phase={phase}
    >
      {/* Living cosmos with parallax */}
      <div
        className="amy-astro-ambient"
        aria-hidden
        style={{
          transform: reducedMotion
            ? undefined
            : `translate3d(0, calc(var(--cp-parallax, 0px) * 0.35), 0)`,
        }}
      >
        <div
          className={cn(
            "amy-astro-nebula",
            !reducedMotion && phase !== "void" && "amy-astro-nebula-grow",
            !reducedMotion && "amy-astro-camera-drift",
          )}
        />
        <div
          className={cn(
            "amy-astro-starfield",
            phase === "void" && "opacity-0",
            phase !== "void" && "amy-astro-stars-in",
          )}
          style={{
            transform: reducedMotion
              ? undefined
              : `translate3d(0, calc(var(--cp-stars-shift, 0px) * -0.5), 0)`,
          }}
        />
        <div
          className={cn(
            "amy-astro-aurora",
            (phase === "nebula" || showAmy) && "amy-astro-aurora-in",
          )}
        />
        <div className="amy-astro-particle-field" />
      </div>

      {burstKey > 0 && !reducedMotion ? (
        <div
          key={burstKey}
          className="amy-astro-magic-burst pointer-events-none absolute inset-0 z-20"
          aria-hidden
        />
      ) : null}

      {/* Hero story opening */}
      <div className="relative z-10 grid gap-5 sm:grid-cols-[1.05fr_0.95fr] sm:items-center">
        <div className="min-w-0">
          <p
            className={cn(
              "amy-astro-display text-sm leading-relaxed text-[hsl(42_60%_78%/0.9)] transition-opacity duration-700",
              showName ? "opacity-100" : "opacity-0",
            )}
          >
            {amyOpener}
          </p>
          <h2
            className={cn(
              "amy-astro-display amy-astro-gold-text mt-2 min-h-[2.4rem] text-[2rem] leading-[1.15] sm:text-[2.35rem]",
              showName ? "opacity-100" : "opacity-0",
            )}
            aria-label={childName}
          >
            {typedName}
            {showName && typedName.length < childName.length && !reducedMotion ? (
              <span className="amy-astro-type-caret" aria-hidden>
                |
              </span>
            ) : null}
          </h2>
          <p
            className={cn(
              "mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cp-accent)] transition-opacity duration-700",
              showName ? "opacity-80" : "opacity-0",
            )}
          >
            {world.label} · Sun in {portrait.sunSign} · Moon in {portrait.moonSign}
          </p>

          <div
            className={cn(
              "mt-5 transition-all duration-700",
              showStory
                ? "translate-y-0 opacity-100"
                : "translate-y-3 opacity-0",
            )}
            data-testid="amy-astro-signature-insight"
          >
            <p className="amy-astro-display text-[1.08rem] leading-relaxed text-[hsl(40_25%_96%/0.93)]">
              Every child arrives with a unique sky.
            </p>
            <ul className="mt-4 space-y-3">
              {beats.slice(0, 3).map((beat, i) => (
                <li key={`${beat}-${i}`} className="flex gap-3">
                  <PortraitIllustration
                    kind={
                      i === 0
                        ? "moon_hug"
                        : i === 1
                          ? "telescope"
                          : "lantern"
                    }
                    reducedMotion={reducedMotion}
                    className="h-10 w-10"
                  />
                  <span className="amy-astro-display pt-1.5 text-[1rem] leading-relaxed text-[color:var(--cp-warm)]">
                    {/[.!?]$/.test(beat) ? beat : `${beat}.`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className={cn(
            "relative mx-auto w-full max-w-[280px] transition-all duration-1000",
            showAmy
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-8 scale-90 opacity-0",
          )}
        >
          <button
            type="button"
            className="w-full cursor-pointer border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(42_70%_60%)]"
            onClick={() => sparkMagic("amy", "up")}
            aria-label="Meet Amy — tap for a magical moment"
          >
            <AmyAstroCosmicPortrait
              childName={childName}
              reducedMotion={reducedMotion}
              sunSign={portrait.sunSign}
              moonSign={portrait.moonSign}
              smileBoost={smileBoost}
              lookTarget={lookTarget}
              orbPulse={orbPulse}
              playEntranceWave={showAmy && !reducedMotion}
              onOrbTap={() => sparkMagic("orb", "up")}
            />
          </button>
        </div>
      </div>

      {/* Soft constellation divider */}
      <div
        className={cn(
          "amy-astro-constellation-divider relative z-10 my-7",
          showRest ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />

      {/* Signature whisper — floating, not a card stack */}
      <button
        type="button"
        className={cn(
          "amy-astro-float-section amy-astro-ripple relative z-10 w-full text-left transition-all duration-700",
          showRest ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          expandedId === "signature" && "amy-astro-section-expanded",
        )}
        onClick={() => sparkMagic("signature", "left")}
        data-testid="amy-astro-signature-sentence"
      >
        <p className="amy-astro-display text-lg leading-relaxed text-[hsl(40_22%_96%/0.94)]">
          <span className="text-[color:var(--cp-accent)]" aria-hidden>
            ✦{" "}
          </span>
          {portrait.signatureSentence}
        </p>
      </button>

      <div
        className={cn(
          "amy-astro-constellation-divider relative z-10 my-7",
          showRest ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />

      {/* Qualities — floating story beads */}
      <section
        className={cn(
          "relative z-10 transition-all duration-700",
          showRest ? "opacity-100" : "opacity-0",
        )}
        aria-labelledby="cp-qualities-lead"
      >
        <p
          id="cp-qualities-lead"
          className="amy-astro-display text-base text-[hsl(42_65%_80%/0.92)]"
        >
          {world.qualitiesLead}
        </p>
        <ul className="mt-5 space-y-5">
          {qualities.map((q, idx) => {
            const id = `quality-${idx}`;
            const open = expandedId === id;
            return (
              <li key={q.title}>
                <button
                  type="button"
                  className={cn(
                    "amy-astro-float-section amy-astro-ripple w-full text-left",
                    open && "amy-astro-section-expanded",
                  )}
                  onClick={() => sparkMagic(id, idx % 2 === 0 ? "left" : "right")}
                  aria-expanded={open}
                >
                  <div className="flex items-start gap-3.5">
                    <PortraitIllustration
                      kind={illustrationForQuality(q.title)}
                      reducedMotion={reducedMotion}
                    />
                    <div className="min-w-0">
                      <p className="amy-astro-display text-[1.05rem] text-[hsl(42_75%_86%)]">
                        {q.title}
                      </p>
                      <p
                        className={cn(
                          "mt-1.5 text-sm leading-relaxed text-[hsl(40_16%_94%/0.78)] transition-all duration-300",
                          open ? "max-h-40 opacity-100" : "max-h-16 opacity-90",
                        )}
                      >
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div
        className={cn(
          "amy-astro-nebula-separator relative z-10 my-8",
          showRest ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />

      {/* Parenting — Amy speaks beside each */}
      <section
        className={cn(
          "relative z-10 transition-all duration-700",
          showRest ? "opacity-100" : "opacity-0",
        )}
        aria-labelledby="cp-reminders-lead"
      >
        <p
          id="cp-reminders-lead"
          className="amy-astro-display text-base text-[hsl(42_65%_80%/0.92)]"
        >
          {world.remindersLead}
        </p>
        <ol className="mt-5 space-y-6">
          {reminders.map((r, idx) => {
            const id = `reminder-${idx}`;
            const open = expandedId === id;
            return (
              <li key={r.headline} className="relative">
                <button
                  type="button"
                  className={cn(
                    "amy-astro-float-section amy-astro-ripple w-full text-left",
                    open && "amy-astro-section-expanded",
                  )}
                  onClick={() => sparkMagic(id, "right")}
                  aria-expanded={open}
                >
                  <div className="flex items-start gap-3.5">
                    <PortraitIllustration
                      kind={illustrationForReminder(r.headline)}
                      reducedMotion={reducedMotion}
                    />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--cp-accent)] opacity-80">
                        Amy whispers
                      </p>
                      <p className="amy-astro-display mt-1 text-[1.02rem] text-[hsl(40_22%_96%/0.95)]">
                        {r.headline}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-[hsl(40_16%_94%/0.76)]">
                        {r.explanation}
                      </p>
                      {open ? (
                        <p className="mt-2 text-xs leading-relaxed text-[hsl(42_55%_74%/0.88)]">
                          Why this matters: {r.whyItMatters}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <div
        className={cn(
          "amy-astro-constellation-divider relative z-10 my-7",
          showRest ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />

      {/* Cosmic insights as floating story orbs */}
      <section
        className={cn(
          "relative z-10 transition-all duration-700",
          showRest ? "opacity-100" : "opacity-0",
        )}
        aria-labelledby="cp-insights-lead"
      >
        <p
          id="cp-insights-lead"
          className="amy-astro-display text-base text-[hsl(42_65%_80%/0.92)]"
        >
          {world.insightsLead}
        </p>
        <div
          className="amy-astro-insight-rail mt-4 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
        >
          {insights.map((card) => (
            <button
              key={card.id}
              type="button"
              role="listitem"
              className={cn(
                "amy-astro-float-section amy-astro-ripple w-[min(70vw,210px)] shrink-0 text-left",
                expandedId === card.id && "amy-astro-section-expanded",
              )}
              onClick={() => sparkMagic(card.id, "right")}
              aria-expanded={expandedId === card.id}
            >
              <PortraitIllustration
                kind={
                  card.id === "emotion"
                    ? "moon_hug"
                    : card.id === "learning"
                      ? "telescope"
                      : card.id === "social"
                        ? "lantern"
                        : card.id === "curiosity"
                          ? "constellation_brush"
                          : "sleeping_moon"
                }
                reducedMotion={reducedMotion}
                className="h-11 w-11"
              />
              <p className="amy-astro-display mt-3 text-sm text-[hsl(42_75%_84%)]">
                {card.title}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[hsl(40_16%_94%/0.74)]">
                {card.body}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Soft sky note — whispered, not a panel */}
      <p
        className={cn(
          "relative z-10 mt-8 text-center text-xs leading-relaxed text-[hsl(40_16%_94%/0.42)] transition-opacity duration-700",
          showRest ? "opacity-100" : "opacity-0",
        )}
      >
        {portrait.currentSkyInfluence}
      </p>

      {/* Ending — Amy, not cards */}
      <footer
        className={cn(
          "relative z-10 mt-10 flex flex-col items-center text-center transition-all duration-1000",
          showRest ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        )}
      >
        <div className="amy-astro-ending-glow pointer-events-none absolute inset-x-0 -top-8 h-40" aria-hidden />
        <div className="relative w-36">
          <AmyAstroCosmicPortrait
            childName={childName}
            reducedMotion={reducedMotion}
            sunSign={portrait.sunSign}
            moonSign={portrait.moonSign}
            smileBoost={smileBoost || (showRest && !reducedMotion)}
            lookTarget="center"
            orbPulse={false}
            playEntranceWave={false}
            className="max-w-[140px]"
          />
        </div>
        <p className="amy-astro-display mt-4 max-w-md text-lg leading-relaxed text-[hsl(40_22%_96%/0.94)]">
          {world.closingLine}
        </p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[hsl(275_40%_82%/0.72)]">
          {portrait.amyReflection}
        </p>
        <p className="amy-astro-gold-text amy-astro-display mt-3 text-base">
          Your steady love is their safest launchpad.
        </p>

        <div className="mt-6 flex w-full max-w-md flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            className="amy-astro-ripple flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-[hsl(42_50%_60%/0.28)] bg-[hsl(275_40%_22%/0.45)] px-2 text-sm font-semibold"
            onClick={() => void saveMemory()}
            data-testid="amy-astro-portrait-save-memory"
          >
            <AmyAstroIcon
              name="save_heart"
              size={28}
              reducedMotion={reducedMotion}
              title="Save"
            />
            {memorySaved ? "Memory saved" : "Save Memory"}
          </button>
          {onAskAmy ? (
            <button
              type="button"
              className="amy-astro-ripple flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] px-2 text-sm font-semibold"
              onClick={onAskAmy}
              data-testid="amy-astro-portrait-ask-amy"
            >
              <AmyAstroIcon
                name="ask_amy"
                size={28}
                reducedMotion={reducedMotion}
                title="Ask Amy"
              />
              Ask Amy
            </button>
          ) : null}
          {onContinue ? (
            <button
              type="button"
              className="amy-astro-ripple flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[hsl(275_55%_42%)] to-[hsl(42_55%_40%)] px-2 text-sm font-semibold text-white shadow-[0_8px_28px_hsl(275_60%_30%/0.4)]"
              onClick={onContinue}
              data-testid="amy-astro-portrait-continue"
            >
              <AmyAstroIcon
                name="continue_moon"
                size={28}
                reducedMotion={reducedMotion}
                title="Continue"
              />
              Continue Journey
            </button>
          ) : null}
        </div>

        <p className="mt-5 text-[11px] text-[hsl(40_16%_94%/0.45)]">
          Guided by stars. Inspired by love. Built for your child. · AmyNest✦
        </p>
        <p className="mt-2 max-w-md text-[10px] leading-snug text-[hsl(40_20%_96%/0.32)]">
          {AMY_ASTRO_DISCLAIMER}
        </p>
      </footer>
    </section>
  );
}
