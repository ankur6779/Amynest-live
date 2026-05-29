/**
 * Post-release watchdog: fail if chat keyboard visibility telemetry appears in logs.
 *
 * Pipe Render/production logs:
 *   render logs <service-id> --tail 5000 | pnpm --filter @workspace/scripts run check-chat-platform-telemetry
 *
 * Or:
 *   cat production.log | pnpm --filter @workspace/scripts run check-chat-platform-telemetry
 *
 * Success criteria (7-day window): ZERO matches for failure events.
 * Recovery events (chat_prompt_recovery_triggered) are warnings only.
 */
import { createInterface } from "node:readline";
import { stdin as input } from "node:process";

const FAILURE_EVENTS = [
  "chat_prompt_hidden_after_keyboard_open",
  "keyboard_visibility_failures",
  "android_keyboard_layout_conflicts",
] as const;

const WARNING_EVENTS = ["chat_prompt_recovery_triggered"] as const;

async function main(): Promise<void> {
  const failureCounts = new Map<string, number>();
  const warningCounts = new Map<string, number>();
  for (const e of FAILURE_EVENTS) failureCounts.set(e, 0);
  for (const e of WARNING_EVENTS) warningCounts.set(e, 0);

  const rl = createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) {
    for (const event of FAILURE_EVENTS) {
      if (line.includes(event)) {
        failureCounts.set(event, (failureCounts.get(event) ?? 0) + 1);
      }
    }
    for (const event of WARNING_EVENTS) {
      if (line.includes(event)) {
        warningCounts.set(event, (warningCounts.get(event) ?? 0) + 1);
      }
    }
  }

  let totalFailures = 0;
  for (const [event, count] of failureCounts) {
    if (count > 0) {
      console.error(`P0 telemetry: ${event} × ${count}`);
      totalFailures += count;
    }
  }

  for (const [event, count] of warningCounts) {
    if (count > 0) {
      console.warn(`Recovery telemetry: ${event} × ${count} (investigate if sustained)`);
    }
  }

  if (totalFailures > 0) {
    console.error(
      `\n${totalFailures} chat keyboard visibility failure(s) detected — reopen P0 investigation.`,
    );
    process.exit(1);
  }

  console.log("ChatPlatform telemetry watchdog: 0 visibility failures in scanned logs.");
}

void main();
