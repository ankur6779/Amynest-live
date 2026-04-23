import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { getAppData, invalidateAppDataCache } from "../services/appDataService";

const router: IRouter = Router();

router.get("/app-data", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const forceRefresh = req.query.refresh === "1" || req.query.refresh === "true";
    const data = await getAppData(userId, { forceRefresh });
    res.json(data);
  } catch (err) {
    req.log?.error({ err }, "app-data failed");
    res.status(500).json({ error: "Failed to build app data" });
  }
});

router.post("/app-data/refresh", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  invalidateAppDataCache(userId);
  try {
    const data = await getAppData(userId, { forceRefresh: true });
    res.json(data);
  } catch (err) {
    req.log?.error({ err }, "app-data refresh failed");
    res.status(500).json({ error: "Failed to refresh app data" });
  }
});

export default router;
