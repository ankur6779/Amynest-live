// ─────────────────────────────────────────────────────────────────────────────
// /api/safety — AI Safety Layer (Module 4)
//
// POST /api/safety/validate — deterministic safety validation against
// age-banded rules. Returns score, violations, and suggested adjustments.
// ─────────────────────────────────────────────────────────────────────────────

import { Router, type IRouter } from "express";
import { z } from "zod/v4";

import { getAuth } from "../lib/auth";
import {
  validateRoutine,
  type SafetyValidationInput,
} from "@workspace/safety";

const router: IRouter = Router();

const ActivitySchema = z.object({
  id: z.string(),
  title: z.string(),
  startMinutes: z.number(),
  durationMinutes: z.number(),
  category: z.string(),
  intensity: z.enum(["low", "moderate", "high"]).nullish(),
  supervisionRequired: z.boolean().nullish(),
});

const ValidateBody = z.object({
  ageBand: z.enum(["infant", "toddler", "preschool", "school", "tween"]),
  ageMonths: z.number(),
  activities: z.array(ActivitySchema),
  totalScreenMinutes: z.number().nullish(),
  totalSleepMinutes: z.number().nullish(),
  totalOutdoorMinutes: z.number().nullish(),
  caregiverPresent: z.boolean().nullish(),
});

router.post("/safety/validate", (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = ValidateBody.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid body", issues: parsed.error.issues });
  }

  const result = validateRoutine(parsed.data as SafetyValidationInput);
  return res.json(result);
});

export default router;
