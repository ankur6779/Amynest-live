import { Link } from "wouter";
import { Shield, Trash2, AlertTriangle, CheckCircle2, Smartphone, Settings, UserX, ChevronRight } from "lucide-react";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";

const DATA_ITEMS = [
  "Profile & account information",
  "All children's profiles and ages",
  "Daily routines and schedules",
  "Behavior tracking records",
  "Phonics test history and progress",
  "AI conversation history",
  "Subscription and payment records",
  "Referral history",
  "All usage data and analytics",
];

const IN_APP_STEPS = [
  {
    icon: Smartphone,
    title: "Open AmyNest App",
    description: "Launch the AmyNest app on your Android or iOS device.",
  },
  {
    icon: Settings,
    title: "Go to Settings",
    description: 'Tap on your profile picture or the menu icon, then select "Settings".',
  },
  {
    icon: UserX,
    title: 'Tap "Delete Account"',
    description: 'Scroll to the bottom and tap "Delete Account". Confirm when prompted.',
  },
  {
    icon: CheckCircle2,
    title: "Account Deleted",
    description: "Your account and all associated data will be permanently deleted within 30 days.",
  },
];

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <AmyMascotLogo size={32} />
            <span className="text-lg font-semibold text-slate-800">AmyNest</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* Hero */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <Trash2 className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-slate-900">Delete Your Account</h1>
          <p className="max-w-xl text-base text-slate-500">
            We're sorry to see you go. You can permanently delete your AmyNest account and all
            associated data by following the steps below.
          </p>
        </div>

        {/* Warning banner */}
        <div className="mb-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-800">
            <strong>This action is permanent.</strong> Once deleted, your account and all data
            cannot be recovered. Please make sure you want to proceed before continuing.
          </p>
        </div>

        {/* Data deleted section */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">What data will be deleted</h2>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <ul className="space-y-2.5">
              {DATA_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-400">
              Data is permanently deleted within <strong>30 days</strong> of the request.
              Anonymised, aggregated analytics (not linked to your account) may be retained.
            </p>
          </div>
        </section>

        {/* In-app steps */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            How to delete from the app
          </h2>
          <div className="space-y-3">
            {IN_APP_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                    <Icon className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">Step {i + 1}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{step.description}</p>
                  </div>
                  {i < IN_APP_STEPS.length - 1 && (
                    <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-slate-300" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact section */}
        <section className="mb-10">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-5">
            <h2 className="mb-1 text-base font-semibold text-slate-800">Need help?</h2>
            <p className="mb-3 text-sm text-slate-500">
              If you're unable to access the app or need assistance with account deletion, contact
              our support team and we'll process your request manually within 7 business days.
            </p>
            <a
              href="mailto:support@amynest.app?subject=Account%20Deletion%20Request"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Email Support
            </a>
            <p className="mt-3 text-xs text-slate-400">
              Please include the email or phone number linked to your AmyNest account in your
              message.
            </p>
          </div>
        </section>

        {/* Footer links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <Link href="/privacy" className="hover:text-slate-600 hover:underline">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-slate-600 hover:underline">
            Terms of Service
          </Link>
          <span>·</span>
          <Link href="/" className="hover:text-slate-600 hover:underline">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
