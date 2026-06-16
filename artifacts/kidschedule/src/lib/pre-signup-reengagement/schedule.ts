import { pickRotatedMessage } from "./content";
import { enforceDailyCap } from "./quiet-hours";
import type {
  AbVariant,
  CampaignMilestone,
  PreSignupCampaignState,
  ScheduledNotif,
} from "./types";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

type MilestoneDef = {
  milestone: CampaignMilestone;
  computeMs: (installAtMs: number, firstOpenAtMs: number) => number;
};

const MILESTONE_DEFS: MilestoneDef[] = [
  {
    milestone: "day0_2h",
    computeMs: (_install, firstOpen) => firstOpen + 2 * MS_HOUR,
  },
  {
    milestone: "day1",
    computeMs: (install) => install + MS_DAY,
  },
  {
    milestone: "day2",
    computeMs: (install) => install + 2 * MS_DAY,
  },
  {
    milestone: "day4",
    computeMs: (install) => install + 4 * MS_DAY,
  },
  {
    milestone: "day7",
    computeMs: (install) => install + 7 * MS_DAY,
  },
];

/** Stable int id for OS schedulers (Capacitor / AlarmManager). */
export function milestoneNotificationId(milestone: CampaignMilestone): number {
  const base: Record<CampaignMilestone, number> = {
    day0_2h: 910001,
    day1: 910002,
    day2: 910003,
    day4: 910004,
    day7: 910005,
  };
  return base[milestone];
}

export function resolvePreSignupDeepLink(
  isAuthenticated: boolean,
  signupCompleted: boolean,
): string {
  if (isAuthenticated && !signupCompleted) return "/onboarding";
  return "/sign-up";
}

function resolveMessageForMilestone(
  milestone: CampaignMilestone,
  variant: AbVariant,
  existing?: PreSignupCampaignState | null,
  lastMessageIndex?: number,
): { title: string; body: string; index: number } {
  const prior = existing?.scheduled.find((s) => s.milestone === milestone);
  if (prior) {
    return { title: prior.title, body: prior.body, index: prior.messageIndex };
  }
  const { message, index } = pickRotatedMessage(variant, lastMessageIndex);
  return { title: message.title, body: message.body, index };
}

export function buildCampaignSchedule(input: {
  installAtMs: number;
  firstOpenAtMs: number;
  variant: AbVariant;
  nowMs?: number;
  isAuthenticated?: boolean;
  signupCompleted?: boolean;
  existing?: PreSignupCampaignState | null;
}): ScheduledNotif[] {
  const now = input.nowMs ?? Date.now();
  const deepLink = resolvePreSignupDeepLink(
    input.isAuthenticated ?? false,
    input.signupCompleted ?? false,
  );
  const countsByDay = new Map<string, number>();
  const scheduled: ScheduledNotif[] = [];
  let lastMessageIndex: number | undefined;

  for (const def of MILESTONE_DEFS) {
    const rawMs = def.computeMs(input.installAtMs, input.firstOpenAtMs);
    if (rawMs <= now) continue;

    const fireAtMs = enforceDailyCap(rawMs, countsByDay, 2);
    const { title, body, index } = resolveMessageForMilestone(
      def.milestone,
      input.variant,
      input.existing,
      lastMessageIndex,
    );
    lastMessageIndex = index;

    scheduled.push({
      id: milestoneNotificationId(def.milestone),
      milestone: def.milestone,
      fireAtMs,
      title,
      body,
      deepLink,
      variant: input.variant,
      messageIndex: index,
      status: "pending",
    });
  }

  return scheduled;
}

export function isCampaignExpired(installAtMs: number, nowMs = Date.now()): boolean {
  return nowMs >= installAtMs + 7 * MS_DAY + MS_DAY;
}

export function buildScheduleFingerprint(scheduled: ScheduledNotif[]): string {
  return scheduled.map((s) => `${s.milestone}:${s.fireAtMs}:${s.messageIndex}`).join("|");
}
