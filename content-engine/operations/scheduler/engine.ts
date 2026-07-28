import {
  buildScheduledJob,
  cronMatches,
  describeTrigger,
  type WorkflowScheduleSpec,
} from "../../workflow/scheduler/index.js";
import type { WorkflowJobRequest } from "../../types/workflow.js";
import type {
  OpsSchedulerBackend,
  ScheduledOpsJob,
} from "../../types/operations.js";
import { listSeasonalEvents } from "../../brain/seasonal/index.js";

export interface OpsSchedulerOptions {
  backend: OpsSchedulerBackend;
  cron: string;
  timezone: string;
  holidayAware?: boolean;
  retryMissedJobs?: boolean;
  seasonalCalendar?: string;
  now?: () => Date;
}

export interface MissedJobEvaluation {
  missed: boolean;
  shouldRetry: boolean;
  reason: string;
}

/**
 * Production scheduler facade over Phase 7 cron matcher.
 * Supports cron/coolify/docker/systemd/cloud backends with holiday awareness.
 */
export class OpsScheduler {
  private lastFiredAt?: string;
  private ready = false;

  constructor(private readonly options: OpsSchedulerOptions) {}

  initialize(): void {
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  describe(): ScheduledOpsJob {
    return {
      id: `sched_${this.options.backend}`,
      backend: this.options.backend,
      cron: this.options.cron,
      timezone: this.options.timezone,
      jobType: "GenerateDailyVideos",
      holidayAware: this.options.holidayAware ?? true,
      retryMissedJobs: this.options.retryMissedJobs ?? true,
      nextRunAt: undefined,
    };
  }

  evaluate(now = this.options.now?.() ?? new Date()): WorkflowJobRequest | null {
    if (!this.ready) return null;
    if (this.isHoliday(now)) return null;

    const trigger =
      this.options.backend === "cron"
        ? "cron"
        : this.options.backend === "coolify"
          ? "coolify"
          : this.options.backend === "docker" || this.options.backend === "systemd"
            ? "docker"
            : "cloud";

    const spec: WorkflowScheduleSpec = {
      cron: this.options.cron,
      timezone: this.options.timezone,
      trigger,
      job: {
        type: "GenerateDailyVideos",
        trigger,
        count: 3,
      },
    };

    const job = buildScheduledJob(spec, now);
    if (job) {
      this.lastFiredAt = now.toISOString();
    }
    return job;
  }

  evaluateMissedJob(lastExpectedAt: Date, now = new Date()): MissedJobEvaluation {
    const matched = cronMatches({
      cron: this.options.cron,
      at: lastExpectedAt,
      timezone: this.options.timezone,
    });
    if (!matched) {
      return { missed: false, shouldRetry: false, reason: "No job expected at that time" };
    }
    if (this.lastFiredAt && Date.parse(this.lastFiredAt) >= lastExpectedAt.getTime()) {
      return { missed: false, shouldRetry: false, reason: "Job already executed" };
    }
    return {
      missed: true,
      shouldRetry: this.options.retryMissedJobs !== false,
      reason: "Missed scheduled execution; retry eligible",
    };
  }

  backendLabel(): string {
    return describeTrigger(
      this.options.backend === "cron"
        ? "cron"
        : this.options.backend === "coolify"
          ? "coolify"
          : this.options.backend === "cloud"
            ? "cloud"
            : "docker",
    );
  }

  private isHoliday(now: Date): boolean {
    if (!this.options.holidayAware) return false;
    const date = now.toISOString().slice(0, 10);
    const year = Number(date.slice(0, 4));
    const calendar = this.options.seasonalCalendar ?? "IN";
    const events = [
      ...listSeasonalEvents(calendar, year),
      ...listSeasonalEvents(calendar, year + 1),
    ];
    // National events pause publishing by default when holiday-aware.
    return events.some(
      (e) =>
        e.kind === "national-event" &&
        date >= e.startDate &&
        date <= e.endDate,
    );
  }
}
