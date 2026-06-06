import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildNotificationFingerprint,
  stableNotificationId,
  infantFingerprint,
  evaluateDeliveryGuard,
  MAX_NOTIFICATIONS_PER_CHILD_PER_DAY,
  MAX_NOTIFICATIONS_PER_HOUR,
  cooldownMsForFingerprint,
} from "../index.js";

describe("notification delivery guard", () => {
  it("builds canonical fingerprints", () => {
    assert.equal(
      buildNotificationFingerprint({
        childId: 1,
        notificationType: "vaccine",
        entityId: "hepb_birth",
        scheduledDate: "2026-06-06",
      }),
      "1_vaccine_hepb_birth_2026-06-06",
    );
  });

  it("stable notification id is deterministic", () => {
    const fp = "1_vaccine_hepb_birth_2026-06-06";
    assert.equal(stableNotificationId(fp), stableNotificationId(fp));
    assert.ok(stableNotificationId(fp) > 0);
  });

  it("blocks duplicate vaccine reminder on same day", () => {
    const fp = infantFingerprint(1, "vaccine_due", "overdue_hepb", "2026-06-06");
    const sentAt = new Date("2026-06-06T09:00:00+05:30");
    const decision = evaluateDeliveryGuard({
      fingerprint: fp,
      timezone: "Asia/Kolkata",
      history: [{ dedupKey: fp, status: "sent", sentAt }],
      childSentToday: 1,
      accountSentToday: 1,
      accountSentLastHour: 1,
      now: new Date("2026-06-06T09:05:00+05:30"),
    });
    assert.equal(decision.allow, false);
    if (!decision.allow) {
      assert.equal(decision.reason, "duplicate");
      assert.equal(decision.logEvent, "NOTIFICATION_SKIPPED_DUPLICATE");
    }
  });

  it("allows same vaccine fingerprint on a new local day", () => {
    const fp = infantFingerprint(1, "vaccine_due", "overdue_hepb", "2026-06-07");
    const decision = evaluateDeliveryGuard({
      fingerprint: fp,
      timezone: "Asia/Kolkata",
      history: [
        {
          dedupKey: infantFingerprint(1, "vaccine_due", "overdue_hepb", "2026-06-06"),
          status: "sent",
          sentAt: new Date("2026-06-06T09:00:00+05:30"),
        },
      ],
      childSentToday: 0,
      accountSentToday: 0,
      accountSentLastHour: 0,
      now: new Date("2026-06-07T09:00:00+05:30"),
    });
    assert.equal(decision.allow, true);
  });

  it("blocks when child daily rate limit exceeded", () => {
    const fp = infantFingerprint(2, "milestone_tip", "identity", "2026-06-06");
    const decision = evaluateDeliveryGuard({
      fingerprint: fp,
      timezone: "Asia/Kolkata",
      history: [],
      childSentToday: MAX_NOTIFICATIONS_PER_CHILD_PER_DAY,
      accountSentToday: 5,
      accountSentLastHour: 1,
    });
    assert.equal(decision.allow, false);
    if (!decision.allow) assert.equal(decision.reason, "rate_limit_child");
  });

  it("blocks when hourly account rate limit exceeded", () => {
    const fp = infantFingerprint(2, "learning", "reading", "2026-06-06");
    const decision = evaluateDeliveryGuard({
      fingerprint: fp,
      timezone: "Asia/Kolkata",
      history: [],
      childSentToday: 0,
      accountSentToday: 2,
      accountSentLastHour: MAX_NOTIFICATIONS_PER_HOUR,
    });
    assert.equal(decision.allow, false);
    if (!decision.allow) assert.equal(decision.reason, "rate_limit_hourly");
  });

  it("vaccine cooldown is 24 hours", () => {
    const fp = infantFingerprint(1, "vaccine_due", "overdue_hepb", "2026-06-06");
    assert.equal(cooldownMsForFingerprint(fp), 24 * 60 * 60 * 1000);
  });
});

describe("notification spam regression", () => {
  it("same vaccine reminder cannot fire twice within one day (minute-by-minute tick)", () => {
    const fp = infantFingerprint(1, "vaccine_due", "overdue_hepb", "2026-06-06");
    const history = [
      { dedupKey: fp, status: "sent", sentAt: new Date("2026-06-06T09:00:00+05:30") },
    ];
    for (let minute = 1; minute <= 59; minute++) {
      const now = new Date(`2026-06-06T09:${String(minute).padStart(2, "0")}:00+05:30`);
      const decision = evaluateDeliveryGuard({
        fingerprint: fp,
        timezone: "Asia/Kolkata",
        history,
        childSentToday: 1,
        accountSentToday: 1,
        accountSentLastHour: 1,
        now,
      });
      assert.equal(decision.allow, false, `should block at 09:${String(minute).padStart(2, "0")}`);
    }
  });

  it("stable notification id updates existing tray entry", () => {
    const fp = infantFingerprint(1, "vaccine_due", "overdue_hepb", "2026-06-06");
    assert.equal(stableNotificationId(fp), stableNotificationId(fp));
  });
});
