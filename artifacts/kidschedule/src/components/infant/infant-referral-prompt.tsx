import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Gift, Share2, Copy, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useReferrals } from "@/hooks/use-referrals";
import { buildReferralShareLink } from "@/lib/referral-links";
import {
  trackReferralPromptClicked,
  trackReferralPromptViewed,
  type ReferralPromptSource,
} from "@/lib/infant-marketing-analytics";

type InfantReferralPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: ReferralPromptSource;
};

export function InfantReferralPrompt({
  open,
  onOpenChange,
  source,
}: InfantReferralPromptProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { payload } = useReferrals();
  const [copied, setCopied] = useState(false);
  const code = payload?.stats.code;

  useEffect(() => {
    if (open) trackReferralPromptViewed(source);
  }, [open, source]);

  async function handleShareLink() {
    if (!code) {
      trackReferralPromptClicked(source, "referrals_page");
      onOpenChange(false);
      setLocation("/referrals");
      return;
    }
    const link = buildReferralShareLink(code);
    const text = t("components.infant_referral.share_text", {
      link,
      defaultValue: `AmyNest helped us so much with our baby — try it free: ${link}`,
    });
    trackReferralPromptClicked(source, "share_link");
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: t("components.infant_referral.share_title", "Try AmyNest"),
          text,
        });
        return;
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      trackReferralPromptClicked(source, "copy_link");
    } catch {
      onOpenChange(false);
      setLocation("/referrals");
    }
  }

  function handleGoReferrals() {
    trackReferralPromptClicked(source, "referrals_page");
    onOpenChange(false);
    setLocation("/referrals");
  }

  function handleDismiss() {
    trackReferralPromptClicked(source, "dismiss");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader>
          <SheetTitle className="text-center pr-8">
            {t(
              "components.infant_referral.title",
              "Know another parent who would love this?",
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Gift className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted-foreground leading-snug px-2">
            {t(
              "components.infant_referral.body",
              "Invite friends and earn premium days when they join AmyNest.",
            )}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full rounded-xl font-bold gap-2"
              onClick={() => void handleShareLink()}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {copied
                ? t("components.infant_referral.copied", "Link copied!")
                : t("components.infant_referral.share_cta", "Share AmyNest")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl gap-2"
              onClick={handleGoReferrals}
            >
              <Copy className="h-4 w-4" />
              {t("components.infant_referral.view_referrals", "Get your referral code")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl text-muted-foreground gap-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
              {t("components.infant_referral.not_now", "Not now")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
