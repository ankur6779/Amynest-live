import { test, expect, type Page } from "@playwright/test";

const ARTIFACTS = "/opt/cursor/artifacts";

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1440x900", width: 1440, height: 900 },
] as const;

const INFANT_CHILDREN = [1, 2, 3, 4, 5, 6] as const;
const CHILD_CHILDREN = [7, 8, 9] as const;

async function collectFailures(page: Page) {
  const consoleErrors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 400) failed.push(`${status} ${res.url()}`);
  });
  return { consoleErrors, failed };
}

function meaningfulErrors(errors: string[]) {
  return errors.filter(
    (text) =>
      !/favicon|Download the React DevTools|Failed to load resource.*experience\//i.test(
        text,
      ),
  );
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
}

test.describe("Content delivery certification", () => {
  test("infant profiles show Infant Care modules and coloring preview", async ({
    page,
  }) => {
    const errors = await collectFailures(page);
    await page.goto("/playwright-content-delivery-cert.html?child=1");
    await expect(page.getByTestId("content-delivery-cert-root")).toBeVisible();

    for (const childId of INFANT_CHILDREN) {
      await page.getByTestId(`cert-child-${childId}`).click();
      await expect(page.getByTestId("content-delivery-cert-root")).toHaveAttribute(
        "data-is-infant",
        "true",
      );
      await expect(page.getByTestId("matrix-infant-hub")).toHaveAttribute(
        "data-visibility",
        "VISIBLE",
      );
      await expect(page.getByTestId("matrix-coloring-books")).toHaveAttribute(
        "data-visibility",
        "PREVIEW",
      );
      await page.getByTestId("cert-enter-care").click();
      await expect(page.getByTestId("dest-infant-hub")).toBeVisible();
      await expect(page.getByTestId("infant-module-sleep")).toBeVisible();
      await expect(page.getByTestId("infant-module-feeding")).toBeVisible();
      await page.getByTestId("parent-hub-exit-room").click();
      await page.getByTestId("cert-enter-moments").click();
      await expect(page.getByTestId("moments-soft-coloring-books")).toBeVisible();
      await page.getByTestId("moments-soft-coloring-books").click();
      await expect(page.getByTestId("dest-coloring-books")).toBeVisible();
      await expect(page.getByTestId("coloring-books-section")).toBeVisible();
      await page.getByTestId("parent-hub-exit-room").click();
    }

    expect(meaningfulErrors(errors.consoleErrors)).toEqual([]);
  });

  test("toddler and school profiles show coloring, worksheets, curiosity, videos", async ({
    page,
  }) => {
    const errors = await collectFailures(page);
    await page.goto("/playwright-content-delivery-cert.html?child=7");

    for (const childId of CHILD_CHILDREN) {
      await page.getByTestId(`cert-child-${childId}`).click();
      await expect(page.getByTestId("matrix-infant-hub")).toHaveAttribute(
        "data-visibility",
        "HIDDEN",
      );
      await expect(page.getByTestId("matrix-coloring-books")).toHaveAttribute(
        "data-visibility",
        "VISIBLE",
      );
      await page.getByTestId("cert-enter-care").click();
      await expect(page.getByTestId("dest-infant-hub")).toHaveCount(0);
      await expect(page.getByTestId("care-quiet-nutrition")).toBeVisible();
      await page.getByTestId("parent-hub-exit-room").click();
      await page.getByTestId("cert-enter-moments").click();
      await expect(page.getByTestId("moments-soft-coloring-books")).toBeVisible();
      await page.getByTestId("moments-soft-coloring-books").click();
      await expect(page.getByTestId("dest-coloring-books")).toBeVisible();
      await page.getByTestId("moments-quiet-make").click();
      await expect(page.getByTestId("dest-worksheets")).toBeVisible();
      await page.getByTestId("moments-quiet-story").click();
      await expect(page.getByTestId("dest-story-hub")).toBeVisible();
      const story = page.getByTestId("story-video");
      await expect(story).toBeVisible();
      await story.evaluate(async (el) => {
        const video = el as HTMLVideoElement;
        video.muted = true;
        await video.play();
      });
      await expect.poll(async () =>
        story.evaluate((el) => (el as HTMLVideoElement).currentTime),
      ).toBeGreaterThan(0.05);
      const pausedAt = await story.evaluate(async (el) => {
        const video = el as HTMLVideoElement;
        video.pause();
        return video.currentTime;
      });
      await page.waitForTimeout(200);
      const afterPause = await story.evaluate((el) => (el as HTMLVideoElement).currentTime);
      expect(Math.abs(afterPause - pausedAt)).toBeLessThan(0.05);
      await story.evaluate(async (el) => {
        const video = el as HTMLVideoElement;
        video.muted = true;
        await video.play();
      });
      await expect.poll(async () =>
        story.evaluate((el) => (el as HTMLVideoElement).currentTime),
      ).toBeGreaterThan(pausedAt);
      await page.getByTestId("parent-hub-exit-room").click();
      await page.getByTestId("cert-enter-understand").click();
      await expect(page.getByTestId("dest-answer-to-kids-how")).toBeVisible();
      await page.getByTestId("parent-hub-exit-room").click();
    }

    expect(meaningfulErrors(errors.consoleErrors)).toEqual([]);
  });

  for (const vp of VIEWPORTS) {
    test(`home + modules fit ${vp.name} without overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-content-delivery-cert.html?child=3");
      await expect(page.getByTestId("content-delivery-cert-root")).toBeVisible();
      await page.getByTestId("cert-enter-care").click();
      await expect(page.getByTestId("dest-infant-hub")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.getByTestId("parent-hub-exit-room").click();
      await page.getByTestId("cert-enter-moments").click();
      await expect(page.getByTestId("moments-soft-coloring-books")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.screenshot({
        path: `${ARTIFACTS}/content_delivery_${vp.name}.png`,
        fullPage: true,
      });
    });
  }
});
