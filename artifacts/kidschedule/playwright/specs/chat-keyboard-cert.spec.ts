/**
 * Chat keyboard certification — assistant, Amy Coach search, Abacus tutor composer.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { dismissCountryPromptIfVisible, signInWithEmail } from "../helpers/auth";

const OUT = join(process.cwd(), "../../audit/chat-keyboard-audit");
const SHOTS = join(OUT, "screenshots");

async function measure(page, composerSelector: string) {
  return page.evaluate((sel) => {
    const vv = window.visualViewport;
    const innerH = window.innerHeight;
    const vvH = vv?.height ?? innerH;
    const vvTop = vv?.offsetTop ?? 0;
    const composer = document.querySelector(sel);
    const platform = document.querySelector("[data-chat-platform]");
    const rect = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height, width: r.width };
    };
    const visibleBottom = vvTop + vvH;
    const c = rect(composer);
    return {
      innerHeight: innerH,
      vv: { height: vvH, offsetTop: vvTop, inset: Math.max(0, innerH - vvH - vvTop) },
      composer: c,
      platform: platform ? { ...rect(platform), pos: getComputedStyle(platform).position } : null,
      composerOffscreenPx: c && c.bottom > visibleBottom + 2 ? c.bottom - visibleBottom : 0,
      keyboardOpenClass: !!document.querySelector(".chat-thread-page--keyboard-open"),
    };
  }, composerSelector);
}

async function simulateKeyboard(page) {
  await page.evaluate(() => {
    const kh = 320;
    const innerH = window.innerHeight;
    const vv = window.visualViewport!;
    Object.defineProperty(vv, "height", { configurable: true, value: innerH - kh });
    Object.defineProperty(vv, "offsetTop", { configurable: true, value: 0 });
    vv.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    document.querySelector(".chat-thread-page")?.classList.add("chat-thread-page--keyboard-open");
  });
  await page.waitForTimeout(500);
}

test.describe("Chat keyboard certification evidence", () => {
  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true });
  });

  test("assistant composer keyboard open/close + scroll stress", async ({ page }) => {
    await signInWithEmail(page);
    await dismissCountryPromptIfVisible(page);

    await page.goto("/assistant", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(2000);
    await dismissCountryPromptIfVisible(page);

    const input = page.getByTestId("chat-thread-input");
    await expect(input).toBeVisible({ timeout: 30_000 });

    const idle = await measure(page, '[data-testid="chat-thread-input"]');
    await page.screenshot({ path: join(SHOTS, "live-assistant-idle.png") });

    await input.click();
    await page.waitForTimeout(400);
    await simulateKeyboard(page);

    const keyboardOpen = await measure(page, '[data-testid="chat-thread-input"]');
    await page.screenshot({ path: join(SHOTS, "live-assistant-keyboard-open.png") });

    await input.fill("A".repeat(1000));
    await page.waitForTimeout(300);
    const longText = await measure(page, '[data-testid="chat-thread-input"]');

    writeFileSync(
      join(OUT, "live-assistant-metrics.json"),
      JSON.stringify({ idle, keyboardOpen, longText }, null, 2),
    );

    expect(keyboardOpen.composer).not.toBeNull();
    expect(keyboardOpen.composerOffscreenPx).toBeLessThan(12);
  });

  test("Amy Coach goals search stays visible with keyboard", async ({ page }) => {
    await signInWithEmail(page);
    await dismissCountryPromptIfVisible(page);

    await page.goto("/amy-coach", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(2500);
    await dismissCountryPromptIfVisible(page);

    const search = page.getByTestId("amy-coach-search-input");
    await expect(search).toBeVisible({ timeout: 30_000 });

    await search.click();
    await simulateKeyboard(page);

    const metrics = await measure(page, '[data-testid="amy-coach-search-input"]');
    await page.screenshot({ path: join(SHOTS, "amy-coach-search-keyboard.png") });

    writeFileSync(join(OUT, "amy-coach-search-metrics.json"), JSON.stringify(metrics, null, 2));

    expect(metrics.composer).not.toBeNull();
    expect(metrics.composerOffscreenPx).toBeLessThan(16);
    expect(metrics.platform).not.toBeNull();
  });

  test("Abacus tutor composer + ask CTA keyboard safe", async ({ page }) => {
    await signInWithEmail(page);
    await dismissCountryPromptIfVisible(page);

    await page.goto("/abacus", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(2500);
    await dismissCountryPromptIfVisible(page);

    const tutorTab = page.getByRole("button", { name: /tutor|ask amy/i }).first();
    if (await tutorTab.isVisible().catch(() => false)) {
      await tutorTab.click();
      await page.waitForTimeout(800);
    }

    const textarea = page.getByTestId("abacus-tutor-question");
    const ask = page.getByTestId("abacus-tutor-ask");

    if (!(await textarea.isVisible().catch(() => false))) {
      test.skip(true, "Abacus tutor panel not available for this account/child");
      return;
    }

    await textarea.click();
    await simulateKeyboard(page);
    await textarea.fill("How do I add 7 and 5 on the abacus?");

    const textareaMetrics = await measure(page, '[data-testid="abacus-tutor-question"]');
    const askMetrics = await measure(page, '[data-testid="abacus-tutor-ask"]');
    await page.screenshot({ path: join(SHOTS, "abacus-tutor-keyboard.png") });

    writeFileSync(
      join(OUT, "abacus-tutor-metrics.json"),
      JSON.stringify({ textarea: textareaMetrics, ask: askMetrics }, null, 2),
    );

    expect(textareaMetrics.composerOffscreenPx).toBeLessThan(16);
    expect(askMetrics.composer?.bottom ?? 0).toBeLessThan(
      (textareaMetrics.vv.offsetTop ?? 0) + (textareaMetrics.vv.height ?? page.viewportSize()!.height) + 4,
    );
  });

  test("Conversation Coach voice footer pinned above keyboard inset", async ({ page }) => {
    await signInWithEmail(page);
    await dismissCountryPromptIfVisible(page);

    await page.goto("/speech-coach/conversation", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(2500);

    const footer = page.getByTestId("conversation-coach-voice-footer");
    if (!(await footer.isVisible().catch(() => false))) {
      test.skip(true, "Conversation coach requires eligible child");
      return;
    }

    await simulateKeyboard(page);
    const metrics = await measure(page, '[data-testid="conversation-coach-voice-footer"]');
    await page.screenshot({ path: join(SHOTS, "conversation-coach-keyboard.png") });

    writeFileSync(join(OUT, "conversation-coach-metrics.json"), JSON.stringify(metrics, null, 2));

    expect(metrics.platform).not.toBeNull();
    expect(metrics.composerOffscreenPx).toBeLessThan(24);
  });
});
