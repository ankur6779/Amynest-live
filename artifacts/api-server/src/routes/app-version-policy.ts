import { Router, type IRouter } from "express";
import {
  getAppVersionPolicy,
  getAppVersionPolicyCacheSeconds,
} from "../services/appVersionPolicyService";

const router: IRouter = Router();

router.get("/app-version-policy", (req, res): void => {
  try {
    const cacheSeconds = getAppVersionPolicyCacheSeconds();
    const policy = getAppVersionPolicy();

    res.setHeader(
      "Cache-Control",
      `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`,
    );
    res.setHeader("Vary", "Accept-Encoding");
    res.status(200).json(policy);
  } catch (err) {
    req.log?.error({ err }, "app version policy validation failed");
    res.status(500).json({
      error: "app_version_policy_invalid",
      message: "App version policy is not configured correctly.",
    });
  }
});

export default router;
