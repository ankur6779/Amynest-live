import type { ContentPackage } from "../../types/content-package.js";
import {
  resolveStoreLinks,
  type AmyNestStoreLinks,
} from "../metadata/store-links.js";
import type { LocalizedMetadata } from "./types.js";

/**
 * English + Hindi metadata for YouTube `localizations` (future-ready).
 * Hindi uses curated parenting-friendly copy — no external translation API.
 */
export function buildLocalizations(input: {
  content: ContentPackage;
  englishTitle: string;
  englishDescription: string;
  links?: AmyNestStoreLinks;
}): { en: LocalizedMetadata; hi: LocalizedMetadata } {
  const links = input.links ?? resolveStoreLinks();
  const topic = input.content.topic.title.trim();
  const hiTopic = hindiTopicLine(input.content);

  return {
    en: {
      title: input.englishTitle,
      description: input.englishDescription,
    },
    hi: {
      title: clampHi(`${hiTopic} | AmyNest AI`),
      description: [
        "✨ AmyNest AI के साथ पेरेंटिंग आसान लगे।",
        "",
        `आज का विषय: ${topic}`,
        "",
        "Study Zone हर दिन नया, उम्र के अनुसार पाठ देता है — सीखने का मज़ा दोहराव की जगह।",
        "",
        "📚 सुविधाएँ: Daily Study Zone · Routines · Speech · Health · Games · Amy AI Coach",
        "",
        "📲 AmyNest AI डाउनलोड करें",
        "",
        "🌐 वेबसाइट",
        links.websiteUrl,
        "",
        "🤖 वेब पर आज़माएँ",
        links.getAppUrl,
        "",
        "▶ Google Play",
        links.playStoreUrl,
        "",
        "🍎 App Store",
        links.appStoreUrl,
        "",
        "#AmyNest #Parenting #KidsLearning #StudyZone #Shorts",
      ].join("\n"),
    },
  };
}

function hindiTopicLine(content: ContentPackage): string {
  const cat = content.topic.category;
  if (/Learning|Brain/i.test(cat)) return "रोज़ नया Study Zone पाठ";
  if (/Speech/i.test(cat)) return "बोलचाल और भाषा की मदद";
  if (/Routines/i.test(cat)) return "शांत दिनचर्या के आसान कदम";
  if (/Games/i.test(cat)) return "सीखने वाले मज़ेदार गेम्स";
  if (/Sleep|Nutrition|Baby|Health|Safety/i.test(cat)) {
    return "सेहतमंद आदतें, शांत माता-पिता";
  }
  return "आज की पेरेंटिंग टिप";
}

function clampHi(title: string): string {
  if (title.length <= 70) return title;
  return `${title.slice(0, 67).trimEnd()}...`;
}
