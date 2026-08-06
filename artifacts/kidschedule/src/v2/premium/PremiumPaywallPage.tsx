/**
 * Premium V2 route page — flag-gated. Redirects to legacy pricing when off.
 * Guest / anonymous: account-required gate only (no fake checkout).
 */

import { Redirect } from "wouter";
import { useAuth, useUser } from "@/lib/firebase-auth-hooks";
import { isAnonymousUser } from "@/lib/anonymous-auth";
import { V2_PREPARE_COPY } from "@/v2/craft";
import { V2CalmPrepare } from "@/v2/shell/V2CalmPrepare";
import { AccountRequiredGate } from "./AccountRequiredGate";
import { isPremiumV2Enabled } from "./flags";
import { PremiumJourney } from "./PremiumJourney";
import { usePremiumJourney } from "./use-premium-journey";

export default function PremiumPaywallPage() {
  if (!isPremiumV2Enabled()) {
    return <Redirect to="/pricing" />;
  }

  return <PremiumPaywallShell />;
}

function PremiumPaywallShell() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <main data-testid="v2-premium-auth-loading">
        <V2CalmPrepare
          message={V2_PREPARE_COPY.continueWays}
          ariaLabel={V2_PREPARE_COPY.continueWays}
          density="standard"
        />
      </main>
    );
  }

  // Unsigned guest or Firebase anonymous — never start store checkout.
  if (!isSignedIn || isAnonymousUser(user)) {
    return <AccountRequiredGate />;
  }

  return <PremiumPaywallAuthenticated />;
}

function PremiumPaywallAuthenticated() {
  const journey = usePremiumJourney();

  return (
    <PremiumJourney
      state={journey.state}
      plans={journey.plans}
      selectedPlan={journey.selectedPlan}
      onSelectPlan={journey.selectPlan}
      onPurchase={() => void journey.purchase()}
      onRestore={() => void journey.restore()}
      onRetry={journey.retry}
      onDismissCancel={journey.dismissCancel}
      busy={journey.nativePurchasing || journey.subscriptionLoading}
    />
  );
}
