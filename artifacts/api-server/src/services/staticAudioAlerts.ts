import { logger } from "../lib/logger.js";

/** Optional webhook for ops (Slack-compatible JSON or plain POST). */
export async function sendStaticAudioAlert(
  kind: string,
  detail: Record<string, unknown>,
): Promise<void> {
  const url = process.env.STATIC_AUDIO_ALERT_WEBHOOK_URL?.trim();
  if (!url) return;

  try {
    const body = {
      text: `[AmyNest] Static audio alert: ${kind}`,
      kind,
      detail,
      ts: new Date().toISOString(),
    };
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    logger.warn(
      {
        evt: "static_audio.alert_webhook_failed",
        kind,
        message: err instanceof Error ? err.message : String(err),
      },
      "static audio alert webhook failed",
    );
  }
}
