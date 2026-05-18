import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { sendSafeError } from "./lib/safe-api-response";
import { APEX_PRODUCTION_HOST } from "./lib/canonical-host";
import { slowApiGuard } from "./middlewares/slow-api-guard";
import { requestTimeout } from "./middlewares/request-timeout.js";
import { limitJsonResponse } from "./middlewares/limit-json-response.js";
import { requestLoopDetector } from "./middlewares/request-loop-detector.js";
import { getMemorySnapshot } from "./utils/memory-monitor.js";
import {
  bootElapsedMs,
  getCurrentBootPhase,
  getLastSuccessfulBootPhase,
  isModuleEnabled,
} from "./lib/boot-diagnostics.js";

const ROUTES_ENABLED = isModuleEnabled("routes");
const REDIS_HEALTH_ENABLED = isModuleEnabled("redis");

/**
 * Full API Express app. Routes are imported only when the `routes` boot module
 * is enabled so BOOT_MODULES=db does not pull the entire router tree at load.
 */
export async function createApp(): Promise<Express> {
  const app: Express = express();

  /** Bare apex → canonical www (matches SPA + Cloudflare). */
  app.use((req, res, next) => {
    if (req.hostname === APEX_PRODUCTION_HOST) {
      return res.redirect(301, `https://www.amynest.in${req.originalUrl}`);
    }
    next();
  });

  app.use(cookieParser());
  app.use(requestTimeout);
  app.use(slowApiGuard);
  app.use(limitJsonResponse);
  if (ROUTES_ENABLED) {
    app.use(requestLoopDetector());
  }

  app.use(
    pinoHttp({
      logger,
      autoLogging: process.env.NODE_ENV !== "production",
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );

  app.use(cors({ credentials: true, origin: true }));
  app.use(
    express.json({
      limit: "1mb",
      verify: (req: express.Request & { rawBody?: string }, _res, buf) => {
        const url: string = req.originalUrl ?? req.url ?? "";
        if (url.includes("/api/subscription/razorpay/webhook")) {
          req.rawBody = buf.toString("utf8");
        }
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({ status: "running", service: "AmyNest API" });
  });

  /** Load balancers / Render keep-warm — minimal response. */
  app.get("/health", (_req, res) => {
    res.status(200).type("text/plain").send("ok");
  });

  /** Render healthCheckPath + probes that do not use the /api prefix. */
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  /** Detailed health for ops (optional). */
  app.get("/health/status", async (_req, res) => {
    const memory = getMemorySnapshot();
    let queueSnapshot: {
      status: "ok" | "degraded";
      redis: boolean;
      queueMode: "bullmq" | "memory" | "off";
      workerExpected: boolean;
    } = {
      status: "ok",
      redis: false,
      queueMode: "memory",
      workerExpected: false,
    };
    let queueStats: unknown = null;

    if (REDIS_HEALTH_ENABLED) {
      const { getQueueHealthSnapshot } = await import("./queue/bootstrap.js");
      const { getAiQueueHealth } = await import("./lib/ai-queue-http.js");
      queueSnapshot = await getQueueHealthSnapshot();
      queueStats = await getAiQueueHealth();
    }

    const status =
      memory.warn || queueSnapshot.status === "degraded" ? "degraded" : "ok";
    if (memory.warn) {
      logger.warn({ evt: "health.memory_high", memory }, "Health check: high memory");
    }
    res.status(200).json({
      status,
      redis: queueSnapshot.redis,
      queueMode: queueSnapshot.queueMode,
      workerExpected: queueSnapshot.workerExpected,
      service: "AmyNest API",
      memory,
      aiQueue: queueStats,
      uptimeSec: Math.round(process.uptime()),
      boot: {
        elapsedMs: bootElapsedMs(),
        currentPhase: getCurrentBootPhase(),
        lastSuccessfulPhase: getLastSuccessfulBootPhase(),
        routesMounted: ROUTES_ENABLED,
      },
    });
  });

  if (ROUTES_ENABLED) {
    const { default: router } = await import("./routes/index.js");
    app.use("/api", router);
  } else {
    logger.warn(
      { evt: "boot.routes_disabled" },
      "BOOT_MODULES: /api router NOT mounted; only /, /health, /health/status served",
    );
    app.use("/api", (req, res) => {
      res.status(503).json({
        error: "routes_disabled",
        message: "API routes are disabled for diagnostic boot mode",
        path: req.originalUrl,
      });
    });
  }

  app.use((req, res) => {
    const safeUrl = (() => {
      if (!req.originalUrl.includes("?")) return req.originalUrl;
      const [p, qs] = req.originalUrl.split("?", 2);
      const params = new URLSearchParams(qs);
      for (const k of ["code", "state", "id_token", "access_token"]) {
        if (params.has(k)) params.set(k, "[REDACTED]");
      }
      return `${p}?${params.toString()}`;
    })();
    logger.warn(
      {
        kind: "api_server_404",
        method: req.method,
        url: safeUrl,
      },
      "Unknown route on api-server",
    );
    sendSafeError(
      res,
      404,
      `No handler for ${req.method} ${req.originalUrl} on api-server.`,
    );
  });

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error({ err }, "Unhandled API error");
      if (res.headersSent) return;
      const message = err instanceof Error ? err.message : "Internal server error";
      sendSafeError(res, 500, message, true);
    },
  );

  return app;
}
