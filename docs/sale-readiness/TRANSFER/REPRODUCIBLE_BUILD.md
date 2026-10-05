# REPRODUCIBLE BUILD

**Date:** 24 September 2026  
A clean buyer-machine compile was **not** executed this pass. Status is from repository scripts and prior AGENTS notes.

| Tooling | Evidence |
|---------|----------|
| Node | `engines.node` `>=22.12.0 <23.0.0`; `.nvmrc` = `22` |
| Package manager | `packageManager`: `pnpm@9.15.0` |
| Lockfile | `pnpm-lock.yaml` present |
| Install | `pnpm install` (frozen in CI) |
| Dev API | `pnpm run dev:api` — port 5000; needs `DATABASE_URL` |
| Dev web | `pnpm run dev:web` — Vite; `VITE_USE_LOCAL_API=1` |
| Typecheck libs | `pnpm run typecheck:libs` |
| Full typecheck | `pnpm run typecheck` — historically includes scripts debt |
| Web tests | `pnpm --filter @workspace/kidschedule test` |
| API tests | `pnpm --filter @workspace/api-server test` |
| DB schema push (dev) | `pnpm db:push` against **local** Postgres |
| DB migrate | `pnpm db:migrate` |
| ORM | Drizzle (`lib/db/`) — not Prisma |

Required external services for a **useful** local run: local PostgreSQL (documented default `amynest_dev`). Redis optional in dev (in-memory fallback). Firebase vars needed for auth UI, not for API boot. OpenAI not required for API boot if AI unused.

---

## LOCAL BUILD

**COMMANDS DOCUMENTED — CLEAN BUYER BUILD NOT VERIFIED THIS PASS.**

Missing for a full product loop: buyer-owned `DATABASE_URL`, optional Redis, Firebase client vars for login.

Not **BLOCKED** for `pnpm install` + documented scripts **if** Node 22 + pnpm 9 + local Postgres exist.

---

## WEB BUILD

Command: `pnpm run build:web` (also runs `check:static-audio`).

**COMMANDS DOCUMENTED — CLEAN BUYER BUILD NOT VERIFIED THIS PASS.**

Production SPA additionally needs Vite Firebase/GA4 **names** at build time (`deploy-production.yml`). Without those secrets the bundle may build but auth/analytics will be empty. Treat production-equivalent web as **BLOCKED** on missing Vite secrets.

---

## ANDROID BUILD

Shipped tree: `android/` (not Capacitor Android).

Documented: `./gradlew assembleRelease` (README: unsigned test) · `./gradlew bundleRelease` (signed AAB).

**Unsigned compile:** depends on Android SDK / JDK — **NOT VERIFIED** this pass.  
**Signed AAB:** **BLOCKED** — upload keystore **NOT ESCROWED**.

CI does not sign Android.

---

## iOS BUILD

Tree: `artifacts/amynest-capacitor/ios/`. Needs macOS, Xcode, CocoaPods, `npx cap sync ios`, then archive.

**Unsigned / simulator:** **NOT VERIFIED** this pass.  
**Signed IPA / App Store:** **BLOCKED** — certificates/profiles **NOT ESCROWED**. No CI signing.

---

## BACKEND BUILD

Commands: `pnpm run build:api` · `pnpm run start:api` · worker `pnpm run dev:worker` / Hetzner image.

**COMMANDS DOCUMENTED — CLEAN BUYER BUILD NOT VERIFIED THIS PASS.**

Production process **BLOCKED** without `DATABASE_URL` (boot-fatal) and, in prod, `REDIS_URL` + `WORKER_ENABLED=true`.

Worker image: `docker/worker` + `scripts/hetzner/deploy-worker-remote.sh` (needs SSH — **BLOCKED** without `HETZNER_*`).
