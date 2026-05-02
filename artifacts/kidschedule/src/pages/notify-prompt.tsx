import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useWebPush } from "@/hooks/use-web-push";
import { useAuth } from "@/lib/firebase-auth-hooks";

const GRAD = "linear-gradient(135deg,#6366F1,#A855F7)";
const BG   = "linear-gradient(160deg,#EEF2FF 0%,#F5F3FF 55%,#FDF2F8 100%)";

export default function NotifyPromptPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const search          = useSearch();
  const next            = new URLSearchParams(search).get("next") ?? "/";
  const { isSignedIn, isLoaded } = useAuth();
  const { status, enable }       = useWebPush();
  const [loading, setLoading]    = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setLocation("/sign-in"); return; }
    if (status === "granted" || status === "denied" || status === "unsupported") {
      setLocation(next);
    }
  }, [status, isLoaded, isSignedIn, next, setLocation]);

  const handleAllow = async () => {
    setLoading(true);
    await enable();
    setLocation(next);
  };

  const handleSkip = () => setLocation(next);

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-10"
      style={{ background: BG }}
    >
      <div style={{ marginBottom: 20 }}>
        <AmyMascotLogo size={72} />
      </div>

      <div
        className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg mb-5"
        style={{ background: GRAD }}
      >
        <span style={{ fontSize: 36 }}>🔔</span>
      </div>

      <h1
        className="text-2xl font-extrabold text-center mb-3"
        style={{ color: "#1e1b4b" }}
      >
        {t("screens.notify_prompt.title")}
      </h1>

      <p
        className="text-sm text-center mb-8 leading-relaxed"
        style={{ color: "#6366F1", maxWidth: 300 }}
      >
        {t("screens.notify_prompt.subtitle")}
      </p>

      <div className="flex flex-col gap-3 w-full" style={{ maxWidth: 320 }}>
        <div
          className="rounded-2xl p-4 mb-2"
          style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(99,102,241,0.15)" }}
        >
          {[
            { emoji: "⏰", text: t("screens.notify_prompt.benefit_routines") },
            { emoji: "🌙", text: t("screens.notify_prompt.benefit_bedtime") },
            { emoji: "🍎", text: t("screens.notify_prompt.benefit_meals") },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex items-center gap-3 py-2">
              <span style={{ fontSize: 20 }}>{emoji}</span>
              <p className="text-sm font-medium" style={{ color: "#1e1b4b" }}>{text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleAllow}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-bold text-base active:scale-95 transition-all"
          style={{
            background: GRAD,
            boxShadow: "0 6px 24px rgba(99,102,241,0.4)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? t("screens.notify_prompt.enabling") : t("screens.notify_prompt.allow_button")}
        </button>

        <button
          onClick={handleSkip}
          className="w-full py-3 text-sm font-semibold"
          style={{ color: "#6366F1", background: "none", border: "none", cursor: "pointer" }}
        >
          {t("screens.notify_prompt.maybe_later")}
        </button>
      </div>
    </div>
  );
}
