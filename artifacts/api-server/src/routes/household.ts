// ─────────────────────────────────────────────────────────────────────────
// /api/household — Multi-Child Conflict Resolution Engine routes.
//
// POST /api/household/orchestrate     — pure compute on a payload
// GET  /api/household/conflicts?date= — orchestrate from saved routines
// ─────────────────────────────────────────────────────────────────────────

import { Router, type IRouter } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod/v4";

import { getAuth } from "../lib/auth";
import { db, childrenTable, routinesTable } from "@workspace/db";
import {
  orchestrateHousehold,
  type CaregiverAvailability,
  type ChildRoutineInput,
  type RoutineItem,
} from "@workspace/conflict-resolution";
import type { HandlerKey } from "@workspace/family-routine";

const router: IRouter = Router();

// ── Zod schemas (kept in-route — small, local, no need to add to api-zod). ──
const CaregiverEnum = z.enum(["mom", "dad", "both", "grandparent", "babysitter"]);

const RoutineItemSchema = z.object({
  time:        z.string(),
  activity:    z.string(),
  duration:    z.number().int().min(0).max(720),
  category:    z.string(),
  notes:       z.string().nullish(),
  status:      z.string().nullish(),
  rewardPoints:z.number().int().nullish(),
  caregiver:   CaregiverEnum.nullish(),
  shiftedFromTime: z.string().nullish(),
  isAnchor:    z.boolean().nullish(),
});

const ChildProfileSchema = z.object({
  id:               z.number().int(),
  name:             z.string(),
  age:              z.number().int().min(0).max(25),
  ageMonths:        z.number().int().nullish(),
  wakeUpTime:       z.string().nullish(),
  sleepTime:        z.string().nullish(),
  schoolStartTime:  z.string().nullish(),
  schoolEndTime:    z.string().nullish(),
  hasSchoolToday:   z.boolean().nullish(),
  defaultCaregiver: CaregiverEnum.nullish(),
  isSick:           z.boolean().nullish(),
  isInfant:         z.boolean().nullish(),
});

const ChildRoutineSchema = z.object({
  child: ChildProfileSchema,
  items: z.array(RoutineItemSchema).max(60),
});

const CaregiverAvailSchema = z.object({
  caregiver: CaregiverEnum,
  capacity:  z.number().int().min(1).max(10),
  windows:   z.array(z.object({ start: z.string(), end: z.string() })).max(8),
});

const OrchestrateBodySchema = z.object({
  date:                  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dryRun:                z.boolean().optional(),
  mealSyncWindowMinutes: z.number().int().min(0).max(180).optional(),
  bucketMinutes:         z.number().int().min(5).max(60).optional(),
  routines:              z.array(ChildRoutineSchema).min(1).max(8),
  caregivers:            z.array(CaregiverAvailSchema).min(1).max(8),
});

// ── POST /api/household/orchestrate ──────────────────────────────────────
router.post("/household/orchestrate", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = OrchestrateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid orchestrate body",
      issues: parsed.error.issues,
    });
  }

  const state = orchestrateHousehold({
    date:                   parsed.data.date,
    dryRun:                 parsed.data.dryRun,
    mealSyncWindowMinutes:  parsed.data.mealSyncWindowMinutes,
    bucketMinutes:          parsed.data.bucketMinutes,
    routines:               parsed.data.routines as ChildRoutineInput[],
    caregivers:             parsed.data.caregivers as CaregiverAvailability[],
  });

  req.log.info({
    userId: auth.userId,
    date: parsed.data.date,
    childCount: parsed.data.routines.length,
    conflicts: state.conflicts.length,
    resolved: state.resolutions.filter((r) => r.strategy !== "no_action").length,
    score: state.summary.overallScore,
  }, "household orchestrated");

  return res.json(state);
});

