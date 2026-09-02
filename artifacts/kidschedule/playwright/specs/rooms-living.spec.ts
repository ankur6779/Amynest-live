import { test, expect, type Page } from "@playwright/test";

const ARTIFACTS = "/opt/cursor/artifacts";

async function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

function roomsErrors(errors: string[]) {
  return errors.filter(
    (text) =>
      /rooms|parent-hub|nutrition|infant|grow|moments|care|understand/i.test(text) &&
      !/favicon|Download the React DevTools|Failed to load resource.*experience\//i.test(
        text,
      ),
  );
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function assertDoorTypography(page: Page, room: string, feeling: string) {
  const door = page.getByTestId(`hub-room-door-${room}`);
  const title = door.locator(".ph-room-door-title");
  const desc = door.locator(".ph-room-door-feeling");
  await expect(title).toHaveText(new RegExp(room, "i"));
  await expect(desc).toHaveText(feeling);
  const titleBox = await title.boundingBox();
  const descBox = await desc.boundingBox();
  expect(titleBox).toBeTruthy();
  expect(descBox).toBeTruthy();
  expect((titleBox?.y ?? 0) + (titleBox?.height ?? 0)).toBeLessThanOrEqual(
    (descBox?.y ?? 0) + 2,
  );
  await expect(door).toHaveAttribute("aria-label", `${room[0]!.toUpperCase()}${room.slice(1)}. ${feeling}`);
}

