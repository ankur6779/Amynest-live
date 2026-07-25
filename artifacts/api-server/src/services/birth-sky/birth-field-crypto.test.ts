/**
 * RC1 — server birth field encryption at rest (Pack 8 Part 4).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import {
  BIRTH_PLACE_ENC_MARKER,
  BIRTH_TIME_ENC_PREFIX,
  isEncryptedBirthPlace,
  isEncryptedBirthTime,
  profileNeedsAtRestMigration,
  sealBirthPlace,
  sealBirthTime,
  sealProfileSensitiveFields,
  unsealBirthPlace,
  unsealBirthTime,
} from "./birth-field-crypto.js";

describe("birth-field-crypto RC1", () => {
  const prevKey = process.env.BIRTH_SKY_FIELD_ENCRYPTION_KEY;

  before(() => {
    process.env.BIRTH_SKY_FIELD_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  after(() => {
    if (prevKey === undefined) delete process.env.BIRTH_SKY_FIELD_ENCRYPTION_KEY;
    else process.env.BIRTH_SKY_FIELD_ENCRYPTION_KEY = prevKey;
  });

  it("seals birth time — no plaintext HH:MM in stored value", () => {
    const sealed = sealBirthTime("08:30");
    assert.ok(sealed);
    assert.ok(isEncryptedBirthTime(sealed));
    assert.ok(sealed.startsWith(BIRTH_TIME_ENC_PREFIX));
    assert.equal(sealed.includes("08:30"), false);
    assert.equal(unsealBirthTime(sealed), "08:30");
  });

  it("seals birth place — no lat/lon plaintext in envelope", () => {
    const place = { label: "City", lat: 12.97, lon: 77.59 };
    const sealed = sealBirthPlace(place);
    assert.ok(isEncryptedBirthPlace(sealed));
    assert.equal(sealed?.__bsenc, BIRTH_PLACE_ENC_MARKER);
    const raw = JSON.stringify(sealed);
    assert.equal(raw.includes("12.97"), false);
    assert.equal(raw.includes("77.59"), false);
    assert.deepEqual(unsealBirthPlace(sealed), place);
  });

  it("seal is idempotent", () => {
    const once = sealBirthTime("14:45");
    const twice = sealBirthTime(once);
    assert.equal(once, twice);
    const placeOnce = sealBirthPlace({ label: "A", lat: 1, lon: 2 });
    const placeTwice = sealBirthPlace(placeOnce as never);
    assert.deepEqual(placeOnce, placeTwice);
  });

  it("reads legacy plaintext without failing", () => {
    assert.equal(unsealBirthTime("09:15"), "09:15");
    assert.deepEqual(unsealBirthPlace({ label: "X", lat: 3, lon: 4 }), {
      label: "X",
      lat: 3,
      lon: 4,
    });
  });

  it("detects migration need for plaintext rows", () => {
    assert.equal(
      profileNeedsAtRestMigration({
        birthTime: "08:30",
        birthPlace: { label: "A", lat: 1, lon: 2 },
      }),
      true,
    );
    const sealed = sealProfileSensitiveFields({
      birthTime: "08:30",
      birthPlace: { label: "A", lat: 1, lon: 2 },
    });
    assert.equal(
      profileNeedsAtRestMigration({
        birthTime: sealed.birthTime,
        birthPlace: sealed.birthPlace,
      }),
      false,
    );
  });

  it("null fields stay null", () => {
    assert.equal(sealBirthTime(null), null);
    assert.equal(sealBirthPlace(null), null);
    assert.equal(unsealBirthTime(null), null);
    assert.equal(unsealBirthPlace(null), null);
  });
});
