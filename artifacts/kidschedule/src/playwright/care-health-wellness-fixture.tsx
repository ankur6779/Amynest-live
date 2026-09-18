/**
 * Care → Health & Wellness isolated fixture.
 * Open: /playwright-care-health-wellness.html
 *
 * Mounts the real Care living stream + Health Lab zone with tab bar / Ask Amy
 * chrome so layout, routing, and game launch can be audited without Firebase.
 */
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "../index.css";
import "../i18n";
import { ThemeProvider } from "@/contexts/theme-context";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { RoomLivingStream } from "@/components/parent-hub/room-living-stream";
import { HealthLabZone } from "@/features/health-lab/components/health-lab-zone";
import { HealthLabStaticFreePreview } from "@/components/health-lab/health-lab-static-free-preview";
import {
  AuthContext,
  type AuthContextValue,
} from "@/lib/firebase-auth-context";
import { isInfantCareAge } from "@/lib/parent-hub/eligibility";
import {
  HEALTH_LAB_MAX_AGE_MONTHS,
  isHealthLabPreviewAge,
} from "@/lib/hub-visibility";
import { syncAmynestLivingUniverseDocumentClass } from "@/lib/amynest-living-universe";
import { HEALTH_LAB_QUIET_PATHS } from "@/lib/health-lab/living-room";

const stubAuth: AuthContextValue = {
  user: {
    id: "playwright_user",
    uid: "playwright_user",
    firstName: "Playwright",
    lastName: null,
    fullName: "Playwright",
    imageUrl: null,
    emailAddresses: [],
    primaryEmailAddress: null,
    primaryPhoneNumber: null,
    setProfileImage: async () => {},
  },
  isLoaded: true,
  authStatus: "authenticated",
  getToken: async () => "playwright-token",
  signOut: async () => {},
  addListener: () => () => {},
};

const CHILDREN = [
  { id: 1, name: "Aria", ageMonths: 8 },
  { id: 2, name: "Devan", ageMonths: 36 },
  { id: 3, name: "Kai Montgomery-Anastasia", ageMonths: 72 },
  { id: 4, name: "Teen", ageMonths: 168 },
] as const;

const VISIBLE_TILES = ["infant-hub", "nutrition", "health-lab"] as const;

type Surface = "care" | "health-lab";

function Fixture() {
  const params = new URLSearchParams(window.location.search);
  const initialChild = Number(params.get("child") ?? "2");
  const entitlementDenied = params.get("entitlement") === "deny";
  const [childId, setChildId] = useState(
    CHILDREN.some((c) => c.id === initialChild) ? initialChild : 2,
  );
  const [surface, setSurface] = useState<Surface>(
    params.get("surface") === "health-lab" ? "health-lab" : "care",
  );
  const [loc, setLoc] = useState("/parenting-hub");
  const navigate = (to: string) => {
    const path = to.split("#")[0] ?? to;
    setLoc(to);
    if (path.startsWith("/parenting-hub") || path.startsWith("/dashboard")) {
      setSurface("care");
    }
  };
  const child = CHILDREN.find((c) => c.id === childId) ?? CHILDREN[1];
  const isInfant = isInfantCareAge(child.ageMonths);
  const preview = isHealthLabPreviewAge(child.ageMonths);
  const tooOld = child.ageMonths >= HEALTH_LAB_MAX_AGE_MONTHS;
  const visibleTileIds = useMemo(
    () =>
      VISIBLE_TILES.filter((id) => (id === "infant-hub" ? isInfant : true)),
    [isInfant],
  );

  useEffect(() => {
    document.documentElement.classList.add("amynest-living-universe");
    document.body.classList.add("amynest-living-universe", "has-tabbar");
    syncAmynestLivingUniverseDocumentClass();
  }, []);

  const openHealth = () => setSurface("health-lab");
  const backToCare = () => setSurface("care");

  return (
    <Router hook={() => [loc, navigate]}>
      <div
        className="app-shell main-container relative w-full max-w-full min-w-0 overflow-x-clip box-border min-h-screen"
        data-testid="care-wellness-fixture"
        data-child-id={String(child.id)}
        data-age-months={String(child.ageMonths)}
        data-surface={surface}
        data-entitlement={entitlementDenied ? "deny" : "allow"}
      >
        <header
          className="flex min-w-0 max-w-full flex-wrap gap-2 px-3 pt-3 pb-2"
          data-testid="care-wellness-child-picker"
        >
          {CHILDREN.map((entry) => (
            <button
              key={entry.id}
              type="button"
              data-testid={`care-wellness-child-${entry.id}`}
              data-active={entry.id === child.id ? "true" : "false"}
              className="ph-quiet-child-chip max-w-full"
              onClick={() => {
                setChildId(entry.id);
                setSurface("care");
              }}
            >
              {entry.name}
            </button>
          ))}
        </header>

        <main className="app-tabbar-content-clearance min-w-0 max-w-full px-3">
          {surface === "care" ? (
            <RoomLivingStream
              key={child.id}
              room="care"
              childName={child.name}
              isInfant={isInfant}
              ageMonths={child.ageMonths}
              visibleTileIds={visibleTileIds}
              onSelectTile={(tileId) => {
                if (tileId === "health-lab") openHealth();
              }}
            />
          ) : entitlementDenied ? (
            <div data-testid="care-wellness-health-lab-denied">
              <HealthLabStaticFreePreview />
            </div>
          ) : preview ? (
            <div data-testid="health-lab-preview-living" className="space-y-3 p-3">
              <button type="button" className="hl-back" onClick={backToCare}>
                Care
              </button>
              <p>Preview Care wellness for {child.name}</p>
              <p>Wellness practices open from 24 months.</p>
            </div>
          ) : tooOld ? (
            <div data-testid="health-lab-age-empty" className="space-y-3 p-3">
              <button type="button" className="hl-back" onClick={backToCare}>
                Care
              </button>
              <p>Wellness care is available for children up to age 12. Add or select an eligible child.</p>
            </div>
          ) : (
            <div data-testid="care-wellness-health-lab">
              <HealthLabZone
                key={child.id}
                childId={child.id}
                childName={child.name}
              />
            </div>
          )}
          <p className="sr-only" data-testid="care-wellness-path-count">
            {HEALTH_LAB_QUIET_PATHS.length}
          </p>
        </main>

        <MobileTabBar visible />
      </div>
    </Router>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthContext.Provider value={stubAuth}>
        <Fixture />
      </AuthContext.Provider>
    </ThemeProvider>
  </StrictMode>,
);
