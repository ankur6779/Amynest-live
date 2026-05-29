import type { ContentContext, ContentType } from "../types.js";

/**
 * Template-based dynamic copy enhancement (no network call).
 * Produces varied educational / motivational / curiosity phrasing
 * while preserving factual recommendation content.
 */
export function enhanceWithAiCopy(input: {
  ctx: ContentContext;
  title: string;
  body: string;
  contentType: ContentType;
  topicKey: string;
}): { title: string; body: string } {
  const { ctx, title, body, contentType } = input;
  const variant = hashMod(`${ctx.localDate}:${input.topicKey}:${ctx.userId}`, 6);

  const titlePrefixes: Partial<Record<ContentType, string[]>> = {
    educational: ["Learn today:", "Try this:", "Brain spark:"],
    motivational: ["You've got this:", "Gentle nudge:", "Keep going:"],
    curiosity: ["Wonder moment:", "Tonight:", "Story spark:"],
    parent_insight: ["Parent tip:", "Today's insight:", "Quick win:"],
    action_challenge: ["Action idea:", "Try now:", "Small step:"],
    achievement: ["Celebrate:", "Win alert:", "Progress:"],
  };

  const bodyOpeners: Partial<Record<ContentType, string[]>> = {
    educational: ["", "Learning moment — ", "Quick activity: "],
    motivational: ["", "Remember: ", "From Amy: "],
    curiosity: ["", "Bedtime idea: ", "Story prompt: "],
    parent_insight: ["", "Evidence-based tip: ", "Worth trying: "],
    action_challenge: ["", "Fresh pick: ", "New idea: "],
  };

  const prefixes = titlePrefixes[contentType];
  const openers = bodyOpeners[contentType];

  let outTitle = title;
  let outBody = body;

  if (prefixes && variant % 3 === 0) {
    const p = prefixes[variant % prefixes.length]!;
    if (!title.startsWith(p)) outTitle = `${p} ${title.replace(/^[\w\s]+:\s*/, "")}`;
  }

  if (openers && variant % 4 === 1) {
    const o = openers[variant % openers.length]!;
    if (o && !body.startsWith(o)) outBody = o + body;
  }

  // Seasonal flavour (light touch)
  if (ctx.season === "monsoon" && variant % 5 === 2 && contentType === "action_challenge") {
    outBody = outBody.replace(/\.$/, " — perfect for a rainy afternoon.");
  }
  if (ctx.season === "festive" && variant % 5 === 3) {
    outBody = outBody.replace(/\.$/, " — festive season is a great time to try this.");
  }

  return { title: outTitle, body: outBody };
}

function hashMod(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}
