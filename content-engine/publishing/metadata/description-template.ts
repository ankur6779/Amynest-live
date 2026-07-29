/**
 * Rich SEO YouTube description template for AmyNest Shorts.
 */

import {
  resolveStoreLinks,
  type AmyNestStoreLinks,
} from "./store-links.js";

/** Build the optimized AmyNest Shorts description. */
export function buildOptimizedDescription(
  links: AmyNestStoreLinks = resolveStoreLinks(),
): string {
  return [
    "✨ Parenting feels easier with AmyNest AI.",
    "",
    "Study Zone gives your child a fresh, age-appropriate lesson every day so learning feels exciting instead of repetitive.",
    "",
    "📚 Features:",
    "",
    "• Daily Study Zone",
    "• Personalized routines",
    "• Speech & Language",
    "• Health Activities",
    "• Learning Games",
    "• Amy AI Parenting Coach",
    "• Audio Learning",
    "• More coming soon",
    "",
    "📲 Download AmyNest AI",
    "",
    "🌐 Website",
    links.websiteUrl,
    "",
    "🤖 Try AmyNest on the Web",
    links.getAppUrl,
    "",
    "▶ Google Play",
    links.playStoreUrl,
    "",
    "🍎 App Store",
    links.appStoreUrl,
    "",
    "If you're a parent looking for smarter daily learning, subscribe for more parenting tips and AmyNest updates.",
    "",
    "#AmyNest",
    "#Parenting",
    "#KidsLearning",
    "#EarlyLearning",
    "#LearningApps",
    "#ParentingTips",
    "#StudyZone",
    "#Shorts",
  ].join("\n");
}
