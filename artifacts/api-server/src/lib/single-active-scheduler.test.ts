import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

describe("single-active-scheduler", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.SCHEDULER_ACTIVE_PLANE;
    delete process.env.RENDER;
    delete process.env.RENDER_SERVICE_NAME;
    delete process.env.COOLIFY;
    delete process.env.API_PUBLIC_URL;
    delete process.env.BACKGROUND_TASKS_ENABLED;
    delete process.env.NOTIFICATIONS_ENABLED;
    delete process.env.DISABLE_NOTIFICATION_CRON;
    process.env.NODE_ENV = "production";
    process.env.AMYNEST_ENV = "production";
  });

  afterEach(() => {
    process.env = env;
  });

  it("render owner runs crons when SCHEDULER_ACTIVE_PLANE=render on Render host", async () => {
    process.env.SCHEDULER_ACTIVE_PLANE = "render";
    process.env.RENDER = "true";
    process.env.BACKGROUND_TASKS_ENABLED = "true";
    process.env.NOTIFICATIONS_ENABLED = "true";

    const mod = await import("./single-active-scheduler.js");
    assert.equal(mod.isThisInstanceSchedulerOwner(), true);
    assert.equal(mod.shouldRunNotificationCrons(), true);
    assert.equal(mod.shouldRunBackgroundCrons(), true);
    assert.equal(mod.shouldAcceptHttpCronTrigger(), true);
  });

  it("coolify standby skips all crons when SCHEDULER_ACTIVE_PLANE=render", async () => {
    process.env.SCHEDULER_ACTIVE_PLANE = "render";
    process.env.COOLIFY = "true";
    process.env.API_PUBLIC_URL = "https://app.188.245.208.126.sslip.io";
    process.env.BACKGROUND_TASKS_ENABLED = "false";
    process.env.NOTIFICATIONS_ENABLED = "false";

    const mod = await import("./single-active-scheduler.js");
    assert.equal(mod.isThisInstanceSchedulerOwner(), false);
    assert.equal(mod.shouldRunNotificationCrons(), false);
    assert.equal(mod.shouldRunBackgroundCrons(), false);
    assert.equal(mod.shouldAcceptHttpCronTrigger(), false);
  });

  it("cutover flips owner to coolify", async () => {
    process.env.SCHEDULER_ACTIVE_PLANE = "coolify";
    process.env.COOLIFY = "true";
    process.env.BACKGROUND_TASKS_ENABLED = "true";
    process.env.NOTIFICATIONS_ENABLED = "true";

    const mod = await import("./single-active-scheduler.js");
    assert.equal(mod.isThisInstanceSchedulerOwner(), true);
    assert.equal(mod.shouldRunBackgroundCrons(), true);
  });

  it("render becomes standby after cutover", async () => {
    process.env.SCHEDULER_ACTIVE_PLANE = "coolify";
    process.env.RENDER = "true";
    process.env.BACKGROUND_TASKS_ENABLED = "false";
    process.env.NOTIFICATIONS_ENABLED = "false";

    const mod = await import("./single-active-scheduler.js");
    assert.equal(mod.isThisInstanceSchedulerOwner(), false);
    assert.equal(mod.shouldRunNotificationCrons(), false);
  });

  it("legacy mode respects NOTIFICATIONS_ENABLED=false on coolify", async () => {
    delete process.env.SCHEDULER_ACTIVE_PLANE;
    process.env.COOLIFY = "true";
    process.env.BACKGROUND_TASKS_ENABLED = "false";
    process.env.NOTIFICATIONS_ENABLED = "false";

    const mod = await import("./single-active-scheduler.js");
    assert.equal(mod.shouldRunNotificationCrons(), false);
    assert.equal(mod.shouldRunBackgroundCrons(), false);
  });
});
