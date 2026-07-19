# AmyNest — Render Retirement Plan

**Document:** `render-retirement-plan.md`  
**Role:** Release Director — Read-only dependency audit  
**Date:** 2026-07-15  
**Audit type:** Inspection only — no deployments, restarts, or configuration changes made

---

## Determination: Is Render Still Required?

**For normal production operation today: YES — partially.**

| Render role | Required for live traffic? | Evidence |
|-------------|:--------------------------:|----------|
| **Static SPA (`Amynest-live-1-dykj`)** | **YES** | All `www.amynest.in` page loads return `rndr-id` header; identical bundle hash to Render origin |
| **API hot standby (`Amynest-backend-dykj`)** | **NO** (failover only) | `CANARY_PERCENT=100`; all API probes return `x-amynest-backend: coolify` |
| **PostgreSQL (`amynest-db-dykj`)** | **NO** | Frozen at `2026-07-12T08:44 UTC`; Coolify is sole writer (681 MB live) |
| **Redis (`amynest-redis-dykj`)** | **NO** | Queue drained; BullMQ runs on Coolify Redis |
| **AI worker (`amynest-ai-worker-dykj`)** | **NO** | Suspended; Hetzner `amynest-worker` is sole consumer |

**Bottom line:** Render is **required only for static SPA hosting** and **retained optionally** for API instant-failover. Everything else on Render is legacy cost, not production dependency.

---

## 1. Static SPA Audit

### 1.1 Build process

| Item | Value | Evidence |
|------|-------|----------|
| Build script | `bash scripts/render-frontend-build.sh` | `render.yaml` line 222 |
| Output path | `./artifacts/kidschedule/dist/public` | `render.yaml` line 223 |
| Package manager | pnpm 9.15.0, frozen lockfile | `scripts/render-frontend-build.sh` |
| Build command | `BASE_PATH=/ PORT=3000 pnpm --filter @workspace/kidschedule build` | `scripts/render-frontend-build.sh` |
| Post-build | `pnpm --filter @workspace/kidschedule validate:seo` | `scripts/render-frontend-build.sh` |
| Vite config | `artifacts/kidschedule/vite.config.ts` | Hashed assets under `/assets/` |
| Deploy version | `RENDER_GIT_COMMIT` or `GITHUB_SHA` injected into `index.html` meta tags | `vite.config.ts` `resolveDeployVersion()` |
| Service worker generation | Build-time from `public/sw.source.js` → `public/sw.js` + FCM block | `amynestServiceWorkerPlugin()` in `vite.config.ts` |
| Last production deploy | **2026-07-15T03:37 UTC** | `last-modified` header on `www.amynest.in` and `amynest-live-1-dykj.onrender.com` |

**Render-specific build coupling:** `RENDER_GIT_COMMIT` env var for deploy version (Render injects this). Cloudflare Pages provides `CF_PAGES_COMMIT_SHA` — one-line substitution needed at migration.

### 1.2 Environment variables (build-time, baked into bundle)

From `render.yaml` (`Amynest-live-1`) and `.env.production.example`:

| Variable | Render dashboard | Production value (documented) | Runtime impact |
|----------|:----------------:|------------------------------|----------------|
| `NODE_VERSION` | `20` | Fixed in blueprint | Build only |
| `VITE_AMYNEST_ENV` | `production` | Fixed in blueprint | Profile selection |
| `VITE_APP_API_ORIGIN` | Dashboard (`sync: false`) | **`https://www.amynest.in`** per `.env.production.example` | API base URL when set |
| `VITE_FIREBASE_API_KEY` | Dashboard | Secret | Auth, FCM SW |
| `VITE_FIREBASE_AUTH_DOMAIN` | Dashboard | Secret | Auth |
| `VITE_FIREBASE_PROJECT_ID` | Dashboard | Secret | Auth, FCM SW |
| `VITE_FIREBASE_APP_ID` | Dashboard | Secret | Auth, FCM SW |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Dashboard | Secret | FCM SW |
| `VITE_FIREBASE_VAPID_KEY` | Dashboard | Secret | Web push |
| `VITE_GA4_MEASUREMENT_ID` | Dashboard | Secret | Analytics |
| `VITE_FF_ONBOARDING_STRICT_COMPLETE_GATE` | `1` | Fixed | Feature flag |
| `VITE_FF_ONBOARDING_SHORT_CHILD_BRANCH` | `1` | Fixed | Feature flag |
| `VITE_FF_FIRST_VALUE_ACTIVATION` | `1` | Fixed | Feature flag |

