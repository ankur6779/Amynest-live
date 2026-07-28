import type {
  AnalyticsReport,
  LearningStoreSnapshot,
  TopicScore,
} from "../../types/analytics.js";

export interface AnalyticsPersistenceStore {
  saveReport(report: AnalyticsReport): void;
  getReport(id: string): AnalyticsReport | undefined;
  listReports(): AnalyticsReport[];
  saveLearning(snapshot: LearningStoreSnapshot): void;
  getLearning(): LearningStoreSnapshot | undefined;
  saveTopicScores(scores: TopicScore[]): void;
  getTopicScores(): TopicScore[];
  clear(): void;
}

/** In-memory analytics persistence for reports, learning, and topic scores. */
export class InMemoryAnalyticsStore implements AnalyticsPersistenceStore {
  private readonly reports = new Map<string, AnalyticsReport>();
  private learning: LearningStoreSnapshot | undefined;
  private topicScores: TopicScore[] = [];

  saveReport(report: AnalyticsReport): void {
    this.reports.set(report.id, structuredClone(report));
  }

  getReport(id: string): AnalyticsReport | undefined {
    const report = this.reports.get(id);
    return report ? structuredClone(report) : undefined;
  }

  listReports(): AnalyticsReport[] {
    return [...this.reports.values()].map((r) => structuredClone(r));
  }

  saveLearning(snapshot: LearningStoreSnapshot): void {
    this.learning = structuredClone(snapshot);
  }

  getLearning(): LearningStoreSnapshot | undefined {
    return this.learning ? structuredClone(this.learning) : undefined;
  }

  saveTopicScores(scores: TopicScore[]): void {
    this.topicScores = structuredClone(scores);
  }

  getTopicScores(): TopicScore[] {
    return structuredClone(this.topicScores);
  }

  clear(): void {
    this.reports.clear();
    this.learning = undefined;
    this.topicScores = [];
  }
}
