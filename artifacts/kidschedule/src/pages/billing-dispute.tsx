import { Link } from "wouter";

const steps = [
  {
    step: "Step 1 — Contact Us",
    body: `If you believe a charge on your account is unauthorised or incorrect, please email us at support@amynest.in within 30 days of the transaction date. Include your registered email address, the transaction date, the amount charged, and a brief description of the issue.`,
  },
  {
    step: "Step 2 — Review",
    body: `We will acknowledge your dispute within 2 business days. Our billing team will investigate the transaction against our records, payment-processor logs, and your account activity. This process typically takes 5–7 business days.`,
  },
  {
    step: "Step 3 — Resolution",
    body: `Once our review is complete, we will notify you of the outcome by email. If the dispute is found in your favour, a full or partial refund will be issued to your original payment method within 7–10 business days. If we are unable to resolve the dispute to your satisfaction, we will provide instructions for escalating to your payment provider or Google Play.`,
  },
  {
    step: "Step 4 — Escalation",
    body: `If you made the purchase through Google Play, you may also contact Google Play Support directly at play.google.com/store/account and raise a refund request. AmyNest AI co-operates fully with payment-processor and platform dispute processes.`,
  },
];

const faqs = [
  {
    q: "What counts as an unauthorised transaction?",
    a: "A charge is considered unauthorised if it was made without your knowledge or consent, or if you did not initiate the subscription or in-app purchase. Charges you may have forgotten about, free-trial conversions, or renewals you did not cancel in time are generally not considered unauthorised.",
  },
  {
    q: "How do I cancel my subscription to avoid future charges?",
    a: "Open the Google Play Store app → tap your profile icon → Payments & subscriptions → Subscriptions → AmyNest AI → Cancel subscription. Cancellation takes effect at the end of the current billing period; you retain access until then.",
  },
  {
    q: "Can I get a refund if I cancel mid-period?",
    a: "Subscription fees are generally non-refundable for the current billing period, as stated in our Terms of Service. However, we review every request on a case-by-case basis. Contact support@amynest.in and we will do our best to help.",
  },
  {
    q: "What if I was charged twice for the same period?",
    a: "Duplicate charges are always resolved in your favour. Email us with both transaction IDs and we will issue a refund for the duplicate charge within 7–10 business days.",
  },
];

export default function BillingDisputePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-4">
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Back to AmyNest AI
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Billing Dispute Resolution</h1>
        <p className="text-muted-foreground mb-10 text-sm">
          Last updated: May 2026 · Operated by AmyNest AI
        </p>

        <section className="mb-10">
          <p className="leading-relaxed">
            At AmyNest AI we are committed to fair and transparent billing. If you
            have a question or concern about a charge, please follow the process
            below. We aim to resolve every dispute quickly and fairly.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Dispute Resolution Process</h2>
          <div className="space-y-6">
            {steps.map(({ step, body }) => (
              <div key={step} className="border border-border rounded-lg p-5">
                <h3 className="font-semibold mb-2 text-primary">{step}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {faqs.map(({ q, a }) => (
              <div key={q}>
                <p className="font-medium mb-1">{q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border pt-8">
          <h2 className="text-lg font-semibold mb-3">Contact Billing Support</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              Email:{" "}
              <a href="mailto:support@amynest.in" className="text-primary hover:underline">
                support@amynest.in
              </a>
            </li>
            <li>Response time: within 2 business days</li>
            <li>
              Website:{" "}
              <a href="https://amynest.in" className="text-primary hover:underline">
                amynest.in
              </a>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-6">
            For purchases made through Google Play, you may also contact{" "}
            <a
              href="https://play.google.com/store/account"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google Play Support
            </a>{" "}
            directly. AmyNest AI co-operates fully with all platform dispute
            processes.
          </p>
        </section>
      </div>
    </div>
  );
}
