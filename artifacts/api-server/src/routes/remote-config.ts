import { Router, type IRouter } from "express";
import { getChatPlatformRemoteConfig } from "../services/chatPlatformRemoteConfig";
import { getSpeechCoachV2RemoteConfig } from "../services/speechCoachV2RemoteConfig";
import { getNotificationsRemoteConfigPayload } from "@workspace/notification-engine";

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

/** Public remote config for Speech Coach V2 rollout flag. */
router.get("/remote-config/speech-coach-v2", (_req, res) => {
  const config = getSpeechCoachV2RemoteConfig();
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json(config);
});

/** Public remote config for CRM notification segmentation. */
router.get("/remote-config/notifications", (_req, res) => {
  const config = getNotificationsRemoteConfigPayload();
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json(config);
});

export default router;
