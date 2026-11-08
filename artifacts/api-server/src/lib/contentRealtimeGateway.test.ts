import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import {
  bindRealtimeProfileToAuthUser,
  extractRealtimeWsToken,
  parseRealtimeChildId,
} from "./contentRealtimeGateway.js";
import type { LearningProfile } from "@workspace/content-orchestration";

function fakeReq(opts: {
  url?: string;
  authorization?: string;
}): IncomingMessage {
  return {
    url: opts.url ?? "/ws/content-realtime",
    headers: opts.authorization ? { authorization: opts.authorization } : {},
  } as IncomingMessage;
}

describe("contentRealtimeGateway auth helpers", () => {
  it("extractRealtimeWsToken reads Bearer header", () => {
    assert.equal(
      extractRealtimeWsToken(fakeReq({ authorization: "Bearer abc.def.ghi" })),
      "abc.def.ghi",
    );
  });

  it("extractRealtimeWsToken reads ?token= and ?access_token=", () => {
    assert.equal(
      extractRealtimeWsToken(
        fakeReq({ url: "/ws/content-realtime?token=query-token-1" }),
      ),
      "query-token-1",
    );
    assert.equal(
      extractRealtimeWsToken(
        fakeReq({ url: "/ws/content-realtime?access_token=query-token-2" }),
      ),
      "query-token-2",
    );
  });

  it("extractRealtimeWsToken prefers Authorization over query", () => {
    assert.equal(
      extractRealtimeWsToken(
        fakeReq({
          authorization: "Bearer header-token",
          url: "/ws/content-realtime?token=query-token",
        }),
      ),
      "header-token",
    );
  });

  it("extractRealtimeWsToken returns null when missing", () => {
    assert.equal(extractRealtimeWsToken(fakeReq({})), null);
    assert.equal(
      extractRealtimeWsToken(fakeReq({ authorization: "Basic nope" })),
      null,
    );
  });

  it("parseRealtimeChildId accepts positive integer ids only", () => {
    assert.equal(parseRealtimeChildId(42), 42);
    assert.equal(parseRealtimeChildId("42"), 42);
    assert.equal(parseRealtimeChildId("0"), null);
    assert.equal(parseRealtimeChildId(-1), null);
    assert.equal(parseRealtimeChildId("child-rt"), null);
    assert.equal(parseRealtimeChildId(undefined), null);
    assert.equal(parseRealtimeChildId("12.5"), null);
  });

  it("bindRealtimeProfileToAuthUser overwrites forged userId", () => {
    const forged = {
      childId: "99",
      userId: "attacker-or-victim-uid",
      version: 1,
      skills: {} as LearningProfile["skills"],
      behavior: {
        avgSessionTime: 0,
        preferredModules: [],
        dropOffPoints: [],
        engagementScore: 1,
      },
      adaptability: {
        difficultyTolerance: 0.5,
        noveltyPreference: 0.5,
        repetitionTolerance: 0.5,
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as LearningProfile;

    const bound = bindRealtimeProfileToAuthUser(forged, "auth-owner-uid", "7");
    assert.ok(bound);
    assert.equal(bound.userId, "auth-owner-uid");
    assert.equal(bound.childId, "7");
    assert.equal(
      bindRealtimeProfileToAuthUser(undefined, "auth-owner-uid", "7"),
      undefined,
    );
  });
});
