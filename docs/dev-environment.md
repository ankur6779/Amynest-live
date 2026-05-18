# AmyNest development & preview environments

This monorepo supports **DEV** and **PROD** profiles via `AMYNEST_ENV` and matching `.env.development` / `.env.production` files at the **repo root**.

| Profile | Backend (Render) | Web preview (Render) | Local API |
|--------|-------------------|----------------------|-----------|
| **PROD** | `https://amynest-backend.onrender.com` | `Amynest-live-1` | — |
| **DEV** | `https://amynest-dev.onrender.com` | `amynest-frontend-dev` | `http://localhost:5000` |

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

### Expo mobile

```bash
pnpm run dev:mobile
```

Copy Firebase keys into `artifacts/amynest-mobile/.env` or set `EXPO_PUBLIC_*` in repo-root `.env.development` (Expo loads project `.env*`; symlink or duplicate keys as needed).

To hit **production** API from Expo:

```bash
pnpm --filter @workspace/amynest-mobile run dev:prod-api
```

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

## 4. Deploy preview on Render

### Option A — Blueprint (`render.yaml`)

1. In Render: **New → Blueprint** → connect repo.
2. Apply `render.yaml` (creates `amynest-dev`, `amynest-frontend-dev`, `amynest-db-dev`).
3. For each new service, set **Environment** (sync: false in blueprint):
   - `GOOGLE_API_KEY` (dev key)
   - `ELEVENLABS_API_KEY` (dev key)
4. Deploy. URLs:
   - API: `https://amynest-dev.onrender.com`
   - Web: `https://amynest-frontend-dev.onrender.com`

### Option B — Manual duplicate

1. Duplicate **Amynest-backend** → rename **amynest-dev**.
2. Set `AMYNEST_ENV=development`, `API_PUBLIC_URL=https://amynest-dev.onrender.com`.
3. Attach **amynest-db-dev** (or a separate Postgres instance) as `DATABASE_URL`.
4. Duplicate static site → **amynest-frontend-dev** with:
   - `VITE_AMYNEST_ENV=development`
   - `VITE_APP_API_ORIGIN=https://amynest-dev.onrender.com`
   - Build: `pnpm --filter @workspace/kidschedule run build:dev`

### Smoke test after deploy

```bash
curl https://amynest-dev.onrender.com/api/healthz/env
# Expect: "profile":"DEV","amynestEnv":"development"
```

---

## 5. Production deploy (unchanged)

- **Amynest-backend** — `AMYNEST_ENV=production`, prod `DATABASE_URL`
- **Amynest-live-1** — `VITE_APP_API_ORIGIN=https://amynest-backend.onrender.com`

---

## 6. Scripts reference

| Command | Description |
|---------|-------------|
| `pnpm run dev` | API with hot reload (DEV) |
| `pnpm run dev:api` | Same as `dev` |
| `pnpm run dev:web` | Vite dev server (DEV) |
| `pnpm run dev:mobile` | Expo (DEV API defaults) |
| `pnpm run build:api` | Build API for production start |
| `pnpm run start:api` | Run built API (`AMYNEST_ENV` defaults to production) |
| `pnpm run build:web` | Production web build |
