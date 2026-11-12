import { and, eq, ne, sql } from "drizzle-orm";
import { db, userDevicesTable, type UserDevice } from "@workspace/db";
import {
  getOrCreateSubscription,
  isPremiumNow,
  resolveDevicesMax,
} from "./subscriptionService.js";
import { logger } from "../lib/logger.js";
import {
  normalizeDeviceMetadata,
  type DeviceMetadataInput,
} from "../lib/device-metadata.js";
import { decideDeviceRegistration } from "./deviceLimitLogic.js";

export { canAddNewDevice, isDeviceLimitExempt } from "./deviceLimitLogic.js";

/** Drizzle transaction shares the same query API as `db`. */
type DbExec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const DEVICE_ID_HEADER = "x-amynest-device-id";
export const DEVICE_NAME_HEADER = "x-amynest-device-name";
export const DEVICE_PLATFORM_HEADER = "x-amynest-platform";
export const DEVICE_BROWSER_HEADER = "x-amynest-browser";
export const DEVICE_OS_HEADER = "x-amynest-os";
export const DEVICE_APP_VERSION_HEADER = "x-amynest-app-version";

export type DeviceRecord = {
  id: number;
  deviceId: string;
  deviceName: string | null;
  platform: string;
  browser: string | null;
  os: string | null;
  appVersion: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  isActive: boolean;
  /** Computed for the requesting client — not stored in DB. */
  isCurrentDevice: boolean;
};

export type DeviceRegistrationResult =
  | { ok: true; device: DeviceRecord; registered: boolean }
  | {
      ok: false;
      error: "device_limit_reached";
      message: string;
      limit: number;
      activeDeviceCount: number;
      devices: DeviceRecord[];
    };

function toDeviceRecord(row: UserDevice, currentDeviceId?: string): DeviceRecord {
  const isCurrent = currentDeviceId === row.deviceId;
  return {
    id: row.id,
    deviceId: row.deviceId,
    deviceName: row.deviceName,
    platform: row.platform,
    browser: row.browser,
    os: row.os,
    appVersion: row.appVersion,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    isActive: row.isActive === 1,
    isCurrentDevice: isCurrent,
  };
}

/** Back-compat: older API consumers used `isCurrent`. */
export function withLegacyIsCurrent(device: DeviceRecord): DeviceRecord & { isCurrent: boolean } {
  return { ...device, isCurrent: device.isCurrentDevice };
}

async function resolveDeviceLimit(userId: string, email?: string | null): Promise<number> {
  const sub = await getOrCreateSubscription(userId);
  return resolveDevicesMax(isPremiumNow(sub), email);
}

