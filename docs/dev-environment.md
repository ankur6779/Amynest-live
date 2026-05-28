# AmyNest development & preview environments

This monorepo supports **DEV** and **PROD** profiles via `AMYNEST_ENV` and matching `.env.development` / `.env.production` files at the **repo root**.

| Profile | Backend | Web | Notes |
|--------|---------|-----|--------|
| **PROD** | `https://amynest-backend-dykj.onrender.com` | `Amynest-live-1` (Render) | Managed by `render.yaml` Blueprint |
| **DEV** | `http://localhost:5000` | `pnpm run dev:web` (Vite) | **Not** in Blueprint — local only by default |

Confirm which profile is running:

- API logs: `[AmyNest] Running in DEV mode` or `PROD`
- API health: `GET /api/healthz/env` → `profile`, `amynestEnv`
- Web devtools console: `[AmyNest] Web DEV — API …`
- Expo Metro: `[AmyNest AI] DEV — API …`

---

## 1. One-time setup

```bash
cd /path/to/AmyNest-AI
cp .env.development.example .env.development
cp .env.production.example .env.production
# Edit both files with your dev DB URL and API keys.
pnpm install
```

Add real values for at least:

- `DATABASE_URL` (dev database)
- `GOOGLE_API_KEY`, `ELEVENLABS_API_KEY`
- Firebase `VITE_*` / `EXPO_PUBLIC_*` vars

**Never commit** `.env`, `.env.development`, or `.env.production` with secrets.

---

## 2. Run locally

### API (Node)

```bash
pnpm run dev
# or
pnpm run dev:api
```

- Loads `.env.development` automatically
- Default port **5000**
- Hot reload via `tsx watch`

Verify:

```bash
curl http://localhost:5000/api/healthz
curl http://localhost:5000/api/healthz/env
```

### Web (Vite / kidschedule)

```bash
pnpm run dev:web
```

Uses repo-root `.env.development`. With `VITE_USE_LOCAL_API=1`, the app calls `http://localhost:5000`.

**Stale Vite / Tailwind cache (splash then crash):** `predev` / `prebuild` and root `postinstall` run `scripts/clean-vite-cache.mjs`. Manual: `pnpm clean:vite` or `pnpm clean:web`. Nuclear: `pnpm reset` (reinstall) or `pnpm reset:hard` (wipe `node_modules` + reinstall). Dev also full-reloads on `vite:beforeUpdate`; production auto-reloads once on chunk load failure.

**Splash then blank screen** with `Cannot find module .../vite/dist/node/chunks/dist.js` or `@tailwindcss/node` in the console → stale `node_modules/.vite` after `pnpm install` — not the API or Capacitor shell.

### Capacitor mobile (iOS / Android)

The Expo app is archived at `archive/amynest-mobile-expo/`. Mobile ships as Capacitor wrapping kidschedule:

```bash
pnpm run dev:web          # develop UI
# then sync/build — see artifacts/amynest-capacitor/SETUP.md
```

`pnpm run dev:mobile` prints a reminder and exits (Expo removed).

---

## 3. Switch DEV ↔ PROD

| Layer | DEV | PROD |
|-------|-----|------|
| API | `AMYNEST_ENV=development` + `.env.development` | `AMYNEST_ENV=production` + Render prod secrets |
| Web | `pnpm run dev:web` or `build:dev` | `pnpm run build:web` (production mode) |
| Override API URL | `VITE_APP_API_ORIGIN=…` | same |
| Mobile | `EXPO_PUBLIC_AMYNEST_ENV=development` | `production` + `EXPO_PUBLIC_API_ORIGIN` |

`AMYNEST_ENV` wins over `NODE_ENV` for labeling (Render sets `NODE_ENV=production` even on staging).

---

## 4. Hosted DEV preview (optional, manual only)

`render.yaml` is **production-only**. Blueprint sync will **not** create `amynest-dev`, `amynest-frontend-dev`, or `amynest-db-dev`.

If you need a hosted staging stack:

1. In Render Dashboard: **New → Web Service** (do **not** use Blueprint for DEV).
2. Duplicate **Amynest-backend** settings; set `AMYNEST_ENV=development` and a dev `DATABASE_URL` on a separate Postgres instance.
3. Optionally duplicate **Amynest-live-1** as a static site with `build:dev` and `VITE_AMYNEST_ENV=development`.
4. Point `VITE_APP_API_ORIGIN` / `API_PUBLIC_URL` at your new API URL.

Default workflow: use **local** API + Vite (`pnpm run dev`, `pnpm run dev:web`).

---

## 5. Production deploy (unchanged)

- **Amynest-backend** — `AMYNEST_ENV=production`, prod `DATABASE_URL`
- **Amynest-live-1** — `VITE_APP_API_ORIGIN=https://amynest-backend-dykj.onrender.com`

**Auto-deploy:** `render.yaml` sets `autoDeployTrigger: commit` on all prod services. After changing deploy settings, run **Blueprint → Sync** in the [Render Dashboard](https://dashboard.render.com) once if pushes still do not deploy.

Optional backup: add `RENDER_API_KEY` to GitHub Actions secrets — `.github/workflows/deploy-render.yml` triggers deploys on every `main` push.

---

## 6. Sync local `main` with GitHub (diverged branches)

If `git pull` fails with *"have diverged"* after cloud agent merges, reset local `main` to match GitHub (creates a backup branch first):

```bash
cd ~/path/to/AmyNest-AI
pnpm run sync:main
```

Or manually:

```bash
git fetch origin main
git branch backup/local-main-$(date +%Y%m%d-%H%M%S) main
git reset --hard origin/main
pnpm install
```

Latest tutor routes after sync: `/learn-with-amy`, `/amy-ai-tutor`, Parent Hub tiles.

---

## 7. Scripts reference

| Command | Description |
|---------|-------------|
| `pnpm run dev` | API with hot reload (DEV) |
| `pnpm run dev:api` | Same as `dev` |
| `pnpm run dev:web` | Vite dev server (DEV) |
| `pnpm run dev:mobile` | Expo (DEV API defaults) |
| `pnpm run build:api` | Build API for production start |
| `pnpm run start:api` | Run built API (`AMYNEST_ENV` defaults to production) |
| `pnpm run build:web` | Production web build |
| `pnpm run sync:main` | Reset local `main` to `origin/main` (backup branch created) |
