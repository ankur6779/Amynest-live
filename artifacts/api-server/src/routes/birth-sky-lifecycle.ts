/**
 * Birth Sky Lifecycle API (IM-5 / Pack 7 + Addendum A).
 * Settings prefs, edit profile, regenerate, snapshots, export, delete, sync.
 * No Lens Platform.
 */

import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  birthProfilesTable,
  skySnapshotsTable,
  birthSkyConversationsTable,
  birthSkyMessagesTable,
  birthSkyAiDeliveriesTable,
  birthSkyPreferencesTable,
  childrenTable,
} from "@workspace/db";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { requireBirthSkyAllowlist } from "../services/birth-sky/require-birth-sky-allowlist";
import {
  computeAndPersistSnapshot,
  loadOwnedProfile,
  mapProfileRow,
  mapSnapshotRow,
  plaintextBirthFields,
} from "../services/birth-sky/snapshot-service.js";
import {
  sealBirthPlace,
  sealBirthTime,
} from "../services/birth-sky/birth-field-crypto.js";
import {
  BIRTH_SKY_EXPORT_MANIFEST_VERSION,
  BIRTH_SKY_PRIVACY_POLICY_VERSION,
  buildBirthSkyExportBundle,
} from "../services/birth-sky/export-service.js";

const router: IRouter = Router();
router.use(requireBirthSkyAllowlist);

const placeSchema = z
  .object({
    label: z.string().min(1).max(500),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    timezoneIana: z.string().max(100).nullable().optional(),
    country: z.string().max(120).nullable().optional(),
    adminRegion: z.string().max(200).nullable().optional(),
  })
  .nullable();

const prefsSchema = z.object({
  showTradition: z.boolean().optional(),
  skySounds: z.boolean().optional(),
  monthlyNotesOptIn: z.boolean().optional(),
  updatedAt: z.string().optional(),
});

/**
 * GET/PUT preferences
 */
