/**
 * Isolated Parent Hub content modules for viewport certification.
 * Open: /playwright-hub-content.html?module=coloring|worksheets|stories|reels
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import "../index.css";
import "../i18n";
import { ColoringBooks } from "@/components/coloring-books";
import { PrintableWorksheets } from "@/components/printable-worksheets";
import { StoryHub } from "@/components/story-hub";
import { ArtCraftReels } from "@/components/art-craft-reels";
import {
  AuthContext,
  type AuthContextValue,
} from "@/lib/firebase-auth-context";

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

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const params = new URLSearchParams(window.location.search);
const moduleId = params.get("module") ?? "coloring";
const childId = Number(params.get("childId") ?? "2");
const childName = params.get("childName") ?? "Devan";
const childAgeMonths = Number(params.get("ageMonths") ?? "36");

function Module() {
  if (moduleId === "worksheets") {
    return <PrintableWorksheets childId={childId} childAgeMonths={childAgeMonths} />;
  }
  if (moduleId === "stories") {
    return <StoryHub childId={childId} childName={childName} />;
  }
  if (moduleId === "reels") {
    return <ArtCraftReels />;
  }
  return <ColoringBooks childId={childId} childName={childName} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={stubAuth}>
        <Router hook={() => ["/parenting-hub", () => {}]}>
          <div
            className="amynest-content-column p-4"
            data-testid="hub-content-cert-fixture"
            data-module={moduleId}
          >
            <Module />
          </div>
        </Router>
      </AuthContext.Provider>
    </QueryClientProvider>
  </StrictMode>,
);
