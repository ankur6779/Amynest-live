import { PremiumWelcomeModal } from "@/components/premium-welcome-modal";
import {
  dismissPremiumWelcome,
  usePremiumWelcomeOpen,
} from "@/lib/premium-welcome-controller";

/** App-shell host for post-purchase Premium welcome (outside the paywall dialog). */
export function PremiumWelcomeHost() {
  const open = usePremiumWelcomeOpen();
  return (
    <PremiumWelcomeModal open={open} onContinue={dismissPremiumWelcome} />
  );
}
