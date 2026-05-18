import { logger } from "./logger";

const INTERVAL_MS = 5 * 60 * 1000;

/**
 * Render free tier sleeps after ~15 min idle. Ping /health on a schedule
 * so cold starts are less likely during peak hours.
 */
export function startRenderKeepWarm(port: number): void {
  if (process.env.RENDER !== "true" && !process.env.RENDER) return;

  const base =
    process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, "") ??
    `http://127.0.0.1:${port}`;

  const ping = (): void => {
    const url = `${base}/health`;
    fetch(url, { signal: AbortSignal.timeout(15_000) })
      .then((r) => {
        if (!r.ok) {
          logger.warn({ url, status: r.status }, "Keep-warm ping non-OK");
        }
      })
      .catch((err) => {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err), url },
          "Keep-warm ping failed",
        );
      });
  };

  ping();
  setInterval(ping, INTERVAL_MS);
  logger.info({ base, intervalMs: INTERVAL_MS }, "Render keep-warm started");
}
