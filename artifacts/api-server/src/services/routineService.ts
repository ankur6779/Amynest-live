import { and, desc, eq, inArray } from "drizzle-orm";
import { db, routinesTable, type Routine } from "@workspace/db";

type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: "pending" | "done";
  id?: string;
};

export type RoutineTaskOut = {
  id: string;
  title: string;
  duration: number;
  status: "pending" | "done";
  time: string;
  category: string;
};

export type RoutineSection = {
  todayTasks: RoutineTaskOut[];
  completedCount: number;
  totalCount: number;
  progress: number;
};

function todayString(): string {
  return new Date().toISOString().split("T")[0]!;
}

export async function getRoutineForChildren(childIds: number[]): Promise<RoutineSection> {
  if (childIds.length === 0) {
    return { todayTasks: [], completedCount: 0, totalCount: 0, progress: 0 };
  }

  const today = todayString();

  const todayRoutines = await db
    .select()
    .from(routinesTable)
    .where(and(inArray(routinesTable.childId, childIds), eq(routinesTable.date, today)))
    .orderBy(desc(routinesTable.createdAt));

  let pickedRoutines: Routine[] = todayRoutines;
  if (pickedRoutines.length === 0) {
    const [latest] = await db
      .select()
      .from(routinesTable)
      .where(inArray(routinesTable.childId, childIds))
      .orderBy(desc(routinesTable.createdAt))
      .limit(1);
    pickedRoutines = latest ? [latest] : [];
  }

  const tasks: RoutineTaskOut[] = pickedRoutines.flatMap((r) => {
    const items = (r.items as RoutineItem[]) ?? [];
    return items.map((it, idx) => ({
      id: it.id ?? `${r.id}-${idx}`,
      title: it.activity,
      duration: it.duration,
      time: it.time,
      category: it.category,
      status: it.status === "done" ? "done" : "pending",
    }));
  });

  const completedCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;
  const progress = totalCount === 0 ? 0 : completedCount / totalCount;

  return { todayTasks: tasks, completedCount, totalCount, progress };
}
