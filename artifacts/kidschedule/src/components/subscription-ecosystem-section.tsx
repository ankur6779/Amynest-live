import { useTranslation } from "react-i18next";
import { FEATURE_SHOWCASE } from "@workspace/subscription-marketing";

export function SubscriptionEcosystemSection() {
  const { t } = useTranslation();

  return (
    <section className="mx-4 mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-5" data-testid="subscription-ecosystem">
      <p className="text-center text-[10px] font-bold uppercase tracking-widest text-primary">
        {t("pricing.ecosystem_eyebrow", { defaultValue: FEATURE_SHOWCASE.eyebrow })}
      </p>
      <h2 className="mt-2 text-center text-lg font-extrabold text-white">
        {t("pricing.ecosystem_title", { defaultValue: FEATURE_SHOWCASE.title })}
      </h2>
      <p className="mt-2 text-center text-xs leading-relaxed text-white/60">
        {t("pricing.ecosystem_subtitle", { defaultValue: FEATURE_SHOWCASE.subtitle })}
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {FEATURE_SHOWCASE.items.map((item) => (
          <li
            key={item.name}
            className="rounded-xl border border-white/8 bg-white/5 px-3 py-2.5"
          >
            <p className="text-xs font-bold text-white/90">{item.name}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-white/55">{item.outcome}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
