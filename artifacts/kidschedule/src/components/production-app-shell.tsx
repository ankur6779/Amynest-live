import { useEffect, useState, type ReactNode } from "react";
import { RedirectLoopGuard } from "@/components/redirect-loop-guard";
import { AuthBootShell } from "@/components/auth-boot-shell";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import { enforceProductionDomain } from "@/lib/domain-gate";
import { isProductionEnvironment } from "@/lib/runtime-crash-policy";
import { initializeFirebase, type FirebaseInitResult } from "@/lib/firebase";
import { beginFirebaseOAuthRedirectResolution } from "@/lib/firebase-oauth-redirect";
import { patchBootDiagnostics } from "@/lib/boot-store";
import { trackStartupFunnel, trackStartupFunnelFailure } from "@/lib/startup-funnel";

type Props = { children: ReactNode };

function DomainGate({ children }: Props) {
  const [status, setStatus] = useState<"checking" | "ok" | "redirecting">("checking");

  useEffect(() => {
    const result = enforceProductionDomain();
    setStatus(result === "redirecting" ? "redirecting" : "ok");
    patchBootDiagnostics({
      hostname: window.location.hostname,
    });
  }, []);

  if (status === "checking" || status === "redirecting") {
    return <AuthBootShell />;
  }
  return <>{children}</>;
}

function FirebaseInitGate({ children }: Props) {
  const [init, setInit] = useState<FirebaseInitResult | null>(null);

  useEffect(() => {
    trackStartupFunnel("firebase_init_started");
    const init = initializeFirebase();
    if (init.status === "ok") {
      beginFirebaseOAuthRedirectResolution();
    }
    setInit(init);
    if (init.status === "ok") {
      trackStartupFunnel("firebase_init_finished");
    } else if (init.status === "fail") {
      trackStartupFunnelFailure("firebase_failed", init.error ?? "firebase_init_failed");
    }
  }, []);

  if (!init || init.status === "pending") {
    return <AuthBootShell />;
  }

  if (init.status === "fail") {
    return (
      <AppFallbackUi
        message={
          isProductionEnvironment()
            ? "We're having trouble loading this screen.\nPlease try again."
            : (init.error ?? "Firebase could not initialize.")
        }
        onTryAgain={() => window.location.reload()}
        onGoHome={() => {
          const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
          window.location.assign(`${base}/dashboard`.replace(/\/{2,}/g, "/"));
        }}
      />
    );
  }

  return <>{children}</>;
}

/**
 * Outermost shell: domain gate, Firebase init, redirect-loop guard.
 * Renders BEFORE route/auth providers.
 */
export function ProductionAppShell({ children }: Props) {
  return (
    <div className="flex w-full max-w-full min-w-0 flex-1 flex-col">
      <DomainGate>
        <FirebaseInitGate>
          <RedirectLoopGuard>{children}</RedirectLoopGuard>
        </FirebaseInitGate>
      </DomainGate>
    </div>
  );
}
