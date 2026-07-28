import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AnalyticsReport, LearningStoreSnapshot } from "../../types/analytics.js";
import type { CampaignPlan } from "../../types/campaign-plan.js";
import type { PublishedVideo } from "../../types/published-video.js";
import type { PersistedWorkflowState } from "../../types/workflow.js";
import type { WorkflowPersistenceStore } from "../../workflow/persistence/index.js";

export interface OperationsPersistenceStore {
  rootDir: string;
  ensure(): void;
  workflows: WorkflowPersistenceStore;
  saveAnalytics(report: AnalyticsReport): void;
  listAnalytics(): AnalyticsReport[];
  saveLearning(snapshot: LearningStoreSnapshot): void;
  getLearning(): LearningStoreSnapshot | undefined;
  saveCampaignPlan(plan: CampaignPlan): void;
  listCampaignPlans(): CampaignPlan[];
  savePublishedVideo(video: PublishedVideo): void;
  listPublishedVideos(): PublishedVideo[];
}

class FileWorkflowStore implements WorkflowPersistenceStore {
  constructor(private readonly dir: string) {}

  save(state: PersistedWorkflowState): void {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(
      join(this.dir, `${state.workflowId}.json`),
      JSON.stringify(state, null, 2),
      "utf8",
    );
  }

  get(workflowId: string): PersistedWorkflowState | undefined {
    const path = join(this.dir, `${workflowId}.json`);
    if (!existsSync(path)) return undefined;
    return JSON.parse(readFileSync(path, "utf8")) as PersistedWorkflowState;
  }

  list(): PersistedWorkflowState[] {
    if (!existsSync(this.dir)) return [];
    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(join(this.dir, f), "utf8")) as PersistedWorkflowState);
  }

  delete(workflowId: string): boolean {
    const path = join(this.dir, `${workflowId}.json`);
    if (!existsSync(path)) return false;
    writeFileSync(path, "", "utf8");
    return true;
  }

  clear(): void {
    if (!existsSync(this.dir)) return;
    for (const file of readdirSync(this.dir)) {
      writeFileSync(join(this.dir, file), "", "utf8");
    }
  }
}

export class FileOperationsStore implements OperationsPersistenceStore {
  readonly workflows: WorkflowPersistenceStore;

  constructor(readonly rootDir: string) {
    this.workflows = new FileWorkflowStore(join(rootDir, "workflows"));
  }

  ensure(): void {
    for (const sub of [
      "workflows",
      "analytics",
      "learning",
      "campaigns",
      "publishing",
    ]) {
      mkdirSync(join(this.rootDir, sub), { recursive: true });
    }
  }

  saveAnalytics(report: AnalyticsReport): void {
    this.ensure();
    writeFileSync(
      join(this.rootDir, "analytics", `${report.id}.json`),
      JSON.stringify(report, null, 2),
      "utf8",
    );
  }

  listAnalytics(): AnalyticsReport[] {
    return readJsonDir<AnalyticsReport>(join(this.rootDir, "analytics"));
  }

  saveLearning(snapshot: LearningStoreSnapshot): void {
    this.ensure();
    writeFileSync(
      join(this.rootDir, "learning", "latest.json"),
      JSON.stringify(snapshot, null, 2),
      "utf8",
    );
  }

  getLearning(): LearningStoreSnapshot | undefined {
    const path = join(this.rootDir, "learning", "latest.json");
    if (!existsSync(path)) return undefined;
    return JSON.parse(readFileSync(path, "utf8")) as LearningStoreSnapshot;
  }

  saveCampaignPlan(plan: CampaignPlan): void {
    this.ensure();
    writeFileSync(
      join(this.rootDir, "campaigns", `${plan.id}.json`),
      JSON.stringify(plan, null, 2),
      "utf8",
    );
  }

  listCampaignPlans(): CampaignPlan[] {
    return readJsonDir<CampaignPlan>(join(this.rootDir, "campaigns"));
  }

  savePublishedVideo(video: PublishedVideo): void {
    this.ensure();
    writeFileSync(
      join(this.rootDir, "publishing", `${video.videoId}.json`),
      JSON.stringify(video, null, 2),
      "utf8",
    );
  }

  listPublishedVideos(): PublishedVideo[] {
    return readJsonDir<PublishedVideo>(join(this.rootDir, "publishing"));
  }
}

export class InMemoryOperationsStore implements OperationsPersistenceStore {
  readonly rootDir = ":memory:";
  readonly workflows: WorkflowPersistenceStore;
  private analytics: AnalyticsReport[] = [];
  private learning?: LearningStoreSnapshot;
  private campaigns: CampaignPlan[] = [];
  private published: PublishedVideo[] = [];

  constructor(workflowStore: WorkflowPersistenceStore) {
    this.workflows = workflowStore;
  }

  ensure(): void {
    // no-op for memory
  }

  saveAnalytics(report: AnalyticsReport): void {
    this.analytics = [
      ...this.analytics.filter((r) => r.id !== report.id),
      structuredClone(report),
    ];
  }

  listAnalytics(): AnalyticsReport[] {
    return this.analytics.map((r) => structuredClone(r));
  }

  saveLearning(snapshot: LearningStoreSnapshot): void {
    this.learning = structuredClone(snapshot);
  }

  getLearning(): LearningStoreSnapshot | undefined {
    return this.learning ? structuredClone(this.learning) : undefined;
  }

  saveCampaignPlan(plan: CampaignPlan): void {
    this.campaigns = [
      ...this.campaigns.filter((p) => p.id !== plan.id),
      structuredClone(plan),
    ];
  }

  listCampaignPlans(): CampaignPlan[] {
    return this.campaigns.map((p) => structuredClone(p));
  }

  savePublishedVideo(video: PublishedVideo): void {
    this.published = [
      ...this.published.filter((v) => v.videoId !== video.videoId),
      structuredClone(video),
    ];
  }

  listPublishedVideos(): PublishedVideo[] {
    return this.published.map((v) => structuredClone(v));
  }
}

function readJsonDir<T>(dir: string): T[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const text = readFileSync(join(dir, f), "utf8").trim();
      if (!text) return undefined;
      return JSON.parse(text) as T;
    })
    .filter((v): v is T => v !== undefined);
}
