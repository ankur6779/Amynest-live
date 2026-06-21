import {
  analyticsEventsTable,
  coloringDownloadsTable,
  db,
  funsheetDownloadsTable,
  subscriptionsTable,
  type Subscription,
} from "@workspace/db";
import { HUB_CONTENT_QUOTAS } from "@workspace/parent-hub-journey";
import { and, eq, sql } from "drizzle-orm";
import { isPremiumSubscriberNow } from "./subscription-premium-gate.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const PREMIUM_DOWNLOAD_BANK = {
  dailyAllocation: HUB_CONTENT_QUOTAS.premiumDownloadDaily,
  maxBank: 25,
  maxAvailable: HUB_CONTENT_QUOTAS.premiumDownloadDaily + 25,
} as const;

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
type DownloadSource = "daily" | "bank";

export type PremiumDownloadWallet = {
  enabled: boolean;
  availableToday: number;
  dailyAllocation: number;
  dailyRefresh: number;
  dailyUsed: number;
  dailyRemaining: number;
  bankedDownloads: number;
  maxBank: number;
  maxAvailable: number;
  lastRefreshAt: string | null;
};

export type PremiumDownloadReserve =
  | { ok: true; source: DownloadSource; wallet: PremiumDownloadWallet }
  | { ok: false; wallet: PremiumDownloadWallet };

function istDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

function utcMsForDayKey(dayKey: string): number {
  const [year, month, day] = dayKey.split("-").map((part) => Number.parseInt(part, 10));
  return Date.UTC(year, month - 1, day);
}

function addDays(dayKey: string, days: number): string {
  return new Date(utcMsForDayKey(dayKey) + days * DAY_MS).toISOString().slice(0, 10);
}

function dayDiff(fromDayKey: string, toDayKey: string): number {
  return Math.max(0, Math.floor((utcMsForDayKey(toDayKey) - utcMsForDayKey(fromDayKey)) / DAY_MS));
}

function clampBank(value: number): number {
  return Math.max(0, Math.min(PREMIUM_DOWNLOAD_BANK.maxBank, value));
}

function walletFromState(input: {
  dailyUsed: number;
  bankedDownloads: number;
  lastRefreshAt: Date | null;
  enabled?: boolean;
}): PremiumDownloadWallet {
  const dailyAllocation = PREMIUM_DOWNLOAD_BANK.dailyAllocation;
  const dailyRemaining = Math.max(0, dailyAllocation - input.dailyUsed);
  const bankedDownloads = clampBank(input.bankedDownloads);
  return {
    enabled: input.enabled ?? true,
    availableToday: Math.min(
      PREMIUM_DOWNLOAD_BANK.maxAvailable,
      dailyRemaining + bankedDownloads,
    ),
    dailyAllocation,
    dailyRefresh: dailyAllocation,
    dailyUsed: input.dailyUsed,
    dailyRemaining,
    bankedDownloads,
    maxBank: PREMIUM_DOWNLOAD_BANK.maxBank,
    maxAvailable: PREMIUM_DOWNLOAD_BANK.maxAvailable,
    lastRefreshAt: input.lastRefreshAt?.toISOString() ?? null,
  };
}

function disabledWallet(dailyUsed: number): PremiumDownloadWallet {
  return walletFromState({
    enabled: false,
    dailyUsed,
    bankedDownloads: 0,
    lastRefreshAt: null,
  });
}

async function countDownloadsForIstDay(
  exec: DbExecutor,
  userId: string,
  dayKey: string,
): Promise<number> {
  const dayPredicate = (column: unknown) =>
    sql`(${column} AT TIME ZONE 'Asia/Kolkata')::date = ${dayKey}::date`;

  const [coloring] = await exec
    .select({ count: sql<number>`count(*)::int` })
    .from(coloringDownloadsTable)
    .where(
      and(
        eq(coloringDownloadsTable.userId, userId),
        dayPredicate(coloringDownloadsTable.downloadedAt),
      ),
    );

  const [funsheets] = await exec
    .select({ count: sql<number>`count(*)::int` })
    .from(funsheetDownloadsTable)
    .where(
      and(
        eq(funsheetDownloadsTable.userId, userId),
        dayPredicate(funsheetDownloadsTable.downloadedAt),
      ),
    );

  return (coloring?.count ?? 0) + (funsheets?.count ?? 0);
}

