/**
 * Release blocker: real Android device certification must be recorded before ship.
 *
 *   pnpm --filter @workspace/scripts run check-chat-platform-certification
 *
 * Update scripts/chat-platform-device-certification.json with:
 * - certifiedBy, certifiedAt, appVersion, webDeploySha
 * - Each device: status "pass", videoUrl (uncut recording), all scenarios "pass"
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

const CERT_PATH = join(REPO_ROOT, "scripts/chat-platform-device-certification.json");

const REQUIRED_SCENARIOS = [
  "freshInstall",
  "existingUser",
  "onboarding",
  "longChatHistory",
  "textInput",
  "timePicker",
  "datePicker",
  "dropdownAnswer",
  "orientationChange",
  "backgroundForeground",
] as const;

interface DeviceCert {
  id: string;
  label: string;
  videoUrl: string;
  status: string;
  scenarios: Record<string, string>;
}

interface CertificationFile {
  certifiedBy?: string;
  certifiedAt?: string;
  appVersion?: string;
  webDeploySha?: string;
  devices: DeviceCert[];
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

const raw = readFileSync(CERT_PATH, "utf8");
const cert = JSON.parse(raw) as CertificationFile;
const violations: string[] = [];

if (!cert.certifiedBy?.trim()) {
  violations.push("certifiedBy is required");
}
if (!cert.certifiedAt?.trim()) {
  violations.push("certifiedAt is required (ISO date)");
}
if (!cert.appVersion?.trim()) {
  violations.push("appVersion is required (Play Store build tested)");
}
if (!cert.webDeploySha?.trim()) {
  violations.push("webDeploySha is required (git SHA deployed to amynest.in)");
}

for (const device of cert.devices ?? []) {
  if (device.status !== "pass") {
    violations.push(`${device.label}: status must be "pass" (got "${device.status}")`);
  }
  if (!device.videoUrl?.trim() || !isHttpUrl(device.videoUrl)) {
    violations.push(`${device.label}: videoUrl must be a public https URL to uncut certification video`);
  }
  for (const scenario of REQUIRED_SCENARIOS) {
    if (device.scenarios?.[scenario] !== "pass") {
      violations.push(`${device.label}: scenario "${scenario}" must be "pass"`);
    }
  }
}

if (violations.length) {
  console.error("ChatPlatform device certification INCOMPLETE — release blocked:\n");
  for (const v of violations) console.error(`  - ${v}`);
  console.error(`\nEdit ${CERT_PATH} after REAL device testing with uncut screen recordings.`);
  console.error("Emulator, dev server, and unit-test-only validation do NOT satisfy this gate.");
  process.exit(1);
}

console.log("ChatPlatform device certification passed.");
console.log(`  Certified by: ${cert.certifiedBy}`);
console.log(`  At: ${cert.certifiedAt}`);
console.log(`  Devices: ${cert.devices.length}`);
