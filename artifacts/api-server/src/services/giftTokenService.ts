import { db, giftTokensTable, type GiftToken } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { extendBonusPremium } from "./subscriptionService";

// ─── Constants ────────────────────────────────────────────────────────────────

const GIFT_CODE_PREFIX = "GIFT-";
const GIFT_CODE_BODY_LEN = 7;
const GIFT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Gift tokens expire 365 days after creation if not redeemed. */
const GIFT_TOKEN_EXPIRY_DAYS = 365;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomBody(len = GIFT_CODE_BODY_LEN): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += GIFT_CODE_ALPHABET[Math.floor(Math.random() * GIFT_CODE_ALPHABET.length)];
  }
  return out;
}

function buildGiftCode(): string {
  return `${GIFT_CODE_PREFIX}${randomBody()}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a new gift token for the given owner. Retries up to 5 times on the
 * (very unlikely) unique-code collision.
 */
export async function createGiftToken(
  ownerUserId: string,
  bonusDays = 30,
): Promise<GiftToken> {
  const expiresAt = new Date(Date.now() + GIFT_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  for (let attempt = 0; attempt < 5; attempt++) {
    const giftCode = buildGiftCode();
    try {
      const [row] = await db
        .insert(giftTokensTable)
        .values({ ownerUserId, giftCode, bonusDays, expiresAt })
        .returning();
      logger.info({ ownerUserId, giftCode, bonusDays }, "gift_token_created");
      return row;
    } catch (err: any) {
      // Unique violation → retry with a new code
      if (err?.code === "23505") continue;
      throw err;
    }
  }
  throw new Error("gift_token_create_collision_exhausted");
}

export type RedeemResult =
  | { ok: true; bonusDays: number; giftCode: string }
  | { ok: false; reason: "not_found" | "already_redeemed" | "expired" | "self_redeem" | "server_error" };

/**
 * Redeems a gift token for the recipient. Grants bonus premium days on success.
 * Returns a typed result — never throws for caller-visible errors.
 */
export async function redeemGiftToken(
  giftCode: string,
  recipientUserId: string,
): Promise<RedeemResult> {
  const code = giftCode.trim().toUpperCase();
  const [token] = await db
    .select()
    .from(giftTokensTable)
    .where(eq(giftTokensTable.giftCode, code));

  if (!token) return { ok: false, reason: "not_found" };
  if (token.ownerUserId === recipientUserId) return { ok: false, reason: "self_redeem" };
  if (token.status === "redeemed") return { ok: false, reason: "already_redeemed" };
  if (token.status === "expired" || (token.expiresAt && token.expiresAt < new Date())) {
    return { ok: false, reason: "expired" };
  }

  // Mark redeemed atomically — only succeeds if status is still "available"
  const updated = await db
    .update(giftTokensTable)
    .set({
      status: "redeemed",
      recipientUserId,
      redeemedAt: new Date(),
    })
    .where(
      and(
        eq(giftTokensTable.giftCode, code),
        eq(giftTokensTable.status, "available"),
      ),
    )
    .returning({ id: giftTokensTable.id, bonusDays: giftTokensTable.bonusDays });

  if (updated.length === 0) return { ok: false, reason: "already_redeemed" };

  const bonusDays = updated[0].bonusDays;
  try {
    await extendBonusPremium(recipientUserId, bonusDays);
    logger.info({ recipientUserId, giftCode: code, bonusDays }, "gift_token_redeemed");
    return { ok: true, bonusDays, giftCode: code };
  } catch (err) {
    logger.error({ err, recipientUserId, giftCode: code }, "gift_token_bonus_extend_failed");
    return { ok: false, reason: "server_error" };
  }
}

/**
 * Returns all gift tokens owned by the user, newest first.
 */
export async function listGiftTokens(ownerUserId: string): Promise<GiftToken[]> {
  return db
    .select()
    .from(giftTokensTable)
    .where(eq(giftTokensTable.ownerUserId, ownerUserId))
    .orderBy(giftTokensTable.createdAt);
}
