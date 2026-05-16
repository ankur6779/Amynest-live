"use strict";

const express = require("express");

const PORT = Number(process.env.PORT) || 3000;

/** @param {string} name */
function readEnv(name) {
  const value = process.env[name];
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** @param {string[]} names */
function readFirstEnv(...names) {
  for (const name of names) {
    const value = readEnv(name);
    if (value) return { name, value };
  }
  return { name: null, value: undefined };
}

function isDriveConfigured() {
  return Boolean(
    readEnv("GOOGLE_API_KEY") ||
      readEnv("GOOGLE_DRIVE_API_KEY") ||
      readEnv("GOOGLE_DRIVE_KEY"),
  );
}

function isElevenLabsConfigured() {
  return Boolean(
    readEnv("ELEVENLABS_API_KEY") || readEnv("ELEVEN_LABS_API_KEY"),
  );
}

function logEnvDiagnostics() {
  const checks = [
    { label: "GOOGLE_API_KEY", set: Boolean(readEnv("GOOGLE_API_KEY")) },
    {
      label: "GOOGLE_DRIVE_API_KEY",
      set: Boolean(readEnv("GOOGLE_DRIVE_API_KEY")),
    },
    { label: "GOOGLE_DRIVE_KEY", set: Boolean(readEnv("GOOGLE_DRIVE_KEY")) },
    {
      label: "ELEVENLABS_API_KEY",
      set: Boolean(readEnv("ELEVENLABS_API_KEY")),
    },
    {
      label: "ELEVEN_LABS_API_KEY",
      set: Boolean(readEnv("ELEVEN_LABS_API_KEY")),
    },
    {
      label: "VITE_GOOGLE_API_KEY (frontend only)",
      set: Boolean(readEnv("VITE_GOOGLE_API_KEY")),
    },
  ];

  console.log("[startup] Environment variable check:");
  for (const { label, set } of checks) {
    console.log(`  ${set ? "✓" : "✗"} ${label}: ${set ? "set" : "missing"}`);
  }

  if (!isDriveConfigured()) {
    console.warn(
      "[startup] Google Drive is NOT configured. Set GOOGLE_API_KEY on this Web Service (not on the static site).",
    );
    if (readEnv("VITE_GOOGLE_API_KEY")) {
      console.warn(
        "[startup] VITE_GOOGLE_API_KEY is set but only applies to the frontend build. Add GOOGLE_API_KEY here.",
      );
    }
  } else {
    const { name } = readFirstEnv(
      "GOOGLE_API_KEY",
      "GOOGLE_DRIVE_API_KEY",
      "GOOGLE_DRIVE_KEY",
    );
    console.log(`[startup] Google Drive configured via ${name}`);
  }

  if (!isElevenLabsConfigured()) {
    console.warn(
      "[startup] ElevenLabs TTS is NOT configured. Set ELEVENLABS_API_KEY on this Web Service.",
    );
  } else {
    const { name } = readFirstEnv("ELEVENLABS_API_KEY", "ELEVEN_LABS_API_KEY");
    console.log(`[startup] ElevenLabs configured via ${name}`);
  }

  console.log(`[startup] NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`);
  console.log(`[startup] RENDER=${process.env.RENDER ? "true" : "false"}`);
}

const app = express();

app.use((req, _res, next) => {
  console.log(`[request] ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/api/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/healthz/drive", (_req, res) => {
  const driveConfigured = isDriveConfigured();
  if (!driveConfigured) {
    console.warn("[healthz/drive] GOOGLE_API_KEY is not set");
  }
  res.json({ driveConfigured });
});

app.get("/api/healthz/tts", (_req, res) => {
  const elevenLabsConfigured = isElevenLabsConfigured();
  if (!elevenLabsConfigured) {
    console.warn("[healthz/tts] ELEVENLABS_API_KEY is not set");
  }
  res.json({ elevenLabsConfigured });
});

app.get("/", (_req, res) => {
  res.json({
    service: "amynest-backend",
    health: "/api/healthz",
    drive: "/api/healthz/drive",
    tts: "/api/healthz/tts",
  });
});

app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Not found" });
});

logEnvDiagnostics();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[startup] Server listening on http://0.0.0.0:${PORT}`);
  console.log("[startup] Health: GET /api/healthz");
  console.log("[startup] Drive:  GET /api/healthz/drive");
  console.log("[startup] TTS:    GET /api/healthz/tts");
});
