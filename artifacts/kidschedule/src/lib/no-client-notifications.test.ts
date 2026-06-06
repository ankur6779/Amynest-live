/**
 * CI guard: client must never schedule or create browser notifications.
 * Push registration + service-worker display of server pushes are allowlisted.
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, "..");

/** Files that may reference Notification API for push registration or SW display only. */
const ALLOWLIST = new Set([
  "lib/firebase.ts",
  "lib/native-push-bridge.ts",
  "lib/pwa-android-permissions.ts",
  "hooks/use-web-push.ts",
  "lib/native-push-bridge.notify.test.ts",
  "components/native-startup-permissions-gate.tsx",
  "lib/no-client-notifications.test.ts",
]);

const FORBIDDEN: Array<{ name: string; pattern: RegExp }> = [
  { name: "new Notification(", pattern: /\bnew\s+Notification\s*\(/ },
  {
    name: "Notification.requestPermission(",
    pattern: /\bNotification\.requestPermission\s*\(/,
  },
  { name: "window.Notification", pattern: /\bwindow\.Notification\b/ },
  {
    name: "setTimeout notification scheduling",
    pattern: /setTimeout\s*\([^)]*notification/i,
  },
];

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      walkTsFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("no client-side notification authority", () => {
  it("production kidschedule src has zero forbidden notification patterns", () => {
    const files = walkTsFiles(SRC_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const rel = path.relative(SRC_ROOT, file).replace(/\\/g, "/");
      if (ALLOWLIST.has(rel)) continue;

      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");

      for (const rule of FORBIDDEN) {
        lines.forEach((line, idx) => {
          if (rule.pattern.test(line)) {
            violations.push(`${rel}:${idx + 1} — ${rule.name}`);
          }
        });
      }

      // Notification.permission outside allowlist (direct browser permission checks)
      lines.forEach((line, idx) => {
        if (/\bNotification\.permission\b/.test(line)) {
          violations.push(`${rel}:${idx + 1} — Notification.permission`);
        }
      });

      // showNotification outside firebase SW handler
      lines.forEach((line, idx) => {
        if (/\bshowNotification\s*\(/.test(line)) {
          violations.push(`${rel}:${idx + 1} — showNotification(`);
        }
      });
    }

    assert.equal(
      violations.length,
      0,
      `Client notification bypass detected:\n${violations.join("\n")}`,
    );
  });
});
