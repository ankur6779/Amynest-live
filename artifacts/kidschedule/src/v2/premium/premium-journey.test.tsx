import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  PREMIUM_OFFLINE_RESTORE,
  PREMIUM_SUCCESS_BODY,
  PREMIUM_SUCCESS_HEADLINE,
} from "./copy";
import {
  PREMIUM_JOURNEY_ID,
  PREMIUM_JOURNEY_VERSION,
} from "./journey-meta";
import { PremiumJourney } from "./PremiumJourney";
import PremiumPaywallPage from "./PremiumPaywallPage";
import {
  createInitialPremiumJourneyState,
  reducePremiumJourney,
} from "./purchase-flow";
import type { PlanCard } from "@/hooks/use-subscription";

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    Redirect: ({ to }: { to: string }) => (
      <div data-testid="redirect" data-to={to} />
    ),
    Link: ({
      href,
      children,
      ...rest
    }: {
      href: string;
      children?: React.ReactNode;
    }) => (
      <a href={href} {...rest}>
        {children}
      </a>
    ),
  };
});

const SAMPLE_PLANS: PlanCard[] = [
  {
    id: "monthly",
    title: "Monthly",
    price: 499,
    currency: "INR",
    period: "month",
    formattedPrice: "₹499",
    badge: null,
    features: [],
  },
  {
    id: "yearly",
    title: "Yearly",
    price: 2999,
    currency: "INR",
    period: "year",
    formattedPrice: "₹2999",
    badge: "Best value",
    features: [],
  },
];

describe("Premium V2 page flag regression", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("flags OFF → /premium redirects to /pricing", () => {
    render(<PremiumPaywallPage />);
    expect(screen.getByTestId("redirect")).toHaveAttribute("data-to", "/pricing");
  });
});

