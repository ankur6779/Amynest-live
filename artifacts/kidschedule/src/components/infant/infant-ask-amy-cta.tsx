import { Link } from "wouter";
import { MessageCircleHeart } from "lucide-react";
import { FF_INFANT_PREMIUM } from "@/lib/infant-feature-flags";

type InfantAskAmyCtaProps = {
  childName: string;
  ageMonths: number;
  question: string;
  label: string;
  testId?: string;
  className?: string;
};

/** Contextual upsell to Amy AI Baby Expert — never blocks tracking flows. */
export function InfantAskAmyCta({
  childName,
  ageMonths,
  question,
  label,
  testId = "infant-ask-amy-cta",
  className = "",
}: InfantAskAmyCtaProps) {
  if (!FF_INFANT_PREMIUM) return null;

  const href = `/assistant?q=${encodeURIComponent(question)}`;

  return (
    <Link href={href}>
      <button
        type="button"
        className={`w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:brightness-110 transition ${className}`}
        data-testid={testId}
      >
        <MessageCircleHeart className="h-4 w-4" />
        {label}
      </button>
    </Link>
  );
}
