import {
  resolveStoreLinks,
  type AmyNestStoreLinks,
} from "../metadata/store-links.js";

/** Build the standard AmyNest pinned-comment template. */
export function buildPinnedComment(
  links: AmyNestStoreLinks = resolveStoreLinks(),
): string {
  return [
    "💜 Thanks for watching!",
    "",
    "📲 Download AmyNest AI",
    "",
    "🌐 Website",
    links.websiteUrl,
    "",
    "🤖 Try AmyNest",
    links.getAppUrl,
    "",
    "▶ Google Play",
    links.playStoreUrl,
    "",
    "🍎 App Store",
    links.appStoreUrl,
    "",
    "Which feature would you like to see next?",
  ].join("\n");
}
