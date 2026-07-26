/**
 * Visual Identity sprint fixture — emblem, portrait, chapter previews (no auth).
 */
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { AmyAstroEmblem } from "@/features/birth-sky/components/amy-astro-emblem";
import { AmyAstroCosmicPortrait } from "@/features/birth-sky/components/cosmic-portrait";
import { AmyAstroCosmicPortraitCard } from "@/features/birth-sky/components/cosmic-portrait-card";
import { AmyAstroInsightsPanel } from "@/features/birth-sky/pages/dashboard/insights-panel";
import { buildCosmicPortrait } from "@/features/birth-sky/lib/signature-insight";
import "@/features/birth-sky/design/amy-astro.css";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") ?? "all";
const childName = params.get("name") ?? "John";

function Shell({ children, testId }: { children: ReactNode; testId: string }) {
  return (
    <div
      className="amy-astro-root min-h-screen bg-[radial-gradient(ellipse_at_top,hsl(275_45%_18%),hsl(230_50%_8%)_55%,hsl(228_60%_4%))] px-4 py-8 text-[hsl(40_20%_96%)]"
      data-testid={testId}
    >
      {children}
    </div>
  );
}

function Fixture() {
  if (mode === "emblem") {
    return (
      <Shell testId="amy-astro-visual-emblem">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-6 pt-16">
          <AmyAstroEmblem size={96} />
          <p className="amy-astro-display text-2xl text-[hsl(42_70%_78%)]">Placing the Moon…</p>
          <p className="text-xs uppercase tracking-[0.2em] text-[hsl(40_20%_96%/0.55)]">
            Deep space is listening…
          </p>
          <div className="mt-4 flex items-end gap-4">
            <AmyAstroEmblem size={24} interactive={false} />
            <AmyAstroEmblem size={40} interactive={false} />
            <AmyAstroEmblem size={64} interactive={false} />
          </div>
        </div>
      </Shell>
    );
  }

  if (mode === "portrait") {
    const portrait = buildCosmicPortrait({
      childName,
      sunSign: "Cancer",
      moonSign: "Sagittarius",
      moonPhaseLabel: "Waxing Crescent",
      risingSign: null,
      daySky: true,
    });
    return (
      <Shell testId="amy-astro-visual-portrait">
        <div className="mx-auto max-w-lg">
          <AmyAstroCosmicPortraitCard childName={childName} portrait={portrait} />
        </div>
      </Shell>
    );
  }

  if (mode === "chapters") {
    return (
      <Shell testId="amy-astro-visual-chapters">
        <div className="mx-auto max-w-lg">
          <AmyAstroInsightsPanel
            childName={childName}
            sunSign="Aries"
            moonSign="Libra"
            risingSign={null}
            moonPhaseLabel="Full Moon"
            daySky
          />
        </div>
      </Shell>
    );
  }

  return (
    <Shell testId="amy-astro-visual-all">
      <div className="mx-auto flex max-w-lg flex-col gap-10">
        <div className="flex flex-col items-center gap-3" data-testid="amy-astro-visual-emblem-block">
          <AmyAstroEmblem size={88} />
          <p className="amy-astro-display text-xl text-[hsl(42_70%_78%)]">Amy Astro Intelligence</p>
        </div>
        <div data-testid="amy-astro-visual-portrait-block">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(42_60%_70%/0.75)]">
            My Child&apos;s Cosmic Portrait
          </p>
          <h2 className="amy-astro-display mt-1 text-2xl text-[hsl(42_70%_78%)]">{childName}</h2>
          <AmyAstroCosmicPortrait childName={childName} className="mt-3" />
        </div>
        <AmyAstroInsightsPanel
          childName={childName}
          sunSign="Aries"
          moonSign="Libra"
          risingSign={null}
          moonPhaseLabel="Full Moon"
          daySky
        />
      </div>
    </Shell>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