**Critical finding:** On `www.amynest.in`, the SPA does **not** call Render for API even when `VITE_APP_API_ORIGIN` is unset — `resolveProductionSameOriginApi()` overrides to `window.location.origin` (same-origin `/api/*`).

Evidence: `artifacts/kidschedule/src/lib/api.ts` + `api-origin.test.ts` — production `www.amynest.in` resolves to `https://www.amynest.in`, not `onrender.com`.

Fallback default in `config.ts` still references `https://amynest-backend-dykj.onrender.com` — used only for non-amynest.in hosts (e.g. direct Render static URL, Capacitor dev).

### 1.3 API URL resolution (production paths)

| Client | API origin | Render dependency? |
|--------|------------|:------------------:|
| `www.amynest.in` browser | `https://www.amynest.in` (same-origin) | **NO** |
| `amynest.in` apex → www redirect | `https://www.amynest.in` | **NO** |
| Android WebView (`AmyNestAndroid/1.0`) | Loads `https://www.amynest.in` | **NO** |
| Capacitor iOS (production) | `https://www.amynest.in` via `resolveProductionWorkerApiOrigin()` | **NO** |
| Direct `amynest-live-1-dykj.onrender.com` | Falls back to Render API default | **YES** (edge case) |
| Cloudflare Worker `/api/*` | Routes 100% to Coolify (`CANARY_PERCENT=100`) | **NO** |

### 1.4 Assets

| Asset class | Host | `rndr-id` present? | Cache-Control |
|-------------|------|:------------------:|---------------|
| `index.html` | Render via CF | **YES** | `public, max-age=0, s-maxage=300` |
| `/assets/*.js` (hashed) | Render via CF | **YES** | `public, max-age=31536000, immutable` |
| `/sw.js` | Render via CF | **YES** | `no-cache, no-store, must-revalidate` |
| `/manifest.json` | Render via CF | **YES** | `public, max-age=0, s-maxage=300` |
| `/pwa-icon-192.png` | Render via CF | **YES** | (image/png) |
| `/opengraph.jpg` | Render via CF | **YES** | `public, max-age=14400, s-maxage=300` |
| `/infant-sleep-audio/*` | Render via CF (Vite `public/`) | **YES** | Bundled static MP3s |
| Google Fonts | `fonts.googleapis.com` / `fonts.gstatic.com` | N/A | External CDN |
| API media (`/api/*`) | Coolify via CF Worker | N/A | Worker edge cache for immutable audio |

**Bundle identity:** `assets/index-BeJfahIn.js` — identical on `www.amynest.in` and `amynest-live-1-dykj.onrender.com` (live probe 2026-07-15).

**SPA routing:** `artifacts/kidschedule/public/_redirects` defines Netlify/Render-style rewrites:

```
/*    /index.html   200
```

Plus debug-route 302 redirects matching `render.yaml` routes block.

### 1.5 Cache behavior

| Layer | Behavior | Evidence |
|-------|----------|----------|
| Render static headers | `index.html` + `sw.js` = no-cache; `/assets/*` = 1 year immutable | `render.yaml` headers block |
| Cloudflare edge | `cf-cache-status: DYNAMIC` for HTML; `MISS`/`BYPASS` for SW; assets cacheable | Live `curl -I` probes |
| Service worker | Cache-first for immutable `/api/static-audio/*` etc.; **never** caches `index.html` navigation | `public/sw.js` lines 7–9, 114–120 |
| SW cache buckets | `amynest-v16` shell; `amynest-audio-v5` audio | `vite.config.ts` `CACHE_VERSION`, `AUDIO_CACHE_VERSION` |

### 1.6 Service worker

| Property | Value |
|----------|-------|
| Registration path | `/sw.js` (generated at build) |
| FCM background | `firebase-messaging-sw.js` (build-injected `importScripts`) |
| Host dependency | **Origin-bound** — works on any static host serving same paths |
| Render coupling | **None** — SW fetches `/api/*` on same origin (CF Worker → Coolify) |

