import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sendSafeError } from "./lib/safe-api-response";
import { APEX_PRODUCTION_HOST } from "./lib/canonical-host";
import { slowApiGuard } from "./middlewares/slow-api-guard";
import { requestTimeout } from "./middlewares/request-timeout.js";
import { limitJsonResponse } from "./middlewares/limit-json-response.js";
import { getMemorySnapshot } from "./utils/memory-monitor.js";
import { getAiQueueHealth } from "./lib/ai-queue-http.js";
import { getQueueHealthSnapshot } from "./queue/bootstrap.js";

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

app.use(
  pinoHttp({
    logger,
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

/** Detailed health for ops (optional). */
app.get("/health/status", async (_req, res) => {
  const memory = getMemorySnapshot();
  const queueSnapshot = await getQueueHealthSnapshot();
  const queueStats = await getAiQueueHealth();
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
  });
});

app.use("/api", router);

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

export default app;
