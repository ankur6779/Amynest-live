import { Router, type IRouter } from "express";
import { eq, and, gte, inArray } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import {
  db,
  behaviorsTable,
  routinesTable,
  childrenTable,
} from "@workspace/db";

const router: IRouter = Router();

type RoutineItem = {
  time?: string;
  activity?: string;
  duration?: number;
  category?: string;
  status?: string;
  notes?: string;
};

type Severity = "good" | "caution" | "risk";

type Prediction = {
  generatedAt: string;
  forDate: string;
  childId: number | null;
  childName: string | null;
  mood: { label: string; emoji: string; severity: Severity };
  energy: { label: string; emoji: string; severity: Severity };
  sleep: { label: string; emoji: string; severity: Severity };
  risk: { label: string; emoji: string; severity: Severity };
  confidence: "Low" | "Medium" | "High";
  suggestions: string[];
  message: string;
  dataPoints: {
    behaviorsConsidered: number;
    routinesConsidered: number;
    avgRoutineCompletion: number;
    daysOfData: number;
  };
};

function ymd(d: Date): string {
  // Use local date components — DB `date` columns store local YYYY-MM-DD,
  // so UTC shifting via toISOString() can misalign day boundaries.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isNegativeBehavior(b: { type: string; behavior: string }): boolean {
  const t = (b.type || "").toLowerCase();
  const txt = (b.behavior || "").toLowerCase();
  if (
    t === "negative" ||
    t === "challenging" ||
    t === "tantrum" ||
    t === "bad"
  )
    return true;
  return /tantrum|hit|bite|scream|cry|defian|refus|melt|whin|fight|angry|irrit/.test(
    txt,
  );
}

function isSleepIssue(b: { type: string; behavior: string }): boolean {
  const txt = `${b.type} ${b.behavior}`.toLowerCase();
  return /sleep|night wake|insomn|nap|tired|disturb/.test(txt);
}