**Migration note:** SW + FCM require `www.amynest.in` (or migrated host) to serve `/sw.js` and `/firebase-messaging-sw.js` with `no-cache` headers. Cloudflare Pages `_headers` file can replicate Render header rules.

---

## 2. Full Render Dependency Matrix

### 2.1 Production traffic dependencies

| Component | Uses Render? | Active traffic? | Evidence |
|-----------|:------------:|:---------------:|----------|
| Static HTML/JS/CSS | **YES** | **YES** | `rndr-id` on all `www.amynest.in` static responses |
| Images (`/pwa-icon-*`, `/opengraph.jpg`) | **YES** | **YES** | `rndr-id` on image probes |
| Fonts | **NO** | N/A | Loaded from Google Fonts CDN (`index.html`) |
| Manifest (`/manifest.json`) | **YES** | **YES** | Served from Render; `application/json` |
| Service worker (`/sw.js`) | **YES** | **YES** | `rndr-id`; `cache-control: no-cache` |
| API (`/api/*`) | **NO** | **YES** → Coolify | `x-amynest-backend: coolify` on all probes |
| Webhooks (RevenueCat) | **NO** | **YES** → Coolify | Single URL `www.amynest.in/api/subscription/webhook` |
| Webhooks (Razorpay) | **NO** | **YES** → Coolify | Same Worker path (secret gap unrelated to Render) |
| PostgreSQL | **NO** | Coolify only | Render PG max `server_ts` frozen Jul 12 |
| Redis / BullMQ | **NO** | Coolify + Hetzner | `wait=0, failed=0` on Coolify Redis |
| Worker | **NO** | Hetzner | `amynest-worker` Up 2 days |
| Scheduler | **NO** | Coolify owner | `schedulerOwner: true` on Coolify |

### 2.2 Infrastructure / config dependencies

| Component | Uses Render? | Evidence |
|-----------|:------------:|----------|
| **DNS** (`www.amynest.in`) | **NO** (Render-independent) | A records → Cloudflare `104.21.21.231`, `172.67.200.243` |
| **Cloudflare Worker** (`amynest-api-proxy`) | **Partial** | `BACKEND_ORIGIN` still Render URL; `CANARY_PERCENT=100` bypasses it for API |
| **GitHub Actions** (`deploy-production.yml`) | **YES** | Triggers `scripts/trigger-render-deploy.sh` on every `main` push |
| **Render API key** (`RENDER_API_KEY` secret) | **YES** | Required for CI deploy job |
| **Post-deploy smoke** | **Partial** | `SMOKE_API_URL=https://amynest-backend-dykj.onrender.com` — probes Render standby |
| **Render Postgres** (archive) | **Legacy** | Still billed; frozen; used for migration scripts only |
| **Render Redis** (archive) | **Legacy** | Still exists; drained |
| **Render API** (standby) | **Optional** | Live, ~95 req/h keep-warm; 0 user API traffic post-cutover |
| **Firebase authorized domains** | **Partial** | `amynest-live-1.onrender.com` listed in `lib/phone-auth/src/site-domain.ts` |
| **iOS OTA docs** | **Doc only** | `APPSTORE-REVIEW-NOTES.md` references Render API URL |
| **CI audio gates** | **Partial** | Default `AUDIO_GATE_API_URL` → Render URL (vars override available) |
| **Migration scripts** | **Tooling** | `RENDER_DATABASE_URL` in `scripts/render-to-coolify/*` |

### 2.3 What does NOT depend on Render (verified)

- Android app (`android/`) — loads `https://www.amynest.in`; no Render references in `android/`
- Capacitor iOS production API — `https://www.amynest.in` (Worker path)
- GCS audio storage — Google Cloud (`amynest-audio-storage`)
- Firebase Auth project — `amynest-836ff` (shared, not Render-hosted)
- RevenueCat — webhooks hit `www.amynest.in` (Coolify backend)
- Coolify backend deploy — separate from Render trigger (Coolify native git deploy on `ankur6779/Amynest-live` @ `main`)

---

## 3. Cloudflare Pages vs Render Static — Comparison

