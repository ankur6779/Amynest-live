/**
 * Birth Sky sensitive-field encryption at rest (Pack 8 Part 4 / Conformance P1).
 * AES-256-GCM. API responses remain plaintext for authorized parents.
 */

import crypto from "node:crypto";

export const BIRTH_TIME_ENC_PREFIX = "bsenc.v1." as const;
export const BIRTH_PLACE_ENC_MARKER = "bsenc/v1" as const;

export type BirthPlacePlain = {
  label: string;
  lat: number;
  lon: number;
  timezoneIana?: string | null;
  country?: string | null;
  adminRegion?: string | null;
};

export type BirthPlaceEncryptedEnvelope = {
  __bsenc: typeof BIRTH_PLACE_ENC_MARKER;
  v: string;
};

export type BirthPlaceStored = BirthPlacePlain | BirthPlaceEncryptedEnvelope | null;

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.AMYNEST_ENV === "production"
  );
}

/** Resolve 32-byte AES key from env (never logged). */
export function resolveBirthFieldEncryptionKey(): Buffer {
  const raw = process.env.BIRTH_SKY_FIELD_ENCRYPTION_KEY?.trim();
  if (raw && raw.length >= 32) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return Buffer.from(raw, "hex");
    }
    try {
      const b64 = Buffer.from(raw, "base64");
      if (b64.length >= 32) return b64.subarray(0, 32);
    } catch {
      /* fall through */
    }
    return crypto.createHash("sha256").update(raw, "utf8").digest();
  }

  const session = process.env.SESSION_SECRET?.trim();
  if (session && session.length >= 32) {
    return crypto
      .createHash("sha256")
      .update(`birth-sky-fields:v1:${session}`, "utf8")
      .digest();
  }

  if (isProductionRuntime()) {
    throw new Error(
      "BIRTH_SKY_FIELD_ENCRYPTION_KEY (or SESSION_SECRET ≥32) required for Birth Sky field encryption in production",
    );
  }

  const db = process.env.DATABASE_URL?.trim() ?? "local-dev";
  return crypto
    .createHash("sha256")
    .update(`birth-sky-fields:dev:${db}`, "utf8")
    .digest();
}

function encryptUtf8(plaintext: string): string {
  const key = resolveBirthFieldEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    ct.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

function decryptUtf8(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("invalid_token");
  }
  const [ivB64, ctB64, tagB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, "base64url");
  const ct = Buffer.from(ctB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("invalid_token");
  }
  const key = resolveBirthFieldEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function isEncryptedBirthTime(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(BIRTH_TIME_ENC_PREFIX);
}

export function isEncryptedBirthPlace(value: unknown): value is BirthPlaceEncryptedEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.__bsenc === BIRTH_PLACE_ENC_MARKER && typeof v.v === "string";
}

export function isPlainBirthPlace(value: unknown): value is BirthPlacePlain {
  if (!value || typeof value !== "object" || isEncryptedBirthPlace(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.label === "string" &&
    typeof v.lat === "number" &&
    typeof v.lon === "number"
  );
}

export function sealBirthTime(plain: string | null): string | null {
  if (plain == null) return null;
  if (isEncryptedBirthTime(plain)) return plain; // idempotent
  return `${BIRTH_TIME_ENC_PREFIX}${encryptUtf8(plain)}`;
}

export function unsealBirthTime(stored: string | null): string | null {
  if (stored == null) return null;
  if (!isEncryptedBirthTime(stored)) return stored; // legacy plaintext
  const token = stored.slice(BIRTH_TIME_ENC_PREFIX.length);
  return decryptUtf8(token);
}

export function sealBirthPlace(plain: BirthPlacePlain | null): BirthPlaceStored {
  if (plain == null) return null;
  if (isEncryptedBirthPlace(plain)) return plain; // idempotent
  return {
    __bsenc: BIRTH_PLACE_ENC_MARKER,
    v: encryptUtf8(JSON.stringify(plain)),
  };
}

export function unsealBirthPlace(stored: BirthPlaceStored | unknown): BirthPlacePlain | null {
  if (stored == null) return null;
  if (isEncryptedBirthPlace(stored)) {
    const json = decryptUtf8(stored.v);
    const parsed: unknown = JSON.parse(json);
    if (!isPlainBirthPlace(parsed)) {
      throw new Error("invalid_place_payload");
    }
    return parsed;
  }
  if (isPlainBirthPlace(stored)) return stored;
  return null;
}

/** True when stored values still contain legacy plaintext secrets. */
export function profileNeedsAtRestMigration(row: {
  birthTime: string | null;
  birthPlace: unknown;
}): boolean {
  const timePlain =
    row.birthTime != null &&
    row.birthTime.length > 0 &&
    !isEncryptedBirthTime(row.birthTime);
  const placePlain = isPlainBirthPlace(row.birthPlace);
  return timePlain || placePlain;
}

export function sealProfileSensitiveFields(input: {
  birthTime: string | null;
  birthPlace: BirthPlacePlain | null;
}): { birthTime: string | null; birthPlace: BirthPlaceStored } {
  return {
    birthTime: sealBirthTime(input.birthTime),
    birthPlace: sealBirthPlace(input.birthPlace),
  };
}
