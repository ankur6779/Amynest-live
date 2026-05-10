import { useTranslation } from "react-i18next";

type PatentBadgeVariant = "ai" | "intelligence" | "pending";

const LABEL_KEYS: Record<PatentBadgeVariant, string> = {
  ai: "patent_pending.ai_badge",
  intelligence: "patent_pending.hub_trust",
  pending: "patent_pending.footer_label",
};

export function PatentBadge({
  variant = "ai",
  className = "",
}: {
  variant?: PatentBadgeVariant;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/[0.07] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary/55 select-none ${className}`}
    >
      {t(LABEL_KEYS[variant])}
    </span>
  );
}
