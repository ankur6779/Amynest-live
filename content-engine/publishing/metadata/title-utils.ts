const TITLE_MAX = 70;

/** Title ≤70 chars and always includes "AmyNest AI". */
export function clampTitle(title: string): string {
  let trimmed = title.trim().replace(/\s+/g, " ");
  const brand = "AmyNest AI";
  if (!/amynest\s*ai/i.test(trimmed)) {
    const suffix = ` | ${brand}`;
    const budget = TITLE_MAX - suffix.length;
    if (budget < 8) return brand.slice(0, TITLE_MAX);
    trimmed = `${trimmed.slice(0, budget).trimEnd()}${suffix}`;
  }
  if (trimmed.length <= TITLE_MAX) return trimmed;

  if (/amynest\s*ai/i.test(trimmed.slice(-brand.length - 3))) {
    const suffix = ` | ${brand}`;
    const head = trimmed
      .replace(/\s*\|\s*AmyNest AI\s*$/i, "")
      .slice(0, TITLE_MAX - suffix.length)
      .trimEnd();
    return `${head}${suffix}`.slice(0, TITLE_MAX);
  }
  return `${trimmed.slice(0, TITLE_MAX - 3).trimEnd()}...`;
}

export const PUBLISH_TITLE_MAX = TITLE_MAX;
