import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "../lib/auth";
import { getChatPlatformHealthDashboard } from "../services/chatPlatformHealthStore";

const router: IRouter = Router();

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

/** Admin — Android Chat Visibility Health dashboard metrics. */
router.get("/admin/chat-platform-health", (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  res.json(getChatPlatformHealthDashboard());
});

export default router;
