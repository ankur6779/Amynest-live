import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TRUST_SECTION } from "@workspace/subscription-marketing";

export function SubscriptionTrustSection() {
  const { t } = useTranslation();

  return (
    <section className="mx-4 mb-4 px-1" data-testid="subscription-trust">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Shield className="h-4 w-4 text-white/40" />
        <h2 className="text-sm font-extrabold text-white/80">
          {t("pricing.trust_title", { defaultValue: TRUST_SECTION.title })}
        </h2>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {TRUST_SECTION.items.map((item) => (
          <li key={item.label} className="text-center sm:text-left">
            <p className="text-xs font-bold text-white/75">{item.label}</p>
            <p className="text-[11px] text-white/45 leading-snug">{item.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-[11px] italic text-white/40">
        {t("pricing.trust_closing", { defaultValue: TRUST_SECTION.closing })}
      </p>
    </section>
  );
}
