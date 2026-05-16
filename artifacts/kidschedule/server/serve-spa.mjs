/**
 * Production static server for the KidSchedule SPA (Render web service or local).
 *
 * Serves artifacts/kidschedule/dist/public with SPA fallback: any GET that does
 * not match a real file is answered with index.html so client-side routing works
 * on hard refresh (e.g. /dashboard, /parent-profile).
 *
 * Zero dependencies — Node built-ins only.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STATIC_ROOT = path.resolve(
  process.env.STATIC_ROOT || path.join(__dirname, "..", "dist", "public"),
);
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
};

function resolveSafePath(urlPath) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);
  if (!filePath.startsWith(STATIC_ROOT)) return null;
  return filePath;
}

function sendFile(filePath, res, extraHeaders = {}) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  const headers = { "content-type": contentType, ...extraHeaders };
  if (ext === ".html") {
    headers["cache-control"] = "no-cache";
  }
  res.writeHead(200, headers);
  res.end(content);
}

function wantsHtml(req) {
  const accept = req.headers.accept || "";
  return accept.includes("text/html") || accept.includes("*/*");
}

function looksLikeAsset(pathname) {
  return /\.[a-z0-9]{1,8}$/i.test(pathname);
}

function tryStatic(pathname) {
  let filePath = resolveSafePath(pathname);
  if (!filePath) return null;

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }

  if (pathname.endsWith("/")) {
    filePath = resolveSafePath(path.join(pathname, "index.html"));
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
  }

  return null;
}

function serveSpaIndex(res) {
  const indexPath = path.join(STATIC_ROOT, "index.html");
  if (!fs.existsSync(indexPath)) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("index.html missing — run the web build first.");
    return;
  }
  sendFile(indexPath, res);
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  const staticFile = tryStatic(pathname);
  if (staticFile) {
    if (req.method === "HEAD") {
      res.writeHead(200);
      res.end();
      return;
    }
    sendFile(staticFile, res);
    return;
  }

  // SPA fallback: navigation / HTML requests for app routes → index.html
  if (
    pathname.startsWith("/api") ||
    (looksLikeAsset(pathname) && !wantsHtml(req))
  ) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  if (req.method === "HEAD") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end();
    return;
  }

  serveSpaIndex(res);
});

const port = Number.parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`AmyNest SPA server listening on ${port}`);
  console.log(`Static root: ${STATIC_ROOT}`);
});