| Criterion | Render Static (current) | Cloudflare Pages (proposed) | Evidence / notes |
|-----------|------------------------|----------------------------|------------------|
| **Cost** | Starter static plan (~$7+/mo) + CF proxy in front | **Free** tier (500 builds/mo, unlimited bandwidth) | Render billed per service; CF Pages on existing CF zone |
| **Performance** | Origin in Render Singapore → CF edge cache | **Native CF edge** — no third-party origin hop | Current: `rndr-id` = extra origin layer behind CF |
| **CDN** | Cloudflare proxied → Render origin | **Direct CF Pages edge** | `cf-cache-status` already CF-managed; Pages removes Render hop |
| **Deployment** | GitHub Actions → Render API deploy trigger | Git connect → auto build on push (or GH Action `pages deploy`) | Current: `trigger-render-deploy.sh` deploys static + API together |
| **Build command** | `scripts/render-frontend-build.sh` | **Same script** — portable | No Render-specific build logic except `RENDER_GIT_COMMIT` |
| **SPA fallback** | `render.yaml` rewrite `/* → /index.html` + `_redirects` | `_redirects` (already exists) or `_routes.json` | `artifacts/kidschedule/public/_redirects` ready |
| **Cache headers** | `render.yaml` headers block | `_headers` file (needs creation) | Must replicate: `index.html` no-cache, `sw.js` no-cache, `/assets/*` immutable |
| **Rollback** | Redeploy previous Render build via dashboard/API | **Instant** — CF Pages deployment history, one-click rollback | Pages retains deployment list per commit |
| **Security** | Render dashboard IP allowlist + CF WAF | CF WAF + Pages access controls; no Render surface | Reduces attack surface (one fewer provider) |
| **Cache invalidation** | Redeploy busts hashed assets; SW cache version bump | Same — hashed filenames + SW `CACHE_VERSION` bump | `vite.config.ts` already versioned |
| **Custom domain** | CF → Render origin (indirect) | **Direct** `www.amynest.in` on Pages project | DNS change: point static route to Pages, keep Worker on `/api/*` |
| **Secrets / env** | Render dashboard env vars | CF Pages env vars (same `VITE_*` set) | Export from Render dashboard before cutover |
| **Risk** | Known working state | New host — requires parallel soak | Mitigated by preview URL soak before DNS switch |

**Verdict:** Cloudflare Pages can **completely replace Render Static Hosting** for this SPA. Build output, routing rules, and API decoupling are already compatible.

---

## 4. Exact Migration Plan (NO deployment — plan only)

### Phase 0 — Pre-migration inventory (read-only, 1 day)

| Step | Action | Owner |
|------|--------|-------|
| 0.1 | Export all `Amynest-live-1-dykj` env vars from Render dashboard | DevOps |
| 0.2 | Document current Cloudflare DNS records for `www.amynest.in` (origin target) | DevOps |
| 0.3 | Confirm CF Worker route `www.amynest.in/api/*` is independent of static origin | DevOps |
| 0.4 | Snapshot current static bundle hash (`assets/index-*.js`) for parity checks | Release |

**Gate:** Inventory complete; no secrets committed to repo.

---

### Phase 1 — Cloudflare Pages parallel deploy (no traffic cutover, 2–3 days)

| Step | Action | Detail |
|------|--------|--------|
| 1.1 | Create CF Pages project `amynest-web` | Connect `ankur6779/Amynest-live` repo, branch `main` |
| 1.2 | Set build command | `bash scripts/render-frontend-build.sh` |
| 1.3 | Set build output directory | `artifacts/kidschedule/dist/public` |
| 1.4 | Set root directory | `/` (monorepo root) |
| 1.5 | Configure build env vars | Copy all `VITE_*` from Render static service |
| 1.6 | Add `CF_PAGES_COMMIT_SHA` handling | Update `vite.config.ts` `resolveDeployVersion()` to accept `CF_PAGES_COMMIT_SHA` alongside `RENDER_GIT_COMMIT` |
| 1.7 | Create `artifacts/kidschedule/public/_headers` | Replicate Render cache rules: |
| | | `/index.html` → `Cache-Control: no-cache, no-store, must-revalidate` |
| | | `/sw.js` → `Cache-Control: no-cache, no-store, must-revalidate` |
| | | `/assets/*` → `Cache-Control: public, max-age=31536000, immutable` |
| 1.8 | Verify `_redirects` deployed | Already at `artifacts/kidschedule/public/_redirects` |
| 1.9 | Deploy to Pages preview URL | e.g. `amynest-web.pages.dev` |
| 1.10 | Soak preview (24 h) | Health: `/health`, `/manifest.json`, `/sw.js`, `/assets/*`, SPA routes |

