import { lazy, Suspense, useEffect, useState } from "react";
import { markAppShellReady } from "@/lib/startup-orchestrator";
import { devLog } from "@/lib/dev-log";
import { initNativeShell } from "@/lib/native-shell";
import { AuthBootShell } from "@/components/auth-boot-shell";
import DebugOverlay from "@/components/DebugOverlay";
import { ReactInstanceRecovery } from "@/components/react-instance-recovery";
import { StartupWatchdogGate } from "@/components/startup-watchdog-gate";
import { ForceUpdateScreen } from "@/components/force-update-screen";
import { OptionalUpdateDialog } from "@/components/optional-update-dialog";
import {
  evaluateVersionGate,
  openStoreUrl,
  setNativeForceUpdateActive,
  type VersionGateDecision,
} from "@/lib/version-service";
import {
  installVersionAnalyticsRetry,
  trackVersionAnalytics,
} from "@/lib/version-analytics";
import { trackStartupFunnel } from "@/lib/startup-funnel";

// Everything heavy — Firebase Auth, providers, the router, every page route,
// and the Layout shell — lives in AppCore. The shell starts the AppCore import
// only after the first browser paint so AppCore parsing cannot block first UI.
const AppCoreLoader = lazy(() => import("./AppCoreLoader"));

declare global {
  interface Window {
    __amynestMark?: (phase: string) => void;
  }
}

function App() {
  const [shouldLoadAppCore, setShouldLoadAppCore] = useState(false);
  const [versionDecision, setVersionDecision] = useState<VersionGateDecision | null>(null);
  const [showSoftUpdate, setShowSoftUpdate] = useState(false);

  useEffect(() => {
    devLog("APP MOUNTED");
    markAppShellReady();
    initNativeShell();
    installVersionAnalyticsRetry();
  }, []);

  useEffect(() => {
    let cancelled = false;
    trackStartupFunnel("version_check_started");
    void evaluateVersionGate()
      .then((decision) => {
        if (cancelled) return;
        trackStartupFunnel("version_check_finished", {
          meta: { decision: decision.kind },
        });
        setVersionDecision(decision);
        const isHardUpdate = decision.kind === "hard-update";
        setNativeForceUpdateActive(isHardUpdate);
        if (decision.kind === "hard-update") {
          const { platform, installedVersion, policy } = decision;
          trackVersionAnalytics(
            "force_update_displayed",
            {
              platform,
              installedVersion,
              minimumVersion: policy.minimumVersion,
              latestVersion: policy.latestVersion,
              forceUpdate: policy.forceUpdate,
              updateType: "hard",
            },
            {
              onceKey: `${platform}:${installedVersion}:${policy.minimumVersion}:${policy.latestVersion}:hard-displayed`,
            },
          );
        }
        if (decision.kind === "soft-update") {
          setShowSoftUpdate(true);
          const { platform, installedVersion, policy } = decision;
          trackVersionAnalytics(
            "optional_update_displayed",
            {
              platform,
              installedVersion,
              minimumVersion: policy.minimumVersion,
              latestVersion: policy.latestVersion,
              forceUpdate: policy.forceUpdate,
              updateType: "soft",
            },
            {
              onceKey: `${platform}:${installedVersion}:${policy.minimumVersion}:${policy.latestVersion}:soft-displayed`,
            },
          );
        }
      })
      .catch((err) => {
        console.error("[amynest:version] gate failed open", err);
        if (!cancelled) {
          setNativeForceUpdateActive(false);
          setVersionDecision({ kind: "allow", platform: null, reason: "gate_exception" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!versionDecision || versionDecision.kind === "hard-update") return;
    let cancelled = false;
    let secondFrame: number | null = null;
    const id = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (!cancelled) setShouldLoadAppCore(true);
        trackStartupFunnel("appcore_started");
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
      if (secondFrame !== null) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, [versionDecision]);

  if (versionDecision?.kind === "hard-update") {
    const { platform, installedVersion, policy } = versionDecision;
    return (
      <ForceUpdateScreen
        message={policy.message}
        latestVersion={policy.latestVersion}
        onUpdateNow={() => {
          trackVersionAnalytics("force_update_update_clicked", {
            platform,
            installedVersion,
            minimumVersion: policy.minimumVersion,
            latestVersion: policy.latestVersion,
            forceUpdate: policy.forceUpdate,
            updateType: "hard",
          }, {
            onceKey: `${platform}:${installedVersion}:${policy.minimumVersion}:${policy.latestVersion}:hard-clicked`,
          });
          void openStoreUrl(platform, policy.storeUrl);
        }}
      />
    );
  }

  return (
    <div id="app-root" className="app-root w-full max-w-full min-w-0">
      <div className="app-scroll page-content">
        <DebugOverlay />
        <StartupWatchdogGate>
          <ReactInstanceRecovery>
            <Suspense fallback={<AuthBootShell />}>
              {shouldLoadAppCore ? <AppCoreLoader /> : <AuthBootShell />}
            </Suspense>
          </ReactInstanceRecovery>
        </StartupWatchdogGate>
        {versionDecision?.kind === "soft-update" && showSoftUpdate ? (
          <OptionalUpdateDialog
            message={versionDecision.policy.message}
            latestVersion={versionDecision.policy.latestVersion}
            onLater={() => {
              trackVersionAnalytics(
                "optional_update_dismissed",
                {
                  platform: versionDecision.platform,
                  installedVersion: versionDecision.installedVersion,
                  minimumVersion: versionDecision.policy.minimumVersion,
                  latestVersion: versionDecision.policy.latestVersion,
                  forceUpdate: versionDecision.policy.forceUpdate,
                  updateType: "soft",
                },
                {
                  onceKey: `${versionDecision.platform}:${versionDecision.installedVersion}:${versionDecision.policy.minimumVersion}:${versionDecision.policy.latestVersion}:soft-dismissed`,
                },
              );
              setShowSoftUpdate(false);
            }}
            onUpdate={() => {
              trackVersionAnalytics("force_update_update_clicked", {
                platform: versionDecision.platform,
                installedVersion: versionDecision.installedVersion,
                minimumVersion: versionDecision.policy.minimumVersion,
                latestVersion: versionDecision.policy.latestVersion,
                forceUpdate: versionDecision.policy.forceUpdate,
                updateType: "soft",
              }, {
                onceKey: `${versionDecision.platform}:${versionDecision.installedVersion}:${versionDecision.policy.minimumVersion}:${versionDecision.policy.latestVersion}:soft-clicked`,
              });
              void openStoreUrl(versionDecision.platform, versionDecision.policy.storeUrl);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export default App;
