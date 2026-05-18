import express, { type Express } from "express";
import { requestTimeout } from "./middlewares/request-timeout.js";

/**
 * Bare Express app for MINIMAL_BOOT=1 — no DB, Redis, routes, crons, or workers.
 * Loaded via dynamic import only when MINIMAL_BOOT=1 so heavy modules never
 * enter the module graph at startup.
 */
const app: Express = express();

app.use(requestTimeout);

app.get("/health", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

app.get("/health/status", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
