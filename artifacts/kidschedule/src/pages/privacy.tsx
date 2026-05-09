import { Link } from "wouter";
import { useTranslation } from "react-i18next";

const PRIVACY_CONTENT = {
  title: "Privacy Policy — AmyNest AI",
  updated: "Last updated: April 21, 2026",
  intro:
    'AmyNest ("the App") is operated by AmyNest AI ("we", "us"). This policy explains what information we collect when you use the App and how we handle it.',
  sections: [
    {
      heading: "1. Information we collect",
      items: [
        "Account information you provide when you sign up: name, email address, and authentication identifiers from your sign-in provider.",
        "Child profile information you voluntarily enter (first name or nickname, age, interests, routine preferences). We never ask for a child's last name, address, or contact details.",
        "Routine and task activity you create or generate inside the App, used to display your dashboard and reward history.",
        "Technical data such as device type, OS version, app version, and crash diagnostics, used to keep the App stable.",
      ],
    },
    {
      heading: "2. How we use information",
      items: [
        "To provide the core features of the App (generating routines, tracking tasks and rewards, syncing across your devices).",
        "To respond to support requests you send us.",
        "To improve the App's reliability and performance.",
      ],
      note: "We do not sell your personal information. We do not show third-party advertising to children inside the App.",
    },
    {
      heading: "3. Children's privacy",
      body:
        "AmyNest is designed to be used by parents and guardians. Child profiles inside the App are managed by a parent account. We collect only the minimum information needed to display a child's routine. Parents may delete a child profile at any time from the App.",
    },
    {
      heading: "4. Data sharing",
      body:
        "We share data with service providers who help us operate the App (hosting, authentication, analytics, AI generation). These providers are bound by contracts to use your data only on our behalf. We may also disclose information if required by law.",
    },
    {
      heading: "5. Data retention and deletion",
      body:
        "You can delete your account and all associated data at any time from inside the App, or by emailing support@amynest.in. Backups are removed within 30 days.",
    },
    {
      heading: "6. Permissions used by the mobile app",
      items: [
        "Internet / Network state — required to load the App.",
        "Camera, Microphone, Photos — only requested at the moment you use a feature that needs them (e.g. uploading a child's profile picture). Always optional.",
      ],
    },
    {
      heading: "7. Contact",
      body: "Questions or requests: support@amynest.in",
    },
  ],
};

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();

  // audit-block-ignore-start — public light-mode page; slate tokens are intentional
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/">
            <span className="flex items-center gap-2 cursor-pointer">
              <img
                src="/amynest-logo.png"
                alt={t("pages.privacy.amynest_ai")}
                className="h-8 w-8 rounded-full"
              />
              <span
                className="font-quicksand text-lg font-black"
                style={{
                  background:
                    "linear-gradient(90deg,hsl(var(--brand-purple-500)),hsl(var(--brand-pink-500)),hsl(var(--brand-cyan-500)))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t("pages.privacy.amynest_ai_2")}
              </span>
            </span>
          </Link>
          <Link href="/">
            <span className="text-sm text-slate-600 hover:text-slate-900 cursor-pointer">
              ← {t("screens.common.home_link")}
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-5 py-12">
        <article data-testid="privacy-policy-content">
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            {PRIVACY_CONTENT.title}
          </h1>
          <p className="text-sm text-slate-500 italic mb-8">
            {PRIVACY_CONTENT.updated}
          </p>
          <p className="text-slate-700 leading-relaxed mb-8">
            {PRIVACY_CONTENT.intro}
          </p>

          {PRIVACY_CONTENT.sections.map((section, i) => (
            <section key={i} className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3 mt-8">
                {section.heading}
              </h2>

              {section.body && (
                <p className="text-slate-700 leading-relaxed">{section.body}</p>
              )}

              {section.items && section.items.length > 0 && (
                <ul className="list-disc pl-6 space-y-2 text-slate-700">
                  {section.items.map((item, j) => (
                    <li key={j} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {section.note && (
                <p className="mt-4 text-slate-700 leading-relaxed font-medium">
                  {section.note}
                </p>
              )}
            </section>
          ))}
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <p className="text-center text-xs text-slate-500">
          {t("screens.common.copyright")}
        </p>
      </footer>
    </div>
  );
  // audit-block-ignore-end
}