async function advisoryLockUser(tx: DbExec, userId: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`device:${userId}`}))`);
}

export async function countActiveDevices(
  userId: string,
  dbExec: DbExec = db,
): Promise<number> {
  const [{ n }] = await dbExec
    .select({ n: sql<number>`count(*)::int` })
    .from(userDevicesTable)
    .where(and(eq(userDevicesTable.userId, userId), eq(userDevicesTable.isActive, 1)));
  return n ?? 0;
}

export async function listActiveDevicesForUser(
  userId: string,
  currentDeviceId?: string,
): Promise<DeviceRecord[]> {
  const rows = await db
    .select()
    .from(userDevicesTable)
    .where(and(eq(userDevicesTable.userId, userId), eq(userDevicesTable.isActive, 1)))
    .orderBy(userDevicesTable.lastSeenAt);
  return rows.map((row) => toDeviceRecord(row, currentDeviceId));
}

export async function getActiveDevice(
  userId: string,
  deviceId: string,
): Promise<UserDevice | null> {
  const [row] = await db
    .select()
    .from(userDevicesTable)
    .where(
      and(
        eq(userDevicesTable.userId, userId),
        eq(userDevicesTable.deviceId, deviceId),
        eq(userDevicesTable.isActive, 1),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function touchDevice(userId: string, deviceId: string): Promise<void> {
  await db
    .update(userDevicesTable)
    .set({ lastSeenAt: new Date() })
    .where(
      and(
        eq(userDevicesTable.userId, userId),
        eq(userDevicesTable.deviceId, deviceId),
        eq(userDevicesTable.isActive, 1),
      ),
    );
}

function buildRowPatch(
  meta: ReturnType<typeof normalizeDeviceMetadata>,
  existing?: UserDevice | null,
) {
  return {
    lastSeenAt: new Date(),
    deviceName: meta.deviceName ?? existing?.deviceName ?? null,
    platform: meta.platform || existing?.platform || "unknown",
    browser: meta.browser ?? existing?.browser ?? null,
    os: meta.os ?? existing?.os ?? null,
    appVersion: meta.appVersion ?? existing?.appVersion ?? null,
    lastIpHash: meta.lastIpHash ?? existing?.lastIpHash ?? null,
  };
}

/**
 * A physical installation can only be actively owned by one account.
 * Historical rows stay (`is_active=0`); they must not block Email B.
 */
async function releaseDeviceFromOtherUsers(
  tx: DbExec,
  deviceId: string,
  keepUserId: string,
): Promise<number> {
  const released = await tx
    .update(userDevicesTable)
    .set({ isActive: 0, lastSeenAt: new Date() })
    .where(
      and(
        eq(userDevicesTable.deviceId, deviceId),
        eq(userDevicesTable.isActive, 1),
        ne(userDevicesTable.userId, keepUserId),
      ),
    )
    .returning({ id: userDevicesTable.id });
  return released.length;
}

/** Claim this installation only when the current account will own it. */
async function transferDeviceIfNeeded(
  tx: DbExec,
  deviceId: string,
  keepUserId: string,
): Promise<void> {
  const transferred = await releaseDeviceFromOtherUsers(tx, deviceId, keepUserId);
  if (transferred > 0) {
    logger.info(
      { evt: "device.transferred", userId: keepUserId, deviceId, releasedCount: transferred },
      "Released other accounts' active claim on this installation",
    );
  }
}

async function deactivateOldestActiveExcept(
  tx: DbExec,
  userId: string,
  exceptDeviceId: string,
): Promise<boolean> {
  const rows = await tx
    .select()
    .from(userDevicesTable)
    .where(and(eq(userDevicesTable.userId, userId), eq(userDevicesTable.isActive, 1)))
    .orderBy(userDevicesTable.lastSeenAt);

  const victim = rows.find((row) => row.deviceId !== exceptDeviceId);
  if (!victim) return false;

  await tx
    .update(userDevicesTable)
    .set({ isActive: 0, lastSeenAt: new Date() })
    .where(eq(userDevicesTable.id, victim.id));
  logger.info(
    {
      evt: "device.replaced_stale",
      userId,
      removedDeviceId: victim.deviceId,
      newDeviceId: exceptDeviceId,
    },
    "Released previous active session for this account",
  );
  return true;
}

/**
 * Register or refresh a device. Existing *active* devices for this user are
 * grandfathered. A device id that is active for another user is transferred
 * (their row is deactivated — not deleted). Free single-session accounts
 * replace their previous active installation instead of remaining blocked
 * after uninstall/sign-out.
 */
export async function registerOrRefreshDevice(params: {
  userId: string;
  deviceId: string;
  email?: string | null;
  metadata?: DeviceMetadataInput;
}): Promise<DeviceRegistrationResult> {
  const { userId, deviceId } = params;
  const meta = normalizeDeviceMetadata(params.metadata ?? {});
  const now = new Date();

  return db.transaction(async (tx) => {
    await advisoryLockUser(tx, userId);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`deviceid:${deviceId}`}))`);

    const [existing] = await tx
      .select()
      .from(userDevicesTable)
      .where(and(eq(userDevicesTable.userId, userId), eq(userDevicesTable.deviceId, deviceId)))
      .limit(1);

    const thisUserHasActiveRow = existing?.isActive === 1;
    if (thisUserHasActiveRow) {
      await transferDeviceIfNeeded(tx, deviceId, userId);
      const patch = buildRowPatch(meta, existing);
      const [updated] = await tx
        .update(userDevicesTable)
        .set(patch)
        .where(eq(userDevicesTable.id, existing.id))
        .returning();
      return {
        ok: true as const,
        device: toDeviceRecord(updated ?? existing, deviceId),
        registered: false,
      };
    }

    const limit = await resolveDeviceLimit(userId, params.email);
    const activeCount = await countActiveDevices(userId, tx);
    const action = decideDeviceRegistration({
      thisUserHasActiveRow: false,
      thisUserHasInactiveRow: Boolean(existing),
      activeCountForUser: activeCount,
      limit,
    });

    if (action === "block") {
      const devices = (
        await tx
          .select()
          .from(userDevicesTable)
          .where(and(eq(userDevicesTable.userId, userId), eq(userDevicesTable.isActive, 1)))
          .orderBy(userDevicesTable.lastSeenAt)
      ).map((row) => toDeviceRecord(row, deviceId));

      const isPremium = limit > 1;
      return {
        ok: false as const,
        error: "device_limit_reached" as const,
        message: isPremium
          ? "Your Premium plan supports up to 3 active devices. Remove an existing device to continue."
          : `Your free plan supports up to ${limit} active device. Remove an existing device or upgrade to continue.`,
        limit,
        activeDeviceCount: activeCount,
        devices,
      };
    }

    await transferDeviceIfNeeded(tx, deviceId, userId);

    if (action === "replace_oldest") {
      const replaced = await deactivateOldestActiveExcept(tx, userId, deviceId);
      if (!replaced) {
        const devices = (
          await tx
            .select()
            .from(userDevicesTable)
            .where(and(eq(userDevicesTable.userId, userId), eq(userDevicesTable.isActive, 1)))
            .orderBy(userDevicesTable.lastSeenAt)
        ).map((row) => toDeviceRecord(row, deviceId));
        return {
          ok: false as const,
          error: "device_limit_reached" as const,
          message: `Your free plan supports up to ${limit} active device. Remove an existing device or upgrade to continue.`,
          limit,
          activeDeviceCount: devices.length,
          devices,
        };
      }
    }

    if (existing) {
      const patch = buildRowPatch(meta, existing);
      const [reactivated] = await tx
        .update(userDevicesTable)
        .set({
          ...patch,
          isActive: 1,
          firstSeenAt: existing.firstSeenAt,
        })
        .where(eq(userDevicesTable.id, existing.id))
        .returning();
      logger.info(
        { evt: "device.registered", userId, deviceId, platform: meta.platform, reactivated: true },
        "Device reactivated",
      );
      return {
        ok: true as const,
        device: toDeviceRecord(reactivated ?? existing, deviceId),
        registered: true,
      };
    }

    const [created] = await tx
      .insert(userDevicesTable)
      .values({
        userId,
        deviceId,
        deviceName: meta.deviceName,
        platform: meta.platform,
        browser: meta.browser,
        os: meta.os,
        appVersion: meta.appVersion,
        lastIpHash: meta.lastIpHash,
        firstSeenAt: now,
        lastSeenAt: now,
        isActive: 1,
      })
      .onConflictDoNothing({ target: [userDevicesTable.userId, userDevicesTable.deviceId] })
      .returning();

    if (!created) {
      const [raced] = await tx
        .select()
        .from(userDevicesTable)
        .where(and(eq(userDevicesTable.userId, userId), eq(userDevicesTable.deviceId, deviceId)))
        .limit(1);
      if (raced) {
        const patch = buildRowPatch(meta, raced);
        const [updated] = await tx
          .update(userDevicesTable)
          .set({ ...patch, isActive: 1 })
          .where(eq(userDevicesTable.id, raced.id))
          .returning();
        return {
          ok: true as const,
          device: toDeviceRecord(updated ?? raced, deviceId),
          registered: false,
        };
      }
      throw new Error("device_insert_failed");
    }

    logger.info(
      { evt: "device.registered", userId, deviceId, platform: meta.platform },
      "Device registered",
    );

    return {
      ok: true as const,
      device: toDeviceRecord(created, deviceId),
      registered: true,
    };
  });
}