async function refreshSubscriptionBank(
  exec: DbExecutor,
  sub: Subscription,
  now: Date,
): Promise<Subscription> {
  const currentBank = clampBank(sub.downloadBankBalance ?? 0);
  const lastRefreshAt = sub.lastDownloadRefreshAt;
  const todayKey = istDayKey(now);

  if (!lastRefreshAt) {
    const [updated] = await exec
      .update(subscriptionsTable)
      .set({
        downloadBankBalance: currentBank,
        dailyDownloadAllocation: PREMIUM_DOWNLOAD_BANK.dailyAllocation,
        lastDownloadRefreshAt: now,
        updatedAt: now,
      })
      .where(eq(subscriptionsTable.userId, sub.userId))
      .returning();
    return updated ?? sub;
  }

  const lastRefreshDayKey = istDayKey(lastRefreshAt);
  const elapsedDays = dayDiff(lastRefreshDayKey, todayKey);
  if (elapsedDays <= 0) return sub;

  let bankGain = 0;
  for (let i = 0; i < elapsedDays; i += 1) {
    const dayKey = addDays(lastRefreshDayKey, i);
    const used = await countDownloadsForIstDay(exec, sub.userId, dayKey);
    bankGain += Math.max(0, PREMIUM_DOWNLOAD_BANK.dailyAllocation - used);
  }

  const [updated] = await exec
    .update(subscriptionsTable)
    .set({
      downloadBankBalance: clampBank(currentBank + bankGain),
      dailyDownloadAllocation: PREMIUM_DOWNLOAD_BANK.dailyAllocation,
      lastDownloadRefreshAt: now,
      updatedAt: now,
    })
    .where(eq(subscriptionsTable.userId, sub.userId))
    .returning();
  return updated ?? sub;
}

async function emitBankAnalytics(
  userId: string,
  eventName: "premium_download_bank_refreshed" | "premium_download_bank_used",
  wallet: PremiumDownloadWallet,
  extra: Record<string, unknown> = {},
): Promise<void> {
  await db.insert(analyticsEventsTable).values({
    userId,
    eventName,
    eventCategory: "premium",
    props: {
      downloads_used_today: wallet.dailyUsed,
      downloads_banked: wallet.bankedDownloads,
      average_bank_balance: wallet.bankedDownloads,
      bank_usage_rate:
        wallet.maxBank > 0 ? Number((wallet.bankedDownloads / wallet.maxBank).toFixed(4)) : 0,
      available_downloads: wallet.availableToday,
      daily_download_allocation: wallet.dailyAllocation,
      days_until_first_bank_use: null,
      ...extra,
    },
  });
}

export async function getPremiumDownloadWallet(userId: string): Promise<PremiumDownloadWallet> {
  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId))
      .limit(1)
      .for("update");

    const todayUsed = await countDownloadsForIstDay(tx, userId, istDayKey(new Date()));
    if (!locked || !isPremiumSubscriberNow(locked)) {
      return disabledWallet(todayUsed);
    }

    const refreshed = await refreshSubscriptionBank(tx, locked, new Date());
    const wallet = walletFromState({
      dailyUsed: todayUsed,
      bankedDownloads: refreshed.downloadBankBalance ?? 0,
      lastRefreshAt: refreshed.lastDownloadRefreshAt,
    });

    void emitBankAnalytics(userId, "premium_download_bank_refreshed", wallet, {
      source: "wallet_read",
    }).catch(() => undefined);
    return wallet;
  });
}

export async function reservePremiumDownload(userId: string): Promise<PremiumDownloadReserve> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [locked] = await tx
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId))
      .limit(1)
      .for("update");

    const todayUsed = await countDownloadsForIstDay(tx, userId, istDayKey(now));
    if (!locked || !isPremiumSubscriberNow(locked)) {
      return { ok: false, wallet: disabledWallet(todayUsed) };
    }

    const refreshed = await refreshSubscriptionBank(tx, locked, now);
    const bankedDownloads = refreshed.downloadBankBalance ?? 0;
    const dailyRemaining = Math.max(0, PREMIUM_DOWNLOAD_BANK.dailyAllocation - todayUsed);

    if (dailyRemaining <= 0 && bankedDownloads <= 0) {
      return {
        ok: false,
        wallet: walletFromState({
          dailyUsed: todayUsed,
          bankedDownloads,
          lastRefreshAt: refreshed.lastDownloadRefreshAt,
        }),
      };
    }

    const source: DownloadSource = dailyRemaining > 0 ? "daily" : "bank";
    let bankAfter = bankedDownloads;
    if (source === "bank") {
      bankAfter = clampBank(bankedDownloads - 1);
      await tx
        .update(subscriptionsTable)
        .set({ downloadBankBalance: bankAfter, updatedAt: now })
        .where(eq(subscriptionsTable.userId, userId));
    }

    const wallet = walletFromState({
      dailyUsed: todayUsed + 1,
      bankedDownloads: bankAfter,
      lastRefreshAt: refreshed.lastDownloadRefreshAt,
    });

    void emitBankAnalytics(userId, "premium_download_bank_used", wallet, {
      debit_source: source,
    }).catch(() => undefined);
    return { ok: true, source, wallet };
  });
}

export async function refundPremiumDownloadBankDebit(userId: string): Promise<void> {
  await db
    .update(subscriptionsTable)
    .set({
      downloadBankBalance: sql`LEAST(${PREMIUM_DOWNLOAD_BANK.maxBank}, ${subscriptionsTable.downloadBankBalance} + 1)`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.userId, userId));
}
