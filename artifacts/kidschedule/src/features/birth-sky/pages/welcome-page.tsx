/**
 * Welcome — Birth Sky living opening (Understand room).
 * Emotional experience: understanding — not astrology software.
 * Engines / calculations untouched. Legacy kill-switch available.
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLink } from "@/components/app-link";
import { BirthSkyModuleShell } from "../components/birth-sky-module-shell";
import { AmyAstroEmblem } from "../components/amy-astro-emblem";
import { trackBirthSkyEvent } from "../lib/analytics";
import {
  AMY_ASTRO_DISCLAIMER,
  AMY_ASTRO_PRODUCT_NAME,
  AMY_ASTRO_SUBLINE,
  AMY_ASTRO_TAGLINE,
} from "../lib/branding";
import {
  BIRTH_SKY_QUIET_PATHS,
  birthSkyLivingOpen,
  isBirthSkyLivingV1Enabled,
  recommendBirthSkyAction,
} from "@/lib/birth-sky/living-room";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { buildParentingHubDeepLink } from "@/lib/hub-activity-cross-link";
import "@/pages/first-experience-material.css";
import "@/components/birth-sky/birth-sky-living-room.css";
import "../design/amy-astro.css";

type WelcomePageProps = {
  childFirstName?: string;
  onBegin: () => void;
  onNotNow: () => void;
  onBack: () => void;
};

const TRUST_CHIPS = ["Precise", "Optional", "Parent-only", "Not a prediction"] as const;
const UNDERSTAND_MEMORY = ROOM_HEROES.understand;

export function BirthSkyWelcomePage({
  childFirstName,
  onBegin,
  onNotNow,
  onBack,
}: WelcomePageProps) {
  const { t } = useTranslation();
  const living = isBirthSkyLivingV1Enabled();
  const recommend = recommendBirthSkyAction();
  const understandHref = buildParentingHubDeepLink("birth-sky");
  const childName =
    childFirstName?.trim() ||
    t("parent_hub.journey.your_child", { defaultValue: "your child" });
  const livingOpen = birthSkyLivingOpen(childName);

  useEffect(() => {
    trackBirthSkyEvent("birth_sky.welcome_viewed", { referrer: "parenting_hub" });
  }, []);

  const begin = () => {
    trackBirthSkyEvent("birth_sky.setup_started", { referrer: "parenting_hub" });
    onBegin();
  };

  if (living) {
    return (
      <div
        className="fe-shell birth-sky-living"
        data-testid="birth-sky-welcome"
        data-ph-pack="birth-sky-2"
        data-fe-shot={UNDERSTAND_MEMORY.shot}
        data-fe-room="reveal"
        data-fe-presence="settle"
      >
        <div className="fe-ambient" aria-hidden="true">
          <img
            src={UNDERSTAND_MEMORY.src}
            alt=""
            decoding="async"
            loading="lazy"
            fetchPriority="low"
          />
          <div className="fe-ambient-wash" />
        </div>
        <div className="fe-breath fe-breath-a" aria-hidden="true" />
        <div className="fe-breath fe-breath-b" aria-hidden="true" />
        <div className="fe-living-shade" aria-hidden="true" />

        <div className="bs-living-content">
          <button
            type="button"
            className="bs-back"
            data-testid="birth-sky-back-understand"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("parent_hub.rooms.understand.title", { defaultValue: "Understand" })}
          </button>

          <div className="bs-living-surface" data-testid="birth-sky-living-surface">
            <header className="bs-today-hero" data-testid="birth-sky-today-hero">
              <div
                className="fe-memory-mount bs-today-memory"
                data-testid="birth-sky-visual-memory"
                data-fe-shot={UNDERSTAND_MEMORY.shot}
              >
                <div className="fe-memory-spill" aria-hidden="true" />
                <div className="fe-memory">
                  <img
                    src={UNDERSTAND_MEMORY.src}
                    alt={UNDERSTAND_MEMORY.alt}
                    draggable={false}
                    decoding="async"
                    fetchPriority="high"
                  />
                  <div className="fe-memory-veil" aria-hidden="true" />
                  <div className="fe-memory-glass" aria-hidden="true" />
                  <div className="fe-memory-grain" aria-hidden="true" />
                  <div className="bs-today-readability" aria-hidden="true" />
                  <div className="bs-today-copy">
                    <p className="bs-today-eyebrow">
                      {t("birth_sky.living.eyebrow", {
                        defaultValue: livingOpen.eyebrow,
                      })}
                    </p>
                    <h1 className="bs-today-title">
                      {t("birth_sky.living.title", {
                        name: childName,
                        defaultValue: livingOpen.title,
                      })}
                    </h1>
                    <p className="bs-today-purpose">
                      {t("birth_sky.living.companionship", {
                        name: childName,
                        defaultValue: livingOpen.companionship,
                      })}
                    </p>
                    <p className="bs-today-purpose bs-today-purpose-soft">
                      {t("birth_sky.living.purpose", {
                        defaultValue: livingOpen.purpose,
                      })}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="bs-recommend-btn"
                data-testid="birth-sky-begin"
                onClick={begin}
              >
                <span className="bs-recommend-cue">{recommend.label}</span>
                <span className="bs-recommend-title">{recommend.title}</span>
                <span className="bs-recommend-purpose">{recommend.purpose}</span>
              </button>
            </header>

            <div className="bs-quiet-band">
              <p className="bs-quiet-label">
                {t("birth_sky.living.quiet_paths", {
                  defaultValue: "Quiet understanding paths",
                })}
              </p>
              <div className="bs-quiet-list" data-testid="birth-sky-quiet-paths">
                {BIRTH_SKY_QUIET_PATHS.map((path) => (
                  <button
                    key={path.id}
                    type="button"
                    className="bs-quiet-path"
                    data-testid={`birth-sky-quiet-${path.id}`}
                    onClick={begin}
                  >
                    <span className="bs-quiet-path-title">{path.title}</span>
                    <span className="bs-quiet-path-purpose">{path.purpose}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bs-more-body mt-2">
            <div className="rounded-[1.05rem] border border-[rgba(232,212,184,0.14)] bg-[rgba(8,6,12,0.45)] p-4 text-sm leading-relaxed text-[rgba(244,238,230,0.86)]">
              {AMY_ASTRO_DISCLAIMER} Not medical advice, and not career or marriage prediction.
            </div>
          </div>

          <button
            type="button"
            className="bs-more-toggle"
            data-testid="birth-sky-not-now"
            onClick={onNotNow}
          >
            {t("birth_sky.living.not_now", { defaultValue: "Not now" })}
          </button>

          <p className="bs-support-note">{PREMIUM_VOICE.invitation}</p>
          <AppLink href={understandHref} source="birth-sky-exit-understand">
            <span className="bs-exit-home" data-testid="birth-sky-exit-understand">
              {t("birth_sky.living.exit_room", {
                defaultValue: "Back to Understand",
              })}
            </span>
          </AppLink>
          <AppLink href="/dashboard" source="birth-sky-exit-home">
            <span className="bs-exit-home" data-testid="birth-sky-exit-home">
              {t("birth_sky.living.exit_home", {
                defaultValue: "Back to Today Home",
              })}
            </span>
          </AppLink>
        </div>
      </div>
    );
  }

  const title = childFirstName
    ? `${childFirstName}'s cosmic blueprint`
    : "Your child's cosmic blueprint";

  return (
    <BirthSkyModuleShell
      title={AMY_ASTRO_PRODUCT_NAME}
      onBack={onBack}
      testId="birth-sky-welcome"
      ambientIntensity="full"
    >
      <div className="amy-astro-enter flex flex-col items-center pt-2 text-center">
        <AmyAstroEmblem size={168} />
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.28em] text-[hsl(42_60%_70%/0.75)]">
          {AMY_ASTRO_PRODUCT_NAME}
        </p>
        <h2 className="amy-astro-display amy-astro-gold-text amy-astro-hero-title mt-2 max-w-full px-2 text-[clamp(1.35rem,5.6vw,1.85rem)] font-semibold leading-snug">
          {title}
        </h2>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[hsl(40_20%_96%/0.45)]">
          {AMY_ASTRO_TAGLINE}
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">
          {AMY_ASTRO_SUBLINE}
        </p>

        <ul
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
          aria-label="Trust"
        >
          {TRUST_CHIPS.map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-[hsl(42_50%_60%/0.28)] bg-white/5 px-3 py-1 text-xs font-semibold text-[hsl(40_20%_96%/0.85)]"
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>

      <section className="mt-8 space-y-3" aria-labelledby="amy-astro-what-is">
        <h3
          id="amy-astro-what-is"
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(42_60%_70%/0.65)]"
        >
          Inside the experience
        </h3>
        {[
          {
            t: "Immersive sky",
            d: "A living map of the sky from their birth details — motion, depth, calm wonder.",
          },
          {
            t: "Kundli & deep insights",
            d: "Animated chart literacy plus long-form intelligence — clearly labeled, never fate.",
          },
          {
            t: "Ask Amy About Their Sky",
            d: "A trusted guide who already knows this sky — reflective counsel for parents, never fate.",
          },
        ].map((card, i) => (
          <div
            key={card.t}
            className={`amy-astro-glass amy-astro-card amy-astro-enter rounded-2xl text-left ${i === 1 ? "amy-astro-enter-delay-1" : ""} ${i === 2 ? "amy-astro-enter-delay-2" : ""}`}
          >
            <p className="text-sm font-bold text-[hsl(42_70%_78%)]">{card.t}</p>
            <p className="mt-1 text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">{card.d}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 space-y-2" aria-labelledby="amy-astro-what-isnt">
        <h3
          id="amy-astro-what-isnt"
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(42_60%_70%/0.65)]"
        >
          What this isn’t
        </h3>
        <div className="amy-astro-glass amy-astro-card rounded-2xl text-left text-sm leading-relaxed text-[hsl(40_20%_96%/0.78)]">
          Not fate, not medical advice, and not career or marriage prediction.{" "}
          {AMY_ASTRO_DISCLAIMER}
        </div>
      </section>

      <div className="amy-astro-cta-stack mt-10 flex flex-col items-stretch gap-4">
        <Button
          type="button"
          className="amy-astro-btn-premium relative z-[1] min-h-12 w-full rounded-xl bg-gradient-to-r from-[hsl(275_50%_38%)] to-[hsl(42_55%_38%)] text-base font-semibold text-white shadow-[0_0_28px_hsl(275_70%_40%/0.35)]"
          onClick={begin}
          data-testid="birth-sky-begin"
        >
          Begin the journey
        </Button>
        <button
          type="button"
          className="amy-astro-btn-text relative z-0 min-h-11 w-full rounded-xl px-3 text-sm font-medium text-[hsl(40_20%_96%/0.78)] transition-colors hover:bg-white/[0.06] hover:text-[hsl(40_20%_96%/0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(42_70%_65%/0.55)]"
          onClick={onNotNow}
          data-testid="birth-sky-not-now"
        >
          Not now
        </button>
      </div>
    </BirthSkyModuleShell>
  );
}
