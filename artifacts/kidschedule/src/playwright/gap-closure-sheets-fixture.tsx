/**
 * Isolated remaining 85vh dialog/sheet surfaces.
 * Open: /playwright-gap-closure-sheets.html?sheet=subscription|country|curriculum|recipe|task-check
 */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../index.css";
import "../i18n";
import { SubscriptionMomentSheet } from "@/components/subscription-moment-sheet";
import { OnboardingCountryModal } from "@/components/onboarding-country-modal";
import { CurriculumExplorerSheet } from "@/components/study-curriculum-visibility";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const params = new URLSearchParams(window.location.search);
const sheet = params.get("sheet") ?? "subscription";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
];

function RecipeDialog() {
  return (
    <Dialog open>
      <DialogContent
        className="rounded-2xl max-w-lg max-h-[min(90dvh,var(--app-dialog-max-height,90dvh))] overflow-y-auto"
        data-testid="routine-recipe-dialog"
      >
        <DialogHeader>
          <DialogTitle>Lunch recipe</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {Array.from({ length: 18 }, (_, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              Step {i + 1}: keep the close control reachable while the body scrolls.
            </p>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskCheckSheet() {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div
        className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border max-h-[var(--app-sheet-max-height,92dvh)] flex flex-col"
        data-testid="routine-task-check-sheet"
      >
        <div className="rounded-t-3xl p-5 shrink-0 border-b">
          <p className="font-bold text-lg">Morning check-in</p>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {Array.from({ length: 16 }, (_, i) => (
            <p key={i} className="text-sm">
              Activity {i + 1} already happened?
            </p>
          ))}
        </div>
        <div className="p-5 pt-0 shrink-0">
          <button type="button" className="w-full rounded-full h-12 font-bold border" data-testid="routine-task-check-save">
            Save and view routine
          </button>
        </div>
      </div>
    </div>
  );
}

function Fixture() {
  const [search, setSearch] = useState("");
  if (sheet === "country") {
    return (
      <OnboardingCountryModal
        open
        onOpenChange={() => {}}
        title="Where do you live?"
        hint="Used for age-appropriate defaults."
        required={false}
        search={search}
        onSearchChange={setSearch}
        topCountries={COUNTRIES}
        searchResults={COUNTRIES}
        onSelect={() => {}}
      />
    );
  }
  if (sheet === "curriculum") {
    return <CurriculumExplorerSheet open onOpenChange={() => {}} />;
  }
  if (sheet === "recipe") {
    return <RecipeDialog />;
  }
  if (sheet === "task-check") {
    return <TaskCheckSheet />;
  }
  return (
    <SubscriptionMomentSheet
      open
      trigger="first_routine"
      onDismiss={() => {}}
      onContinuePremium={() => {}}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={stubAuth}>
        <div data-testid="gap-closure-sheets-fixture" data-sheet={sheet}>
          <Fixture />
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  </StrictMode>,
);