// ── GET /api/household/conflicts?date=YYYY-MM-DD ─────────────────────────
router.get("/household/conflicts", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) return res.status(401).json({ error: "Unauthorized" });

  const date = String(req.query.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Invalid or missing 'date' (YYYY-MM-DD)" });
  }

  // 1. Load this user's children.
  const kids = await db
    .select()
    .from(childrenTable)
    .where(eq(childrenTable.userId, auth.userId));
  if (kids.length === 0) {
    return res.json(emptyState(date));
  }

  // 2. Load already-saved routines for the requested date.
  const childIds = kids.map((k) => k.id);
  const savedRoutines = await db
    .select()
    .from(routinesTable)
    .where(and(eq(routinesTable.date, date), inArray(routinesTable.childId, childIds)));

  // 3. Build engine input. Children without routines get an empty items array
  //    so caregiver/sleep windows from the profile still feed sleep-violation
  //    detection.
  const isoWeekday = isoWeekdayFromDate(date);
  const routinesInput: ChildRoutineInput[] = kids.map((k) => {
    const saved = savedRoutines.find((r) => r.childId === k.id);
    const items: RoutineItem[] = Array.isArray(saved?.items)
      ? (saved!.items as unknown as RoutineItem[])
      : [];
    const schoolDays = (k.schoolDays ?? null) as number[] | null;
    const hasSchoolToday = schoolDays
      ? schoolDays.includes(isoWeekday)
      : isoWeekday >= 1 && isoWeekday <= 5;
    return {
      child: {
        id: k.id,
        name: k.name,
        age: k.age,
        ageMonths: k.ageMonths,
        wakeUpTime: k.wakeUpTime ?? undefined,
        sleepTime: k.sleepTime ?? undefined,
        schoolStartTime: k.schoolStartTime ?? undefined,
        schoolEndTime: k.schoolEndTime ?? undefined,
        hasSchoolToday,
        isInfant: k.age < 1,
      },
      items,
    };
  });

  // Profile-only signals (e.g., infant sleep windows) still feed the engine,
  // but if there are literally zero items across all children there's nothing
  // to orchestrate.
  const totalItems = routinesInput.reduce((s, r) => s + r.items.length, 0);
  if (totalItems === 0) {
    return res.json(emptyState(date));
  }

  // 4. Default caregivers — assume mom + dad each available all day with
  //    capacity 1 (until we add a household_caregivers table).
  const caregivers: CaregiverAvailability[] = [
    { caregiver: "mom" as HandlerKey, capacity: 1, windows: [{ start: "06:00", end: "22:00" }] },
    { caregiver: "dad" as HandlerKey, capacity: 1, windows: [{ start: "06:00", end: "22:00" }] },
  ];

  const state = orchestrateHousehold({
    date,
    routines: routinesInput,
    caregivers,
    dryRun: true, // GET should never mutate — UI applies via the POST.
  });

  req.log.info({
    userId: auth.userId,
    date,
    childCount: routinesInput.length,
    conflicts: state.conflicts.length,
    score: state.summary.overallScore,
  }, "household conflicts checked");

  return res.json(state);
});

function emptyState(date: string) {
  return {
    date,
    originalRoutines: [],
    finalRoutines:    [],
    conflicts:        [],
    postResolutionConflicts: [],
    resolutions:      [],
    timeline:         [],
    summary: {
      totalConflicts: 0,
      resolvedConflicts: 0,
      sharedActivityWindows: 0,
      caregiverPeakLoad: 0,
      sleepIntegrityScore: 100,
      overallScore: 100,
    },
    reasoningTrace: [
      { step: "noop", detail: "No routines saved for this date — nothing to orchestrate." },
    ],
  };
}

function isoWeekdayFromDate(date: string): number {
  // ISO: Mon=1..Sun=7
  const d = new Date(date + "T12:00:00Z");
  const js = d.getUTCDay(); // 0=Sun..6=Sat
  return js === 0 ? 7 : js;
}

export default router;
