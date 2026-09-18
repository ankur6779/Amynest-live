/**
 * Visual Identity sprint fixture — emblem, portrait, chapter previews (no auth).
 */
import { StrictMode, useMemo, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "../i18n";
import { AmyAstroEmblem } from "@/features/birth-sky/components/amy-astro-emblem";
import { AmyAstroCosmicPortrait } from "@/features/birth-sky/components/cosmic-portrait";
import { AmyAstroCosmicPortraitCard } from "@/features/birth-sky/components/cosmic-portrait-card";
import { AmyAstroInsightsPanel } from "@/features/birth-sky/pages/dashboard/insights-panel";
import { buildCosmicPortrait } from "@/features/birth-sky/lib/signature-insight";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { AMY_ASTRO_LAUNCH_VISUAL } from "@/lib/amy-astro-card-config";
import "@/features/birth-sky/design/amy-astro.css";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") ?? "all";
const childName = params.get("name") ?? "John";
const startAtHub = params.get("from") === "hub";

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
          <AmyAstroCosmicPortraitCard
            childName={childName}
            portrait={portrait}
            reducedMotion
          />
        </div>
      </Shell>
    );
  }

  if (mode === "layout") {
    return <AstronomyLayoutFixture initialName={childName} startAtHub={startAtHub} />;
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

const LAYOUT_CHILDREN = ["Child 1", "Child 2", "Child 3"] as const;

function AstronomyLayoutFixture({
  initialName,
  startAtHub,
}: {
  initialName: string;
  startAtHub: boolean;
}) {
  const start = LAYOUT_CHILDREN.includes(initialName as (typeof LAYOUT_CHILDREN)[number])
    ? initialName
    : "Child 2";
  const [name, setName] = useState(start);
  const [view, setView] = useState<"portrait" | "home" | "hub">(startAtHub ? "hub" : "portrait");
  const portrait = useMemo(
    () =>
      buildCosmicPortrait({
        childName: name,
        sunSign: "Cancer",
        moonSign: "Sagittarius",
        moonPhaseLabel: "Waxing Gibbous",
        risingSign: "Cancer",
        daySky: false,
      }),
    [name],
  );

  if (view === "home") {
    return (
      <div className="min-h-screen bg-[hsl(228_48%_5%)] p-6 text-white" data-testid="amy-astro-layout-home">
        <p>Returned from Amy Astronomy</p>
        <button type="button" onClick={() => setView("portrait")}>
          Open Astronomy
        </button>
      </div>
    );
  }

  if (view === "hub") {
    return (
      <div
        className="min-h-screen bg-[hsl(222_47%_11%)] px-4 py-6 text-white"
        data-testid="amy-astro-layout-hub"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">
          Parent Hub · Understand
        </p>
        <div className="mx-auto w-full max-w-md">
          <button
            type="button"
            className="amy-astro-launch-card block h-full w-full overflow-visible rounded-[30px] p-0 text-left"
            data-testid="amy-astro-hub-tile"
            aria-label="Amy Astro Intelligence. Your child's cosmic portrait"
            onClick={() => setView("portrait")}
          >
            <HubPremiumFeatureCard
              visual={AMY_ASTRO_LAUNCH_VISUAL}
              title="Amy Astro Intelligence"
              description="Your child's cosmic portrait · Birth Sky · Soft parenting insights"
              previewBadge="Explore Free"
              tryFree
              showTryFreeBadge
              className="amy-astro-launch-card"
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="amy-astro-root min-h-screen bg-[hsl(228_48%_5%)] text-[hsl(40_20%_96%)] has-tabbar">
      <header
        data-testid="mock-app-header"
        className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-white/10 bg-[hsl(228_48%_6%/0.92)] px-3"
      >
        <button
          type="button"
          data-testid="birth-sky-back"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full"
          aria-label="Back"
          onClick={() => setView("home")}
        >
          ←
        </button>
        <p className="font-semibold">AmyNest AI</p>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom,0px)+var(--amynest-module-end-gap,2.75rem))] pt-3">
        <div className="mb-3 flex flex-wrap gap-2" data-testid="amy-astro-child-switcher">
          {LAYOUT_CHILDREN.map((child) => (
            <button
              key={child}
              type="button"
              data-testid={`amy-astro-switch-${child.replace(/\s+/g, "-").toLowerCase()}`}
              className="min-h-11 rounded-full border border-white/20 px-3 text-sm"
              onClick={() => setName(child)}
            >
              {child}
            </button>
          ))}
        </div>
        <AmyAstroCosmicPortraitCard
          key={name}
          childName={name}
          portrait={portrait}
          reducedMotion
          profileId={name}
          onAskAmy={() => undefined}
          onContinue={() => undefined}
        />
      </main>

      <footer
        data-testid="mock-tabbar"
        className="app-footer tabbar"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: 72,
          zIndex: 40,
          background: "rgba(12,10,20,0.96)",
        }}
      >
        <nav className="flex h-full items-center justify-around text-[11px]" aria-label="Bottom navigation">
          <span>Home</span>
          <span>Today</span>
          <span>Beside you</span>
          <span>Rooms</span>
        </nav>
        <div
          id="amy-fab-floating"
          data-testid="mock-amy-fab"
          className="amy-fab-floating amy-fab-in-footer"
          style={{
            position: "absolute",
            right: 10,
            bottom: "calc(100% + 8px)",
            zIndex: 2001,
          }}
          aria-label="Ask Amy AI"
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: 9999,
              background: "#f97316",
            }}
          />
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
