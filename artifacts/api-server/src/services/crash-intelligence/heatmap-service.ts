import { crashEventsTable, db } from "@workspace/db";
import { gte, sql } from "drizzle-orm";
import { getSourceMappingForFingerprint } from "./source-mappings.js";
import type { CrashHeatmap } from "./types.js";

type HeatmapWindow = CrashHeatmap["window"];

function windowStart(window: HeatmapWindow): Date {
  const hours = window === "24h" ? 24 : window === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export async function computeCrashHeatmap(
  window: HeatmapWindow = "7d",
): Promise<CrashHeatmap> {
  const since = windowStart(window);

  const [componentRows, routeRows, fpRows] = await Promise.all([
    db
      .select({
        name: sql<string>`coalesce(${crashEventsTable.meta}->>'component', split_part(${crashEventsTable.readableFingerprint}, '|', 1))`,
        count: sql<number>`count(*)::int`,
      })
      .from(crashEventsTable)
      .where(gte(crashEventsTable.timestamp, since))
      .groupBy(sql`1`)
      .orderBy(sql`count(*) desc`)
      .limit(20),
    db
      .select({
        name: sql<string>`coalesce(${crashEventsTable.route}, '(unknown)')`,
        count: sql<number>`count(*)::int`,
      })
      .from(crashEventsTable)
      .where(gte(crashEventsTable.timestamp, since))
      .groupBy(crashEventsTable.route)
      .orderBy(sql`count(*) desc`)
      .limit(20),
    db
      .select({
        readableFingerprint: crashEventsTable.readableFingerprint,
        count: sql<number>`count(*)::int`,
      })
      .from(crashEventsTable)
      .where(gte(crashEventsTable.timestamp, since))
      .groupBy(crashEventsTable.readableFingerprint)
      .orderBy(sql`count(*) desc`)
      .limit(30),
  ]);

  const hookCounts = new Map<string, number>();
  const effectCounts = new Map<string, number>();

  for (const row of fpRows) {
    const mapping = getSourceMappingForFingerprint(row.readableFingerprint);
    if (!mapping) continue;
    for (const loc of mapping.locations) {
      const hookKey = `${mapping.component}:${loc.hook}`;
      hookCounts.set(hookKey, (hookCounts.get(hookKey) ?? 0) + Number(row.count));
      if (loc.hook === "useEffect") {
        const effectKey = `${loc.functionName}:${loc.line}`;
        effectCounts.set(
          effectKey,
          (effectCounts.get(effectKey) ?? 0) + Number(row.count),
        );
      }
    }
  }

  const sortEntries = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));

  return {
    generatedAt: new Date().toISOString(),
    window,
    components: componentRows.map((r) => ({
      name: r.name,
      count: Number(r.count),
    })),
    routes: routeRows.map((r) => ({
      name: r.name,
      count: Number(r.count),
    })),
    hooks: sortEntries(hookCounts),
    effects: sortEntries(effectCounts),
  };
}

export async function computeAllHeatmaps(): Promise<{
  h24: CrashHeatmap;
  h7d: CrashHeatmap;
  h30d: CrashHeatmap;
}> {
  const [h24, h7d, h30d] = await Promise.all([
    computeCrashHeatmap("24h"),
    computeCrashHeatmap("7d"),
    computeCrashHeatmap("30d"),
  ]);
  return { h24, h7d, h30d };
}
