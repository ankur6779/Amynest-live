#!/usr/bin/env tsx
/**
 * Amy Coach progressive-generation stress test.
 *
 * Usage:
 *   COACH_STRESS_AUTH_TOKEN=<firebase-id-token> pnpm run stress --users=50 --batch=10
 *   COACH_STRESS_AUTH_TOKEN=… pnpm run stress --profile=high
 *
 * Env:
 *   COACH_STRESS_AUTH_TOKEN / STRESS_AUTH_TOKEN — required Bearer token
 *   API_URL / COACH_STRESS_API_URL — default http://localhost:5000
 *   USERS, BATCH_SIZE — optional overrides
 */

import { loadStressConfig } from "./src/amy-coach-stress/config.js";
import { runFullCoachFlow } from "./src/amy-coach-stress/client.js";
import { printStressReport } from "./src/amy-coach-stress/report.js";
import type { ErrorLogEntry, PollLogEntry, RequestLogEntry } from "./src/amy-coach-stress/metrics.js";
import { runInBatches } from "./src/amy-coach-stress/metrics.js";

async function main(): Promise<void> {
  const config = loadStressConfig();
  const requests: RequestLogEntry[] = [];
  const polls: PollLogEntry[] = [];
  const errors: ErrorLogEntry[] = [];

  const indices = Array.from({ length: config.users }, (_, i) => i);

  console.log("\n🧪 Amy Coach stress test starting…");
  console.log(`   ${config.users} virtual users, batch size ${config.batchSize}`);
  console.log(`   Target: ${config.apiUrl}/api/coach/generate\n`);

  const wallStart = performance.now();

  await runInBatches(indices, config.batchSize, async (virtualUserIndex) => {
    try {
      const result = await runFullCoachFlow(config, virtualUserIndex);
      requests.push(result.generate.requestLog);

      console.log(
        JSON.stringify({
          userId: result.generate.requestLog.userId,
          responseTime: result.generate.requestLog.responseTimeMs,
          timeToFirstResponse: result.generate.requestLog.timeToFirstResponseMs,
          status: result.generate.requestLog.status,
          coachStatus: result.generate.requestLog.coachStatus,
          success: result.generate.requestLog.success,
          timestamp: result.generate.requestLog.timestamp,
        }),
      );

      if (!result.generate.requestLog.success) {
        errors.push({
          userId: result.generate.requestLog.userId,
          virtualUserIndex,
          phase: "generate",
          message: result.generate.requestLog.error ?? `HTTP ${result.generate.requestLog.status}`,
          timestamp: result.generate.requestLog.timestamp,
          status: result.generate.requestLog.status,
        });
      }

      if (result.poll) {
        polls.push(result.poll);
        if (!result.poll.success) {
          errors.push({
            userId: result.poll.userId,
            virtualUserIndex,
            phase: "poll",
            message: result.poll.error ?? "poll failed",
            timestamp: result.poll.timestamp,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const timestamp = new Date().toISOString();
      errors.push({
        userId: `stress-user-${virtualUserIndex}`,
        virtualUserIndex,
        phase: "generate",
        message,
        timestamp,
      });
      console.error(`[fatal] virtualUser=${virtualUserIndex} ${message}`);
    }
  });

  printStressReport({
    config,
    requests,
    polls,
    errors,
    elapsedMs: Math.round(performance.now() - wallStart),
  });

  const failureRate = requests.length
    ? requests.filter((r) => !r.success).length / requests.length
    : 1;
  if (failureRate > 0.2) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Stress test crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
