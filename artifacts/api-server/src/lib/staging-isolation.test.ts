import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stagingIsolationProblem } from "./staging-isolation";

const stagingDb = "postgresql://staging_user:secret@10.0.0.8:5432/amynest_staging";
const stagingApi = "https://api-staging.amynest.in";

describe("staging database isolation", () => {
  it("accepts a dedicated staging database and staging API host", () => {
    assert.equal(
      stagingIsolationProblem({
        databaseUrl: stagingDb,
        apiPublicUrl: stagingApi,
        redisUrl: "redis://10.0.0.9:6379",
      }),
      null,
    );
  });

  it("rejects the Coolify production database host, local dev database, and production API", () => {
    assert.match(
      stagingIsolationProblem({
        databaseUrl: "postgresql://u:p@tcl9udyxcuq2zu598ebj0pfu:5432/amynest_staging",
        apiPublicUrl: stagingApi,
      }) ?? "",
      /tcl9udyxcuq2zu598ebj0pfu/,
    );
    assert.match(
      stagingIsolationProblem({
        databaseUrl: "postgresql://amynest:amynest@127.0.0.1:5432/amynest_dev",
        apiPublicUrl: stagingApi,
      }) ?? "",
      /amynest_dev/,
    );
    assert.match(
      stagingIsolationProblem({
        databaseUrl: stagingDb,
        apiPublicUrl: "https://www.amynest.in",
      }) ?? "",
      /api-staging/,
    );
    assert.match(
      stagingIsolationProblem({
        databaseUrl: stagingDb,
        apiPublicUrl: stagingApi,
        redisUrl: "redis://g7jotufnm43n4au4e8n6x946:6379",
      }) ?? "",
      /g7jotufnm43n4au4e8n6x946/,
    );
  });
});
