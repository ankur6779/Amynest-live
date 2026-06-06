import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { db, childrenTable, parentProfilesTable } from "@workspace/db";
import {
  getChildByIdForUser,
  insertChildRow,
  listChildrenForUser,
  updateChildRow,
} from "../lib/children-db.js";
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
import { tryMarkReferralValidForUser } from "../services/referralService";
import { ONBOARDING_CHILD_SAVE_FALLBACK } from "../lib/api-fallbacks.js";
import { safeRoute } from "../lib/safe-route-handler.js";
import { isSchemaMismatchError } from "../lib/db-safe.js";
import { enrichChildEducationFields } from "../lib/child-education-enrich.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/children", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const children = await listChildrenForUser(userId);
  res.json(ListChildrenResponse.parse(children.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))));
});

router.post(
  "/children",
  safeRoute(
    "POST /children",
    async (req, res): Promise<void> => {
      const auth = getAuth(req);
      const userId = auth.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const parsed = CreateChildBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const isOnboarding = req.body?.isOnboarding === true;

      if (isOnboarding) {
        const existingChildren = await listChildrenForUser(userId);
        const byName = existingChildren.find(
          (c) => c.name.toLowerCase() === parsed.data.name.toLowerCase(),
        );
        if (byName) {
          res.status(200).json(
            GetChildResponse.parse({
              ...byName,
              createdAt: byName.createdAt.toISOString(),
            }),
          );
          return;
        }
      }

      if (!isOnboarding) {
        try {
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
        } catch (err) {
          if (isSchemaMismatchError(err)) {
            logger.warn(
              { evt: "children.create.subscription_check_skipped", err },
              "Subscription check skipped — schema mismatch",
            );
          } else {
            throw err;
          }
        }
      }

      let inheritedPrefs: Record<string, unknown> = {};
      if (!parsed.data.dietType && !parsed.data.foodStyle) {
        try {
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
        } catch (err) {
          if (!isSchemaMismatchError(err)) throw err;
          logger.warn(
            { evt: "children.create.parent_inherit_skipped", err },
            "Parent food pref inherit skipped — schema mismatch",
          );
        }
      }

      let enriched;
      try {
        enriched = enrichChildEducationFields(
          {
            ...parsed.data,
            foodPrefInherited: parsed.data.foodPrefInherited ?? undefined,
            foodPrefCustomized: parsed.data.foodPrefCustomized ?? undefined,
            ...inheritedPrefs,
          },
          { strict: !isOnboarding },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Invalid education stage";
        res.status(400).json({ error: message });
        return;
      }

      const insertData = {
        ...enriched,
        userId,
      };
      const child = await insertChildRow(insertData);

      tryMarkReferralValidForUser(userId, {
        emailVerified: auth.emailVerified,
        phoneNumber: auth.phoneNumber,
      }).catch(() => {});

      res
        .status(201)
        .json(GetChildResponse.parse({ ...child, createdAt: child.createdAt.toISOString() }));
    },
    (req, res) => {
      if (req.body?.isOnboarding === true) {
        res.status(200).json({ ...ONBOARDING_CHILD_SAVE_FALLBACK });
        return;
      }
      res.status(503).json({ ...ONBOARDING_CHILD_SAVE_FALLBACK, error: "schema_mismatch" });
    },
  ),
);

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
  const child = await getChildByIdForUser(params.data.id, userId);
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
  const existing = await getChildByIdForUser(params.data.id, userId);
  if (!existing) {
    res.status(404).json({ error: "Child not found" });
    return;
  }

  let updateData;
  try {
    updateData = enrichChildEducationFields({
      age: parsed.data.age ?? existing.age,
      ageMonths: parsed.data.ageMonths ?? existing.ageMonths,
      educationStage: parsed.data.educationStage ?? existing.educationStage,
      learningEnvironment: parsed.data.learningEnvironment ?? existing.learningEnvironment,
      scheduleKnown: parsed.data.scheduleKnown ?? existing.scheduleKnown,
      isSchoolGoing: parsed.data.isSchoolGoing ?? existing.isSchoolGoing,
      childClass: parsed.data.childClass ?? existing.childClass,
      schoolStartTime: parsed.data.schoolStartTime ?? existing.schoolStartTime,
      schoolEndTime: parsed.data.schoolEndTime ?? existing.schoolEndTime,
      schoolDays: parsed.data.schoolDays ?? (existing.schoolDays as number[] | null),
      ...parsed.data,
      foodPrefInherited: parsed.data.foodPrefInherited ?? undefined,
      foodPrefCustomized: parsed.data.foodPrefCustomized ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid education stage";
    res.status(400).json({ error: message });
    return;
  }

  const child = await updateChildRow(params.data.id, userId, updateData);
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
