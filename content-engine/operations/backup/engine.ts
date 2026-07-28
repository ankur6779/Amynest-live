import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { AnalyticsReport, LearningStoreSnapshot } from "../../types/analytics.js";
import type { CampaignPlan } from "../../types/campaign-plan.js";
import type {
  BackupManifest,
  RestoreResult,
  RuntimeEnvironment,
} from "../../types/operations.js";
import type { PublishedVideo } from "../../types/published-video.js";
import type { PersistedWorkflowState } from "../../types/workflow.js";
import type { OperationsPersistenceStore } from "../persistence/store.js";

export interface BackupEngineOptions {
  backupDirectory: string;
  store: OperationsPersistenceStore;
  environment: RuntimeEnvironment;
  now?: () => Date;
}

export class BackupEngine {
  constructor(private readonly options: BackupEngineOptions) {}

  createBackup(): BackupManifest {
    const now = this.options.now ?? (() => new Date());
    const createdAt = now().toISOString();
    const id = `bak_${createHash("sha256")
      .update(createdAt)
      .digest("hex")
      .slice(0, 12)}`;
    const path = join(this.options.backupDirectory, id);
    mkdirSync(path, { recursive: true });

    const workflows = this.options.store.workflows.list();
    const analytics = this.options.store.listAnalytics();
    const learning = this.options.store.getLearning();
    const campaigns = this.options.store.listCampaignPlans();
    const publishing = this.options.store.listPublishedVideos();

    writeJson(join(path, "workflows.json"), workflows);
    writeJson(join(path, "analytics.json"), analytics);
    writeJson(join(path, "learning.json"), learning ?? null);
    writeJson(join(path, "campaigns.json"), campaigns);
    writeJson(join(path, "publishing.json"), publishing);

    const includes: BackupManifest["includes"] = [
      "workflow-state",
      "learning-store",
      "analytics",
      "campaign-plans",
      "publishing-history",
    ];
    const entryCount =
      workflows.length +
      analytics.length +
      campaigns.length +
      publishing.length +
      (learning ? 1 : 0);

    const checksum = createHash("sha256")
      .update(
        JSON.stringify({
          workflows,
          analytics,
          learning,
          campaigns,
          publishing,
        }),
      )
      .digest("hex");

    const manifest: BackupManifest = {
      id,
      createdAt,
      environment: this.options.environment,
      path,
      includes,
      checksum,
      entryCount,
    };
    writeJson(join(path, "manifest.json"), manifest);
    return manifest;
  }

  listBackups(): BackupManifest[] {
    if (!existsSync(this.options.backupDirectory)) return [];
    return readdirSync(this.options.backupDirectory)
      .map((id) => {
        const manifestPath = join(this.options.backupDirectory, id, "manifest.json");
        if (!existsSync(manifestPath)) return undefined;
        return JSON.parse(readFileSync(manifestPath, "utf8")) as BackupManifest;
      })
      .filter((m): m is BackupManifest => Boolean(m))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  restore(backupId: string): RestoreResult {
    const now = this.options.now ?? (() => new Date());
    const path = join(this.options.backupDirectory, backupId);
    const manifestPath = join(path, "manifest.json");
    if (!existsSync(manifestPath)) {
      return {
        ok: false,
        backupId,
        restoredAt: now().toISOString(),
        restoredIncludes: [],
        message: `Backup not found: ${backupId}`,
      };
    }

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as BackupManifest;
    const workflows = readJsonArray<PersistedWorkflowState>(join(path, "workflows.json"));
    const analytics = readJsonArray<AnalyticsReport>(join(path, "analytics.json"));
    const campaigns = readJsonArray<CampaignPlan>(join(path, "campaigns.json"));
    const publishing = readJsonArray<PublishedVideo>(join(path, "publishing.json"));
    const learningRaw = readFileSync(join(path, "learning.json"), "utf8");
    const learning =
      learningRaw.trim() === "null"
        ? undefined
        : (JSON.parse(learningRaw) as LearningStoreSnapshot);

    this.options.store.ensure();
    for (const state of workflows) {
      this.options.store.workflows.save(state);
    }
    for (const report of analytics) {
      this.options.store.saveAnalytics(report);
    }
    for (const plan of campaigns) {
      this.options.store.saveCampaignPlan(plan);
    }
    for (const video of publishing) {
      this.options.store.savePublishedVideo(video);
    }
    if (learning) {
      this.options.store.saveLearning(learning);
    }

    return {
      ok: true,
      backupId,
      restoredAt: now().toISOString(),
      restoredIncludes: manifest.includes,
      message: `Restored backup ${backupId} (${manifest.entryCount} entries)`,
    };
  }

  prune(keepLatest = 10): number {
    const backups = this.listBackups();
    const removable = backups.slice(keepLatest);
    for (const backup of removable) {
      rmSync(backup.path, { recursive: true, force: true });
    }
    return removable.length;
  }
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJsonArray<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const value = JSON.parse(readFileSync(path, "utf8")) as T[];
  return Array.isArray(value) ? value : [];
}
