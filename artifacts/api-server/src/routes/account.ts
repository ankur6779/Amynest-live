import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { adminAuth } from "../lib/firebase-admin";
import { db } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  logDeletionAudit,
  purgeUserDataChunked,
  type DeletionAuditEntry,
} from "../services/data-deletion-service.js";

const router: IRouter = Router();

router.delete("/account", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const requestId = typeof req.headers["x-request-id"] === "string"
    ? req.headers["x-request-id"]
    : undefined;

  try {
    const audit: DeletionAuditEntry[] = [];
    let childIds: number[] = [];
    let accountEmail: string | null = null;
    try {
      const fbUser = await adminAuth().getUser(userId);
      accountEmail = fbUser.email ?? null;
    } catch {
      // Email lookup is best-effort for admin grant cleanup.
    }

    childIds = await purgeUserDataChunked(userId, audit, { accountEmail });

    logDeletionAudit({
      operation: "account",
      userId,
      childIds,
      audit,
      requestId,
    });

    try {
      await adminAuth().deleteUser(userId);
    } catch (err) {
      logger.warn({ err, userId }, "Firebase user delete failed (data already wiped)");
    }

    res.json({ ok: true, deletedChildCount: childIds.length });
  } catch (err) {
    logger.error({ err, userId }, "Account deletion failed");
    res.status(500).json({ error: "Account deletion failed" });
  }
});

export default router;
