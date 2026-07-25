/**
 * Secure offline crypto (Pack 8 Part 4) — AES-GCM for Birth Sky offline bundles.
 * Device key lives in IndexedDB when available; never stores birth time/place as plaintext.
 */

export const BIRTH_SKY_OFFLINE_ENVELOPE_VERSION = "birth_sky_offline_envelope/1.0.0" as const;
export const BIRTH_SKY_OFFLINE_ALG = "A256GCM" as const;

const IDB_NAME = "amynest-birth-sky-crypto";
const IDB_STORE = "keys";
const KEY_RECORD = "offline_device_key_v1";
/** Fallback key material slot — random key bytes only, never birth payload. */
const LS_KEY_FALLBACK = "amynest:birth-sky:offline-key-material:v1";

export type OfflineEncryptedEnvelope = {
  envelopeVersion: typeof BIRTH_SKY_OFFLINE_ENVELOPE_VERSION;
  alg: typeof BIRTH_SKY_OFFLINE_ALG;
  iv: string;
  ciphertext: string;
  profileId: string;
  /** Inner OfflineCacheBundle.schemaVersion */
  payloadSchemaVersion: "1";
};

let cachedKey: CryptoKey | null = null;
let keyInit: Promise<CryptoKey> | null = null;

function getSubtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) {
    throw new Error("webcrypto_unavailable");
  }
  return c.subtle;
}

function bytesToB64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGetRaw(): Promise<ArrayBuffer | null> {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(KEY_RECORD);
      req.onsuccess = () => {
        const v = req.result as ArrayBuffer | undefined;
        resolve(v ?? null);
        db.close();
      };
      req.onerror = () => {
        resolve(null);
        db.close();
      };
    } catch {
      resolve(null);
    }
  });
}

async function idbPutRaw(raw: ArrayBuffer): Promise<boolean> {
  const db = await openIdb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(raw, KEY_RECORD);
      req.onsuccess = () => {
        resolve(true);
        db.close();
      };
      req.onerror = () => {
        resolve(false);
        db.close();
      };
    } catch {
      resolve(false);
    }
  });
}

async function importAesKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return getSubtle().importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function createAndPersistKey(): Promise<CryptoKey> {
  const raw = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const key = await importAesKey(raw.buffer);
  const stored = await idbPutRaw(raw.buffer.slice(0));
  if (!stored) {
    try {
      localStorage.setItem(LS_KEY_FALLBACK, bytesToB64(raw));
    } catch {
      /* memory-only key — session limited */
    }
  }
  return key;
}

async function loadOrCreateDeviceKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  if (!keyInit) {
    keyInit = (async () => {
      const fromIdb = await idbGetRaw();
      if (fromIdb) {
        cachedKey = await importAesKey(fromIdb);
        return cachedKey;
      }
      try {
        const ls = localStorage.getItem(LS_KEY_FALLBACK);
        if (ls) {
          const bytes = b64ToBytes(ls);
          const ab = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ) as ArrayBuffer;
          cachedKey = await importAesKey(ab);
          await idbPutRaw(ab);
          return cachedKey;
        }
      } catch {
        /* continue */
      }
      cachedKey = await createAndPersistKey();
      return cachedKey;
    })();
  }
  return keyInit;
}

export function isOfflineEncryptedEnvelope(value: unknown): value is OfflineEncryptedEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.envelopeVersion === BIRTH_SKY_OFFLINE_ENVELOPE_VERSION &&
    v.alg === BIRTH_SKY_OFFLINE_ALG &&
    typeof v.iv === "string" &&
    typeof v.ciphertext === "string" &&
    typeof v.profileId === "string"
  );
}

export async function encryptOfflinePayload(
  profileId: string,
  plaintextJson: string,
): Promise<OfflineEncryptedEnvelope> {
  const key = await loadOrCreateDeviceKey();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintextJson);
  const ct = await getSubtle().encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    envelopeVersion: BIRTH_SKY_OFFLINE_ENVELOPE_VERSION,
    alg: BIRTH_SKY_OFFLINE_ALG,
    iv: bytesToB64(iv),
    ciphertext: bytesToB64(ct),
    profileId,
    payloadSchemaVersion: "1",
  };
}

export async function decryptOfflinePayload(envelope: OfflineEncryptedEnvelope): Promise<string> {
  const key = await loadOrCreateDeviceKey();
  const iv = b64ToBytes(envelope.iv);
  const ct = b64ToBytes(envelope.ciphertext);
  const pt = await getSubtle().decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ct as BufferSource,
  );
  return new TextDecoder().decode(pt);
}

/** Test helper — clears in-memory key cache (does not wipe IDB). */
export function __resetOfflineCryptoCacheForTests(): void {
  cachedKey = null;
  keyInit = null;
}
