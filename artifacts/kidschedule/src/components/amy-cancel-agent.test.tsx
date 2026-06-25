import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AmyCancelAgent } from "./amy-cancel-agent";

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

describe("AmyCancelAgent static rendering", () => {
  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      <AmyCancelAgent {...baseProps} open={false} billingMode="razorpay" />,
    );
    expect(html).toBe("");
  });

  it("renders the cancel dialog shell", () => {
    const html = renderToStaticMarkup(
      <AmyCancelAgent {...baseProps} billingMode="razorpay" />,
    );
    expect(html).toContain("role=\"dialog\"");
    expect(html).toContain("pages.pricing.amy_cancel_agent.title");
    expect(html).toContain("pages.pricing.amy_cancel_agent.powered_by");
  });

  it("renders store-managed dialog shell without throwing", () => {
    const html = renderToStaticMarkup(
      <AmyCancelAgent {...baseProps} billingMode="store" storeTarget="google" />,
    );
    expect(html).toContain("pages.pricing.amy_cancel_agent.title");
  });
});
