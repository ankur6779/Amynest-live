import { useEffect } from "react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/geo";
import { useTranslation } from "react-i18next";

const LOGO = "/amynest-logo-new.png";

export default function StoreTapPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = "Download AmyNest AI";
  }, []);

  return (
    <div
      data-on-dark
      className="min-h-[100dvh] flex flex-col text-white relative overflow-hidden"
      style={{ background: "linear-gradient(165deg,#07050f 0%,#12102a 50%,#1a1538 100%)" }}
    >
      <style>{`
        @keyframes tapFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .tap-float { animation: tapFloat 5s ease-in-out infinite; }
        .tap-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .tap-btn:active { transform: scale(0.97); }
      `}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full opacity-35" style={{ background: "radial-gradient(circle,rgba(168,85,247,0.5),transparent 70%)" }} />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-8 max-w-md mx-auto w-full">
        <img
          src={LOGO}
          alt="AmyNest AI"
          className="tap-float w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover mb-6"
          style={{ boxShadow: "0 24px 60px rgba(124,58,237,0.45)" }}
        />

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300/80 mb-2">
          {t("store_tap.badge")}
        </p>
        <h1 className="font-quicksand font-black text-2xl sm:text-3xl text-center leading-tight mb-2">
          {t("store_tap.headline")}
        </h1>
        <p className="text-white/60 text-sm text-center leading-relaxed mb-8 max-w-xs">
          {t("store_tap.sub")}
        </p>

        <div className="w-full space-y-3">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="tap-app-store"
            className="tap-btn flex items-center gap-4 w-full px-5 py-4 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
              textDecoration: "none",
            }}
          >
            <svg viewBox="0 0 24 24" className="h-10 w-10 shrink-0 fill-white" aria-hidden>
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="text-left flex-1">
              <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide">{t("store_tap.download_on")}</p>
              <p className="text-white font-bold text-lg">{t("store_tap.app_store")}</p>
            </div>
            <span className="text-white/40 text-xl">›</span>
          </a>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="tap-google-play"
            className="tap-btn flex items-center gap-4 w-full px-5 py-4 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
              textDecoration: "none",
            }}
          >
            <svg viewBox="0 0 24 24" className="h-10 w-10 shrink-0" aria-hidden>
              <path d="M3.18 23.76c.3.17.65.19.97.06l12.14-7.01-2.66-2.67-10.45 9.62z" fill="#EA4335" />
              <path d="M22.47 10.3L19.7 8.72l-3.03 2.96 3.03 3.04 2.79-1.61c.8-.46.8-1.75-.02-2.81z" fill="#FBBC04" />
              <path d="M3.18.24C2.88.4 2.69.72 2.69 1.12v21.76l10.7-10.7L3.18.24z" fill="#4285F4" />
              <path d="M16.29 8.28L3.18.24C2.86.07 2.51.09 2.18.26l10.99 10.82 3.12-2.8z" fill="#34A853" />
            </svg>
            <div className="text-left flex-1">
              <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide">{t("store_tap.get_it_on")}</p>
              <p className="text-white font-bold text-lg">{t("store_tap.google_play")}</p>
            </div>
            <span className="text-white/40 text-xl">›</span>
          </a>
        </div>

        <p className="mt-8 text-[11px] text-white/35 text-center">{t("store_tap.footer")}</p>
      </main>
    </div>
  );
}