describe("PremiumJourney UI states", () => {
  it("shows loading state", () => {
    render(
      <PremiumJourney
        state={createInitialPremiumJourneyState()}
        plans={[]}
        selectedPlan="yearly"
        onSelectPlan={() => {}}
        onPurchase={() => {}}
        onRestore={() => {}}
        onRetry={() => {}}
        onDismissCancel={() => {}}
      />,
    );
    const loading = screen.getByTestId("v2-premium-loading");
    expect(loading).toBeInTheDocument();
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(loading).toHaveTextContent(/Preparing ways to continue/i);
    expect(loading.querySelector(".animate-spin")).toBeNull();
    expect(screen.getByTestId("v2-premium-journey")).toHaveAttribute(
      "data-phase",
      "loading",
    );
  });

  it("shows offline state", () => {
    const state = reducePremiumJourney(createInitialPremiumJourneyState(), {
      type: "HYDRATE",
      isPremium: false,
      online: false,
    });
    render(
      <PremiumJourney
        state={state}
        plans={SAMPLE_PLANS}
        selectedPlan="yearly"
        onSelectPlan={() => {}}
        onPurchase={() => {}}
        onRestore={() => {}}
        onRetry={() => {}}
        onDismissCancel={() => {}}
      />,
    );
    expect(screen.getByTestId("v2-premium-offline")).toBeInTheDocument();
    expect(screen.getByTestId("v2-premium-journey")).toHaveAttribute(
      "data-journey-id",
      PREMIUM_JOURNEY_ID,
    );
    expect(screen.getByTestId("v2-premium-journey")).toHaveAttribute(
      "data-journey-version",
      String(PREMIUM_JOURNEY_VERSION),
    );
  });

  it("restore while offline — friendly copy + retry CTA", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    let state = createInitialPremiumJourneyState({ phase: "ready", online: true });
    state = reducePremiumJourney(state, {
      type: "GO_OFFLINE",
      context: "restore",
    });
    render(
      <PremiumJourney
        state={state}
        plans={SAMPLE_PLANS}
        selectedPlan="yearly"
        onSelectPlan={() => {}}
        onPurchase={() => {}}
        onRestore={() => {}}
        onRetry={onRetry}
        onDismissCancel={() => {}}
      />,
    );
    expect(screen.getByTestId("v2-premium-offline")).toHaveAttribute(
      "data-offline-context",
      "restore",
    );
    expect(screen.getByTestId("v2-premium-offline-message")).toHaveTextContent(
      PREMIUM_OFFLINE_RESTORE,
    );
    await user.click(screen.getByTestId("v2-premium-retry"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("ready → journey CTA and return-to-place (not commerce catalogue)", async () => {
    const user = userEvent.setup();
    const onPurchase = vi.fn();
    const onRestore = vi.fn();
    const state = reducePremiumJourney(createInitialPremiumJourneyState(), {
      type: "HYDRATE",
      isPremium: false,
      online: true,
    });
    render(
      <PremiumJourney
        state={state}
        plans={SAMPLE_PLANS}
        selectedPlan="yearly"
        onSelectPlan={() => {}}
        onPurchase={onPurchase}
        onRestore={onRestore}
        onRetry={() => {}}
        onDismissCancel={() => {}}
      />,
    );
    expect(screen.getByTestId("v2-premium-heading")).toHaveTextContent(
      /Stay with Amy/i,
    );
    expect(screen.getByText(/Amy asks to remain present/i)).toBeInTheDocument();
    expect(screen.getByTestId("v2-premium-support")).toHaveTextContent(
      /Permission for Amy to keep caring/i,
    );
    expect(screen.getByTestId("v2-premium-purchase")).toHaveTextContent(
      /Let Amy stay/i,
    );
    expect(screen.getByTestId("v2-premium-restore")).toHaveTextContent(
      /Return to your place/i,
    );
    const yearly = screen.getByTestId("v2-premium-plan-yearly");
    expect(yearly).toHaveTextContent(/Stay present/i);
    expect(yearly.querySelector(".sr-only")).toBeTruthy();
    expect(screen.queryByText(/Best value|Upgrade|Subscribe/i)).toBeNull();
    expect(yearly).toHaveAttribute("data-selected", "true");
    await user.click(screen.getByTestId("v2-premium-purchase"));
    expect(onPurchase).toHaveBeenCalled();
    await user.click(screen.getByTestId("v2-premium-restore"));
    expect(onRestore).toHaveBeenCalled();
  });

  it("success state — reassurance copy only", () => {
    const state = reducePremiumJourney(
      createInitialPremiumJourneyState({ phase: "purchasing" }),
      { type: "PURCHASE_SUCCESS" },
    );
    render(
      <PremiumJourney
        state={state}
        plans={SAMPLE_PLANS}
        selectedPlan="yearly"
        onSelectPlan={() => {}}
        onPurchase={() => {}}
        onRestore={() => {}}
        onRetry={() => {}}
        onDismissCancel={() => {}}
      />,
    );
    expect(screen.getByTestId("v2-premium-success")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      PREMIUM_SUCCESS_HEADLINE,
    );
    expect(screen.getByTestId("v2-premium-success-copy")).toHaveTextContent(
      PREMIUM_SUCCESS_BODY,
    );
    expect(screen.queryByText(/unlimited|feature list|best value/i)).toBeNull();
    expect(screen.queryByText(/You're all set/i)).toBeNull();
    expect(screen.getByTestId("v2-premium-done")).toHaveAttribute("href", "/today");
  });

  it("cancelled state", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const state = reducePremiumJourney(
      createInitialPremiumJourneyState({ phase: "purchasing" }),
      { type: "PURCHASE_CANCEL" },
    );
    render(
      <PremiumJourney
        state={state}
        plans={SAMPLE_PLANS}
        selectedPlan="yearly"
        onSelectPlan={() => {}}
        onPurchase={() => {}}
        onRestore={() => {}}
        onRetry={() => {}}
        onDismissCancel={onDismiss}
      />,
    );
    expect(screen.getByTestId("v2-premium-cancelled")).toBeInTheDocument();
    await user.click(screen.getByTestId("v2-premium-dismiss-cancel"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("error / failed state", () => {
    const state = reducePremiumJourney(
      createInitialPremiumJourneyState({ phase: "purchasing" }),
      { type: "PURCHASE_FAIL", error: "Billing unavailable" },
    );
    render(
      <PremiumJourney
        state={state}
        plans={SAMPLE_PLANS}
        selectedPlan="yearly"
        onSelectPlan={() => {}}
        onPurchase={() => {}}
        onRestore={() => {}}
        onRetry={() => {}}
        onDismissCancel={() => {}}
      />,
    );
    expect(screen.getByTestId("v2-premium-error")).toHaveTextContent(
      "Billing unavailable",
    );
  });
});

describe("premium_v2 flag default", () => {
  it("is off without env (regression)", async () => {
    vi.resetModules();
    const { isPremiumV2Enabled } = await import("./flags");
    expect(isPremiumV2Enabled()).toBe(false);
    vi.stubEnv(v2BooleanFlagEnvKey("premium_v2"), "1");
    vi.resetModules();
    const enabled = await import("./flags");
    expect(enabled.isPremiumV2Enabled()).toBe(true);
    vi.unstubAllEnvs();
  });
});
