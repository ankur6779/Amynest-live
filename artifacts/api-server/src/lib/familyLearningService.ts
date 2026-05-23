import { eq } from "drizzle-orm";
import {
  computeAge,
  runPrediction,
  refreshFamilyIntelligence,
  toFamilyApiPayload,
  enhancePredictionWithFamily,
  startCooperativeSession,
  advanceCooperativeTurn,
  getCooperativeSession,
  recordChildActivity,
  setFamilyGraphStore,
  loadFamilyGraphFromRecord,
  type ChildFamilySnapshot,
  type CountryCode,
  type FamilyGraphRecord,
  type LearningGraph,
  type FamilyInsights,
} from "@workspace/content-orchestration";
import { db, childrenTable, familyLearningGraphsTable } from "@workspace/db";
import { getOrCreateLearningProfile } from "./learningProfileRepository.js";
import { getOrCreatePersonalityProfile } from "./personalityProfileRepository.js";
import { createPostgresPredictionStore } from "./predictionSnapshotRepository.js";

function createPostgresFamilyGraphStore() {
  return {
    async get(familyId: string): Promise<FamilyGraphRecord | null> {
      const rows = await db
        .select()
        .from(familyLearningGraphsTable)
        .where(eq(familyLearningGraphsTable.familyId, familyId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        familyId: row.familyId,
        graph: row.graph as LearningGraph,
        insights: row.insights as FamilyInsights,
        version: row.version,
        updatedAt: row.updatedAt.toISOString(),
      };
    },
    async upsert(record: FamilyGraphRecord): Promise<FamilyGraphRecord> {
      const existing = await this.get(record.familyId);
      if (!existing) {
        await db.insert(familyLearningGraphsTable).values({
          familyId: record.familyId,
          graph: record.graph,
          insights: record.insights,
          version: record.version,
        });
      } else {
        await db
          .update(familyLearningGraphsTable)
          .set({
            graph: record.graph,
            insights: record.insights,
            version: record.version,
            updatedAt: new Date(),
          })
          .where(eq(familyLearningGraphsTable.familyId, record.familyId));
      }
      loadFamilyGraphFromRecord(record);
      return record;
    },
  };
}

let storeInitialized = false;

function ensureFamilyStore() {
  if (!storeInitialized) {
    setFamilyGraphStore(createPostgresFamilyGraphStore());
    storeInitialized = true;
  }
}

export async function loadFamilySnapshotsForUser(
  userId: string,
  countryCode: CountryCode,
): Promise<ChildFamilySnapshot[]> {
  const rows = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      dob: childrenTable.dob,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId));

  const predictionStore = createPostgresPredictionStore();
  const snapshots: ChildFamilySnapshot[] = [];

  for (const row of rows) {
    const childId = String(row.id);
    if (!row.dob) continue;
    const profile = await getOrCreateLearningProfile(childId, userId);
    const personality = await getOrCreatePersonalityProfile(childId, userId);
    const age = computeAge({ childDOB: row.dob, countryCode });
    const latest = await predictionStore.getLatest(childId);
    let prediction = runPrediction({ childId, profile, personality });
    if (latest) {
      prediction = {
        ...prediction,
        predictedDropOffRisk: latest.dropOffRisk,
        predictedEngagement: latest.engagementScore,
        confidence: latest.confidence,
      };
    }

    snapshots.push({
      childId,
      displayName: row.name,
      ageMonths: row.ageMonths ?? age.ageInMonths,
      profile,
      personality,
      prediction,
      sessionMinutes: profile.behavior.avgSessionTime,
    });
  }

  if (snapshots.length > 1) {
    for (let i = 0; i < snapshots.length; i++) {
      const s = snapshots[i]!;
      if (s.prediction) {
        s.prediction = enhancePredictionWithFamily(
          s.childId,
          userId,
          s.prediction,
          snapshots,
        );
      }
    }
  }

  return snapshots;
}

export async function fetchFamilyInsightsForUser(
  userId: string,
  countryCode: CountryCode,
) {
  ensureFamilyStore();
  const snapshots = await loadFamilySnapshotsForUser(userId, countryCode);
  const refreshed = await refreshFamilyIntelligence(userId, snapshots);
  for (const s of snapshots) recordChildActivity(s.childId);
  return {
    ...toFamilyApiPayload(refreshed.dashboard),
    familyRisk: refreshed.familyRisk,
    sharedContentHints: refreshed.sharedContent,
  };
}

export function handleCooperativeTurn(params: {
  familyId: string;
  taskId: string;
  childId: string;
  answer?: string;
  approved?: boolean;
  partnerChildId?: string;
}) {
  if (
    params.partnerChildId &&
    !getCooperativeSession(params.familyId, params.taskId)
  ) {
    startCooperativeSession({
      familyId: params.familyId,
      childA: params.childId,
      childB: params.partnerChildId,
      taskId: params.taskId,
    });
  }
  return advanceCooperativeTurn(params.familyId, params.taskId, {
    childId: params.childId,
    answer: params.answer,
    approved: params.approved,
  });
}
