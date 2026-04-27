import { lazy, Suspense } from "react";
import { ReactInstanceRecovery } from "@/components/react-instance-recovery";

// Everything heavy — Firebase Auth, React Query, i18n providers, the
// router, every page route, the Layout shell — lives in AppCore. By
// lazy-loading it here we keep the eager bundle minimal so iOS Safari's
// WebContent process on memory-constrained iPhones (e.g. iPhone 13
// with 4 GB RAM) doesn't get killed by Jetsam during initial parse +
// React mount. The splash screen rendered by index.html stays visible
// until AppCore loads and renders, so there's no blank-screen flash.
//
// Retry once on ChunkLoadError. On a flaky mobile network the first
// fetch can fail (or be served a stale 404 from a CDN edge mid-deploy);
// a single retry with a cache-busting query string recovers without a
// full page reload. If it still fails, the rejection bubbles up to the
// ReactInstanceRecovery error boundary, which renders the recovery UI
// (rather than leaving the user on a permanent splash).
const AppCore = lazy(() =>
  import("./AppCore").catch((firstErr) => {
    if (typeof window !== "undefined") {
      try { window.__amynestMark?.("appcore-chunk-retry"); } catch (_e) { /* best-effort */ }
    }
    return import(/* @vite-ignore */ `./AppCore?retry=${Date.now()}`).catch(
      (secondErr) => {
        if (typeof window !== "undefined") {
          try { window.__amynestMark?.("appcore-chunk-failed"); } catch (_e) { /* best-effort */ }
        }
        // Re-throw the original error so the recovery boundary shows
        // it. The retry's error is logged via the phase marker above.
        throw firstErr instanceof Error ? firstErr : secondErr;
      },
    );
  }),
);

declare global {
  interface Window {
    __amynestMark?: (phase: string) => void;
  }
}

function App() {
  // Suspense fallback is `null` rather than a spinner because the
  // index.html splash screen is still visible at this point — it's not
  // dismissed until BOTH the splash min-time has elapsed AND
  // `__amynestAppCoreReady` is true (see main.tsx). That readiness
  // gate means the splash always covers the lazy AppCore download, so
  // the user never sees a blank Suspense fallback even on slow networks.
  return (
    <ReactInstanceRecovery>
      <Suspense fallback={null}>
        <AppCore />
      </Suspense>
    </ReactInstanceRecovery>
  );
}

export default App;
