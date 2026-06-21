import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectRevenueCatCustomerIdentifiers,
  resolveCanonicalRevenueCatUserId,
} from "../rcCustomerService.js";

test("RevenueCat aliases prefer Firebase UID over anonymous app user id", () => {
  const body = {
    id: "$RCAnonymousID:bc712ba21b8a4458941a416abcd",
    original_app_user_id: "$RCAnonymousID:bc712ba21b8a4458941a416abcd",
    aliases: [
      "$RCAnonymousID:bc712ba21b8a4458941a416abcd",
      "batwvUd0UJV6o1Oh6QnbDbUeGfn2",
    ],
  };

  assert.deepEqual(collectRevenueCatCustomerIdentifiers(body, "$RCAnonymousID:bc712ba21b8a4458941a416abcd"), [
    "$RCAnonymousID:bc712ba21b8a4458941a416abcd",
    "batwvUd0UJV6o1Oh6QnbDbUeGfn2",
  ]);
  assert.equal(
    resolveCanonicalRevenueCatUserId(body, "$RCAnonymousID:bc712ba21b8a4458941a416abcd"),
    "batwvUd0UJV6o1Oh6QnbDbUeGfn2",
  );
});

test("RevenueCat aliases keep requested UID when it is already canonical", () => {
  const body = {
    id: "batwvUd0UJV6o1Oh6QnbDbUeGfn2",
    original_app_user_id: "batwvUd0UJV6o1Oh6QnbDbUeGfn2",
    aliases: [
      "$RCAnonymousID:bc712ba21b8a4458941a416abcd",
      "batwvUd0UJV6o1Oh6QnbDbUeGfn2",
    ],
  };

  assert.equal(
    resolveCanonicalRevenueCatUserId(body, "batwvUd0UJV6o1Oh6QnbDbUeGfn2"),
    "batwvUd0UJV6o1Oh6QnbDbUeGfn2",
  );
});

test("RevenueCat alias list response resolves anonymous id to Firebase UID", () => {
  const customer = {
    id: "$RCAnonymousID:bc712ba21b8a4458941a4165972ce8ce",
    object: "customer",
  };
  const aliases = {
    items: [
      {
        id: "$RCAnonymousID:bc712ba21b8a4458941a4165972ce8ce",
        object: "customer.alias",
      },
      {
        id: "batwvUd0UJV6o1Oh6QnbDbUeGfn2",
        object: "customer.alias",
      },
    ],
  };

  assert.equal(
    resolveCanonicalRevenueCatUserId([customer, ...aliases.items], "$RCAnonymousID:bc712ba21b8a4458941a4165972ce8ce"),
    "batwvUd0UJV6o1Oh6QnbDbUeGfn2",
  );
});
