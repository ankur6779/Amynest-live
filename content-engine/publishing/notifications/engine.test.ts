import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryNotificationBus } from "./engine.js";

describe("publishing notifications", () => {
  it("delivers to telegram email webhook slack and discord", async () => {
    const bus = new InMemoryNotificationBus();
    const deliveries = await bus.notify(
      ["telegram", "email", "webhook", "slack", "discord"],
      "published",
      {
        title: "Live",
        body: "Video is live",
        videoId: "abc",
        url: "https://youtube.com/shorts/abc",
      },
    );

    assert.equal(deliveries.length, 5);
    assert.ok(deliveries.every((d) => d.delivered));
    assert.equal(bus.listSent().length, 5);
  });

  it("supports success failure and retry events", async () => {
    const bus = new InMemoryNotificationBus();
    await bus.notify(["webhook"], "success", { title: "ok", body: "done" });
    await bus.notify(["webhook"], "failure", { title: "fail", body: "err" });
    await bus.notify(["webhook"], "retry", { title: "retry", body: "again" });
    const events = bus.listSent().map((p) => p.event);
    assert.deepEqual(events, ["success", "failure", "retry"]);
  });
});
