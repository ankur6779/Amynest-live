#!/usr/bin/env node
/**
 * Bake a static 3D Amy image for the small "icon" tier (headers, lists, chat
 * bubbles). Renders the same procedural head as src/components/amy-3d (kept in
 * sync by hand) to a transparent PNG using Playwright + the locally installed
 * three.js ESM build — no network access required.
 *
 * Output:
 *   public/amy-3d/amy-idle.png      (256x256, 1x)
 *   public/amy-3d/amy-idle@2x.png   (512x512, 2x)
 *
 * Run:  node scripts/render-amy-baked.mjs   (from artifacts/kidschedule)
 *
 * Once the PNG exists, AmyIcon (and therefore every small Amy spot) renders the
 * 3D image automatically. If this script is not run, small spots keep the 2D
 * SVG — nothing breaks.
 */
import { chromium } from "@playwright/test";
import { mkdir, cp, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

function startStaticServer(rootDir) {
  const types = { ".js": "text/javascript", ".html": "text/html", ".mjs": "text/javascript" };
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const filePath = path.join(rootDir, urlPath === "/" ? "bake.html" : urlPath);
      if (!filePath.startsWith(rootDir)) {
        res.statusCode = 403;
        res.end("forbidden");
        return;
      }
      const body = await readFile(filePath);
      res.setHeader("Content-Type", types[path.extname(filePath)] ?? "application/octet-stream");
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_DIR = path.resolve(__dirname, "..");
const THREE_BUILD_DIR = path.resolve(PKG_DIR, "node_modules/three/build");
const THREE_ESM = path.join(THREE_BUILD_DIR, "three.module.js");
const OUT_DIR = path.resolve(PKG_DIR, "public/amy-3d");

function bakeHtml() {
  // Plain-three replica of ProceduralAmy (no React). Renders a single 3/4-view
  // frame on a transparent background. Colours mirror amy-3d-stage.tsx.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:transparent}
    #c{display:block}
  </style></head><body>
  <canvas id="c"></canvas>
  <script type="module">
    import * as THREE from './three.module.js';
    const COLORS = { face:'#F6B97A', cap:'#9B6FD4', capShine:'#C4A0FF', eye:'#1A1530', cheek:'#FFB4C8', mouth:'#6E2E2E' };
    const size = Number(new URLSearchParams(location.search).get('size') || 512);
    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, preserveDrawingBuffer:true });
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.05, 5.0);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1); dir.position.set(2,3,4); scene.add(dir);
    const p1 = new THREE.PointLight(0x8B5CF6, 1.4, 12); p1.position.set(-3,1,2); scene.add(p1);
    const p2 = new THREE.PointLight(0xEC4899, 0.8, 12); p2.position.set(3,-1,1); scene.add(p2);

    const std = (hex, o={}) => new THREE.MeshStandardMaterial({ color:new THREE.Color(hex), roughness:o.roughness ?? 0.6, metalness:o.metalness ?? 0.04, transparent:o.transparent ?? false, opacity:o.opacity ?? 1, emissive:o.emissive ? new THREE.Color(o.emissive):new THREE.Color(0,0,0), emissiveIntensity:o.emissiveIntensity ?? 0 });

    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(1,48,48), std(COLORS.face,{roughness:0.62}));
    g.add(head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.05,48,32,0,Math.PI*2,0,Math.PI*0.42), std(COLORS.cap,{roughness:0.45,metalness:0.1}));
    cap.position.y = 0.05; g.add(cap);
    const shine = new THREE.Mesh(new THREE.TorusGeometry(0.5,0.022,12,48,Math.PI), std(COLORS.capShine,{roughness:0.4,emissive:COLORS.capShine,emissiveIntensity:0.35}));
    shine.position.y = 0.66; shine.rotation.x = Math.PI*0.1; g.add(shine);
    const cheekGeo = new THREE.SphereGeometry(0.16,24,24);
    const cheekL = new THREE.Mesh(cheekGeo, std(COLORS.cheek,{transparent:true,opacity:0.6,roughness:0.8})); cheekL.position.set(-0.58,-0.12,0.66); g.add(cheekL);
    const cheekR = cheekL.clone(); cheekR.position.x = 0.58; g.add(cheekR);
    const eyeGeo = new THREE.SphereGeometry(0.14,28,28);
    const eyeL = new THREE.Mesh(eyeGeo, std(COLORS.eye,{roughness:0.3})); eyeL.position.set(-0.32,0.12,0.86); g.add(eyeL);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.32; g.add(eyeR);
    const sparkGeo = new THREE.SphereGeometry(0.035,12,12);
    const sparkMat = std('#ffffff',{emissive:'#ffffff',emissiveIntensity:0.6});
    const sL = new THREE.Mesh(sparkGeo, sparkMat); sL.position.set(-0.27,0.18,0.99); g.add(sL);
    const sR = new THREE.Mesh(sparkGeo, sparkMat); sR.position.set(0.37,0.18,0.99); g.add(sR);
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.2,24,24), std(COLORS.mouth,{roughness:0.5}));
    mouth.position.set(0,-0.34,0.9); mouth.scale.set(0.42,0.42,0.42); g.add(mouth);

    // Friendly 3/4 view.
    g.rotation.y = -0.22;
    g.rotation.x = 0.02;
    scene.add(g);

    renderer.render(scene, camera);
    window.__amyReady = true;
  </script></body></html>`;
}

async function main() {
  const tmp = path.join(os.tmpdir(), `amy-bake-${Date.now()}`);
  await mkdir(tmp, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  if (!existsSync(THREE_ESM)) {
    throw new Error(`three.module.js not found at ${THREE_ESM} — run pnpm install first.`);
  }
  // three.module.js re-exports from sibling files (three.core.js, three.tsl.js),
  // so copy the whole build dir to satisfy the relative ESM imports.
  const buildDir = path.join(tmp, "build");
  await cp(THREE_BUILD_DIR, buildDir, { recursive: true });
  await writeFile(path.join(buildDir, "bake.html"), bakeHtml(), "utf8");

  const { server, port } = await startStaticServer(buildDir);
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();
  try {
    const targets = [
      { size: 256, out: "amy-idle.png" },
      { size: 512, out: "amy-idle@2x.png" },
    ];
    for (const { size, out } of targets) {
      const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
      page.on("console", (m) => { if (m.type() === "error") console.error("[amy-bake:page]", m.text()); });
      page.on("pageerror", (e) => console.error("[amy-bake:pageerror]", e.message));
      await page.goto(`${baseUrl}/bake.html?size=${size}`);
      await page.waitForFunction(() => window.__amyReady === true, { timeout: 15000 });
      const canvas = page.locator("#c");
      const buf = await canvas.screenshot({ omitBackground: true });
      await writeFile(path.join(OUT_DIR, out), buf);
      console.log(`[amy-bake] wrote ${out} (${size}x${size})`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
    await rm(tmp, { recursive: true, force: true });
  }
  console.log("[amy-bake] done");
}

main().catch((err) => {
  console.error("[amy-bake] failed:", err?.message ?? err);
  process.exit(1);
});
