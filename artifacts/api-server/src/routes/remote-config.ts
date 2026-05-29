import { Router, type IRouter } from "express";
import { getChatPlatformRemoteConfig } from "../services/chatPlatformRemoteConfig";

const router: IRouter = Router();

/**
 * Public remote config for ChatPlatform kill switch / force visibility mode.
 * WebView + PWA poll this — no APK release required.
 */
router.get("/remote-config/chat-platform", (_req, res) => {
  const config = getChatPlatformRemoteConfig();
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json(config);
});

export default router;