test.describe("Rooms living fixture", () => {
  test("door typography, overflow, and all-profile module journeys", async ({
    page,
  }) => {
    const errors = await collectPageErrors(page);
    await page.goto("/playwright-rooms-living.html");
    await expect(page.getByTestId("rooms-fixture-root")).toBeVisible();
    await expect(page.getByTestId("hub-room-door-help")).toBeVisible();

    await assertDoorTypography(page, "help", "You are not alone.");
    await assertDoorTypography(page, "understand", "See your child more clearly.");
    await assertDoorTypography(page, "care", "Take care of today.");
    await assertDoorTypography(page, "moments", "Spend one meaningful moment.");
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${ARTIFACTS}/rooms_doors_mobile_360.png`,
      fullPage: true,
    });

    await page.getByTestId("rooms-child-1").click();
    await page.getByTestId("hub-room-door-help").click();
    await expect(page.getByTestId("help-living-stream")).toBeVisible();
    await expect(page.getByTestId("help-quiet-speech-coach")).toBeVisible();
    await expect(page.getByTestId("help-quiet-ptm-prep")).toHaveCount(0);
    await expect(page.getByTestId("help-quiet-life-skills")).toHaveCount(0);
    await page.getByTestId("help-recommend").click();
    await expect(page.getByTestId("dest-ask-amy")).toBeVisible();
    await page.getByTestId("parent-hub-exit-room").click();

    await page.getByTestId("hub-room-door-understand").click();
    await page.getByTestId("understand-quiet-grow").click();
    await expect(page.getByTestId("grow-living-stream")).toBeVisible();
    await expect(page.getByTestId("grow-quiet-sounds")).toHaveAttribute(
      "data-enabled",
      "false",
    );
    await expect(page.getByTestId("grow-quiet-sounds")).toContainText(
      /age 1|begins/i,
    );
    await expect(page.getByTestId("dest-phonics")).toHaveCount(0);
    await page.getByTestId("parent-hub-exit-room").click();

    await page.getByTestId("hub-room-door-care").click();
    await expect(page.getByTestId("care-recommend")).toContainText("Today's care");
    await expect(page.getByTestId("care-quiet-nutrition")).toContainText("Nutrition");
    await page.getByTestId("care-recommend").click();
    await expect(page.getByTestId("dest-infant-hub")).toBeVisible();
    await page.getByTestId("care-quiet-nutrition").click();
    await expect(page.getByTestId("dest-nutrition")).toHaveAttribute(
      "data-child-id",
      "1",
    );
    await expect(page.getByTestId("nutrition-hub-parent-content")).toHaveAttribute(
      "data-nutrition-band",
      "infant_6_12",
    );
    await expect(page.getByTestId("nutrition-today-meal")).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACTS}/rooms_care_nutrition_infant.png`,
      fullPage: true,
    });
    await expect(page).toHaveURL(/#tile-nutrition/);
    await page.getByTestId("care-quiet-health-lab").click();
    await expect(page.getByTestId("dest-health-lab")).toBeVisible();
    await page.getByTestId("parent-hub-exit-room").click();

    await page.getByTestId("hub-room-door-moments").click();
    await page.getByTestId("moments-quiet-presence").click();
    await expect(page.getByTestId("dest-activities")).toBeVisible();
    await page.getByTestId("moments-quiet-story").click();
    await expect(page.getByTestId("dest-story-hub")).toBeVisible();
    await page.getByTestId("moments-quiet-make").click();
    await expect(page.getByTestId("dest-worksheets")).toBeVisible();
    await expect(page.getByTestId("moments-quiet-games")).toHaveAttribute(
      "href",
      /\/games/,
    );
    await page.getByTestId("parent-hub-exit-room").click();

    await page.getByTestId("rooms-child-2").click();
    await expect(page.getByTestId("rooms-fixture-root")).toHaveAttribute(
      "data-child-id",
      "2",
    );
    await page.getByTestId("hub-room-door-care").click();
    await expect(page.getByTestId("care-quiet-nutrition")).toBeVisible();
    await expect(page.getByTestId("dest-infant-hub")).toHaveCount(0);
    await expect(page.getByTestId("care-recommend")).toContainText(/nutrition/i);
    await page.getByTestId("care-quiet-nutrition").click();
    await expect(page.getByTestId("dest-nutrition")).toHaveAttribute(
      "data-child-id",
      "2",
    );
    await expect(page.getByTestId("nutrition-hub-parent-content")).toHaveAttribute(
      "data-nutrition-band",
      "preschool_3_6",
    );
    await expect(page.getByTestId("nutrition-today-meal")).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACTS}/rooms_care_nutrition_preschool.png`,
      fullPage: true,
    });

    await page.getByTestId("parent-hub-exit-room").click();
    await page.getByTestId("hub-room-door-help").click();
    await expect(page.getByTestId("help-quiet-ptm-prep")).toBeVisible();
    await expect(page.getByTestId("help-quiet-life-skills")).toBeVisible();
    await page.getByTestId("help-quiet-speech-coach").click();
    await expect(page.getByTestId("dest-speech-coach")).toHaveAttribute(
      "data-speech-mode",
      "full",
    );
    await page.getByTestId("parent-hub-exit-room").click();
    await page.getByTestId("hub-room-door-understand").click();
    await page.getByTestId("understand-quiet-grow").click();
    await expect(page.getByTestId("grow-quiet-sounds")).toHaveAttribute(
      "data-enabled",
      "true",
    );
    await expect(page.getByTestId("grow-quiet-numbers")).toHaveAttribute(
      "data-enabled",
      "true",
    );
    await expect(page.getByTestId("grow-quiet-spelling")).toHaveAttribute(
      "data-enabled",
      "true",
    );
    await expect(page.getByTestId("grow-quiet-study")).toHaveAttribute(
      "data-enabled",
      "false",
    );
    await expect(page.getByTestId("grow-quiet-challenge")).toHaveCount(0);
    await page.getByTestId("grow-quiet-sounds").click();
    await expect(page.getByTestId("dest-phonics")).toBeVisible();
    await page.getByTestId("parent-hub-exit-room").click();

    await page.getByTestId("rooms-child-3").click();
    await page.getByTestId("hub-room-door-care").click();
    await expect(page.getByTestId("care-quiet-nutrition")).toContainText("Nutrition");
    await page.getByTestId("care-quiet-nutrition").click();
    await expect(page.getByTestId("dest-nutrition")).toHaveAttribute(
      "data-child-id",
      "3",
    );
    await expect(page.getByTestId("nutrition-hub-parent-content")).toHaveAttribute(
      "data-nutrition-band",
      "school_6_10",
    );
    await expect(page.getByTestId("nutrition-hub-parent-content")).toContainText(
      "Kai Montgomery-Anastasia",
    );
    await expect(page.getByTestId("nutrition-today-meal")).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACTS}/rooms_care_nutrition_school_long_name.png`,
      fullPage: true,
    });
    await page.getByTestId("parent-hub-exit-room").click();
    await page.getByTestId("hub-room-door-understand").click();
    await page.getByTestId("understand-quiet-grow").click();
    await expect(page.getByTestId("grow-quiet-challenge")).toBeVisible();
    await expect(page.getByTestId("grow-quiet-challenge")).toHaveAttribute(
      "data-enabled",
      "true",
    );
    await page.getByTestId("grow-quiet-challenge").click();
    await expect(page.getByTestId("dest-olympiad")).toBeVisible();
    await assertNoHorizontalOverflow(page);

    expect(roomsErrors(errors)).toEqual([]);
  });

  test("child switch clears stale Nutrition and restores Child A", async ({
    page,
  }) => {
    await page.goto("/playwright-rooms-living.html");
    await page.getByTestId("rooms-child-1").click();
    await page.getByTestId("hub-room-door-care").click();
    await page.getByTestId("care-quiet-nutrition").click();
    await expect(page.getByTestId("dest-nutrition")).toHaveAttribute(
      "data-child-id",
      "1",
    );

    await page.getByTestId("rooms-child-2").click();
    await expect(page.getByTestId("dest-nutrition")).toHaveCount(0);
    await expect(page).toHaveURL(/#care/);
    await expect(page.getByTestId("care-living-stream")).toBeVisible();
    await page.getByTestId("care-quiet-nutrition").click();
    await expect(page.getByTestId("dest-nutrition")).toHaveAttribute(
      "data-child-id",
      "2",
    );

    await page.getByTestId("parent-hub-exit-room").click();
    await page.getByTestId("hub-room-door-help").click();
    await page.getByTestId("help-quiet-speech-coach").click();
    await expect(page.getByTestId("dest-speech-coach")).toHaveAttribute(
      "data-child-id",
      "2",
    );

    await page.getByTestId("rooms-child-3").click();
    await expect(page.getByTestId("dest-speech-coach")).toHaveCount(0);
    await page.getByTestId("parent-hub-exit-room").click();
    await page.getByTestId("hub-room-door-care").click();
    await page.getByTestId("care-quiet-nutrition").click();
    await expect(page.getByTestId("dest-nutrition")).toHaveAttribute(
      "data-child-id",
      "3",
    );

    await page.getByTestId("rooms-child-1").click();
    await expect(page.getByTestId("dest-nutrition")).toHaveCount(0);
    await expect(page.getByTestId("rooms-fixture-root")).toHaveAttribute(
      "data-child-id",
      "1",
    );
  });

  test("deep links, refresh, back, and missing destinations recover", async ({
    page,
  }) => {
    await page.goto("/playwright-rooms-living.html#care");
    await expect(page.getByTestId("care-living-stream")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("care-living-stream")).toBeVisible();

    await page.goto("/playwright-rooms-living.html#tile-nutrition");
    await expect(page.getByTestId("dest-nutrition")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("dest-nutrition")).toBeVisible();
    await expect(page.getByTestId("care-living-stream")).toBeVisible();

    await page.goto("/playwright-rooms-living.html");
    await page.getByTestId("hub-room-door-care").click();
    await expect(page).toHaveURL(/#care/);
    await page.getByTestId("care-quiet-nutrition").click();
    await expect(page).toHaveURL(/#tile-nutrition/);
    await page.goBack();
    await expect(page.getByTestId("care-living-stream")).toBeVisible();
    await expect(page.getByTestId("dest-nutrition")).toHaveCount(0);
    await page.goBack();
    await expect(page.getByTestId("hub-room-door-help")).toBeVisible();

    await page.goto("/playwright-rooms-living.html#nonexistent");
    await expect(page.getByTestId("hub-room-door-help")).toBeVisible();
    await expect(page.getByTestId("parent-hub-module-unavailable")).toHaveCount(0);

    await page.goto("/playwright-rooms-living.html#tile-invalid");
    await expect(page.getByTestId("parent-hub-module-unavailable")).toBeVisible();
    await page.getByTestId("parent-hub-module-unavailable-back").click();
    await expect(page.getByTestId("parent-hub-module-unavailable")).toHaveCount(0);

    await page.goto("/playwright-rooms-living.html");
    await page.getByTestId("rooms-force-missing").click();
    await expect(page.getByTestId("parent-hub-module-unavailable")).toBeVisible();
    await expect(page.getByTestId("parent-hub-module-unavailable")).toContainText(
      /isn't available|still help/i,
    );
    await page.getByTestId("parent-hub-module-unavailable-back").click();
    await expect(page.getByTestId("care-living-stream")).toBeVisible();
    await expect(page.locator("body")).not.toHaveText(
      "HelpYou are not alone.",
    );
  });
});
