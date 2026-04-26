// 2-section Parent Hub age band metadata. Lives in its own module so that the
// constants/helpers can be unit-tested without pulling in the heavy hub.tsx
// component graph (firebase, expo-router, etc.). Re-exported from hub.tsx for
// callers that already import from there.

export const HUB_AGE_BANDS = [
  { idx: 0, label: "0–2", minMonths: 0,   maxMonths: 24  },
  { idx: 1, label: "2–4", minMonths: 24,  maxMonths: 48  },
  { idx: 2, label: "4–6", minMonths: 48,  maxMonths: 72  },
  { idx: 3, label: "6–8", minMonths: 72,  maxMonths: 96  },
  { idx: 4, label: "8–10", minMonths: 96, maxMonths: 120 },
  { idx: 5, label: "10–12", minMonths: 120, maxMonths: 144 },
  { idx: 6, label: "12–15", minMonths: 144, maxMonths: 180 },
] as const;

export function getAgeBand(ageYears: number, ageMonths = 0): number {
  const total = ageYears * 12 + ageMonths;
  if (total < 0) return 0;
  for (let i = 0; i < HUB_AGE_BANDS.length; i++) {
    const b = HUB_AGE_BANDS[i];
    if (total >= b.minMonths && total < b.maxMonths) return i;
  }
  return HUB_AGE_BANDS.length - 1;
}

// Standalone metadata: which bands each tile is intended for. Lives outside
// the JSX so it's easy to tweak/scale without touching the render code.
export const HUB_CONTENT_AGE_BANDS: Record<string, readonly number[]> = {
  amy:                   [0, 1, 2, 3, 4, 5, 6],
  articles:              [0, 1, 2, 3, 4, 5, 6],
  tips:                  [0, 1, 2, 3, 4, 5, 6],
  emotional:             [0, 1, 2, 3, 4, 5, 6],
  "ptm-prep":            [2, 3, 4, 5, 6],
  "smart-study":         [1, 2, 3, 4, 5, 6],
  "morning-flow":        [2, 3, 4, 5, 6],
  olympiad:              [3, 4, 5, 6],
  "kids-control-center": [3, 4, 5, 6],
  meals:                 [1, 2, 3, 4, 5, 6],
  nutrition:             [0, 1, 2, 3, 4, 5, 6],
  "event-prep":          [1, 2, 3, 4, 5],
  activities:            [0, 1, 2, 3, 4, 5],
  "story-hub":           [1, 2, 3, 4, 5],
  "art-craft":           [1, 2, 3, 4],
  worksheets:            [1, 2, 3, 4, 5],
  facts:                 [2, 3, 4, 5, 6],
  "life-skills":         [1, 2, 3, 4, 5, 6],
  "meal-suggestions":    [0, 1, 2, 3, 4, 5, 6],
};