**Gate:** Preview URL passes smoke: HTTP 200 on all routes; `getAppApiBaseOrigin()` resolves same-origin on `*.pages.dev` only if env set — use `VITE_APP_API_ORIGIN=https://www.amynest.in` for preview API tests OR test static-only paths.

---

### Phase 2 — Static traffic cutover (production, 1 hour window)

| Step | Action | Detail |
|------|--------|--------|
| 2.1 | Add custom domain `www.amynest.in` to Pages project | CF auto-manages DNS if zone owned |
| 2.2 | **Critical:** Ensure Worker route `www.amynest.in/api/*` takes precedence over Pages | CF route order: Worker `/api/*` before Pages `/*` |
| 2.3 | Remove or repoint Render origin DNS/CNAME | Stop routing static traffic to `amynest-live-1-dykj.onrender.com` |
| 2.4 | Verify production | |
| | | `curl -I https://www.amynest.in/` → **no** `rndr-id` header |
| | | `curl -I https://www.amynest.in/assets/index-*.js` → immutable cache |
| | | `curl -I https://www.amynest.in/api/healthz` → `x-amynest-backend: coolify` |
| | | Android WebView smoke: app loads, auth works |
| | | iOS Capacitor smoke: API via `www.amynest.in` |
| 2.5 | Monitor 48 h | Hetzner production monitor + manual spot checks |

**Gate:** 48 h soak with 0 static-serving regressions; `rndr-id` absent from all `www.amynest.in` responses.

---

### Phase 3 — CI/CD decoupling (1–2 days)

| Step | Action | Detail |
|------|--------|--------|
| 3.1 | Split `scripts/trigger-render-deploy.sh` | Remove `srv-d85k80jtqb8s7382m7i0` (static) from deploy list |
| 3.2 | Update `.github/workflows/deploy-production.yml` | Remove or gate `deploy-render` static trigger |
| 3.3 | Add Pages deploy | CF Pages git integration (auto) OR `cloudflare/pages-action` in GH Actions |
| 3.4 | Update `scripts/post-deploy-smoke.sh` | Change `SMOKE_API_URL` to `https://www.amynest.in` (Coolify path) instead of Render direct |
| 3.5 | Update `docs/dev-environment.md` | Reflect Pages as production web host |

**Gate:** `main` push deploys static to Pages only; Render static no longer receives deploy triggers.

---

### Phase 4 — Render API standby decision (ops choice, 1 day)

| Option | Action | When |
|--------|--------|------|
| **A — Keep standby (recommended short-term)** | Leave `BACKEND_ORIGIN` as Render URL; `CANARY_PERCENT=100` | Until 30-day Pages soak complete |
| **B — Remove standby** | Set `BACKEND_ORIGIN` = Coolify URL; redeploy Worker | Only after failover drill proves Coolify-only recovery |

| Step | Action |
|------|--------|
| 4.1 | Run manual failover drill: `CANARY_PERCENT=0` → verify Render still carries API |
| 4.2 | Run reverse drill: `CANARY_PERCENT=100` → verify Coolify recovery |
| 4.3 | Document decision in runbook |

**Gate:** Failover drill documented; no unplanned dependency on Render API for normal ops.

---

### Phase 5 — Render service decommission (ordered, 1 week)

| Order | Service | ID | Precondition | Action |
|------:|---------|-----|--------------|--------|
| 1 | `amynest-ai-worker-dykj` | `srv-d98vh077f7vs739h85mg` | Already suspended | Delete |
| 2 | `amynest-redis-dykj` | `red-d85k80btqb8s7382m7gg` | Coolify Redis verified 30+ days | Export snapshot → delete |
| 3 | `amynest-db-dykj` | `dpg-d85k80jtqb8s7382m7lg-a` | Final `pg_dump` to cold storage | Delete after 30-day retention |
| 4 | `Amynest-live-1-dykj` | `srv-d85k80jtqb8s7382m7i0` | Pages serving 100% traffic 7+ days | Delete |
| 5 | `Amynest-backend-dykj` | `srv-d85k8jbtqb8s7382mjng` | Standby drill complete; Worker `BACKEND_ORIGIN` updated or failover accepted | Scale to 0 → delete |
| 6 | `render.yaml` Blueprint | — | All services deleted | Archive or remove static/API entries |
| 7 | `RENDER_API_KEY` GitHub secret | — | No Render deploys | Remove from GH secrets |

