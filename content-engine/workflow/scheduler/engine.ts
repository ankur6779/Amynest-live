import type { WorkflowJobRequest, WorkflowTrigger } from "../../types/workflow.js";

export interface WorkflowScheduleSpec {
  /** Standard 5-field cron: minute hour day-of-month month day-of-week */
  cron: string;
  timezone: string;
  job: WorkflowJobRequest;
  trigger: WorkflowTrigger;
}

export interface CronMatchInput {
  cron: string;
  at: Date;
  timezone: string;
}

/** Timezone-aware cron matcher for manual/cron/coolify/docker/cloud triggers. */
export function cronMatches(input: CronMatchInput): boolean {
  const parts = input.cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression (expected 5 fields): ${input.cron}`);
  }
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const zoned = zonedParts(input.at, input.timezone);
  return (
    fieldMatches(minute!, zoned.minute) &&
    fieldMatches(hour!, zoned.hour) &&
    fieldMatches(dayOfMonth!, zoned.day) &&
    fieldMatches(month!, zoned.month) &&
    fieldMatches(dayOfWeek!, zoned.weekday)
  );
}

export function buildScheduledJob(
  spec: WorkflowScheduleSpec,
  now = new Date(),
): WorkflowJobRequest | null {
  if (!cronMatches({ cron: spec.cron, at: now, timezone: spec.timezone })) {
    return null;
  }
  return {
    ...spec.job,
    trigger: spec.trigger,
  };
}

export function describeTrigger(trigger: WorkflowTrigger): string {
  switch (trigger) {
    case "manual":
      return "Manual CLI/API trigger";
    case "cron":
      return "Cron schedule";
    case "coolify":
      return "Coolify scheduled job";
    case "docker":
      return "Docker/container scheduler";
    case "cloud":
      return "Future cloud scheduler";
    default: {
      const _exhaustive: never = trigger;
      return _exhaustive;
    }
  }
}

function fieldMatches(field: string, value: number): boolean {
  if (field === "*") return true;
  for (const token of field.split(",")) {
    if (token.includes("/")) {
      const [base, stepRaw] = token.split("/");
      const step = Number(stepRaw);
      if (!Number.isFinite(step) || step <= 0) continue;
      if (base === "*" || base === "") {
        if (value % step === 0) return true;
        continue;
      }
      const start = Number(base);
      if (Number.isFinite(start) && value >= start && (value - start) % step === 0) {
        return true;
      }
      continue;
    }
    if (token.includes("-")) {
      const [a, b] = token.split("-").map(Number);
      if (Number.isFinite(a) && Number.isFinite(b) && value >= a! && value <= b!) {
        return true;
      }
      continue;
    }
    if (Number(token) === value) return true;
  }
  return false;
}

function zonedParts(
  date: Date,
  timezone: string,
): { minute: number; hour: number; day: number; month: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    minute: "2-digit",
    hour: "2-digit",
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    minute: Number(get("minute")),
    hour: Number(get("hour")),
    day: Number(get("day")),
    month: Number(get("month")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}
