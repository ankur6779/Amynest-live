import { Router, type IRouter } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { db, childrenTable, parentProfilesTable, routinesTable } from "@workspace/db";
import {
  CreateChildBody,
  UpdateChildBody,
  GetChildParams,
  UpdateChildParams,
  DeleteChildParams,
  ListChildrenResponse,
  GetChildResponse,
  UpdateChildResponse,
} from "@workspace/api-zod";
import {
  getOrCreateSubscription,
  isPremiumNow,
  FREE_LIMITS,
} from "../services/subscriptionService";
import { markReferralValid } from "../services/referralService";
import { generateRuleBasedRoutine, type AgeGroup } from "../lib/routine-templates.js";

const router: IRouter = Router();

// ── Auto-generate today's rule-based routine for a newly created child ───────
// Fire-and-forget: never throws, never blocks the POST /children response.
// Uses the rule-based engine (no AI cost) and respects the free-tier cap.
async function autoGenerateTodayRoutine(
  child: typeof childrenTable.$inferSelect,
  userId: string,
): Promise<void> {
  try {
    // Free-tier: check if this user already hit the routines cap.
    const sub = await getOrCreateSubscription(userId);
    if (!isPremiumNow(sub)) {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(routinesTable)
        .innerJoin(childrenTable, eq(childrenTable.id, routinesTable.childId))
        .where(eq(childrenTable.userId, userId));
      if ((n ?? 0) >= FREE_LIMITS.routinesMax) return;
    }

    // Build today's date string (YYYY-MM-DD).
    const now = new Date();
    const todayStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    // Don't generate if a routine already exists for today.
    const existing = await db
      .select({ id: routinesTable.id })
      .from(routinesTable)
      .where(and(eq(routinesTable.childId, child.id), eq(routinesTable.date, todayStr)))
      .limit(1);
    if (existing.length > 0) return;

    // Compute age group.
    const totalAgeMonths = (child.age * 12) + (child.ageMonths ?? 0);
    const ageGroup: AgeGroup =
      totalAgeMonths < 12 ? "infant"
      : totalAgeMonths < 36 ? "toddler"
      : totalAgeMonths < 60 ? "preschool"
      : totalAgeMonths < 120 ? "early_school"
      : "pre_teen";

    // Determine if today is a school day.
    // JS getDay(): 0=Sun,1=Mon…6=Sat → ISO: 1=Mon…7=Sun
    const jsDay = now.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    const schoolDays = Array.isArray((child as any).schoolDays) && (child as any).schoolDays.length > 0
      ? (child as any).schoolDays as number[]
      : [1, 2, 3, 4, 5];
    const hasSchool = (child.isSchoolGoing === true) && schoolDays.includes(isoDay);

    const foodType = (child as any).dietType ?? (child as any).foodType ?? "veg";
    const region = (child as any).foodStyle === "indian"
      ? ((child as any).subCuisine || "pan_indian")
      : ((child as any).foodStyle ?? "pan_indian");

    const generated = generateRuleBasedRoutine({
      region: region as any,
      childName: child.name,
      ageGroup,
      totalAgeMonths,
      wakeUpTime: child.wakeUpTime,
      sleepTime: child.sleepTime,
      schoolStartTime: child.schoolStartTime,
      schoolEndTime: child.schoolEndTime,
      travelMode: child.travelMode,
      hasSchool,
      mood: "normal",
      foodType,
      goals: child.goals,
      caregiver: "mom",
      weatherOutdoor: "yes",
      date: todayStr,
    });

    await db.insert(routinesTable).values({
      childId: child.id,
      date: todayStr,
      title: generated.title,
      items: generated.items,
    });
  } catch {
    // Silently ignore — auto-generation is best-effort and must never fail the parent request.
  }
}

router.get("/children", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const children = await db
    .select()
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .orderBy(asc(childrenTable.createdAt), asc(childrenTable.id));
  res.json(ListChildrenResponse.parse(children.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))));
});

router.post("/children", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateChildBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // During initial onboarding, bypass the per-child free-tier cap so all
  // children entered in the setup wizard are saved correctly.
  const isOnboarding = req.body?.isOnboarding === true;

  if (!isOnboarding) {
    // Enforce free-tier child cap
    const sub = await getOrCreateSubscription(userId);
    if (!isPremiumNow(sub)) {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(childrenTable)
        .where(eq(childrenTable.userId, userId));
      if ((n ?? 0) >= FREE_LIMITS.childrenMax) {
        res.status(402).json({
          error: "child_limit_reached",
          message: `Free plan supports up to ${FREE_LIMITS.childrenMax} child. Upgrade to add more.`,
          limit: FREE_LIMITS.childrenMax,
        });
        return;
      }
    }
  }

  // Auto-inherit food prefs from parent profile when not explicitly provided.
  // If the caller didn't pass dietType/foodStyle, copy from the parent profile
  // and mark foodPrefInherited=true so the child form can show the banner.
  let inheritedPrefs: Record<string, unknown> = {};
  if (!parsed.data.dietType && !parsed.data.foodStyle) {
    const [pp] = await db
      .select()
      .from(parentProfilesTable)
      .where(eq(parentProfilesTable.userId, userId));
    if (pp?.dietType || pp?.foodStyle) {
      inheritedPrefs = {
        dietType: pp.dietType ?? null,
        foodStyle: pp.foodStyle ?? null,
        subCuisine: pp.subCuisine ?? null,
        allergies: pp.allergies ?? null,
        foodPrefInherited: true,
      };
    }
  }

  // Strip nulls from boolean NOT-NULL columns (Zod allows null from OpenAPI nullable, DB does not).
  const insertData = {
    ...parsed.data,
    foodPrefInherited: parsed.data.foodPrefInherited ?? undefined,
    foodPrefCustomized: parsed.data.foodPrefCustomized ?? undefined,
    ...inheritedPrefs,
    userId,
  };
  const [child] = await db.insert(childrenTable).values(insertData).returning();

  // Referral system: creating a child counts as the user's first
  // meaningful feature use. Idempotent (only flips pending → valid).
  markReferralValid(userId).catch(() => {});

  // Auto-generate today's rule-based routine for the new child.
  // Fire-and-forget: response is sent immediately, routine is created in background.
  autoGenerateTodayRoutine(child, userId).catch(() => {});

  res.status(201).json(GetChildResponse.parse({ ...child, createdAt: child.createdAt.toISOString() }));
});

router.get("/children/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetChildParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [child] = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.id, params.data.id), eq(childrenTable.userId, userId)));
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  res.json(GetChildResponse.parse({ ...child, createdAt: child.createdAt.toISOString() }));
});

router.patch("/children/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = UpdateChildParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateChildBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData = {
    ...parsed.data,
    foodPrefInherited: parsed.data.foodPrefInherited ?? undefined,
    foodPrefCustomized: parsed.data.foodPrefCustomized ?? undefined,
  };
  const [child] = await db
    .update(childrenTable)
    .set(updateData)
    .where(and(eq(childrenTable.id, params.data.id), eq(childrenTable.userId, userId)))
    .returning();
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  res.json(UpdateChildResponse.parse({ ...child, createdAt: child.createdAt.toISOString() }));
});

router.delete("/children/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = DeleteChildParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [child] = await db
    .delete(childrenTable)
    .where(and(eq(childrenTable.id, params.data.id), eq(childrenTable.userId, userId)))
    .returning();
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
