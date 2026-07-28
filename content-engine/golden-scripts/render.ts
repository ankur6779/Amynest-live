import type { GoldenScript } from "./types.js";

export function renderGoldenScriptMarkdown(script: GoldenScript): string {
  const q = script.quality;
  const hooksTable = script.hooks
    .map(
      (h, i) =>
        `| ${i + 1} | ${escapeMd(h.text)} | ${h.retentionPredict} | ${h.curiosity} | ${h.clickbaitRisk} |${
          h.text === script.selectedHook.text ? " ✅ selected" : ""
        } |`,
    )
    .join("\n");

  return `# ${script.title}

> Golden Script **#${String(script.number).padStart(3, "0")}** · ${script.category}  
> Overall: **${q.overall}/100** · Storycraft: **${q.storycraft}/100** · Muted Video: **${q.mutedVideo}/100** · Rewrites: ${script.rewritePasses}  
> **Laws:** Emotion first · Visual story first · Show over tell · Hope before download

## Meta

| Field | Value |
|---|---|
| ID | \`${script.id}\` |
| Topic | ${escapeMd(script.topic)} |
| Target Age | ${escapeMd(script.targetAge)} |
| Target Parent | ${escapeMd(script.targetParent)} |
| Objective | ${escapeMd(script.objective)} |
| Suggested Duration | ${script.suggestedDuration} |
| Suggested Emotion | ${script.suggestedEmotion} |
| Suggested Characters | ${script.suggestedCharacters.join(", ")} |

## Real Feature (Accuracy Lock)

| Field | Value |
|---|---|
| Feature | **${escapeMd(script.featureName)}** |
| Feature ID | \`${script.featureId}\` |
| Source | \`${script.featureSource}\` |

> Feature appears only after the parenting situation and emotional problem are established. Never invent capabilities.

## First 3 Seconds (Stop the Scroll)

${script.firstThreeSeconds}

**Selected opening line (hook):**

> ${escapeMd(script.selectedHook.text)}

## Parenting Situation (Cold Open — No Product)

${script.parentingSituation}

## Hook Engine (10 situation variations)

All hooks are product-free. Ranked by predicted retention.

| # | Hook | Retention Predict | Curiosity | Clickbait Risk | Pick |
|---|---|---:|---:|---:|---|
${hooksTable}

## Story Flow (Emotion → Product → Hope)

1. **Hook (0–3s)** — ${escapeMd(script.storyFlow[0] ?? script.selectedHook.text)}
2. **Parenting Situation** — ${escapeMd(script.parentingSituation)}
3. **Problem** — ${escapeMd(script.problem)}
4. **Emotion** — ${escapeMd(script.emotionBeat)}
5. **Product Entry (only now)** — ${escapeMd(script.productEntryBeat)}
6. **Transformation** — ${escapeMd(script.featureDemo)} → ${escapeMd(script.expectedChildOutcome)}
7. **Hope Close (final 3s)** — ${escapeMd(script.hopeClose)}
8. **Soft CTA** — after hope lands

## Full Script Beats

### Problem
${script.problem}

### Why Parents Face It
${script.whyParentsFaceIt}

### Emotion Beat
${script.emotionBeat}

### Product Entry Beat
${script.productEntryBeat}

### AmyNest Solution
${script.amynestSolution}

### Real Feature Demonstration
${script.featureDemo}

### Expected Child Outcome
${script.expectedChildOutcome}

### Parent Benefit
${script.parentBenefit}

### Hope Close (Final 3 Seconds)
${script.hopeClose}

> Parents should remember this feeling first — AmyNest second.

### CTA (After Hope)
\`\`\`
${script.cta}
\`\`\`

## Muted Video Test (Visual Story First)

**PASS required.** Design as a visual story first and a narrated story second. Prefer showing over telling.

### First 10 Seconds — Sound OFF

${script.mutedVisual.mutedTestSummary.first10}

| Window | SHOW (no audio needed) | MUTED VIEWER READS |
|---|---|---|
${script.mutedVisual.first10SecondsMuted
  .map(
    (s) =>
      `| ${escapeMd(s.window)} | ${escapeMd(s.show)} | ${escapeMd(s.readsAs)} |`,
  )
  .join("\n")}

### Last 5 Seconds — No Narration

${script.mutedVisual.mutedTestSummary.last5}

| Window | SHOW (no narration needed) | MUTED VIEWER READS |
|---|---|---|
${script.mutedVisual.last5SecondsMuted
  .map(
    (s) =>
      `| ${escapeMd(s.window)} | ${escapeMd(s.show)} | ${escapeMd(s.readsAs)} |`,
  )
  .join("\n")}

### Silent Story Beats

${script.mutedVisual.silentStoryBeats.map((b) => `- ${b}`).join("\n")}

### Show, Don’t Tell

${script.mutedVisual.showDontTell.map((b) => `- ${b}`).join("\n")}

## Production Direction

| Field | Direction |
|---|---|
| Suggested Camera Style | ${escapeMd(script.suggestedCameraStyle)} |
| Suggested Music | ${escapeMd(script.suggestedMusic)} |
| Suggested Thumbnail | ${escapeMd(script.suggestedThumbnail)} |
| Suggested Opening Scene | ${escapeMd(script.suggestedOpeningScene)} |
| Suggested Ending Scene | ${escapeMd(script.suggestedEndingScene)} |

### Tiny Pixar Short — Not an Ad

- Open on a real parent moment the audience recognizes instantly.
- Earn the emotional problem before any feature or UI appears.
- Amy / AmyNest enter as a guide after the feeling lands.
- End on hope; store badges follow the feeling, they do not replace it.
- If sound is off for the first 10s, the emotional story still reads.
- If narration is off for the last 5s, the AmyNest solution still reads.

## Quality Scorecard

| Dimension | Score |
|---|---:|
| Hook | ${q.hook} |
| Story | ${q.story} |
| Parent Value | ${q.parentValue} |
| Educational Value | ${q.educationalValue} |
| Brand Consistency | ${q.brandConsistency} |
| Feature Accuracy | ${q.featureAccuracy} |
| Retention Prediction | ${q.retentionPrediction} |
| CTR Prediction | ${q.ctrPrediction} |
| Emotional Impact | ${q.emotionalImpact} |
| CTA Strength | ${q.ctaStrength} |
| Storycraft (emotion-first) | ${q.storycraft} |
| Muted Video Test | ${q.mutedVideo} |
| **Overall** | **${q.overall}** |

### Acceptance
- Threshold: **90**
- Emotion-first lock: **PASS** (no product before problem)
- Muted Video Test: **PASS** (first 10s + last 5s)
- Status: **ACCEPTED**

---

*AmyNest Golden Script Library · Visual story first · Official characters only: Amy AI, Amy Girl, Amy Boy*
`;
}

