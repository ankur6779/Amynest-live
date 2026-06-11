import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

async function activityPayload(
  page: Page,
  activityId: string,
): Promise<Record<string, unknown>> {
  return page.evaluate((id) => {
    const cert = (window as unknown as {
      __MP_CERT__: {
        generateActivity: (activityId: string) => { payload: Record<string, unknown> };
      };
    }).__MP_CERT__;
    return cert.generateActivity(id).payload;
  }, activityId);
}

async function miniGamePayload(
  page: Page,
  template: string,
  seed: number,
): Promise<Record<string, unknown>> {
  return page.evaluate(
    ({ t, s }) => {
      const cert = (window as unknown as {
        __MP_CERT__: {
          generateMiniGame: (template: string, seed: number) => { payload: Record<string, unknown> };
        };
      }).__MP_CERT__;
      return cert.generateMiniGame(t, s).payload;
    },
    { t: template, s: seed },
  );
}

export async function openPlaygroundTab(page: Page): Promise<void> {
  await page.getByTestId("smt-tab-playground").click();
  await expect(page.getByTestId("math-playground")).toBeVisible();
}

export async function launchActivity(page: Page, activityId: string): Promise<void> {
  await page.getByTestId(`mp-activity-${activityId}`).click({ force: true });
  await expect(page.getByTestId("mp-session")).toBeVisible({ timeout: 12_000 });
}

export async function exitToHub(page: Page): Promise<void> {
  const home = page.getByTestId("mp-back-hub");
  if (await home.isVisible().catch(() => false)) {
    await home.click({ force: true });
  } else {
    await page.getByRole("button", { name: /hub|back/i }).first().click();
  }
  await expect(page.getByTestId("math-playground")).toBeVisible({ timeout: 8_000 });
}

export async function completeCurrentActivity(page: Page, activityId: string): Promise<void> {
  const payload = await activityPayload(page, activityId);

  switch (activityId) {
    case "counting_adventure": {
      const fallbackTarget = Number(payload.targetCount ?? 3);
      for (let i = 0; i < fallbackTarget + 6; i += 1) {
        const counterText = await page
          .getByText(/\d+\s*\/\s*\d+/)
          .first()
          .innerText()
          .catch(() => "");
        const match = counterText.match(/(\d+)\s*\/\s*(\d+)/);
        if (match && Number(match[1]) >= Number(match[2])) break;

        const tap = page.locator('[data-testid="mp-tap-target"]').first();
        if (!(await tap.isVisible().catch(() => false))) break;
        await tap.click({ force: true });
        await page.waitForTimeout(200);
      }
      break;
    }
    case "addition_lab": {
      const total =
        Number(payload.augend ?? 0) + Number(payload.addend ?? 0);
      for (let i = 0; i < total + 2; i += 1) {
        const tap = page.locator('[data-testid="mp-tap-target"]').first();
        if (!(await tap.isVisible().catch(() => false))) break;
        await tap.click({ force: true });
        await page.waitForTimeout(100);
      }
      break;
    }
    case "subtraction_garden": {
      const pick = Number(payload.subtrahend ?? 1);
      const taps = page.locator('[data-testid="mp-tap-target"]');
      for (let i = 0; i < pick; i += 1) await taps.nth(i).click({ force: true });
      break;
    }
    case "multiplication_factory": {
      const groups = Number(payload.groups ?? 1);
      for (let i = 0; i < groups; i += 1) {
        await page.getByTestId(`mp-mult-box-${i}`).click({ force: true });
      }
      break;
    }
    case "division_bakery": {
      const total = Number(payload.total ?? 1);
      const recipients = Number(payload.recipients ?? 1);
      for (let i = 0; i < total; i += 1) {
        await page.getByTestId("mp-cookie-pick").first().click({ force: true });
        await page.getByTestId(`mp-child-slot-${i % recipients}`).click({ force: true });
      }
      break;
    }
    case "number_patterns": {
      const correct = Number(payload.correctChoice);
      await page.getByTestId(`mp-pattern-choice-${correct}`).click({ force: true });
      await page.getByTestId("mp-pattern-slot").click({ force: true });
      break;
    }
    case "math_puzzles":
      await solvePuzzle(page, payload);
      break;
    case "daily_challenge": {
      const tasks = (payload.tasks as Array<{ activityId: string; payload: Record<string, unknown> }>) ?? [];
      if (tasks[0]) {
        await solvePuzzle(page, tasks[0].payload);
      }
      break;
    }
    default:
      break;
  }

  await expect(page.getByTestId("mp-session-complete")).toBeVisible({ timeout: 20_000 });
}

