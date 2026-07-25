import { useEffect, useRef } from "react";
import { X, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthLegalFooter } from "@/components/auth-legal-footer";
import { Button } from "@/components/ui/button";
import {
  FF_VALUE_SHEET_COMPARISON,
} from "@/lib/mrr-experiment-flags";
import {
  FREE_VS_PREMIUM_ROWS,
  resolvePremiumMomentCopy,
} from "@/lib/premium-moment-copy";
import type { PremiumPromptTrigger } from "@/lib/premium-prompt";
import { useNativeBilling } from "@/hooks/use-native-billing";
import { trackPremiumPromptEvent } from "@/lib/premium-prompt-analytics";

type Props = {
  open: boolean;
  trigger: PremiumPromptTrigger;
  onDismiss: () => void;
  onContinuePremium: () => void;
};

/**
 * Lightweight value-first upgrade sheet — NOT a blocking paywall.
 * Shown only after meaningful value (first routine, limit reached, feature complete).
 */
export function SubscriptionMomentSheet({
  open,
  trigger,
  onDismiss,
  onContinuePremium,
}: Props) {
  const copy = resolvePremiumMomentCopy(trigger);
  const nativeBilling = useNativeBilling();
  const restoreLoggedRef = useRef(false);

  useEffect(() => {
    if (!open) restoreLoggedRef.current = false;
  }, [open]);

  const onRestore = () => {
    if (restoreLoggedRef.current) return;
    restoreLoggedRef.current = true;
    trackPremiumPromptEvent("premium_prompt_clicked", trigger, {
      action: "restore_purchase",
    });
    void nativeBilling.restore();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="premium-moment-title"
          data-testid="subscription-moment-sheet"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Dismiss"
            onClick={onDismiss}
          />

          <motion.div
            className="relative w-full max-w-md rounded-t-[28px] sm:rounded-[28px] border border-white/15 bg-[#0B0B1A] shadow-2xl overflow-hidden"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="max-h-[85vh] overflow-y-auto px-6 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden>{copy.emoji}</span>
                  <div>
                    <h2
                      id="premium-moment-title"
                      className="text-lg font-extrabold text-white"
                    >
                      {copy.title}
                    </h2>
                    <p className="text-sm text-white/65 mt-0.5 leading-snug">
                      {copy.subtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="shrink-0 rounded-full p-2 text-white/50 hover:text-white/80 hover:bg-white/10"
                  aria-label="Maybe later"
                  data-testid="premium-moment-dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 mb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-white/45 mb-2">
                  Premium includes
                </p>
                <ul className="space-y-2">
                  {copy.benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-center gap-2 text-sm text-white/85"
                    >
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {FF_VALUE_SHEET_COMPARISON ? (
                <div className="rounded-2xl border border-white/10 overflow-hidden mb-4">
                  <div className="grid grid-cols-3 bg-white/5 text-[10px] font-bold uppercase tracking-wide text-white/45 px-3 py-2">
                    <span>Feature</span>
                    <span className="text-center">Free</span>
                    <span className="text-center text-primary">Premium</span>
                  </div>
                  {FREE_VS_PREMIUM_ROWS.map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-3 border-t border-white/8 px-3 py-2 text-xs text-white/75"
                    >
                      <span>{row.label}</span>
                      <span className="text-center">{row.free}</span>
                      <span className="text-center font-semibold text-white">
                        {row.premium}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <p className="text-[11px] text-white/40 text-center mb-1">
                From ₹199/mo · Cancel anytime · Family-safe
              </p>
            </div>

            {/* Sticky CTA footer */}
            <div className="sticky bottom-0 border-t border-white/10 bg-[#0B0B1A]/98 backdrop-blur-md px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                onClick={onContinuePremium}
                className="w-full h-12 text-base font-extrabold bg-gradient-to-r from-primary to-primary hover:opacity-90 border-0 shadow-[0_10px_24px_rgba(255,78,205,0.45)]"
                data-testid="premium-moment-cta"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {copy.cta}
              </Button>
              <button
                type="button"
                onClick={onDismiss}
                className="w-full mt-2 py-2.5 text-sm font-semibold text-white/55 hover:text-white/80"
                data-testid="premium-moment-maybe-later"
              >
                Maybe later
              </button>
              {nativeBilling.available ? (
                <button
                  type="button"
                  onClick={onRestore}
                  className="w-full text-[11px] font-semibold text-white/40 py-1 hover:text-white/65"
                >
                  Restore purchase
                </button>
              ) : null}
              <div className="mt-2 scale-90 origin-bottom opacity-70">
                <AuthLegalFooter />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
