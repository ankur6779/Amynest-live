import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { capturePendingReferralCode, PENDING_REFERRAL_KEY } from "@/hooks/use-referrals";

/**
 * Universal-link target: /referral/:code → capture code and land on home with ?ref=.
 */
export default function ReferralDeepLinkPage() {
  const [, params] = useRoute("/referral/:code");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const raw = params?.code?.trim();
    if (raw) {
      try {
        window.localStorage.setItem(PENDING_REFERRAL_KEY, raw.toUpperCase());
      } catch {
        // ignore
      }
      setLocation(`/?ref=${encodeURIComponent(raw)}`);
      return;
    }
    capturePendingReferralCode();
    setLocation("/referrals");
  }, [params?.code, setLocation]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Opening invite…
    </div>
  );
}
