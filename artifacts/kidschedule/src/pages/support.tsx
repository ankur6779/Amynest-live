import { Link } from "wouter";
import { Mail, MessageCircle, CreditCard, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const SUPPORT_EMAIL = "support@amynest.in";

const topics = [
  {
    icon: HelpCircle,
    title: "Account & app help",
    body: "Sign-in issues, child profiles, routines, notifications, or anything not working as expected in the app.",
  },
  {
    icon: CreditCard,
    title: "Billing & subscriptions",
    body: "Questions about Premium plans, renewals, refunds, or charges from the App Store, Google Play, or Razorpay.",
  },
  {
    icon: MessageCircle,
    title: "Feedback & feature requests",
    body: "Tell us what would help your family most. We read every message and use feedback to improve AmyNest.",
  },
];

export default function SupportPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/">
            <span className="flex cursor-pointer items-center gap-2">
              <img src="/amynest-logo.png" alt={t("pages.support.amynest_ai")} className="h-8 w-8 rounded-full" />
              <span
                className="font-quicksand text-lg font-black"
                style={{
                  background:
                    "linear-gradient(90deg,hsl(var(--brand-purple-500)),hsl(var(--brand-pink-500)),hsl(var(--brand-cyan-500)))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t("pages.support.amynest_ai_2")}
              </span>
            </span>
          </Link>
          <Link href="/">
            <span className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              ← {t("screens.common.home_link")}
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">{t("pages.support.title")}</h1>
        <p className="mb-8 text-muted-foreground">{t("pages.support.subtitle")}</p>

        <section className="mb-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t("pages.support.contact_heading")}</h2>
              <p className="text-sm text-muted-foreground">{t("pages.support.contact_subtitle")}</p>
            </div>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=AmyNest%20Support%20Request`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Mail className="h-4 w-4" />
            {SUPPORT_EMAIL}
          </a>
          <p className="mt-4 text-sm text-muted-foreground">{t("pages.support.response_time")}</p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">{t("pages.support.topics_heading")}</h2>
          <ul className="space-y-4">
            {topics.map((topic) => (
              <li key={topic.title} className="rounded-xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <topic.icon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{topic.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{topic.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10 rounded-2xl border border-border bg-muted/40 p-6">
          <h2 className="mb-3 text-lg font-semibold">{t("pages.support.self_service_heading")}</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/feedback" className="text-primary hover:underline">
                {t("pages.support.send_feedback")}
              </Link>
            </li>
            <li>
              <Link href="/billing-dispute" className="text-primary hover:underline">
                {t("pages.support.billing_dispute")}
              </Link>
            </li>
            <li>
              <Link href="/delete-account" className="text-primary hover:underline">
                {t("pages.support.delete_account")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-primary hover:underline">
                {t("pages.landing.privacy_policy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-primary hover:underline">
                {t("pages.landing.terms_of_service")}
              </Link>
            </li>
          </ul>
        </section>

        <section className="mb-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold">{t("pages.support.subscription_heading")}</h2>
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
            {t("pages.support.subscription_body")}
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>{t("pages.support.subscription_ios")}</li>
            <li>{t("pages.support.subscription_android")}</li>
            <li>{t("pages.support.subscription_web")}</li>
          </ul>
        </section>

        <p className="text-xs text-muted-foreground">{t("pages.support.footer")}</p>
      </main>
    </div>
  );
}
