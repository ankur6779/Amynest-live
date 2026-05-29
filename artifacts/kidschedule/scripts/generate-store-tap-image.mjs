#!/usr/bin/env node
/**
 * Shareable store-tap promo image (1080×1350) for WhatsApp / Instagram.
 * Buttons are visual only — share amynest.in/app link for clickable downloads.
 */
import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const outDir = path.resolve(publicDir, "promo");

const WIDTH = 1080;
const HEIGHT = 1350;

async function main() {
  const logoPath = path.join(publicDir, "amynest-logo-new.png");
  const logoDataUrl = `data:image/png;base64,${Buffer.from(await readFile(logoPath)).toString("base64")}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden;
      font-family: Quicksand, system-ui, sans-serif;
      background: linear-gradient(165deg,#07050f,#12102a 45%,#1a1538);
      color: #fff;
    }
    .wrap {
      width: 100%; height: 100%;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 64px 56px;
      position: relative;
    }
    .orb {
      position: absolute; border-radius: 50%; pointer-events: none;
      width: 500px; height: 500px; top: -120px; left: 50%; transform: translateX(-50%);
      background: radial-gradient(circle, rgba(168,85,247,0.4), transparent 68%);
    }
    .logo {
      width: 160px; height: 160px; border-radius: 36px; object-fit: cover;
      box-shadow: 0 24px 70px rgba(124,58,237,0.5);
      margin-bottom: 32px; position: relative; z-index: 1;
    }
    .badge {
      font-size: 13px; font-weight: 700; letter-spacing: 0.18em;
      text-transform: uppercase; color: rgba(216,180,254,0.85);
      margin-bottom: 16px; z-index: 1;
    }
    h1 {
      font-size: 52px; font-weight: 800; text-align: center;
      line-height: 1.1; margin-bottom: 16px; z-index: 1;
    }
    h1 span {
      background: linear-gradient(90deg,#e9d5ff,#f9a8d4,#7dd3fc);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .sub {
      font-size: 22px; font-weight: 600; text-align: center;
      color: rgba(255,255,255,0.58); line-height: 1.5;
      max-width: 820px; margin-bottom: 48px; z-index: 1;
    }
    .btn {
      width: 100%; max-width: 720px;
      display: flex; align-items: center; gap: 20px;
      padding: 28px 32px; border-radius: 24px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      margin-bottom: 20px; z-index: 1;
    }
    .btn-icon { width: 52px; height: 52px; flex-shrink: 0; }
    .btn-label { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .btn-title { font-size: 28px; font-weight: 800; color: #fff; }
    .tap-hint {
      margin-top: 36px; font-size: 26px; font-weight: 800;
      text-align: center; z-index: 1;
      background: linear-gradient(90deg,#c084fc,#f472b6);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .url {
      margin-top: 12px; font-size: 32px; font-weight: 800;
      color: rgba(255,255,255,0.9); z-index: 1;
    }
    .footer {
      margin-top: 28px; font-size: 16px; font-weight: 600;
      color: rgba(255,255,255,0.35); z-index: 1;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="orb"></div>
    <img class="logo" src="${logoDataUrl}" alt="" />
    <p class="badge">Free Download · Patent Pending</p>
    <h1>Download <span>AmyNest AI</span></h1>
    <p class="sub">Smart parenting routines, learning, speech coach &amp; nutrition — personalised for your child.</p>

    <div class="btn">
      <svg class="btn-icon" viewBox="0 0 24 24" fill="#fff"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
      <div>
        <div class="btn-label">Download on the</div>
        <div class="btn-title">App Store</div>
      </div>
    </div>
    <div class="btn">
      <svg class="btn-icon" viewBox="0 0 24 24"><path d="M3.18 23.76c.3.17.65.19.97.06l12.14-7.01-2.66-2.67-10.45 9.62z" fill="#EA4335"/><path d="M22.47 10.3L19.7 8.72l-3.03 2.96 3.03 3.04 2.79-1.61c.8-.46.8-1.75-.02-2.81z" fill="#FBBC04"/><path d="M3.18.24C2.88.4 2.69.72 2.69 1.12v21.76l10.7-10.7L3.18.24z" fill="#4285F4"/><path d="M16.29 8.28L3.18.24C2.86.07 2.51.09 2.18.26l10.99 10.82 3.12-2.8z" fill="#34A853"/></svg>
      <div>
        <div class="btn-label">Get it on</div>
        <div class="btn-title">Google Play</div>
      </div>
    </div>

    <p class="tap-hint">Tap link to download ↓</p>
    <p class="url">amynest.in/app</p>
    <p class="footer">Privacy First · Child Safe · Free To Start</p>
  </div>
</body>
</html>`;

  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const outPath = path.join(outDir, "amynest-tap-to-download.png");
  await page.screenshot({ path: outPath, type: "png" });
  await browser.close();
  console.log(`✓ ${outPath}`);
}

main();
