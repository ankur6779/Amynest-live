import { test } from "node:test";
import assert from "node:assert/strict";
import { createCaregiverShareLink, getCaregiverShareView } from "./caregiverShareService.js";

test("getCaregiverShareView returns not_found for unknown token", async () => {
  const result = await getCaregiverShareView("nonexistent-token-xyz");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "not_found");
});

test("createCaregiverShareLink rejects unknown children", async () => {
  const result = await createCaregiverShareLink("user-test", [999999], {
    foodStyle: "indian",
    children: [],
  });
  assert.equal(result.ok, false);
});
