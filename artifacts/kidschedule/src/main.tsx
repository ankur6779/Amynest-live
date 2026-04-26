import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

const root = createRoot(document.getElementById("root")!);

root.render(<App />);

// Dismiss the splash screen after React has painted AND a minimum display
// time has elapsed, so the "Meet AMY" intro animation can play in full.
// Total perceived duration ≈ 2.7s visible + 0.7s fade = ~3.4s.
const SPLASH_MIN_MS = 3200; // keep visible long enough for shimmer at 2.9s to complete
const splashStartedAt = performance.now();

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const elapsed = performance.now() - splashStartedAt;
    const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
    setTimeout(() => {
      const splash = document.getElementById("splash");
      if (splash) {
        splash.classList.add("splash-hide");
        // Remove from DOM after the CSS transition ends so it no longer
        // intercepts pointer events or occupies the accessibility tree.
        splash.addEventListener("transitionend", () => splash.remove(), { once: true });
      }
    }, wait);
  });
});
