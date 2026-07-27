/**
 * Layout polish fixture — hub tile + welcome CTAs (no auth / onboarding).
 * Open: /playwright-amy-astro-ui-polish.html?name=Yuhira
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { AMY_ASTRO_LAUNCH_VISUAL } from "@/lib/amy-astro-card-config";
import { BirthSkyWelcomePage } from "@/features/birth-sky/pages/welcome-page";
import "@/features/birth-sky/design/amy-astro.css";

const params = new URLSearchParams(window.location.search);
const childName = params.get("name") ?? "Yuhira";
const panel = params.get("panel") ?? "all";

function Fixture() {
  return (
    <div className="min-h-screen bg-[hsl(222_47%_11%)] text-white">
      {(panel === "all" || panel === "tile") && (
        <section className="mx-auto max-w-md space-y-3 px-4 py-6" data-testid="amy-astro-polish-tile">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Hub tile · {childName}
          </p>
          <div className="amy-astro-launch-card">
            <HubPremiumFeatureCard
              visual={AMY_ASTRO_LAUNCH_VISUAL}
              title="Amy Astro Intelligence"
              description="Your child's cosmic portrait · Birth Sky · Soft parenting insights"
              previewBadge="Explore Free"
              tryFree
              showTryFreeBadge
              className="amy-astro-launch-card"
            />
          </div>
          {/* Narrow viewport stress */}
          <div className="mx-auto w-[320px]">
            <HubPremiumFeatureCard
              visual={AMY_ASTRO_LAUNCH_VISUAL}
              title="Amy Astro Intelligence"
              description="Your child's cosmic portrait · Birth Sky · Soft parenting insights"
              previewBadge="Explore Free"
              tryFree
              showTryFreeBadge
              className="amy-astro-launch-card"
            />
          </div>
        </section>
      )}

      {(panel === "all" || panel === "welcome") && (
        <section data-testid="amy-astro-polish-welcome">
          <BirthSkyWelcomePage
            childFirstName={childName}
            onBegin={() => undefined}
            onNotNow={() => undefined}
            onBack={() => undefined}
          />
        </section>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
