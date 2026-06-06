import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Durable client crash events — ingested from /api/logs and /api/crash-events. */
export const crashEventsTable = pgTable(
  "crash_events",
  {
    id: serial("id").primaryKey(),
    errorId: text("error_id").notNull(),
    /** Stable hash fingerprint (fp_*) — secondary grouping key. */
    fingerprint: text("fingerprint").notNull(),
    /** Human-readable fingerprint — primary grouping key (Component|ErrorClass|Hint). */
    readableFingerprint: text("readable_fingerprint").notNull(),
    route: text("route"),
    message: text("message").notNull(),
    stack: text("stack"),
    componentStack: text("component_stack"),
    userId: text("user_id"),
    childId: text("child_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    readableFpTsIdx: index("crash_events_readable_fp_ts_idx").on(
      t.readableFingerprint,
      t.timestamp,
    ),
    fpTsIdx: index("crash_events_fp_ts_idx").on(t.fingerprint, t.timestamp),
    userTsIdx: index("crash_events_user_ts_idx").on(t.userId, t.timestamp),
    errorIdIdx: index("crash_events_error_id_idx").on(t.errorId),
    createdAtIdx: index("crash_events_created_at_idx").on(t.createdAt),
  }),
);

/** Regression test registry — links fingerprints to test coverage (no auto code apply). */
export const crashRegressionsTable = pgTable(
  "crash_regressions",
  {
    id: serial("id").primaryKey(),
    readableFingerprint: text("readable_fingerprint").notNull().unique(),
    status: text("status").notNull().default("pending"),
    rootCauseId: text("root_cause_id"),
    testPaths: jsonb("test_paths").$type<string[]>().notNull().default([]),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    statusIdx: index("crash_regressions_status_idx").on(t.status),
  }),
);

export const insertCrashEventSchema = createInsertSchema(crashEventsTable).omit({
  id: true,
  createdAt: true,
});

export const insertCrashRegressionSchema = createInsertSchema(
  crashRegressionsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type CrashEventRow = typeof crashEventsTable.$inferSelect;
export type InsertCrashEvent = z.infer<typeof insertCrashEventSchema>;
export type CrashRegressionRow = typeof crashRegressionsTable.$inferSelect;
export type InsertCrashRegression = z.infer<typeof insertCrashRegressionSchema>;

/** Per-deploy fingerprint snapshot for new-regression detection. */
export const crashDeployBaselinesTable = pgTable(
  "crash_deploy_baselines",
  {
    id: serial("id").primaryKey(),
    appVersion: text("app_version").notNull(),
    deployId: text("deploy_id"),
    fingerprintCounts: jsonb("fingerprint_counts")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    versionCapturedIdx: index("crash_deploy_baselines_version_captured_idx").on(
      t.appVersion,
      t.capturedAt,
    ),
  }),
);

/** Triage + fix verification lifecycle per fingerprint. */
export const crashFingerprintStatusTable = pgTable(
  "crash_fingerprint_status",
  {
    id: serial("id").primaryKey(),
    readableFingerprint: text("readable_fingerprint").notNull().unique(),
    triageStatus: text("triage_status").notNull().default("active"),
    markedFixedAt: timestamp("marked_fixed_at", { withTimezone: true }),
    markedFixedDeploy: text("marked_fixed_deploy"),
    baselineCount7d: integer("baseline_count_7d"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    verification: jsonb("verification")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    triageStatusIdx: index("crash_fingerprint_status_triage_idx").on(t.triageStatus),
  }),
);

export type CrashDeployBaselineRow = typeof crashDeployBaselinesTable.$inferSelect;
export type CrashFingerprintStatusRow =
  typeof crashFingerprintStatusTable.$inferSelect;

/** Release intelligence run history — pre-deploy risk analysis audit trail. */
export const releaseIntelligenceRunsTable = pgTable(
  "release_intelligence_runs",
  {
    id: serial("id").primaryKey(),
    version: text("version").notNull(),
    baseRef: text("base_ref").notNull(),
    headRef: text("head_ref").notNull(),
    verdict: text("verdict").notNull(),
    releaseRiskScore: integer("release_risk_score").notNull(),
    changedFiles: jsonb("changed_files").$type<string[]>().notNull().default([]),
    impactedFingerprints: jsonb("impacted_fingerprints")
      .$type<string[]>()
      .notNull()
      .default([]),
    report: jsonb("report").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    versionCreatedIdx: index("release_intel_runs_version_created_idx").on(
      t.version,
      t.createdAt,
    ),
    verdictIdx: index("release_intel_runs_verdict_idx").on(t.verdict),
  }),
);

/** Historical file → regression learning for risk multipliers. */
export const fileRiskHistoryTable = pgTable(
  "file_risk_history",
  {
    id: serial("id").primaryKey(),
    filePath: text("file_path").notNull().unique(),
    component: text("component"),
    p0Incidents: integer("p0_incidents").notNull().default(0),
    riskMultiplier: integer("risk_multiplier").notNull().default(100),
    linkedFingerprints: jsonb("linked_fingerprints")
      .$type<string[]>()
      .notNull()
      .default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    componentIdx: index("file_risk_history_component_idx").on(t.component),
  }),
);

export type ReleaseIntelligenceRunRow =
  typeof releaseIntelligenceRunsTable.$inferSelect;
export type FileRiskHistoryRow = typeof fileRiskHistoryTable.$inferSelect;