function buildPrediction(
  child: { id: number; name: string } | null,
  behaviors: Array<{ type: string; behavior: string; date: string }>,
  routines: Array<{ items: RoutineItem[] | null; date: string }>,
): Prediction {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const negativeCount = behaviors.filter(isNegativeBehavior).length;
  const sleepIssueCount = behaviors.filter(isSleepIssue).length;
  const totalBehaviors = behaviors.length;

  // Routine completion %
  let totalItems = 0;
  let completedItems = 0;
  for (const r of routines) {
    const items = Array.isArray(r.items) ? r.items : [];
    totalItems += items.length;
    completedItems += items.filter((i) => i?.status === "completed").length;
  }
  const completionPct =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // ── Mood
  let mood: Prediction["mood"];
  if (negativeCount >= 3) {
    mood = { label: "Likely Irritated", emoji: "😣", severity: "risk" };
  } else if (negativeCount >= 1) {
    mood = { label: "Slightly Irritated", emoji: "😐", severity: "caution" };
  } else {
    mood = { label: "Happy & Calm", emoji: "😊", severity: "good" };
  }

  // ── Energy
  let energy: Prediction["energy"];
  if (sleepIssueCount >= 2 || (totalItems > 0 && completionPct < 40)) {
    energy = { label: "Low", emoji: "🪫", severity: "risk" };
  } else if (sleepIssueCount >= 1 || (totalItems > 0 && completionPct < 70)) {
    energy = { label: "Moderate", emoji: "⚡", severity: "caution" };
  } else {
    energy = { label: "High", emoji: "🔋", severity: "good" };
  }

  // ── Sleep quality forecast
  let sleep: Prediction["sleep"];
  if (sleepIssueCount >= 2) {
    sleep = { label: "May Be Disturbed", emoji: "🌙", severity: "risk" };
  } else if (sleepIssueCount === 1 || negativeCount >= 2) {
    sleep = { label: "Restless", emoji: "😴", severity: "caution" };
  } else {
    sleep = { label: "Restful", emoji: "💤", severity: "good" };
  }

  // ── Risk
  let risk: Prediction["risk"];
  if (negativeCount >= 3 && (totalItems > 0 ? completionPct < 50 : true)) {
    risk = { label: "Evening Tantrum Risk", emoji: "⚠️", severity: "risk" };
  } else if (negativeCount >= 1 || (totalItems > 0 && completionPct < 60)) {
    risk = { label: "Mild Mood Dip", emoji: "🟡", severity: "caution" };
  } else {
    risk = { label: "Smooth Day Ahead", emoji: "🟢", severity: "good" };
  }

  // ── Confidence (based on data volume)
  const dataPoints = totalBehaviors + routines.length;
  const confidence: Prediction["confidence"] =
    dataPoints >= 6 ? "High" : dataPoints >= 3 ? "Medium" : "Low";

  // ── Suggestions
  const suggestions: string[] = [];
  if (mood.severity !== "good")
    suggestions.push("Keep tomorrow's routine light and predictable.");
  if (energy.severity !== "good")
    suggestions.push("Add a calming activity before sleep tonight.");
  if (sleep.severity !== "good")
    suggestions.push("Wind down screens 45 minutes before bedtime.");
  if (risk.severity === "risk")
    suggestions.push("Plan a small connection moment in the evening — story, hug, or walk.");
  if (totalItems > 0 && completionPct < 60)
    suggestions.push("Pick 2 'must-do' routine items and let the rest be flexible.");
  if (suggestions.length === 0)
    suggestions.push("You're doing great — keep the consistent routine going!");

  // ── Message (Amy tone)
  let message: string;
  const name = child?.name ?? "your child";
  if (risk.severity === "risk") {
    message = `Tomorrow might be a little challenging for ${name} — let's prepare together ❤️`;
  } else if (risk.severity === "caution") {
    message = `Tomorrow looks mostly okay for ${name}. A small tweak can make it smoother 🌱`;
  } else {
    message = `Tomorrow is looking great for ${name}! Keep doing what you're doing ✨`;
  }

  return {
    generatedAt: new Date().toISOString(),
    forDate: ymd(tomorrow),
    childId: child?.id ?? null,
    childName: child?.name ?? null,
    mood,
    energy,
    sleep,
    risk,
    confidence,
    suggestions: suggestions.slice(0, 4),
    message,
    dataPoints: {
      behaviorsConsidered: totalBehaviors,
      routinesConsidered: routines.length,
      avgRoutineCompletion: completionPct,
      daysOfData: 3,
    },
  };
}

router.get("/future-predictor", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Get user's children
  const children = await db
    .select()
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId));

  if (children.length === 0) {
    res
      .status(404)
      .json({ error: "No children found. Add a child to get predictions." });
    return;
  }

  const childIdRaw = req.query.childId
    ? Number.parseInt(String(req.query.childId), 10)
    : null;

  let target: { id: number; name: string };
  if (childIdRaw != null && !Number.isNaN(childIdRaw)) {
    const found = children.find((c) => c.id === childIdRaw);
    if (!found) {
      res.status(403).json({ error: "Child not found or not yours" });
      return;
    }
    target = { id: found.id, name: found.name };
  } else {
    target = { id: children[0].id, name: children[0].name };
  }

  // Pull last 3 days of behaviors & routines
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const cutoffStr = ymd(cutoff);

  const [behaviors, routines] = await Promise.all([
    db
      .select()
      .from(behaviorsTable)
      .where(
        and(
          eq(behaviorsTable.childId, target.id),
          gte(behaviorsTable.date, cutoffStr),
        ),
      ),
    db
      .select()
      .from(routinesTable)
      .where(
        and(
          eq(routinesTable.childId, target.id),
          gte(routinesTable.date, cutoffStr),
        ),
      ),
  ]);

  const prediction = buildPrediction(
    target,
    behaviors.map((b) => ({
      type: b.type,
      behavior: b.behavior,
      date: b.date,
    })),
    routines.map((r) => ({
      items: (r.items as RoutineItem[] | null) ?? [],
      date: r.date,
    })),
  );

  res.json(prediction);
});

export default router;
