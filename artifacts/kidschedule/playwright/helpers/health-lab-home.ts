import type { Page } from "@playwright/test";

/**
 * Living Care home uses `data-testid=health-lab-living`.
 * Galaxy home uses the "Amy Health Lab" heading.
 * Do not combine those as a CSS comma list — Playwright parses `text=` as CSS.
 */
export function healthLabHome(page: Page) {
  return page.getByTestId("health-lab-living").or(page.getByText("Amy Health Lab"));
}

export async function waitForHealthLabHome(page: Page, timeout = 30_000) {
  await healthLabHome(page).first().waitFor({ state: "visible", timeout });
}

/** Living quiet-path list, or galaxy "Today's Adventures" world map. */
export function healthLabListing(page: Page) {
  return page.getByTestId("health-lab-living").or(page.getByText("Today's Adventures"));
}

export async function waitForHealthLabListing(page: Page, timeout = 10_000) {
  await healthLabListing(page).first().waitFor({ state: "visible", timeout });
}

export const HEALTH_LAB_LIVING_PATH: Record<string, string> = {
  "Balloon Journey Adventure": "health-lab-quiet-breath-control",
  "Sky Island Survival": "health-lab-quiet-flamingo-balance",
  "Rocket Launch Academy": "health-lab-quiet-reaction-time",
  "Crystal Garden Challenge": "health-lab-quiet-freeze-statue",
  "Crystal Core Reactor": "health-lab-quiet-finger-stability",
};

export async function openHealthLabAdventure(page: Page, galaxyTitle: string) {
  const livingId = HEALTH_LAB_LIVING_PATH[galaxyTitle];
  if (livingId && (await page.getByTestId(livingId).isVisible().catch(() => false))) {
    await page.getByTestId(livingId).click();
  } else {
    await page
      .getByRole("button", {
        name: new RegExp(galaxyTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      })
      .first()
      .click();
  }
  const ready = page.getByRole("button", { name: /I'm Ready!|I'm ready/i });
  if (await ready.isVisible().catch(() => false)) {
    await ready.click();
  }
}

export async function startHealthLabPractice(page: Page) {
  await page.getByTestId("health-lab-practice-start").click();
}
