import { stagingIsolationProblem } from "./staging-isolation";

const problem = stagingIsolationProblem({
  databaseUrl: process.env.STAGING_DATABASE_URL,
  redisUrl: process.env.STAGING_REDIS_URL,
  apiPublicUrl: process.env.STAGING_API_PUBLIC_URL,
  workerEnabled: process.env.STAGING_WORKER_ENABLED === "true",
});

if (problem) {
  console.error(`STAGING ISOLATION: ${problem}`);
  process.exit(1);
}

console.log("STAGING ISOLATION: ok");
