/**
 * Anonymous device registry for pre-signup CRM push (Segment 2).
 * Tokens are mirrored into push_tokens under synthetic userId `anon:{deviceId}`
 * so the existing dispatch / claim / FCM pipeline stays intact.
 *
 * Linking an anonymous device to a signed-in user MUST prove push-token
 * possession: the caller presents the same FCM token that was stored for that
 * deviceId. Otherwise an attacker who knows a shared-tablet install id can
 * plant their own token via register-anonymous and auto-receive the victim's
 * private notifications after /push/register links the header device id.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { anonymousDevicesTable, db, pushTokensTable } from "@workspace/db";

const ANON_PREFIX = "anon:";

export function anonymousUserId(deviceId: string): string {
  return `${ANON_PREFIX}${deviceId}`;
}

export type AnonymousLinkGate =
  | { ok: true }
  | { ok: false; reason: "missing_token" | "missing_stored" | "token_mismatch" };

/**
 * Pure gate used by linkAnonymousDeviceToUser (and unit tests).
 * presentedPushToken must exactly match the token previously stored for the device.
 */
export function canLinkAnonymousDevice(params: {
  storedPushToken: string | null | undefined;
  presentedPushToken: string | null | undefined;
}): AnonymousLinkGate {
  const presented = params.presentedPushToken?.trim() ?? "";
  if (!presented) return { ok: false, reason: "missing_token" };
  const stored = params.storedPushToken?.trim() ?? "";
  if (!stored) return { ok: false, reason: "missing_stored" };
  if (stored !== presented) return { ok: false, reason: "token_mismatch" };
  return { ok: true };
}

export interface RegisterAnonymousDeviceInput {
  deviceId: string;
  pushToken: string;
  platform?: string;
  deviceName?: string | null;
  locale?: string | null;
  timezone?: string;
}

export async function registerAnonymousDevice(
  input: RegisterAnonymousDeviceInput,
): Promise<{ ok: true }> {
  const platform = input.platform ?? "unknown";
  const timezone = input.timezone ?? "Asia/Kolkata";
  const syntheticUserId = anonymousUserId(input.deviceId);

  await db
    .insert(anonymousDevicesTable)
    .values({
      deviceId: input.deviceId,
      pushToken: input.pushToken,
      platform,
      deviceName: input.deviceName ?? null,
      locale: input.locale ?? null,
      timezone,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: anonymousDevicesTable.deviceId,
      set: {
        pushToken: input.pushToken,
        platform,
        deviceName: input.deviceName ?? null,
        locale: input.locale ?? null,
        timezone,
        lastSeenAt: sql`now()`,
        uninstalledAt: null,
      },
    });

  await db
    .insert(pushTokensTable)
    .values({
      userId: syntheticUserId,
      token: input.pushToken,
      platform,
      deviceName: input.deviceName ?? null,
    })
    .onConflictDoUpdate({
      target: pushTokensTable.token,
      set: {
        userId: syntheticUserId,
        platform,
        deviceName: input.deviceName ?? null,
        lastSeenAt: sql`now()`,
      },
    });

  return { ok: true };
}

export async function linkAnonymousDeviceToUser(
  deviceId: string,
  userId: string,
  opts: { requirePushToken: string },
): Promise<{ linked: boolean; reason?: string }> {
  const [device] = await db
    .select()
    .from(anonymousDevicesTable)
    .where(eq(anonymousDevicesTable.deviceId, deviceId))
    .limit(1);

  if (!device) return { linked: false, reason: "not_found" };

  const gate = canLinkAnonymousDevice({
    storedPushToken: device.pushToken,
    presentedPushToken: opts.requirePushToken,
  });
  if (!gate.ok) {
    return { linked: false, reason: gate.reason };
  }

  const syntheticUserId = anonymousUserId(deviceId);

  await db
    .update(pushTokensTable)
    .set({ userId, lastSeenAt: new Date() })
    .where(
      and(
        eq(pushTokensTable.userId, syntheticUserId),
        eq(pushTokensTable.token, device.pushToken),
      ),
    );

  await db
    .update(anonymousDevicesTable)
    .set({ linkedUserId: userId, linkedAt: new Date() })
    .where(eq(anonymousDevicesTable.deviceId, deviceId));

  return { linked: true };
}

export async function listUnlinkedAnonymousDevices(limit = 200) {
  return db
    .select()
    .from(anonymousDevicesTable)
    .where(
      and(
        isNull(anonymousDevicesTable.linkedUserId),
        isNull(anonymousDevicesTable.uninstalledAt),
      ),
    )
    .limit(limit);
}
