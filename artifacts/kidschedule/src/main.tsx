import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

const root = createRoot(document.getElementById("root")!);

root.render(<App />);

// Dismiss the splash screen once React has painted its first frame.
// Two rAF calls ensure the browser has actually committed the paint before
// we start fading the splash out (avoids a brief white flash on fast devices).
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("splash-hide");
      // Remove from DOM after the CSS transition ends so it no longer
      // intercepts pointer events or occupies the accessibility tree.
      splash.addEventListener("transitionend", () => splash.remove(), { once: true });
    }
  });
});
