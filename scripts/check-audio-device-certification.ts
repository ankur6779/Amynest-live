/**
 * Audio device matrix certification gate (manual release, like chat-platform cert).
 *
 *   pnpm run check:audio-device-certification
 *
 * Update scripts/audio-device-certification.json after real-device testing.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

const CERT_PATH = join(REPO_ROOT, "scripts/audio-device-certification.json");

const REQUIRED_MODULES = [
  "speech_coach",
  "phonics",
  "blending",
  "reading",
  "parent_hub",
] as const;

type DeviceCert = {
  id: string;
  label: string;
  status: string;
  modulesCompleted: Record<string, string>;
  actionsPerModule: number;
  reportUrl?: string;
};

type CertificationFile = {
  certifiedBy?: string;
  certifiedAt?: string;
  appVersion?: string;
  webDeploySha?: string;
  devices: DeviceCert[];
};

function main(): void {
  let raw: CertificationFile;
  try {
    raw = JSON.parse(readFileSync(CERT_PATH, "utf8")) as CertificationFile;
  } catch {
    console.error(`Missing or invalid ${CERT_PATH}`);
    process.exit(1);
  }

  const failures: string[] = [];

  if (!raw.certifiedBy?.trim()) failures.push("certifiedBy is empty");
  if (!raw.certifiedAt?.trim()) failures.push("certifiedAt is empty");

  for (const device of raw.devices ?? []) {
    if (device.status !== "pass") {
      failures.push(`Device ${device.id} status is "${device.status}" (need "pass")`);
      continue;
    }
    for (const mod of REQUIRED_MODULES) {
      if (device.modulesCompleted?.[mod] !== "pass") {
        failures.push(`Device ${device.id} module ${mod} not pass`);
      }
    }
    if ((device.actionsPerModule ?? 0) < 100) {
      failures.push(`Device ${device.id} actionsPerModule < 100`);
    }
  }

  if (failures.length > 0) {
    console.error("\nAudio device certification FAILED (manual release gate):\n");
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      "\nComplete real-device testing, then update scripts/audio-device-certification.json\n",
    );
    process.exit(1);
  }

  console.log("Audio device certification PASSED.");
}

main();
