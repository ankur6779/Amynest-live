import { describe, expect, it } from "vitest";
import { evaluateBootWatchdog, type BootWatchdogInput } from "@/lib/boot-watchdog";

/** Shared vectors — public/boot-watchdog.js must match. */
export const BOOT_WATCHDOG_VECTORS: Array<{
  name: string;
  input: BootWatchdogInput;
  expected: ReturnType<typeof evaluateBootWatchdog>;
}> = [
  {
    name: "react-rendered phase",
    input: {
      phases: ["html-parsed", "bundle-loaded", "react-rendered"],
      startup: null,
      bootWatchdogExtended: false,
      now: 20_000,
    },
    expected: { action: "ok" },
  },
  {
    name: "startup.reactRendered flag",
    input: {
      phases: ["bundle-loaded"],
      startup: { reactRendered: true, lastProgressAt: 10_000 },
      bootWatchdogExtended: false,
      now: 20_000,
    },
    expected: { action: "ok" },
  },
  {
    name: "bundle loaded extend",
    input: {
      phases: ["bundle-loaded"],
      startup: { lastProgressAt: 19_000 },
      bootWatchdogExtended: false,
      now: 20_000,
    },
    expected: { action: "extend", extendMs: 16_000 },
  },
  {
    name: "recent progress extend",
    input: {
      phases: ["html-parsed"],
      startup: { lastProgressAt: 19_500 },
      bootWatchdogExtended: false,
      now: 20_000,
      progressWindowMs: 6000,
    },
    expected: { action: "extend", extendMs: 16_000 },
  },
  {
    name: "bundle loading first extend",
    input: {
      phases: ["html-parsed", "bundle-loading"],
      startup: null,
      bootWatchdogExtendCount: 0,
      now: 20_000,
    },
    expected: { action: "extend", extendMs: 16_000 },
  },
  {
    name: "bundle loading second extend",
    input: {
      phases: ["html-parsed", "bundle-loading"],
      startup: null,
      bootWatchdogExtendCount: 1,
      now: 36_000,
    },
    expected: { action: "extend", extendMs: 16_000 },
  },
  {
    name: "bundle loading exhausted extends fails",
    input: {
      phases: ["html-parsed", "bundle-loading"],
      startup: null,
      bootWatchdogExtendCount: 2,
      now: 52_000,
    },
    expected: { action: "fail", reason: "no_react_render" },
  },
  {
    name: "already extended fails",
    input: {
      phases: ["bundle-loaded"],
      startup: null,
      bootWatchdogExtendCount: 1,
      now: 40_000,
    },
    expected: { action: "fail", reason: "no_react_render" },
  },
  {
    name: "stale progress fails",
    input: {
      phases: ["html-parsed"],
      startup: { lastProgressAt: 1_000 },
      bootWatchdogExtended: false,
      now: 20_000,
    },
    expected: { action: "fail", reason: "no_react_render" },
  },
  {
    name: "no progress no bundle fails",
    input: {
      phases: ["html-parsed"],
      startup: null,
      bootWatchdogExtended: false,
      now: 20_000,
    },
    expected: { action: "fail", reason: "no_react_render" },
  },
];

describe("boot-watchdog", () => {
  for (const vector of BOOT_WATCHDOG_VECTORS) {
    it(vector.name, () => {
      expect(evaluateBootWatchdog(vector.input)).toEqual(vector.expected);
    });
  }
});