async function solvePuzzle(page: Page, payload: Record<string, unknown>): Promise<void> {
  const template = String(payload.template ?? "");
  const miniTemplates = new Set([
    "pop_correct_answer",
    "rocket_counting",
    "balloon_burst",
    "feed_the_monkey",
    "number_train",
    "castle_builder",
  ]);

  if (miniTemplates.has(template)) {
    await solveMiniGame(page, template, payload);
    return;
  }

  if (template === "bigger_number") {
    const bigger = Math.max(Number(payload.leftValue), Number(payload.rightValue));
    await page.getByRole("button", { name: String(bigger), exact: true }).click({ force: true });
    return;
  }

  if (template === "match_quantity") {
    const target = Number(payload.targetNumeral);
    await page.getByRole("button", { name: String(target), exact: true }).click({ force: true });
    return;
  }

  if (template === "sort_ascending") {
    const nums = [...((payload.sortNumbers as number[]) ?? [])].sort((a, b) => a - b);
    for (const n of nums) {
      await page.getByRole("button", { name: String(n), exact: true }).click({ force: true });
    }
  }
}

export async function solveMiniGame(
  page: Page,
  template: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const p = payload ?? (await miniGamePayload(page, template, 42));

  switch (template) {
    case "pop_correct_answer":
    case "rocket_counting":
    case "number_train": {
      const answer =
        p.correctAnswer ??
        (p.choices as number[])?.[Number(p.correctIndex ?? 0)];
      await page.getByTestId(`mp-mini-choice-${answer}`).click({ force: true });
      break;
    }
    case "balloon_burst": {
      const target = Number(p.targetQuantity ?? 1);
      for (let i = 0; i < target + 2; i += 1) {
        const poppedText = await page.getByText(/Popped:\s*\d+/).innerText().catch(() => "");
        const match = poppedText.match(/Popped:\s*(\d+)/);
        if (match && Number(match[1]) >= target) break;
        const balloon = page.getByTestId("mp-balloon-pop").first();
        if (!(await balloon.isVisible().catch(() => false))) break;
        await balloon.click({ force: true });
        await page.waitForTimeout(300);
      }
      break;
    }
    case "feed_the_monkey": {
      const target = Number(p.targetBananas ?? 1);
      for (let i = 0; i < target + 2; i += 1) {
        const fedText = await page.getByText(/Fed:\s*\d+/).innerText().catch(() => "");
        const match = fedText.match(/Fed:\s*(\d+)/);
        if (match && Number(match[1]) >= target) break;
        const banana = page.getByTestId("mp-banana-feed").first();
        if (!(await banana.isVisible().catch(() => false))) break;
        await banana.click({ force: true });
        await page.waitForTimeout(300);
      }
      break;
    }
    case "castle_builder": {
      const rounds = (p.castleRounds as Array<{ answer: number }>) ?? [];
      for (const round of rounds) {
        await page.getByTestId(`mp-mini-choice-${round.answer}`).click({ force: true });
        await page.waitForTimeout(350);
      }
      break;
    }
    default:
      break;
  }
}

export async function refreshIntelligenceIfNeeded(page: Page): Promise<void> {
  const refresh = page.getByTestId("mp-intelligence-refresh");
  if (await refresh.isVisible().catch(() => false)) {
    await refresh.click({ force: true });
    await page.waitForTimeout(500);
  }
}

export async function readStars(page: Page): Promise<number> {
  const text = await page.getByTestId("mp-stars").innerText();
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export async function readPlaygroundState(page: Page): Promise<{
  stars: number;
  badges: string[];
  sessions: number;
}> {
  return page.evaluate(() => {
    const cert = (window as unknown as { __MP_CERT__: { childId: number; getPlaygroundState: () => {
      rewards: { stars: number; badges: Array<{ id: string }> };
      learning: { sessionHistory: unknown[] };
    } | null } }).__MP_CERT__;
    const state = cert.getPlaygroundState();
    return {
      stars: state?.rewards.stars ?? 0,
      badges: (state?.rewards.badges ?? []).map((b) => b.id),
      sessions: state?.learning.sessionHistory.length ?? 0,
    };
  });
}
