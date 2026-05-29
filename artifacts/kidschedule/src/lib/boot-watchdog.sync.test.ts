/**
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { BOOT_WATCHDOG_VECTORS } from "@/lib/boot-watchdog.test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadPublicEvaluator(): (input: BootWatchdogInput) => BOOT_WATCHDOG_VECTORS[0]["expected"] {
  const js = readFileSync(join(root, "public/boot-watchdog.js"), "utf8");
  const sandbox: { __amynestEvaluateBootWatchdog?: (input: BootWatchdogInput) => BOOT_WATCHDOG_VECTORS[0]["expected"] } = {};
  vm.runInNewContext(js, sandbox, { filename: "boot-watchdog.js" });
  const fn = sandbox.__amynestEvaluateBootWatchdog;
  if (typeof fn !== "function") {
    throw new Error("boot-watchdog.js did not define __amynestEvaluateBootWatchdog");
  }
  return fn;
}

type BootWatchdogInput = BOOT_WATCHDOG_VECTORS[number]["input"];

describe("boot-watchdog sync with public/boot-watchdog.js", () => {
  const evaluatePublic = loadPublicEvaluator();

  for (const vector of BOOT_WATCHDOG_VECTORS) {
    it(`public JS matches TS: ${vector.name}`, () => {
      expect(evaluatePublic(vector.input)).toEqual(vector.expected);
    });
  }
});
