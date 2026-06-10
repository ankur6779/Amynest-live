import type { Page } from "@playwright/test";

/** Unlock autoplay with a user gesture before triggering audio. */
export async function primeUserGesture(page: Page): Promise<void> {
  await page.locator("body").click({ position: { x: 12, y: 12 }, force: true });
  await page.waitForTimeout(150);
}

/** Expand a top-level Parent Hub group (creativity, learning, stories, …). */
export async function expandHubGroup(page: Page, groupKey: string): Promise<void> {
  const group = page.locator(`#hub-group-${groupKey}`);
  await group.scrollIntoViewIfNeeded().catch(() => {});
  const toggle = group.locator('button[aria-expanded]').first();
  if ((await toggle.getAttribute("aria-expanded")) === "false") {
    await toggle.click({ timeout: 15_000 });
    await page.waitForTimeout(400);
  }
}

/** Expand a hub feature tile (story-hub, phonics, articles, …). */
export async function expandHubSection(page: Page, sectionId: string): Promise<void> {
  const section = page.locator(`[data-section-id="${sectionId}"]`);
  await section.scrollIntoViewIfNeeded({ timeout: 20_000 });
  const toggle = section.locator('button[aria-expanded]').first();
  if ((await toggle.getAttribute("aria-expanded")) === "false") {
    await toggle.click({ timeout: 15_000 });
    await page.waitForTimeout(500);
  }
}

/** Deep-link into Parent Hub and expand the target group + tile. */
export async function openParentingHubTile(
  page: Page,
  opts: { group: string; tileId: string; hash?: string },
): Promise<void> {
  const hash = opts.hash ?? `tile-${opts.tileId}`;
  await page.goto(`/parenting-hub#${hash}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2_000);
  await primeUserGesture(page);
  await expandHubGroup(page, opts.group);
  await expandHubSection(page, opts.tileId);
}

/** Open an Infant Hub collapsible subsection by clicking collapsed headers until a target appears. */
export async function expandInfantHubUntil(
  page: Page,
  targetTestId: string,
  maxAttempts = 12,
): Promise<boolean> {
  const root = page.locator('[data-section-id="infant-hub"]');
  await root.scrollIntoViewIfNeeded({ timeout: 20_000 }).catch(() => {});

  if (await page.getByTestId(targetTestId).isVisible({ timeout: 1_000 }).catch(() => false)) {
    return true;
  }

  for (let i = 0; i < maxAttempts; i++) {
    const collapsed = root.locator('button[aria-expanded="false"]');
    const count = await collapsed.count();
    if (count === 0) break;

    await collapsed.first().click({ timeout: 8_000 });
    await page.waitForTimeout(450);

    if (await page.getByTestId(targetTestId).isVisible({ timeout: 1_000 }).catch(() => false)) {
      return true;
    }
  }

  return page.getByTestId(targetTestId).isVisible({ timeout: 2_000 }).catch(() => false);
}

function parseAgeMonths(label: string): number | null {
  const text = label.toLowerCase();
  const years = text.match(/(\d+)\s*y/);
  const months = text.match(/(\d+)\s*m/);
  const y = years ? Number(years[1]) : 0;
  const m = months ? Number(months[1]) : 0;
  if (!years && !months) return null;
  return y * 12 + m;
}

/** Select a child under 24 months when the hub exposes a child picker. */
export async function selectInfantChildIfPresent(page: Page): Promise<boolean> {
  const root = page.locator('[data-section-id="infant-hub"]');
  if (await root.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return true;
  }

  const namedInfant = page.getByRole("button", { name: /Audit-Toddler|Infant/i });
  if (await namedInfant.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
    await namedInfant.first().click();
    await page.waitForTimeout(1_000);
    if (await root.isVisible({ timeout: 8_000 }).catch(() => false)) return true;
  }

  const picker = page.locator("div.overflow-x-auto.scrollbar-none button");
  const n = await picker.count();
  for (let i = 0; i < n; i++) {
    const btn = picker.nth(i);
    const label = await btn.innerText();
    const ageMonths = parseAgeMonths(label);
    if (ageMonths !== null && ageMonths < 24) {
      await btn.click();
      await page.waitForTimeout(1_000);
      return await root.isVisible({ timeout: 10_000 }).catch(() => false);
    }
  }

  return false;
}

/** Switch infant sleep module tab (Noise / Lullabies). */
export async function selectSleepModuleTab(page: Page, tab: "noise" | "lullabies"): Promise<void> {
  const tablist = page.getByRole("tablist", { name: "Sleep library" });
  const name = tab === "lullabies" ? /^lullabies$/i : /^noise$/i;
  await tablist.getByRole("tab", { name }).click({ timeout: 12_000 });
  await page.waitForTimeout(400);
}
