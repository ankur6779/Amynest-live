import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BASIC_SUBJECTS, ADVANCED_SUBJECTS } from "../index.js";
import { AMY_SPEAK_LINES } from "./amy-speak-lines.js";
import { amySpeakKey } from "./enrich-topics.js";

describe("enrich-topics", () => {
  it("every topic has amySpeak from the global catalog", () => {
    for (const pack of [...BASIC_SUBJECTS, ...ADVANCED_SUBJECTS]) {
      for (const topic of pack.topics) {
        const key = amySpeakKey(pack.id, topic.id);
        assert.ok(AMY_SPEAK_LINES[key], `missing AMY_SPEAK_LINES[${key}]`);
        assert.equal(topic.amySpeak, AMY_SPEAK_LINES[key]);
      }
    }
  });
});
