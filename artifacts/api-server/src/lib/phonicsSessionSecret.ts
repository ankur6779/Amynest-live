import crypto from "node:crypto";
import { readEnv } from "./env.js";
import { logger } from "./logger.js";

export type PhonicsSessionSecretSource =
  | "session_secret"
  | "phonics_session_secret"
  | "jwt_secret"
  | "webhook_secret"
  | "derived"
  | "dev_fallback";

let cached: { secret: string; source: PhonicsSessionSecretSource } | null = null;

function firstLongSecret(...names: string[]): string | null {
  for (const name of names) {
    const v = readEnv(name)?.trim();
    if (v && v.length >= 32) return v;
  }
  return null;
}

function deriveFromDeploymentMaterial(): string | null {
  const parts = [
    readEnv("DATABASE_URL"),
    readEnv("FIREBASE_SERVICE_ACCOUNT_JSON"),
    readEnv("OPENAI_API_KEY"),
    readEnv("REVENUECAT_WEBHOOK_SECRET"),
    readEnv("RAZORPAY_WEBHOOK_SECRET"),
    readEnv("API_PUBLIC_URL"),
  ].filter((p): p is string => !!p && p.trim().length > 0);

  if (parts.length === 0) return null;

  return crypto
    .createHash("sha256")
    .update(`amynest-phonics-session-v1:${parts.join("\n")}`)
    .digest("hex");
}

/**
 * AES-256-GCM key material for phonics test sessions (32+ chars required).
 * Production Render often omits SESSION_SECRET — derive from other configured secrets.
 */
export function resolvePhonicsSessionSecret(): {
  secret: string;
  source: PhonicsSessionSecretSource;
} {
  const explicit = firstLongSecret("SESSION_SECRET");
  if (explicit) return { secret: explicit, source: "session_secret" };

  const phonics = firstLongSecret("PHONICS_SESSION_SECRET");
  if (phonics) return { secret: phonics, source: "phonics_session_secret" };

  const jwt = firstLongSecret("JWT_SECRET", "AUTH_SECRET");
  if (jwt) return { secret: jwt, source: "jwt_secret" };

  const webhook = firstLongSecret(
    "REVENUECAT_WEBHOOK_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "FIREBASE_PRIVATE_KEY",
  );
  if (webhook) return { secret: webhook, source: "webhook_secret" };

  const derived = deriveFromDeploymentMaterial();
  if (derived) return { secret: derived, source: "derived" };

  if (process.env.NODE_ENV !== "production") {
    return {
      secret: crypto
        .createHash("sha256")
        .update("amynest-phonics-dev-session-v1")
        .digest("hex"),
      source: "dev_fallback",
    };
  }

  throw new Error(
    "Phonics test sessions need SESSION_SECRET (32+ chars) or DATABASE_URL + Firebase/OpenAI secrets for derivation",
  );
}

/** Cached secret — safe to call on every /tests/start and /tests/submit. */
export function getPhonicsSessionSecret(): string {
  if (!cached) {
    cached = resolvePhonicsSessionSecret();
    logger.info(
      {
        evt: "phonics.session_secret_ready",
        source: cached.source,
        length: cached.secret.length,
      },
      "Phonics test session encryption ready",
    );
  }
  return cached.secret;
}

/** @internal — reset cache for unit tests */
export function resetPhonicsSessionSecretCacheForTests(): void {
  cached = null;
}
