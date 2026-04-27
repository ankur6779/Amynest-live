import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

// Boot diagnostic helpers installed by the inline <script> in index.html.
// They write phase markers to localStorage so we can detect mid-boot crashes
// on the next load and auto-fall back to a minimal splash. See the comment
// block in index.html for the full design.
declare global {
  interface Window {
    __amynestMark?: (phase: string) => void;
    __amynestDiag?: () => unknown;
  }
}
const mark = (p: string) => {
  try { window.__amynestMark?.(p); } catch (_e) { /* breadcrumbs are best-effort */ }
};

mark("bundle-loaded");

const root = createRoot(document.getElementById("root")!);

root.render(<App />);
mark("react-rendered");

// Dismiss the splash screen after React has painted AND a minimum display
// time has elapsed, so the "Meet AMY" intro animation can play in full.
// Total perceived duration ≈ 2.7s visible + 0.7s fade = ~3.4s.
// Skip the full animation when the user navigates directly to an inner page
// (e.g. /sign-in, /sign-up) — the splash belongs only to the root entry.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const isRootEntry =
  window.location.pathname === "/" ||
  window.location.pathname === BASE ||
  window.location.pathname === BASE + "/";

// On a known-affected device (lite-splash class set by the inline boot
// script — either iOS or post-crash recovery) shorten the splash to
// 1200ms so its animations stop competing with React mount for GPU
// memory. Other browsers keep the full 3200ms intro.
const isLiteSplash =
  document.documentElement.classList.contains("lite-splash");
const SPLASH_MIN_MS = !isRootEntry ? 0 : isLiteSplash ? 1200 : 3200;

const splashStartedAt = performance.now();

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    mark("splash-raf-fired");
    const elapsed = performance.now() - splashStartedAt;
    const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
    setTimeout(() => {
      mark("splash-timer-fired");
      const splash = document.getElementById("splash");
      if (splash) {
        splash.classList.add("splash-hide");
        mark("splash-hide-class-added");
        // Remove from DOM after the CSS transition ends so it no longer
        // intercepts pointer events or occupies the accessibility tree.
        splash.addEventListener("transitionend", () => {
          splash.remove();
          mark("splash-hidden");
        }, { once: true });
      } else {
        // No splash element — mark immediately so the crash detector
        // doesn't flag this load as incomplete.
        mark("splash-hidden");
      }
    }, wait);
  });
});