**Gate:** Zero production probes reference Render; monthly Render bill → $0.

---

## 5. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R-1 | CF Worker `/api/*` route conflicts with Pages `/*` | Medium | API or static breakage | Configure route precedence before cutover; test in staging |
| R-2 | `index.html` cached at edge after cutover | Medium | Users stuck on old bundle | `_headers` no-cache on `/index.html` and `/sw.js`; verify with `cf-cache-status` |
| R-3 | Service worker scope/cache stale after host change | Low | Audio/shell stale | `CACHE_VERSION` bump in `vite.config.ts` on migration deploy |
| R-4 | Firebase auth domain missing for Pages preview | Low | Auth fails on preview only | Production uses `www.amynest.in` — unchanged |
| R-5 | FCM `firebase-messaging-sw.js` not served with correct headers | Medium | Push broken | Replicate `no-cache` header; verify FCM registration post-cutover |
| R-6 | `favicon.ico` SPA rewrite returns HTML today | Low | Minor UX | Add explicit `favicon.ico` to `public/` or fix rewrite rules |
| R-7 | Removing Render API standby before soak | High | No instant failover | Keep `BACKEND_ORIGIN` until Phase 4 decision |
| R-8 | Lost Render env vars during Pages migration | Medium | Build fails or wrong flags | Export Render dashboard vars in Phase 0 |
| R-9 | GitHub Actions still triggers Render deploy | Low | Accidental Render redeploy | Phase 3 CI split |
| R-10 | Render Postgres deleted without final backup | High | Data loss | Mandatory `pg_dump` before Phase 5 step 3 |

---

## 6. Rollback

### Phase 2 rollback (static cutover) — **< 5 minutes**

1. Revert DNS/origin for `www.amynest.in` static route to `amynest-live-1-dykj.onrender.com`
2. Confirm `rndr-id` header returns on `www.amynest.in`
3. CF Worker `/api/*` unchanged — API stays on Coolify
4. No database or queue changes required

### Phase 4 rollback (API standby)

1. `wrangler deploy` with `CANARY_PERCENT=0` → instant traffic to Render API
2. Or restore `BACKEND_ORIGIN` to Render URL

### Phase 5 rollback (decommission)

**Not reversible** after Postgres/Redis deletion — maintain backups 30+ days before destructive steps.

---

## 7. Everything Still Using Render (Summary)

### Active production dependencies

| # | Item | Service | Traffic |
|---|------|---------|---------|
| 1 | **Static SPA** | `Amynest-live-1-dykj` | **100% of `www.amynest.in` HTML/JS/CSS/images/SW** |

### Operational / failover dependencies

| # | Item | Service | Purpose |
|---|------|---------|---------|
| 2 | API hot standby | `Amynest-backend-dykj` | CF Worker `BACKEND_ORIGIN` fallback |
| 3 | CI deploy pipeline | GitHub Actions + `RENDER_API_KEY` | Triggers Render deploy on `main` push |
| 4 | Post-deploy smoke | `post-deploy-smoke.sh` | Probes Render API health |
| 5 | Production monitor | Hetzner monitor | Probes Render standby health |

### Legacy / non-production (billable, decommission candidates)

| # | Item | Service | Status |
|---|------|---------|--------|
| 6 | Archive database | `amynest-db-dykj` | Frozen Jul 12; 611 MB |
| 7 | Archive Redis | `amynest-redis-dykj` | Drained |
| 8 | AI worker | `amynest-ai-worker-dykj` | Suspended |

### Code / config references (non-runtime for `www.amynest.in`)

| # | Item | Location |
|---|------|----------|
| 9 | API origin fallback default | `artifacts/kidschedule/src/config.ts` |
| 10 | Firebase authorized domain | `lib/phone-auth/src/site-domain.ts` |
| 11 | CF Worker fallback origin | `infra/cloudflare/amynest-api-proxy/wrangler.toml` |
| 12 | CI default API URLs | `.github/workflows/audio-gates.yml` |
| 13 | Migration tooling | `scripts/render-to-coolify/*` |
| 14 | Documentation | `docs/dev-environment.md`, `.env.production.example` |