export function renderLibraryIndex(scripts: GoldenScript[]): string {
  const avg =
    Math.round(
      (scripts.reduce((sum, s) => sum + s.quality.overall, 0) / scripts.length) * 10,
    ) / 10;
  const storycraftAvg =
    Math.round(
      (scripts.reduce((sum, s) => sum + s.quality.storycraft, 0) / scripts.length) * 10,
    ) / 10;
  const mutedAvg =
    Math.round(
      (scripts.reduce((sum, s) => sum + s.quality.mutedVideo, 0) / scripts.length) * 10,
    ) / 10;

  const byCategory = new Map<string, GoldenScript[]>();
  for (const s of scripts) {
    const list = byCategory.get(s.category) ?? [];
    list.push(s);
    byCategory.set(s.category, list);
  }

  const categorySummary = [...byCategory.entries()]
    .map(([cat, list]) => {
      const catAvg =
        Math.round((list.reduce((a, b) => a + b.quality.overall, 0) / list.length) * 10) /
        10;
      return `| ${cat} | ${list.length} | ${catAvg} |`;
    })
    .join("\n");

  const top10 = [...scripts]
    .sort(
      (a, b) =>
        b.quality.overall * 2 +
        b.quality.storycraft +
        b.quality.emotionalImpact +
        b.quality.retentionPrediction -
        (a.quality.overall * 2 +
          a.quality.storycraft +
          a.quality.emotionalImpact +
          a.quality.retentionPrediction),
    )
    .slice(0, 10);

  const topTable = top10
    .map(
      (s, i) =>
        `| ${i + 1} | [#${String(s.number).padStart(3, "0")}](./${s.filename}) | ${escapeMd(s.title)} | ${s.category} | ${s.quality.overall} | ${s.quality.storycraft} | ${s.quality.emotionalImpact} |`,
    )
    .join("\n");

  const productionOrder = [...scripts].sort((a, b) => {
    const score = (s: GoldenScript) =>
      s.quality.storycraft * 0.3 +
      s.quality.retentionPrediction * 0.25 +
      s.quality.emotionalImpact * 0.25 +
      s.quality.overall * 0.2;
    return score(b) - score(a);
  });

  const prodTable = productionOrder
    .map(
      (s, i) =>
        `| ${i + 1} | [#${String(s.number).padStart(3, "0")}](./${s.filename}) | ${s.category} | ${escapeMd(s.title)} | ${s.suggestedDuration} | ${s.quality.overall} |`,
    )
    .join("\n");

  const toc = scripts
    .map(
      (s) =>
        `${s.number}. [${s.title}](./${s.filename}) — *${s.category}* (score ${s.quality.overall}, storycraft ${s.quality.storycraft})`,
    )
    .join("\n");

  return `# AmyNest Golden Script Library

**Status:** Production foundation · Emotion-first · Visual-story-first  
**Scripts:** ${scripts.length}  
**Average Quality Score:** **${avg}/100**  
**Average Storycraft Score:** **${storycraftAvg}/100**  
**Average Muted Video Score:** **${mutedAvg}/100**  
**Acceptance rule:** Reject below 90 — including failed Muted Video Test  
**Characters:** Official only — Amy AI, Amy Girl, Amy Boy  
**Scope:** Scripts only (no video, image, render, or publish in this release)

---

## Storycraft Laws (Locked)

1. Every script begins with a **real parenting situation**.
2. The AmyNest feature **never** appears before the emotional problem is established.
3. The audience must relate to the parent before the product is introduced.
4. Every video must feel like a **tiny Pixar short**, not a software advertisement.
5. The **first 3 seconds** must stop scrolling.
6. The **final 3 seconds** must create **hope**, not only ask for a download.
7. Parents should remember the **emotion first** and AmyNest second.
8. **Muted Video Test:** first 10s with sound OFF still tells the emotional story.
9. **Muted Video Test:** last 5s without narration still shows why AmyNest solved it.
10. Design every script as a **visual story first** and a narrated story second. Prefer showing over telling.

---

## Table of Contents

${toc}

---

## Category Summary

| Category | Scripts | Avg Score |
|---|---:|---:|
${categorySummary}

---

## Average Quality Score

**${avg}/100** across ${scripts.length} Golden Scripts · Storycraft **${storycraftAvg}/100** · Muted Video **${mutedAvg}/100**.

---

## Predicted Top 10 Performers

Ranked by overall quality + storycraft + emotional impact + retention.

| Rank | Script | Title | Category | Overall | Storycraft | Emotion |
|---:|---|---|---|---:|---:|---:|
${topTable}

---

## Production Order Recommendation

Animate in this order to maximize emotional recognition and retention learning. Scripts-only here — recommended future production sequence.

| Order | Script | Category | Title | Duration | Score |
|---:|---|---|---|---|---:|
${prodTable}

---

*Generated for the AmyNest AI Content Studio · Golden Script Library v1.1 · Emotion first*
`;
}

function escapeMd(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