export async function deactivateDevice(
  userId: string,
  deviceId: string,
): Promise<{ ok: boolean; reason?: "not_found" | "current_device" }> {
  return db.transaction(async (tx) => {
    await advisoryLockUser(tx, userId);
    const [row] = await tx
      .select()
      .from(userDevicesTable)
      .where(
        and(
          eq(userDevicesTable.userId, userId),
          eq(userDevicesTable.deviceId, deviceId),
          eq(userDevicesTable.isActive, 1),
        ),
      )
      .limit(1);

    if (!row) return { ok: false, reason: "not_found" as const };

    await tx
      .update(userDevicesTable)
      .set({ isActive: 0, lastSeenAt: new Date() })
      .where(eq(userDevicesTable.id, row.id));

    logger.info({ evt: "device.removed", userId, deviceId }, "Device deactivated");
    return { ok: true as const };
  });
}

/** Sign-out / account-switch: mark this installation inactive for the user. */
export async function releaseCurrentDeviceSession(
  userId: string,
  deviceId: string,
): Promise<{ ok: boolean }> {
  const result = await deactivateDevice(userId, deviceId);
  return { ok: result.ok };
}

export async function replaceDevice(params: {
  userId: string;
  removeDeviceId: string;
  newDeviceId: string;
  email?: string | null;
  metadata?: DeviceMetadataInput;
}): Promise<DeviceRegistrationResult> {
  return db.transaction(async (tx) => {
    await advisoryLockUser(tx, params.userId);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`deviceid:${params.newDeviceId}`}))`,
    );
    await transferDeviceIfNeeded(tx, params.newDeviceId, params.userId);

    const [toRemove] = await tx
      .select()
      .from(userDevicesTable)
      .where(
        and(
          eq(userDevicesTable.userId, params.userId),
          eq(userDevicesTable.deviceId, params.removeDeviceId),
          eq(userDevicesTable.isActive, 1),
        ),
      )
      .limit(1);

    if (!toRemove) {
      const limit = await resolveDeviceLimit(params.userId, params.email);
      const devices = (
        await tx
          .select()
          .from(userDevicesTable)
          .where(
            and(eq(userDevicesTable.userId, params.userId), eq(userDevicesTable.isActive, 1)),
          )
      ).map((row) => toDeviceRecord(row, params.newDeviceId));

      return {
        ok: false as const,
        error: "device_limit_reached" as const,
        message: "Could not remove the selected device. Try again.",
        limit,
        activeDeviceCount: devices.length,
        devices,
      };
    }

    await tx
      .update(userDevicesTable)
      .set({ isActive: 0, lastSeenAt: new Date() })
      .where(eq(userDevicesTable.id, toRemove.id));

    const meta = normalizeDeviceMetadata(params.metadata ?? {});
    const now = new Date();
    const [existingNew] = await tx
      .select()
      .from(userDevicesTable)
      .where(
        and(
          eq(userDevicesTable.userId, params.userId),
          eq(userDevicesTable.deviceId, params.newDeviceId),
        ),
      )
      .limit(1);

    let saved: UserDevice;
    if (existingNew) {
      const patch = buildRowPatch(meta, existingNew);
      const [updated] = await tx
        .update(userDevicesTable)
        .set({ ...patch, isActive: 1, firstSeenAt: existingNew.firstSeenAt })
        .where(eq(userDevicesTable.id, existingNew.id))
        .returning();
      saved = updated ?? existingNew;
    } else {
      const [created] = await tx
        .insert(userDevicesTable)
        .values({
          userId: params.userId,
          deviceId: params.newDeviceId,
          deviceName: meta.deviceName,
          platform: meta.platform,
          browser: meta.browser,
          os: meta.os,
          appVersion: meta.appVersion,
          lastIpHash: meta.lastIpHash,
          firstSeenAt: now,
          lastSeenAt: now,
          isActive: 1,
        })
        .returning();
      saved = created;
    }

    logger.info(
      {
        evt: "device.replaced",
        userId: params.userId,
        removedDeviceId: params.removeDeviceId,
        newDeviceId: params.newDeviceId,
      },
      "Device replaced",
    );

    return {
      ok: true as const,
      device: toDeviceRecord(saved, params.newDeviceId),
      registered: true,
    };
  });
}
