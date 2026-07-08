import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const downloadRoutes = [
  "artifacts/api-server/src/routes/coloring.ts",
  "artifacts/api-server/src/routes/funsheets.ts",
  "artifacts/api-server/src/routes/worksheets.ts",
];

describe("premium download bank 23505 race refund", () => {
  for (const routePath of downloadRoutes) {
    it(`${routePath} refunds bank debit on duplicate insert`, () => {
      const src = readRepoFile(routePath);
      assert.match(
        src,
        /if \(pgCode === "23505"\) \{[\s\S]*?refundPremiumDownloadBankDebit\(userId\)/,
      );
    });
  }
});
