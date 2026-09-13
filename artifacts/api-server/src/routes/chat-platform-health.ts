import { Router, type IRouter, type Request, type Response } from "express";
import { requireAdmin } from "../lib/admin-auth.js";
import { getChatPlatformHealthDashboard } from "../services/chatPlatformHealthStore";

const router: IRouter = Router();

router.use(requireAdmin);

/** Admin — Android Chat Visibility Health dashboard metrics. */
router.get("/admin/chat-platform-health", (req: Request, res: Response) => {
  res.json(getChatPlatformHealthDashboard());
});

export default router;
