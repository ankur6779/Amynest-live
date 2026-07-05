/** Short labels for dynamic collapsed section previews (one line, no i18n for tile ids). */
export const HUB_TILE_PREVIEW_LABEL: Record<string, string> = {
  "amy-ai": "AI Coach",
  "daily-tips": "Daily Tips",
  "generate-routine": "Routine",
  "tomorrow-forecast": "Forecast",
  "command-center": "Command Center",
  "smart-math-tricks": "Math",
  "abacus": "Abacus",
  "phonics": "Phonics",
  "spelling-mastery": "Spelling",
  "smart-study": "Study",
  "olympiad": "Olympiad",
  "activities": "Activities",
  "origami-studio": "Origami",
  "art-craft": "Drawing",
  "worksheets": "Worksheets",
  "coloring-books": "Coloring",
  "fun-sheets": "Fun Sheets",
  "answer-to-kids-how": "Curiosity",
  "event-prep": "Event Prep",
  "story-hub": "Stories",
  "talking-amy": "Talking Amy",
  "speech-coach": "Speech",
  "discovery-worlds": "Discovery",
  "nutrition": "Nutrition",
  "health-lab": "Wellness",
  "gaming-rewards": "Brain Games",
  "articles": "Articles",
  "emotional": "Emotional",
  "life-skills": "Life Skills",
  "ptm-prep": "PTM Prep",
  "new-parent-tips": "New Parent",
};

export function hubTilePreviewLabels(tileIds: readonly string[], max = 2): string[] {
  const labels: string[] = [];
  for (const id of tileIds) {
    const label = HUB_TILE_PREVIEW_LABEL[id];
    if (!label || labels.includes(label)) continue;
    labels.push(label);
    if (labels.length >= max) break;
  }
  return labels;
}
