import { useEffect, useState, type ReactNode } from "react";
import { BootDebugOverlay } from "@/components/boot-debug-overlay";
import { RedirectLoopGuard } from "@/components/redirect-loop-guard";
import { AuthBootShell } from "@/components/auth-boot-shell";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import { enforceProductionDomain } from "@/lib/domain-gate";
import { initializeFirebase, type FirebaseInitResult } from "@/lib/firebase";
import { patchBootDiagnostics } from "@/lib/boot-store";

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
    setInit(initializeFirebase());
  }, []);

  if (!init || init.status === "pending") {
    return <AuthBootShell />;
  }

  if (init.status === "fail") {
    return (
      <AppFallbackUi
        title="Firebase failed to start"
        message={init.error ?? "Firebase could not initialize."}
        onReload={() => window.location.reload()}
      />
    );
  }

  return <>{children}</>;
}

/**
 * Outermost shell: debug overlay, domain, Firebase init, redirect-loop guard.
 * Renders BEFORE route/auth providers.
 */
export function ProductionAppShell({ children }: Props) {
  return (
    <>
      <BootDebugOverlay />
      <DomainGate>
      <FirebaseInitGate>
        <RedirectLoopGuard>{children}</RedirectLoopGuard>
      </FirebaseInitGate>
      </DomainGate>
    </>
  );
}
