import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  childrenTable,
  db,
  pool,
} from "@workspace/db";
import type { FixedActivityInput } from "../lib/routine-fixed-activities.js";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const DAY_TO_FIXED_LABEL: Record<(typeof WEEKDAYS)[number], string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

const TimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm 24-hour time");

const UserCustomActivityBase = z.object({
  childId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40).optional().default("activity"),
  daysOfWeek: z.array(z.enum(WEEKDAYS)).min(1).max(7),
  startTime: TimeSchema,
  endTime: TimeSchema,
  location: z.string().trim().max(160).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const UserCustomActivityInput = UserCustomActivityBase.refine((value) => value.endTime > value.startTime, {
  path: ["endTime"],
  message: "End time must be after start time",
});

export const UserCustomActivityPatch = UserCustomActivityBase.partial().refine(
  (value) => {
    if (!value.startTime || !value.endTime) return true;
    return value.endTime > value.startTime;
  },
  { path: ["endTime"], message: "End time must be after start time" },
);

export type UserCustomActivityInput = z.infer<typeof UserCustomActivityInput>;
export type UserCustomActivityPatch = z.infer<typeof UserCustomActivityPatch>;

export type UserCustomActivity = {
  id: number;
  userId: string;
  childId: number | null;
  title: string;
  category: string;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const ACTIVITY_SELECT = `
  id,
  user_id AS "userId",
  child_id AS "childId",
  title,
  category,
  days_of_week AS "daysOfWeek",
  start_time AS "startTime",
  end_time AS "endTime",
  location,
  notes,
  is_active AS "isActive",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export function serializeUserCustomActivity(row: UserCustomActivity) {
  return {
    id: row.id,
    userId: row.userId,
    childId: row.childId,
    title: row.title,
    category: row.category,
    daysOfWeek: Array.isArray(row.daysOfWeek) ? row.daysOfWeek : [],
    startTime: row.startTime,
    endTime: row.endTime,
    location: row.location,
    notes: row.notes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertChildOwnership(userId: string, childId: number | null | undefined): Promise<void> {
  if (childId == null) return;
  const [child] = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  if (!child) {
    const err = new Error("Child not found");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
}

export async function listUserCustomActivities(userId: string, childId?: number | null) {
  const params: unknown[] = [userId];
  const childFilter = childId != null ? "AND child_id = $2" : "";
  if (childId != null) params.push(childId);
  const { rows } = await pool.query<UserCustomActivity>(
    `SELECT ${ACTIVITY_SELECT}
       FROM user_custom_activities
      WHERE user_id = $1 ${childFilter}
      ORDER BY child_id NULLS FIRST, start_time, title`,
    params,
  );
  return rows;
}

export async function createUserCustomActivity(userId: string, input: UserCustomActivityInput) {
  const childId = input.childId ?? null;
  await assertChildOwnership(userId, childId);
  const { rows } = await pool.query<UserCustomActivity>(
    `INSERT INTO user_custom_activities
       (user_id, child_id, title, category, days_of_week, start_time, end_time, location, notes, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, now())
     RETURNING ${ACTIVITY_SELECT}`,
    [
      userId,
      childId,
      input.title,
      input.category,
      JSON.stringify(input.daysOfWeek),
      input.startTime,
      input.endTime,
      input.location || null,
      input.notes || null,
      input.isActive,
    ],
  );
  return rows[0]!;
}

export async function updateUserCustomActivity(
  userId: string,
  id: number,
  patch: UserCustomActivityPatch,
) {
  const existing = await getOwnedUserCustomActivity(userId, id);
  if (!existing) return undefined;
  const nextChildId = patch.childId === undefined ? existing.childId : patch.childId;
  await assertChildOwnership(userId, nextChildId);

  const sets: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (patch.childId !== undefined) add("child_id", nextChildId ?? null);
  if (patch.title !== undefined) add("title", patch.title);
  if (patch.category !== undefined) add("category", patch.category);
  if (patch.daysOfWeek !== undefined) add("days_of_week", JSON.stringify(patch.daysOfWeek));
  if (patch.startTime !== undefined) add("start_time", patch.startTime);
  if (patch.endTime !== undefined) add("end_time", patch.endTime);
  if (patch.location !== undefined) add("location", patch.location || null);
  if (patch.notes !== undefined) add("notes", patch.notes || null);
  if (patch.isActive !== undefined) add("is_active", patch.isActive);
  add("updated_at", new Date());

  values.push(id, userId);
  const idParam = values.length - 1;
  const userParam = values.length;
  const { rows } = await pool.query<UserCustomActivity>(
    `UPDATE user_custom_activities
        SET ${sets.join(", ")}
      WHERE id = $${idParam} AND user_id = $${userParam}
      RETURNING ${ACTIVITY_SELECT}`,
    values,
  );
  return rows[0];
}

export async function deleteUserCustomActivity(userId: string, id: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    "DELETE FROM user_custom_activities WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
}

export async function getOwnedUserCustomActivity(userId: string, id: number) {
  const { rows } = await pool.query<UserCustomActivity>(
    `SELECT ${ACTIVITY_SELECT}
       FROM user_custom_activities
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
    [id, userId],
  );
  return rows[0];
}

export async function listActiveCustomActivitiesForRoutine(
  userId: string,
  childId: number,
): Promise<FixedActivityInput[]> {
  const { rows } = await pool.query<UserCustomActivity>(
    `SELECT ${ACTIVITY_SELECT}
       FROM user_custom_activities
      WHERE user_id = $1
        AND is_active = true
        AND (child_id = $2 OR child_id IS NULL)
      ORDER BY start_time, title`,
    [userId, childId],
  );
  return rows.map(customActivityToFixedActivity);
}

export async function listActiveCustomActivitiesForChildren(
  userId: string,
  childIds: number[],
): Promise<Map<number, FixedActivityInput[]>> {
  const result = new Map<number, FixedActivityInput[]>();
  if (childIds.length === 0) return result;
  for (const id of childIds) result.set(id, []);

  const { rows } = await pool.query<UserCustomActivity>(
    `SELECT ${ACTIVITY_SELECT}
       FROM user_custom_activities
      WHERE user_id = $1
        AND is_active = true
        AND (child_id = ANY($2::int[]) OR child_id IS NULL)
      ORDER BY start_time, title`,
    [userId, childIds],
  );

  for (const row of rows) {
    const fixed = customActivityToFixedActivity(row);
    if (row.childId == null) {
      for (const id of childIds) result.get(id)?.push(fixed);
    } else {
      result.get(row.childId)?.push(fixed);
    }
  }
  return result;
}

export function customActivityToFixedActivity(row: UserCustomActivity): FixedActivityInput {
  const days = (Array.isArray(row.daysOfWeek) ? row.daysOfWeek : [])
    .filter(
      (day: unknown): day is (typeof WEEKDAYS)[number] =>
        typeof day === "string" && WEEKDAYS.includes(day as (typeof WEEKDAYS)[number]),
    )
    .map((day) => DAY_TO_FIXED_LABEL[day]);
  return {
    activity: row.title,
    days,
    start: row.startTime,
    end: row.endTime,
  };
}
