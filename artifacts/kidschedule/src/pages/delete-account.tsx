import { Link } from "wouter";
import { Shield, Trash2, AlertTriangle, CheckCircle2, Smartphone, Settings, UserX, ChevronRight } from "lucide-react";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useTranslation } from "react-i18next";
export default function DeleteAccountPage() {
  const {
    t
  } = useTranslation();
  const DATA_ITEMS = t("screens.delete_account.data_items", {
    returnObjects: true
  }) as string[];
  const IN_APP_STEPS = (t("screens.delete_account.steps", {
    returnObjects: true
  }) as Array<{
    title: string;
    description: string;
  }>).map((s, i) => ({
    ...s,
    icon: [Smartphone, Settings, UserX, CheckCircle2][i]
  }));
  return <div className="min-h-screen bg-gradient-to-b from-background to-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <AmyMascotLogo size={32} />
            <span className="text-lg font-semibold text-foreground">{t("pages.delete_account.amynest")}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* Hero */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/40">
            <Trash2 className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-foreground">{t("screens.delete_account.title")}</h1>
          <p className="max-w-xl text-base text-muted-foreground">
            {t("screens.delete_account.subtitle")}
          </p>
        </div>

        {/* Warning banner */}
        <div className="mb-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{t("screens.delete_account.warning_strong")}</strong> {t("screens.delete_account.warning_body")}
          </p>
        </div>

        {/* Data deleted section */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">{t("screens.delete_account.data_heading")}</h2>
          </div>
          <div className="rounded-xl border border-card-border bg-card p-5">
            <ul className="space-y-2.5">
              {DATA_ITEMS.map(item => <li key={item} className="flex items-center gap-3 text-sm text-card-foreground">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400 dark:bg-red-500" />
                  {item}
                </li>)}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("screens.delete_account.retention_before")} <strong>{t("screens.delete_account.retention_days")}</strong> {t("screens.delete_account.retention_after")}
            </p>
          </div>
        </section>

        {/* In-app steps */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {t("screens.delete_account.steps_heading")}
          </h2>
          <div className="space-y-3">
            {IN_APP_STEPS.map((step, i) => {
            const {
              t
            } = useTranslation();
            const Icon = step.icon;
            return <div key={i} className="flex items-start gap-4 rounded-xl border border-card-border bg-card px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40">
                    <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{t("screens.delete_account.step_label", {
                      n: i + 1
                    })}</span>
                    </div>
                    <p className="text-sm font-semibold text-card-foreground">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {i < IN_APP_STEPS.length - 1 && <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground/60" />}
                </div>;
          })}
          </div>
        </section>

        {/* Contact section */}
        <section className="mb-10">
          <div className="rounded-xl border border-border bg-muted px-6 py-5">
            <h2 className="mb-1 text-base font-semibold text-foreground">{t("screens.delete_account.help_heading")}</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              {t("screens.delete_account.help_body")}
            </p>
            <a data-on-dark href="mailto:support@amynest.app?subject=Account%20Deletion%20Request" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
              {t("screens.delete_account.email_support")}
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("screens.delete_account.help_footnote")}
            </p>
          </div>
        </section>

        {/* Footer links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            {t("screens.delete_account.privacy_link")}
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-foreground hover:underline">
            {t("screens.delete_account.terms_link")}
          </Link>
          <span>·</span>
          <Link href="/" className="hover:text-foreground hover:underline">
            {t("screens.delete_account.back_home")}
          </Link>
        </div>
      </main>
    </div>;
}