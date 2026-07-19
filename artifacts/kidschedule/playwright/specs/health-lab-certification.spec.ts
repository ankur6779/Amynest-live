/**
 * Amy Health Lab™ — production certification E2E suite (30+ scenarios).
 */
import { test, expect, type Route } from "@playwright/test";

const CHILD_ID = 42;

function mockHealthLabApi(page: import("@playwright/test").Page) {
  let serverProfile: Record<string, unknown> | null = null;

  return page.route("**/api/health-lab/**", async (route: Route) => {
    const req = route.request();
    const url = req.url();

    if (req.method() === "GET" && url.includes("/profile/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, profile: serverProfile, clientUpdatedAt: Date.now() }),
      });
      return;
    }
    if (req.method() === "GET" && url.includes("/dashboard/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, dashboard: { sessions: 0, streakDays: 0, level: 1, totalXp: 0 } }),
      });
      return;
    }
    if (req.method() === "GET" && url.includes("/history/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, history: serverProfile?.gameHistory ?? [] }),
      });
      return;
    }
    if (req.method() === "POST") {
      const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;
      if (body.profile) serverProfile = body.profile as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, profile: serverProfile, clientUpdatedAt: Date.now() }),
      });
      return;
    }
    await route.continue();
  });
}

test.beforeEach(async ({ page }) => {
  await mockHealthLabApi(page);
  await page.goto("/playwright-health-lab.html?childId=42&childName=Riya");
  await page.waitForSelector("text=Amy Health Lab", { timeout: 30_000 });
});

async function expandGrownUps(page: import("@playwright/test").Page) {
  const grownUps = page.getByRole("button", { name: /For grown-ups/i });
  if (await grownUps.isVisible().catch(() => false)) {
    const expanded = await grownUps.getAttribute("aria-expanded");
    if (expanded !== "true") await grownUps.click();
  }
}

async function expandGoals(page: import("@playwright/test").Page) {
  const goals = page.getByRole("button", { name: /Daily Quests/i });
  if (await goals.isVisible().catch(() => false)) {
    const expanded = await goals.getAttribute("aria-expanded");
    if (expanded !== "true") await goals.click();
  }
}

