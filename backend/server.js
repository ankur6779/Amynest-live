"use strict";

/** @build 2026-05-17 infant realism scoring + rewrite layer */
/**
 * Render Amynest-backend entrypoint (rootDir=backend).
 * Dashboard: build = npm install, start = node server.js
 * Delegates to the monorepo api-server after install postinstall build.
 */
const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const profile =
  process.env.AMYNEST_ENV === "development" ? "DEV" : "PROD";
console.log(
  `[Amynest-backend] Starting full api-server (${profile}) from`,
  root,
);

const child = spawn(
  "pnpm",
  ["--filter", "@workspace/api-server", "start"],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: true,
  },
);

child.on("error", (err) => {
  console.error("[Amynest-backend] Failed to start api-server:", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[Amynest-backend] api-server killed: ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
