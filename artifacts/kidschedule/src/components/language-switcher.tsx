import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from "@/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:border-white/25 transition-colors backdrop-blur-md"
        data-testid="language-switcher"
      >
        <Globe className="h-3.5 w-3.5 text-violet-300" />
        {compact ? current.code.toUpperCase() : current.native}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-white/10 bg-[#14142B]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          style={{ boxShadow: "0 10px 40px rgba(123,63,242,0.3)" }}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = lang.code === i18n.language;
            return (
              <button
                key={lang.code}
                onClick={() => { setLanguage(lang.code as LanguageCode); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  active ? "bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-white" : "text-white/75 hover:bg-white/5"
                }`}
              >
                <span className="font-medium">{lang.native}</span>
                {active && <Check className="h-4 w-4 text-violet-300" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