---

## 8. What Must Be Migrated

| Priority | Component | Migrate to | Blocking Render retirement? |
|----------|-----------|------------|:---------------------------:|
| **P0** | Static SPA hosting | **Cloudflare Pages** | **YES** |
| **P1** | GitHub Actions deploy | Pages auto-deploy or `pages-action` | **YES** (stops Render static deploys) |
| **P1** | Cache header rules | Pages `_headers` file | **YES** |
| **P2** | Post-deploy smoke target | `www.amynest.in` API path | No (ops hygiene) |
| **P2** | `vite.config.ts` deploy SHA | `CF_PAGES_COMMIT_SHA` support | No (build parity) |
| **P3** | API standby (`BACKEND_ORIGIN`) | Coolify URL or remove | No (optional failover) |
| **P3** | Render Postgres/Redis | Cold backup → delete | No (cost only) |
| **P4** | Code/doc cleanup | Remove Render URL references | No |

---

## 9. Migration Order (Recommended)

```
Phase 0: Inventory (env vars, DNS, bundle hash)
    ↓
Phase 1: CF Pages parallel deploy + 24h preview soak
    ↓
Phase 2: Static DNS cutover (www.amynest.in → Pages) + 48h production soak
    ↓
Phase 3: CI/CD split (stop Render static deploys)
    ↓
Phase 4: API standby decision (keep or remove BACKEND_ORIGIN)
    ↓
Phase 5: Decommission Render services (worker → redis → postgres → static → API)
```

**Estimated calendar time:** 2–3 weeks (including soaks)  
**Estimated engineering effort:** 2–4 days active work  
**Zero-downtime target:** Phase 2 achievable with DNS/route switch (API unchanged)

---

## 10. Final Recommendation

### Is Render still required?

| Question | Answer |
|----------|--------|
| For production API, database, queue, worker, scheduler? | **NO** — Coolify + Hetzner certified |
| For production static SPA? | **YES** — sole host today |
| For instant API failover? | **Optional** — configured but unused at `CANARY_PERCENT=100` |
| For CI/CD? | **YES** — `main` branch deploy still triggers Render |
| Can Render be fully retired? | **YES, after static migration to Cloudflare Pages** |

### Recommended path

1. **Migrate static site to Cloudflare Pages** — highest value, lowest risk, eliminates the only hard production dependency on Render.
2. **Keep Render API hot standby 30 more days** after Pages cutover — free instant rollback path already proven during canary migration.
3. **Decommission Render Postgres/Redis/worker** after final backups — cost savings, no production impact.
4. **Remove Render API last** — after failover drill and `BACKEND_ORIGIN` decision.

### Do NOT migrate static to Coolify

Hosting the SPA on the same Coolify VPS as the API increases blast radius. Cloudflare Pages provides better edge performance, zero incremental cost, and aligns with the existing Cloudflare DNS + Worker architecture.

---

## Evidence Index

| Source | Method |
|--------|--------|
| Live static probes | `curl -I https://www.amynest.in/*` — `rndr-id` header on all static assets |
| Live API routing | `curl -H x-amynest-device-id https://www.amynest.in/api/healthz` → `x-amynest-backend: coolify` |
| Render static origin | `curl -I https://amynest-live-1-dykj.onrender.com/` — same `last-modified`, same bundle hash |
| DNS | `dig www.amynest.in` → Cloudflare IPs only |
| Build pipeline | `scripts/render-frontend-build.sh`, `render.yaml`, `vite.config.ts` |
| API resolution | `artifacts/kidschedule/src/lib/api.ts`, `api-origin.test.ts` |
| CF Worker config | `infra/cloudflare/amynest-api-proxy/wrangler.toml` |
| CI/CD | `.github/workflows/deploy-production.yml`, `scripts/trigger-render-deploy.sh` |
| 48h certification | `48-hour-production-certification.md` |
| Render services | Render API `list_services` (2026-07-15): static + API live, worker suspended |
| Render Postgres | `query_render_postgres` — max `server_ts` frozen `2026-07-12T08:44 UTC` |
| Coolify production | `48-hour-production-certification.md` — 100% API availability on Coolify |

---

**Audit completed:** 2026-07-15  
**Mode:** Read-only — no deployments, restarts, or configuration changes made.

*End of Render retirement plan.*