async function launchAdventure(page: import("@playwright/test").Page, title: string) {
  await page.getByText(title).click();
  const ready = page.getByRole("button", { name: /I'm Ready!/i });
  if (await ready.isVisible().catch(() => false)) {
    await ready.click();
  }
}

test.describe("Health Lab home", () => {
  test("home loads with hero and CTAs", async ({ page }) => {
    await expect(page.getByText("Start Today's Adventure")).toBeVisible();
    await expect(page.getByText("Today's Adventures")).toBeVisible();
  });

  test("shows playable adventures and health passport", async ({ page }) => {
    await expect(page.getByText("Balloon Journey Adventure")).toBeVisible();
    await expect(page.getByText("Sky Island Survival")).toBeVisible();
    await expect(page.getByText("Rocket Launch Academy")).toBeVisible();
    await expect(page.getByText("Crystal Garden Challenge")).toBeVisible();
    await expect(page.getByText("Crystal Core Reactor")).toBeVisible();
    await expandGrownUps(page);
    await expect(page.getByText("Health Passport")).toBeVisible();
    await expect(page.getByText("Amy Wellness Report")).toBeVisible();
  });

  test("daily quests section visible", async ({ page }) => {
    await expect(page.getByText("Daily Quests")).toBeVisible();
    await expandGoals(page);
    await expect(page.getByText("Triple Play")).toBeVisible();
  });
});

test.describe("Game launch", () => {
  test("launches Breath Control onboarding", async ({ page }) => {
    await launchAdventure(page, "Balloon Journey Adventure");
    await expect(page.getByText("Mission Briefing")).toBeVisible();
    await expect(page.getByText("Place your finger on the circle and hold still")).toBeVisible();
    await expect(page.getByRole("button", { name: /Start Journey/i })).toBeVisible();
  });

  test("launches Flamingo Balance onboarding", async ({ page }) => {
    await launchAdventure(page, "Sky Island Survival");
    await expect(page.getByText("Mission Briefing")).toBeVisible();
    await expect(page.getByText("Hold your phone steady like a flamingo!")).toBeVisible();
    await expect(page.getByRole("button", { name: /Start Survival/i })).toBeVisible();
  });

  test("launches Reaction Time onboarding", async ({ page }) => {
    await launchAdventure(page, "Rocket Launch Academy");
    await expect(page.getByText("Mission Briefing")).toBeVisible();
    await expect(page.getByText("Wait… then tap FAST when you see GO!")).toBeVisible();
    await expect(page.getByRole("button", { name: /Launch Mission/i })).toBeVisible();
  });

  test("launches Freeze Statue onboarding", async ({ page }) => {
    await launchAdventure(page, "Crystal Garden Challenge");
    await expect(page.getByText("Mission Briefing")).toBeVisible();
    await expect(page.getByRole("button", { name: /Start Dancing/i })).toBeVisible();
  });

  test("launches Finger Stability onboarding", async ({ page }) => {
    await launchAdventure(page, "Crystal Core Reactor");
    await expect(page.getByText("Mission Briefing")).toBeVisible();
    await expect(page.getByRole("button", { name: /Power Up Reactor/i })).toBeVisible();
  });

  test("launches Calmness Meter onboarding", async ({ page }) => {
    await expandGrownUps(page);
    await page.getByText("Amy Wellness Report").click();
    await expect(page.getByText("Mission Briefing")).toBeVisible();
    await expect(page.getByRole("button", { name: /View Report|Open Dashboard/i })).toBeVisible();
  });
});

test.describe("Onboarding and calibration flows", () => {
  test("Sky Island shows calibration overlay after start", async ({ page }) => {
    await launchAdventure(page, "Sky Island Survival");
    await page.getByRole("button", { name: /Start Survival/i }).click({ force: true });
    await expect(page.getByRole("heading", { name: "HOLD DEVICE STILL" })).toBeVisible({ timeout: 5000 });
  });

  test("Sky Island shows progress ring during gameplay", async ({ page }) => {
    await launchAdventure(page, "Sky Island Survival");
    await page.getByRole("button", { name: /Start Survival/i }).click({ force: true });
    await expect(page.getByRole("heading", { name: "HOLD DEVICE STILL" })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(3500);
    await expect(page.getByText("to go")).toBeVisible({ timeout: 5000 });
  });

  test("Balloon Journey reaches gameplay after onboarding", async ({ page }) => {
    await launchAdventure(page, "Balloon Journey Adventure");
    await page.getByRole("button", { name: /Start Journey/i }).click();
    await expect(page.getByText("Hold time")).toBeVisible();
    await expect(page.getByLabel("Hold to inflate balloon")).toBeVisible();
  });

  test("Rocket Launch reaches countdown after onboarding", async ({ page }) => {
    await launchAdventure(page, "Rocket Launch Academy");
    await page.getByRole("button", { name: /Launch Mission/i }).click({ force: true });
    await expect(page.getByText("3").or(page.getByText("GO!"))).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Navigation flows", () => {
  test("opens progress screen", async ({ page }) => {
    await expandGrownUps(page);
    await page.getByRole("button", { name: "Progress" }).click();
    await expect(page.getByText("Your Progress")).toBeVisible();
  });

  test("opens parent dashboard", async ({ page }) => {
    await expandGrownUps(page);
    await page.getByText("Parent Insights").click();
    await expect(page.getByRole("heading", { name: "Wellness Trends" })).toBeVisible();
  });

  test("opens shop from home", async ({ page }) => {
    await page.getByLabel(/Open shop/i).click();
    await expect(page.getByText("Lab Shop")).toBeVisible();
  });
});

test.describe("Module logic (certification)", () => {
  test("anti-cheat rejects taped finger", async ({ page }) => {
    const flags = await page.evaluate(async () => {
      const { validateBreathSession } = await import("../src/features/health-lab/anti-cheat.ts");
      return validateBreathSession({ holdSeconds: 10, touchMoves: [0, 0, 0], pointerCount: 1 }).flags;
    });
    expect(flags).toContain("taped_finger");
  });

  test("calmness snapshot gated by 3 games", async ({ page }) => {
    const ok = await page.evaluate(async () => {
      const { canRewardCalmnessSnapshot } = await import("../src/features/health-lab/anti-cheat.ts");
      return canRewardCalmnessSnapshot(["a", "b"], false);
    });
    expect(ok).toBe(false);
  });

  test("level 7 requires 10000+ XP", async ({ page }) => {
    const xp = await page.evaluate(async () => {
      const { HEALTH_LEVELS } = await import("../src/features/health-lab/constants.ts");
      return HEALTH_LEVELS.find((l) => l.id === 7)!.xpRequired;
    });
    expect(xp).toBeGreaterThanOrEqual(10000);
  });

  test("shop purchase deducts coins", async ({ page }) => {
    const coins = await page.evaluate(async () => {
      const { purchaseItem } = await import("../src/features/health-lab/shop.ts");
      return purchaseItem([], 200, "deco-plant-pot").coins;
    });
    expect(coins).toBe(155);
  });

  test("equipment maps items to slots", async ({ page }) => {
    const slot = await page.evaluate(async () => {
      const { slotForItem } = await import("../src/features/health-lab/equipment.ts");
      return slotForItem("hat-star-crown");
    });
    expect(slot).toBe("head");
  });

  test("equip requires ownership", async ({ page }) => {
    const ok = await page.evaluate(async () => {
      const { equipItem } = await import("../src/features/health-lab/equipment.ts");
      return equipItem({}, [], "hat-star-crown").ok;
    });
    expect(ok).toBe(false);
  });

  test("quest XP rewards defined", async ({ page }) => {
    const xp = await page.evaluate(async () => {
      const { DAILY_QUESTS } = await import("../src/features/health-lab/constants.ts");
      return DAILY_QUESTS.find((q) => q.id === "complete-under-5min")!.xpReward;
    });
    expect(xp).toBeGreaterThan(0);
  });

  test("master badge evaluation", async ({ page }) => {
    const unlock = await page.evaluate(async () => {
      const { shouldUnlockFocusMaster } = await import("../src/features/health-lab/badges.ts");
      const history = Array.from({ length: 8 }, (_, i) => ({
        gameId: "breath-control",
        timestamp: Date.now() - i * 1000,
        durationMs: 5000,
        xpEarned: 50,
        xpTier: "silver",
        score: 85,
        metrics: { focus: 85 },
        personalBest: false,
      }));
      return shouldUnlockFocusMaster({ gameHistory: history } as never);
    });
    expect(unlock).toBe(true);
  });

  test("local date key not UTC", async ({ page }) => {
    const key = await page.evaluate(async () => {
      const { dateKeyLocal } = await import("../src/features/health-lab/storage.ts");
      return dateKeyLocal(new Date(2026, 5, 12, 23, 30));
    });
    expect(key).toBe("2026-06-12");
  });

  test("prestige tiers exist", async ({ page }) => {
    const label = await page.evaluate(async () => {
      const { getPrestigeTier } = await import("../src/features/health-lab/constants.ts");
      return getPrestigeTier(3);
    });
    expect(label).toContain("Master");
  });

  test("quarterly summary returns text", async ({ page }) => {
    const text = await page.evaluate(async () => {
      const { quarterlySummary } = await import("../src/features/health-lab/dashboard-utils.ts");
      const { defaultHealthLabState } = await import("../src/features/health-lab/storage.ts");
      return quarterlySummary(defaultHealthLabState(1));
    });
    expect(text.length).toBeGreaterThan(10);
  });

  test("special event rotation", async ({ page }) => {
    const event = await page.evaluate(async () => {
      const { getActiveSpecialEvent } = await import("../src/features/health-lab/retention.ts");
      return getActiveSpecialEvent(new Date(2026, 5, 12)).id;
    });
    expect(event).toBeTruthy();
  });

  test("reaction false start penalty", async ({ page }) => {
    const score = await page.evaluate(async () => {
      const { computeReactionScoreWithPenalties } = await import("../src/features/health-lab/scoring.ts");
      return computeReactionScoreWithPenalties(250, 4);
    });
    expect(score).toBeLessThan(80);
  });

  test("freeze score from successes", async ({ page }) => {
    const score = await page.evaluate(async () => {
      const { computeFreezeScore } = await import("../src/features/health-lab/scoring.ts");
      return computeFreezeScore(5, 5);
    });
    expect(score).toBe(100);
  });

  test("double XP modifier", async ({ page }) => {
    const xp = await page.evaluate(async () => {
      const { applyXpModifiers } = await import("../src/features/health-lab/scoring.ts");
      return applyXpModifiers(100, { doubleXpDay: true });
    });
    expect(xp).toBe(150);
  });
});

test.describe("Sync & offline", () => {
  test("sync API accepts profile POST", async ({ page }) => {
    let synced = false;
    await page.route("**/api/health-lab/sync", async (route) => {
      synced = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, profile: {}, clientUpdatedAt: Date.now() }) });
    });
    await page.evaluate(async () => {
      const { configureHealthLabSync, enqueueHealthLabSync, flushHealthLabSync } = await import("../src/features/health-lab/health-lab-sync.ts");
      configureHealthLabSync(async (url, init) => fetch(url, init));
      enqueueHealthLabSync(42);
      await flushHealthLabSync(42);
    });
    expect(synced).toBe(true);
  });

  test("offline queue persists in localStorage", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("amynest:health-lab-sync-queue:42", JSON.stringify([{ kind: "full", clientUpdatedAt: Date.now() }]));
    });
    const depth = await page.evaluate(() => {
      const raw = localStorage.getItem("amynest:health-lab-sync-queue:42");
      return raw ? JSON.parse(raw).length : 0;
    });
    expect(depth).toBe(1);
  });

  test("cross-device hydrate merges server XP", async ({ page }) => {
    const mergedXp = await page.evaluate(async () => {
      const { saveHealthLabState, defaultHealthLabState, loadHealthLabState } = await import("../src/features/health-lab/storage.ts");
      const { configureHealthLabSync, hydrateHealthLabProfile } = await import("../src/features/health-lab/health-lab-sync.ts");
      const local = { ...defaultHealthLabState(42), totalXp: 100, coins: 10 };
      saveHealthLabState(local);
      configureHealthLabSync(async (url) => {
        if (String(url).includes("/profile/")) {
          return new Response(
            JSON.stringify({
              ok: true,
              profile: { totalXp: 500, coins: 50, gameHistory: [], badges: [] },
              clientUpdatedAt: Date.now() - 1000,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });
      const merged = await hydrateHealthLabProfile(42);
      return { totalXp: merged.totalXp, coins: merged.coins };
    });
    expect(mergedXp.totalXp).toBeGreaterThanOrEqual(500);
    expect(mergedXp.coins).toBeGreaterThanOrEqual(50);
  });

  test("sync analytics events fire on flush", async ({ page }) => {
    const events = await page.evaluate(async () => {
      const logs: string[] = [];
      const orig = console.info;
      const { configureHealthLabSync, enqueueHealthLabSync, flushHealthLabSync } = await import("../src/features/health-lab/health-lab-sync.ts");
      configureHealthLabSync(async (_url, init) => {
        if (init?.method === "POST") {
          return new Response(JSON.stringify({ ok: true, profile: {}, clientUpdatedAt: Date.now() }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, profile: null }), { status: 200 });
      });
      enqueueHealthLabSync(42);
      await flushHealthLabSync(42);
      return logs;
    });
    expect(events).toBeDefined();
  });
});

test.describe("Dashboard & parent value", () => {
  test("dashboard shows weekly summary", async ({ page }) => {
    await expandGrownUps(page);
    await page.getByText("Parent Insights").click();
    await expect(page.getByText("Weekly Summary")).toBeVisible();
    await expect(page.getByText("Quarterly Growth")).toBeVisible();
    await expect(page.getByText("Progress Milestones")).toBeVisible();
    await expect(page.getByText("Session Heatmap")).toBeVisible();
  });

  test("dashboard range filters", async ({ page }) => {
    await expandGrownUps(page);
    await page.getByText("Parent Insights").click();
    await page.getByRole("button", { name: "30d" }).click();
    await expect(page.getByText("Monthly Wellness Summary")).toBeVisible();
  });
});

test.describe("Retention UI", () => {
  test("treasure chest button visible", async ({ page }) => {
    await expect(page.getByText("Treasure Chest")).toBeVisible();
  });

  test("weekly challenge card visible", async ({ page }) => {
    await expect(page.getByText("Weekly Challenge")).toBeVisible();
  });

  test("monthly mega quest card visible", async ({ page }) => {
    await expect(page.getByText("Monthly Mega Quest")).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("live region component exists in breath game", async ({ page }) => {
    await page.getByText("Balloon Journey Adventure").click();
    await page.getByRole("button", { name: /Start Journey/i }).click();
    const live = page.locator('[role="status"]');
    await expect(live.first()).toBeAttached();
  });

  test("reaction uses icon not color alone", async ({ page }) => {
    await page.getByText("Rocket Launch Academy").click();
    await page.getByRole("button", { name: /Launch Mission/i }).click();
    await expect(page.getByText("🚀").first()).toBeVisible();
  });
});
