# SOURCE CODE TITLE INVENTORY

**Date:** 25 September 2026  
**Not a title determination.** Classification is **code origin**, not legal ownership.  
First-party = written in this monorepo after the 8 Apr 2026 scaffold, excluding vendor trees. That is **not** proof of copyright.

No `.gitmodules`. No `vendor/` / `third_party/` directories at depth ≤3 (excluding `node_modules`).

| Path | Role | Classification | Notes |
|------|------|----------------|-------|
| `artifacts/kidschedule/` | Web / frontend (Vite React SPA) | **FIRST-PARTY** (product) + **OPEN-SOURCE** (npm) + **GENERATED** (some maps) | Shipped UI |
| `artifacts/api-server/` | Backend / API | **FIRST-PARTY** + **OPEN-SOURCE** | Express API |
| `android/` | Play Store WebView wrapper | **FIRST-PARTY** Kotlin + **THIRD-PARTY** SDKs | Shipped Android |
| `artifacts/amynest-capacitor/` | iOS Capacitor shell | **FIRST-PARTY** + **THIRD-PARTY** (Capacitor/pods) | Shipped iOS |
| `lib/` | Shared libraries | **FIRST-PARTY** + **GENERATED** (see below) | Workspace packages |
| `lib/api-client-react/src/generated/` | OpenAPI client | **GENERATED** | From `lib/api-spec/` |
| `lib/api-zod/src/generated/` | Zod from OpenAPI | **GENERATED** | Same |
| `lib/api-spec/` | OpenAPI source | **FIRST-PARTY** | Input to codegen |
| `content-engine/` | Content / video factory | **FIRST-PARTY** + **UNKNOWN** media | Operator optional |
| `scripts/` | Ops / codegen / growth | **FIRST-PARTY** | Mixed prod vs one-off |
| `infra/` | Cloudflare / deploy config | **FIRST-PARTY** | Infra as code |
| `docker/` `docker-compose.yml` | Container config | **FIRST-PARTY** | |
| `.github/workflows/` | CI | **FIRST-PARTY** | Secrets are names only |
| `patent/` | Patent papers (not product runtime) | **UNKNOWN** as software; filing docs | Not app source |
| `docs/` | Documentation | **FIRST-PARTY** text | Not executable product |
| `artifacts/kidschedule/src/pages/admin-growth.tsx` and related admin | Admin / Growth OS UI | **FIRST-PARTY** | In kidschedule |
| `artifacts/amynest-splash/` | Splash artifact | **FIRST-PARTY** | |
| `artifacts/ephemeris-daemon/` | Birth Sky ephemeris | **FIRST-PARTY** + **THIRD-PARTY** (JPL data **UNKNOWN** license) | [TO BE CONFIRMED] |
| `artifacts/kidschedule/public/` | Static assets | **UNKNOWN** per file | Some first-party; stock/generated **UNKNOWN** |
| `assets/` `attached_assets/` `screenshots/` | Design / marketing binaries | **UNKNOWN** | Provenance not per-file audited |
| `content-bank/` | Content bank | **UNKNOWN** | Code vs licensed content |
| `archive/amynest-mobile-expo/` | Archived Expo | **FIRST-PARTY** historical + **THIRD-PARTY** | Not shipped stores |
| `artifacts/kidschedule-android/` `kidschedule-android/` | Non-shipped Android trees | **UNKNOWN** overlap | Shipped Play app is `android/` |
| `backend/` | Legacy `server.js` | **UNKNOWN** vs current `api-server` | |
| `node_modules/` | Installed packages | **OPEN-SOURCE** / **THIRD-PARTY** | Not first-party |
| `pnpm-lock.yaml` | Lockfile | **OPEN-SOURCE** inventory | |
| Gradle / CocoaPods caches | Build tools | **THIRD-PARTY** | |
| `*.env` files if present in working tree | Config / secrets | **UNKNOWN** — **do not copy to evidence** | Not title evidence |

**FIRST-PARTY** rows still have legal title **UNKNOWN**.
