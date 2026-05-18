import type { StressConfig } from "./config.js";
import type { ErrorLogEntry, PollLogEntry, RequestLogEntry } from "./metrics.js";
import { aggregateTimings } from "./metrics.js";

export function printStressReport(params: {
  config: StressConfig;
  requests: RequestLogEntry[];
  polls: PollLogEntry[];
  errors: ErrorLogEntry[];
  elapsedMs: number;
}): void {
  const { config, requests, polls, errors, elapsedMs } = params;

  const successes = requests.filter((r) => r.success);
  const failures = requests.filter((r) => !r.success);
  const partials = successes.filter((r) => r.coachStatus === "partial");
  const completes = successes.filter((r) => r.coachStatus === "complete");

  const responseTimes = successes.map((r) => r.responseTimeMs);
  const ttfbTimes = successes.map((r) => r.timeToFirstResponseMs);
  const respAgg = aggregateTimings(responseTimes);
  const ttfbAgg = aggregateTimings(ttfbTimes);

  const underSla = successes.filter((r) => r.timeToFirstResponseMs <= config.initialSlaMs).length;
  const slaPct =
    successes.length === 0 ? 0 : Math.round((underSla / successes.length) * 1000) / 10;

  const pollSuccesses = polls.filter((p) => p.success);
  const pollTimes = pollSuccesses.map((p) => p.backgroundCompletionMs);
  const pollAgg = aggregateTimings(pollTimes);

  const successRate =
    requests.length === 0 ? 0 : Math.round((successes.length / requests.length) * 1000) / 10;
  const failureRate =
    requests.length === 0 ? 0 : Math.round((failures.length / requests.length) * 1000) / 10;

  console.log("\n===== AMY COACH STRESS TEST REPORT =====\n");
  console.log(`API URL:              ${config.apiUrl}`);
  console.log(`Virtual users:        ${config.users}`);
  console.log(`Batch size:           ${config.batchSize}`);
  console.log(`Status polling:       ${config.pollStatus ? "yes" : "no"}`);
  console.log(`Total wall time:      ${(elapsedMs / 1000).toFixed(1)} s\n`);

  console.log(`Total Requests:       ${requests.length}`);
  console.log(`Success Rate:         ${successRate}%`);
  console.log(`Failure Rate:         ${failureRate}%`);
  console.log(`Partial responses:    ${partials.length}`);
  console.log(`Complete (cached):    ${completes.length}\n`);

  console.log("— Initial response (2 wins) —");
  console.log(`Avg Response Time:    ${respAgg.avg} ms`);
  console.log(`P95 Response Time:    ${respAgg.p95} ms`);
  console.log(`Max Response Time:    ${respAgg.max} ms`);
  console.log(`Min Response Time:    ${respAgg.min} ms`);
  console.log(`Avg TTFB:             ${ttfbAgg.avg} ms`);
  console.log(`P95 TTFB:             ${ttfbAgg.p95} ms`);
  console.log(
    `Initial SLA (<${config.initialSlaMs}ms): ${underSla}/${successes.length} (${slaPct}%)\n`,
  );

  if (config.pollStatus) {
    console.log("— Background completion (poll until complete) —");
    console.log(`Poll attempts:        ${polls.length}`);
    console.log(`Poll success rate:    ${
      polls.length === 0 ? 0 : Math.round((pollSuccesses.length / polls.length) * 1000) / 10
    }%`);
    console.log(
      `Background Completion Time Avg: ${pollAgg.avg} ms (${(pollAgg.avg / 1000).toFixed(1)} sec)`,
    );
    console.log(`Background P95:         ${pollAgg.p95} ms`);
    console.log(`Background Max:         ${pollAgg.max} ms\n`);
  }

  if (errors.length > 0) {
    console.log(`Errors logged:        ${errors.length}`);
    for (const e of errors.slice(0, 10)) {
      console.log(`  [${e.phase}] user=${e.userId} status=${e.status ?? "—"} ${e.message}`);
    }
    if (errors.length > 10) console.log(`  … and ${errors.length - 10} more`);
    console.log("");
  }

  console.log("===== END REPORT =====\n");
}
