// i18n-ignore-start — debug/dev tool: English-only by design
import { lazy, Suspense, useEffect, useState } from "react";
import { Activity } from "lucide-react";
import {
  installAmyRuntimeInspector,
  isAmyRuntimeInspectorBuildEnabled,
  isAmyRuntimeInspectorEnabled,
  setAmyRuntimeInspectorPreferred,
} from "@/lib/amy-runtime-inspector";

const RuntimeInspectorConsole = lazy(() =>
  import("./runtime-inspector-console").then((m) => ({
    default: m.RuntimeInspectorConsole,
  })),
);

/**
 * Floating DEV host for Amy Runtime Inspector.
 * Renders nothing in production builds.
 */
export function AmyRuntimeInspectorHost() {
  if (!isAmyRuntimeInspectorBuildEnabled()) return null;
  return <AmyRuntimeInspectorHostInner />;
}

function AmyRuntimeInspectorHostInner() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return new URLSearchParams(window.location.search).get("runtimeInspector") === "1";
    } catch {
      return false;
    }
  });
  const [path, setPath] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "",
  );

  useEffect(() => {
    if (!isAmyRuntimeInspectorEnabled()) return;
    installAmyRuntimeInspector();
  }, []);

  useEffect(() => {
    if (!open) return;
    setAmyRuntimeInspectorPreferred(true);
    installAmyRuntimeInspector();
  }, [open]);

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    sync();
    window.addEventListener("popstate", sync);
    const prevPush = history.pushState.bind(history);
    const prevReplace = history.replaceState.bind(history);
    history.pushState = (...args) => {
      prevPush(...args);
      sync();
    };
    history.replaceState = (...args) => {
      prevReplace(...args);
      sync();
    };
    return () => {
      window.removeEventListener("popstate", sync);
      history.pushState = prevPush;
      history.replaceState = prevReplace;
    };
  }, []);

  // First-experience film: no competing chrome. Photography owns attention.
  if (path === "/begin" && !open) return null;

  return (
    <>
      <button
        type="button"
        data-testid="amy-runtime-inspector-toggle"
        title="Amy Runtime Inspector"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 left-4 z-[199] flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/50 bg-[#120f1c]/95 text-violet-200 shadow-lg hover:bg-violet-950"
      >
        <Activity className="h-4 w-4" />
      </button>
      {open && (
        <Suspense fallback={null}>
          <RuntimeInspectorConsole onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
// i18n-ignore-end
