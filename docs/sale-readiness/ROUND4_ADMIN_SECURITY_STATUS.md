# ROUND 4 — ADMIN / GROWTH SECURITY STATUS

**Date:** 24 September 2026  
**Do not call this fixed.**

## CURRENT PRODUCTION STATE (verified)

| Check | Result |
|-------|--------|
| `GET /api/admin/growth/dashboard` unauthenticated | **401** |
| `GET /api/admin/growth/gos/overview` unauthenticated | **401** |
| `/admin/growth` UI | Shipped. Signed-in users can **open the route**. Chrome used to render **while loading** (Round 2 observation). |
| API authorization | `isGrowthAdminUser` = `ADMIN_USER_IDS` **or** `ADMIN_GROWTH_EMAILS` — **not** hardcoded to demo |
| Dev example | `.env.development.example` sets `ADMIN_GROWTH_EMAILS=demo@amynest.in` |
| Production allowlist | **UNVERIFIED** |
| `demo@amynest.in` | Real **privileged QA** identity in code: unlimited children/devices, email-verify bypass, Birth Sky allowlist. **Not** found as a RevenueCat email customer. |

Unauthenticated data breach: **not evidenced**.  
Production “demo is Growth admin”: **unknown** (depends on env).

## PROPOSED FIX (in repo, NOT DEPLOYED)

`artifacts/kidschedule/src/pages/admin-growth.tsx`:

- While `isLoading && !data` → only “Checking admin access…” (no GOS nav/chrome)
- 403 / `not_admin` → lock screen; example “e.g. demo@amynest.in” **removed** from that copy

Does **not** change API allowlists. Does **not** remove demo privileges.

## POST-DEPLOY VERIFICATION (only after authorized deploy)

1. Anonymous: APIs still 401; `/admin/growth` → sign-in, never GOS chrome.
2. Normal signed-in non-admin: lock screen, no nav, API 403.
3. Allowlisted admin: dashboard JSON 200.
4. Confirm production `ADMIN_GROWTH_EMAILS` / `ADMIN_USER_IDS` in Coolify (redact in data room).

## demo@amynest.in — keep or remove?

**OWNER ACTION REQUIRED.** Do not delete automatically.

| Keep | Remove / shrink |
|------|-----------------|
| App Store / Play review canary, Birth Sky kill-switch bypass, multi-child QA | If leaked, unlimited children/devices + possible admin if env copied |

Recommendation for sale: treat as **privileged**; disclose to buyer; rotate password / restrict allowlist before listing. Not executed here.
