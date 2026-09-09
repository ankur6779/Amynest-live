import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AMY_CANCEL_AGENT_OVERLAY_Z_CLASS,
  AmyCancelAgent,
  AmyCancelAgentFooter,
} from "./amy-cancel-agent";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string; date?: string }) =>
      opts?.defaultValue ?? (opts?.date ? `${key} ${opts.date}` : key),
  }),
}));

vi.mock("@/lib/subscription-feature-flags", () => ({
  FF_CANCEL_ANNUAL_SAVE: true,
}));

vi.mock("@/lib/subscription-analytics", () => ({
  trackSubscriptionEvent: vi.fn(),
}));

vi.mock("@/components/amy-icon", () => ({
  AmyIcon: () => <div data-testid="amy-icon" />,
}));

const baseProps = {
  open: true,
  onClose: vi.fn(),
  periodEnd: "30 June 2026",
  annualMonthlyEquivalent: "₹49/mo",
  onSwitchToAnnual: vi.fn(),
  onConfirmCancel: vi.fn(),
  onOpenStore: vi.fn(),
  cancelling: false,
};

const footerHandlers = {
  onFeedbackChange: vi.fn(),
  onSelectReason: vi.fn(),
  onKeepPlan: vi.fn(),
  onSwitchAnnual: vi.fn(),
  onStillCancel: vi.fn(),
  onSubmitFeedback: vi.fn(),
  onOpenStoreAndClose: vi.fn(),
  onConfirmRazorpayCancel: vi.fn(),
};

describe("AmyCancelAgent static rendering", () => {
  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      <AmyCancelAgent {...baseProps} open={false} billingMode="razorpay" />,
    );
    expect(html).toBe("");
  });

  it("renders the cancel dialog above the tab bar stacking context", () => {
    const html = renderToStaticMarkup(
      <AmyCancelAgent {...baseProps} billingMode="store" storeTarget="google" />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('data-testid="amy-cancel-agent-overlay"');
    expect(html).toContain(AMY_CANCEL_AGENT_OVERLAY_Z_CLASS);
    expect(html).toContain("pages.pricing.amy_cancel_agent.powered_by");
  });
});

describe("AmyCancelAgentFooter cancel visibility", () => {
  it("renders Continue cancellation as a full-width outline control, not muted ghost text", () => {
    const html = renderToStaticMarkup(
      <AmyCancelAgentFooter
        {...footerHandlers}
        step="retention"
        billingMode="store"
        storeTarget="google"
        showAnnualSave
        cancelling={false}
        feedback=""
      />,
    );
    expect(html).toContain('data-testid="amy-cancel-continue"');
    expect(html).toContain("pages.pricing.amy_cancel_agent.continue_cancellation");
    expect(html).toContain("min-h-11");
    expect(html).toContain("text-foreground");
    expect(html).not.toContain("text-muted-foreground");
    expect(html).toContain("pages.pricing.keep_premium");
    expect(html).toContain("pages.pricing.amy_cancel_agent.switch_to_growth_year");
  });

  it("renders Cancel in Google Play as a full-width store action", () => {
    const html = renderToStaticMarkup(
      <AmyCancelAgentFooter
        {...footerHandlers}
        step="final"
        billingMode="store"
        storeTarget="google"
        showAnnualSave={false}
        cancelling={false}
        feedback=""
      />,
    );
    expect(html).toContain('data-testid="amy-agent-cancel-google-play"');
    expect(html).toContain("pages.pricing.cancel_in_google_play");
    expect(html).toContain("min-h-11");
  });
});
