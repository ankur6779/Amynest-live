import { eq } from "drizzle-orm";
import { db, growthOsStateTable } from "@workspace/db";
import {
  DEFAULT_GROWTH_OS_SETTINGS,
  EMPTY_GROWTH_OS_PAYLOAD,
  type GrowthOsActionLog,
  type GrowthOsAlertWorkflow,
  type GrowthOsDecision,
  type GrowthOsExperiment,
  type GrowthOsPayload,
  type GrowthOsSettings,
} from "./types.js";

const SINGLETON_ID = "singleton";

function mergePayload(raw: unknown): GrowthOsPayload {
  if (!raw || typeof raw !== "object") return { ...EMPTY_GROWTH_OS_PAYLOAD };
  const p = raw as Partial<GrowthOsPayload>;
  return {
    decisions: Array.isArray(p.decisions) ? p.decisions : [],
    experiments: Array.isArray(p.experiments) ? p.experiments : [],
    alertWorkflows: Array.isArray(p.alertWorkflows) ? p.alertWorkflows : [],
    actionHistory: Array.isArray(p.actionHistory) ? p.actionHistory : [],
    settings: { ...DEFAULT_GROWTH_OS_SETTINGS, ...(p.settings ?? {}) },
  };
}

export async function loadGrowthOsPayload(): Promise<GrowthOsPayload> {
  try {
    const rows = await db
      .select()
      .from(growthOsStateTable)
      .where(eq(growthOsStateTable.id, SINGLETON_ID))
      .limit(1);
    const row = rows[0];
    if (!row) return { ...EMPTY_GROWTH_OS_PAYLOAD };
    return mergePayload(row.payload);
  } catch (err) {
    console.error("[growth-os] loadGrowthOsPayload failed — using defaults", err);
    return { ...EMPTY_GROWTH_OS_PAYLOAD };
  }
}

export async function saveGrowthOsPayload(payload: GrowthOsPayload): Promise<void> {
  try {
    const existing = await db
      .select({ id: growthOsStateTable.id })
      .from(growthOsStateTable)
      .where(eq(growthOsStateTable.id, SINGLETON_ID))
      .limit(1);

    if (existing[0]) {
      await db
        .update(growthOsStateTable)
        .set({ payload, updatedAt: new Date() })
        .where(eq(growthOsStateTable.id, SINGLETON_ID));
    } else {
      await db.insert(growthOsStateTable).values({
        id: SINGLETON_ID,
        payload,
      });
    }
  } catch (err) {
    console.error("[growth-os] saveGrowthOsPayload failed", err);
    throw err;
  }
}

export async function appendActionLog(
  entry: Omit<GrowthOsActionLog, "id" | "at"> & { at?: string },
): Promise<GrowthOsActionLog> {
  const payload = await loadGrowthOsPayload();
  const log: GrowthOsActionLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: entry.at ?? new Date().toISOString(),
    userId: entry.userId,
    action: entry.action,
    reason: entry.reason ?? null,
    outcome: entry.outcome ?? null,
    entityType: entry.entityType,
    entityId: entry.entityId,
  };
  payload.actionHistory = [log, ...payload.actionHistory].slice(0, 500);
  await saveGrowthOsPayload(payload);
  return log;
}

export async function updateSettings(settings: Partial<GrowthOsSettings>, userId: string): Promise<GrowthOsSettings> {
  const payload = await loadGrowthOsPayload();
  payload.settings = { ...payload.settings, ...settings };
  await saveGrowthOsPayload(payload);
  await appendActionLog({
    userId,
    action: "settings_updated",
    reason: JSON.stringify(settings),
    outcome: null,
    entityType: "settings",
    entityId: "singleton",
  });
  return payload.settings;
}

export type { GrowthOsDecision, GrowthOsExperiment, GrowthOsAlertWorkflow, GrowthOsPayload, GrowthOsSettings };