router.get("/birth-sky/preferences", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(birthSkyPreferencesTable)
      .where(eq(birthSkyPreferencesTable.userId, userId))
      .limit(1);
    const row = rows[0];
    res.json({
      preferences: {
        showTradition: row?.showTradition ?? true,
        skySounds: row?.skySounds ?? true,
        monthlyNotesOptIn: row?.monthlyNotesOptIn ?? true,
        updatedAt: row?.updatedAt?.toISOString() ?? new Date(0).toISOString(),
      },
      requiredPrivacyPolicyVersion: BIRTH_SKY_PRIVACY_POLICY_VERSION,
    });
  } catch (err) {
    logger.error(`birth-sky prefs get: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/birth-sky/preferences", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = prefsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  try {
    const existing = await db
      .select()
      .from(birthSkyPreferencesTable)
      .where(eq(birthSkyPreferencesTable.userId, userId))
      .limit(1);
    const clientUpdated = parsed.data.updatedAt
      ? new Date(parsed.data.updatedAt).getTime()
      : Date.now();
    const serverUpdated = existing[0]?.updatedAt?.getTime() ?? 0;
    // LWW: reject stale client if server newer
    if (existing[0] && serverUpdated > clientUpdated) {
      res.json({
        preferences: {
          showTradition: existing[0].showTradition,
          skySounds: existing[0].skySounds,
          monthlyNotesOptIn: existing[0].monthlyNotesOptIn,
          updatedAt: existing[0].updatedAt.toISOString(),
        },
        conflict: "server_wins",
      });
      return;
    }
    const next = {
      showTradition: parsed.data.showTradition ?? existing[0]?.showTradition ?? true,
      skySounds: parsed.data.skySounds ?? existing[0]?.skySounds ?? true,
      monthlyNotesOptIn:
        parsed.data.monthlyNotesOptIn ?? existing[0]?.monthlyNotesOptIn ?? true,
      updatedAt: new Date(),
    };
    if (existing[0]) {
      await db
        .update(birthSkyPreferencesTable)
        .set(next)
        .where(eq(birthSkyPreferencesTable.userId, userId));
    } else {
      await db.insert(birthSkyPreferencesTable).values({ userId, ...next });
    }
    res.json({
      preferences: {
        ...next,
        updatedAt: next.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error(`birth-sky prefs put: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * PATCH birth details — does NOT mutate historical snapshots.
 */
router.patch("/birth-sky/profiles/:profileId", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const profileId = String(req.params.profileId);
  const schema = z.object({
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    timePrecision: z.enum(["exact", "approximate", "unknown"]),
    birthPlace: placeSchema,
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const body = parsed.data;
  if (body.timePrecision === "unknown" && body.birthTime != null) {
    res.status(400).json({ error: "time_must_be_null" });
    return;
  }
  if (body.timePrecision !== "unknown" && !body.birthTime) {
    res.status(400).json({ error: "time_required" });
    return;
  }
  try {
    const profile = await loadOwnedProfile(userId, profileId);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const plainTime = body.timePrecision === "unknown" ? null : body.birthTime;
    const [updated] = await db
      .update(birthProfilesTable)
      .set({
        birthDate: body.birthDate,
        birthTime: sealBirthTime(plainTime),
        timePrecision: body.timePrecision,
        birthPlace: sealBirthPlace(body.birthPlace),
        updatedAt: new Date(),
      })
      .where(eq(birthProfilesTable.id, profileId))
      .returning();
    res.json({ profile: mapProfileRow(updated!), regenerateRequired: true });
  } catch (err) {
    logger.error(`birth-sky patch profile: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST regenerate — new snapshot; history preserved; conversations/reflections untouched.
 */
router.post("/birth-sky/profiles/:profileId/regenerate", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const profileId = String(req.params.profileId);
  try {
    const profile = await loadOwnedProfile(userId, profileId);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const plain = plaintextBirthFields(profile);
    const snapshot = await computeAndPersistSnapshot({
      userId,
      profileId,
      birthDate: profile.birthDate,
      birthTime: plain.birthTime,
      timePrecision: profile.timePrecision as "exact" | "approximate" | "unknown",
      birthPlace: plain.birthPlace,
    });
    res.json({
      profile: mapProfileRow(profile),
      snapshot,
      computeStatus: "ready",
    });
  } catch (err) {
    logger.error(`birth-sky regenerate: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "regeneration_failed", computeStatus: "failed" });
  }
});

/**
 * GET snapshot history
 */
router.get("/birth-sky/profiles/:profileId/snapshots", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const profileId = String(req.params.profileId);
  try {
    if (!(await loadOwnedProfile(userId, profileId))) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const rows = await db
      .select()
      .from(skySnapshotsTable)
      .where(
        and(eq(skySnapshotsTable.profileId, profileId), eq(skySnapshotsTable.userId, userId)),
      )
      .orderBy(desc(skySnapshotsTable.computedAt))
      .limit(50);
    res.json({
      snapshots: rows.map((r) => ({
        ...mapSnapshotRow(r),
        // Metadata only for history list — full astronomy on activate/fetch
        astronomySummary: {
          sunSign: (r.astronomy as { sunSign?: string })?.sunSign ?? null,
          moonSign: (r.astronomy as { moonSign?: string })?.moonSign ?? null,
          moonPhaseLabel: (r.astronomy as { moonPhaseLabel?: string })?.moonPhaseLabel ?? null,
          mode: r.mode,
        },
      })),
    });
  } catch (err) {
    logger.error(`birth-sky list snapshots: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST activate historical snapshot (pointer only — never mutates snapshot body).
 */
router.post(
  "/birth-sky/profiles/:profileId/snapshots/:snapshotId/activate",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const profileId = String(req.params.profileId);
    const snapshotId = String(req.params.snapshotId);
    try {
      if (!(await loadOwnedProfile(userId, profileId))) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const snaps = await db
        .select()
        .from(skySnapshotsTable)
        .where(
          and(
            eq(skySnapshotsTable.id, snapshotId),
            eq(skySnapshotsTable.profileId, profileId),
            eq(skySnapshotsTable.userId, userId),
          ),
        )
        .limit(1);
      const snap = snaps[0];
      if (!snap) {
        res.status(404).json({ error: "snapshot_not_found" });
        return;
      }
      await db
        .update(skySnapshotsTable)
        .set({ isCurrent: false })
        .where(eq(skySnapshotsTable.profileId, profileId));
      await db
        .update(skySnapshotsTable)
        .set({ isCurrent: true })
        .where(eq(skySnapshotsTable.id, snapshotId));
      res.json({ snapshot: mapSnapshotRow({ ...snap, isCurrent: true }) });
    } catch (err) {
      logger.error(`birth-sky activate snapshot: ${err instanceof Error ? err.message : String(err)}`);
      res.status(500).json({ error: "server_error" });
    }
  },
);

/**
 * POST accept privacy policy version
 */
router.post("/birth-sky/profiles/:profileId/privacy-accept", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const profileId = String(req.params.profileId);
  const schema = z.object({
    privacyPolicyVersion: z.string().min(1).max(64),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  try {
    if (!(await loadOwnedProfile(userId, profileId))) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const [updated] = await db
      .update(birthProfilesTable)
      .set({
        privacyPolicyVersion: parsed.data.privacyPolicyVersion,
        privacyAcceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(birthProfilesTable.id, profileId))
      .returning();
    res.json({ profile: mapProfileRow(updated!) });
  } catch (err) {
    logger.error(`birth-sky privacy accept: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * GET export bundle
 */
router.get("/birth-sky/profiles/:profileId/export", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const profileId = String(req.params.profileId);
  const exportType = String(req.query.type ?? "summary");
  if (!["summary", "astronomy", "reflections", "conversations"].includes(exportType)) {
    res.status(400).json({ error: "invalid_export_type" });
    return;
  }
  try {
    const profile = await loadOwnedProfile(userId, profileId);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const snaps = await db
      .select()
      .from(skySnapshotsTable)
      .where(
        and(eq(skySnapshotsTable.profileId, profileId), eq(skySnapshotsTable.isCurrent, true)),
      )
      .limit(1);
    const childRows = await db
      .select()
      .from(childrenTable)
      .where(eq(childrenTable.id, profile.childId))
      .limit(1);
    const childName = childRows[0]?.name ?? "Child";

    let conversations: Array<{
      conversationId: string;
      messages: Array<{ role: string; body: string; createdAt: string }>;
    }> = [];
    if (exportType === "conversations") {
      const convs = await db
        .select()
        .from(birthSkyConversationsTable)
        .where(eq(birthSkyConversationsTable.profileId, profileId))
        .orderBy(desc(birthSkyConversationsTable.updatedAt))
        .limit(20);
      for (const c of convs) {
        const msgs = await db
          .select()
          .from(birthSkyMessagesTable)
          .where(eq(birthSkyMessagesTable.conversationId, c.id))
          .orderBy(asc(birthSkyMessagesTable.sequence));
        conversations.push({
          conversationId: c.id,
          messages: msgs.map((m) => ({
            role: m.role,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
          })),
        });
      }
    }

    // Reflections are client-authored; server export accepts optional body from query not used —
    // client merges local reflections for reflections type. Server returns empty array placeholder.
    const bundle = buildBirthSkyExportBundle({
      exportType: exportType as "summary" | "astronomy" | "reflections" | "conversations",
      childFirstName: childName,
      profile: mapProfileRow(profile),
      snapshot: snaps[0] ? mapSnapshotRow(snaps[0]) : null,
      reflections: [],
      conversations,
    });
    res.json(bundle);
  } catch (err) {
    logger.error(`birth-sky export: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * DELETE Birth Sky profile — online required; cascade purge.
 */
router.delete("/birth-sky/profiles/:profileId", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const profileId = String(req.params.profileId);
  const confirm = String(req.query.confirm ?? "");
  if (confirm !== "DELETE") {
    res.status(400).json({ error: "confirm_required" });
    return;
  }
  try {
    const profile = await loadOwnedProfile(userId, profileId);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const convs = await db
      .select({ id: birthSkyConversationsTable.id })
      .from(birthSkyConversationsTable)
      .where(eq(birthSkyConversationsTable.profileId, profileId));
    for (const c of convs) {
      await db
        .delete(birthSkyMessagesTable)
        .where(eq(birthSkyMessagesTable.conversationId, c.id));
    }
    await db
      .delete(birthSkyAiDeliveriesTable)
      .where(eq(birthSkyAiDeliveriesTable.profileId, profileId));
    await db
      .delete(birthSkyConversationsTable)
      .where(eq(birthSkyConversationsTable.profileId, profileId));
    await db.delete(skySnapshotsTable).where(eq(skySnapshotsTable.profileId, profileId));
    await db
      .update(birthProfilesTable)
      .set({
        deletedAt: new Date(),
        aiInsightsUsedCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(birthProfilesTable.id, profileId));
    res.json({ ok: true, delete_scope: "birth_sky" });
  } catch (err) {
    logger.error(`birth-sky delete: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * DELETE one conversation
 */
router.delete("/birth-sky/conversations/:conversationId", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const conversationId = String(req.params.conversationId);
  try {
    const convs = await db
      .select()
      .from(birthSkyConversationsTable)
      .where(
        and(
          eq(birthSkyConversationsTable.id, conversationId),
          eq(birthSkyConversationsTable.userId, userId),
        ),
      )
      .limit(1);
    if (!convs[0]) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    await db
      .delete(birthSkyMessagesTable)
      .where(eq(birthSkyMessagesTable.conversationId, conversationId));
    await db
      .delete(birthSkyConversationsTable)
      .where(eq(birthSkyConversationsTable.id, conversationId));
    res.json({ ok: true, delete_scope: "conversation" });
  } catch (err) {
    logger.error(`birth-sky delete conversation: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST sync cycle — pull preferences + current snapshot; LWW prefs.
 */
router.post("/birth-sky/profiles/:profileId/sync", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const profileId = String(req.params.profileId);
  const schema = z.object({
    syncTransactionId: z.string().min(1).max(80),
    preferences: prefsSchema.optional(),
  });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  try {
    const profile = await loadOwnedProfile(userId, profileId);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (parsed.data.preferences) {
      // Reuse PUT logic inline (LWW)
      const existing = await db
        .select()
        .from(birthSkyPreferencesTable)
        .where(eq(birthSkyPreferencesTable.userId, userId))
        .limit(1);
      const clientUpdated = parsed.data.preferences.updatedAt
        ? new Date(parsed.data.preferences.updatedAt).getTime()
        : 0;
      const serverUpdated = existing[0]?.updatedAt?.getTime() ?? 0;
      if (!existing[0] || clientUpdated >= serverUpdated) {
        const next = {
          showTradition:
            parsed.data.preferences.showTradition ?? existing[0]?.showTradition ?? true,
          skySounds: parsed.data.preferences.skySounds ?? existing[0]?.skySounds ?? true,
          monthlyNotesOptIn:
            parsed.data.preferences.monthlyNotesOptIn ??
            existing[0]?.monthlyNotesOptIn ??
            true,
          updatedAt: new Date(),
        };
        if (existing[0]) {
          await db
            .update(birthSkyPreferencesTable)
            .set(next)
            .where(eq(birthSkyPreferencesTable.userId, userId));
        } else {
          await db.insert(birthSkyPreferencesTable).values({ userId, ...next });
        }
      }
    }
    const prefs = await db
      .select()
      .from(birthSkyPreferencesTable)
      .where(eq(birthSkyPreferencesTable.userId, userId))
      .limit(1);
    const snaps = await db
      .select()
      .from(skySnapshotsTable)
      .where(
        and(eq(skySnapshotsTable.profileId, profileId), eq(skySnapshotsTable.isCurrent, true)),
      )
      .limit(1);
    res.json({
      syncTransactionId: parsed.data.syncTransactionId,
      profile: mapProfileRow(profile),
      snapshot: snaps[0] ? mapSnapshotRow(snaps[0]) : null,
      preferences: {
        showTradition: prefs[0]?.showTradition ?? true,
        skySounds: prefs[0]?.skySounds ?? true,
        monthlyNotesOptIn: prefs[0]?.monthlyNotesOptIn ?? true,
        updatedAt: prefs[0]?.updatedAt?.toISOString() ?? new Date(0).toISOString(),
      },
      requiredPrivacyPolicyVersion: BIRTH_SKY_PRIVACY_POLICY_VERSION,
      exportManifestVersion: BIRTH_SKY_EXPORT_MANIFEST_VERSION,
    });
  } catch (err) {
    logger.error(`birth-sky sync: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
