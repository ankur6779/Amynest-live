# Phase 2 — Route & Navigation Audit

**Generated:** 2026-06-11T18:45:00Z  
**Evidence base:** Static analysis of `AppCore.tsx`, nav configs, production HTTP probes  
**Production tested with:** `demo@amynest.in` (Playwright prod-crash-verify PASS)

## Executive Summary

| Metric | Count | Severity |
|--------|-------|----------|
| Orphan pages | 3 | HIGH |
| Unguarded dev/debug routes | 3 | HIGH |
| Redirect rules | 9 in-router + SPA fallback | OK |
| Redirect loops detected | 0 | OK |
| Nav items missing from desktop sidebar | 2 | MEDIUM |
| Unfinished feature badges | 1 (`Kids Control Center`) | MEDIUM |
| Production crash on core routes | 0 | OK |

**Navigation Score evidence:** 78/100 (see launch score engine)

---

## Route Inventory

Router: **Wouter** in `artifacts/kidschedule/src/AppCore.tsx`  
Total registered routes: **72**  
Catch-all unmatched → `route-failed.tsx` (not `not-found.tsx`)

---

## Orphan Pages (CRITICAL)

| Page file | Issue | Evidence |
|-----------|-------|----------|
| `pages/discovery-world-preview.tsx` | `DiscoveryWorldPreviewRoute` created at AppCore.tsx:434 but **no `<Route path=...>`** registered | Static grep of AppCore.tsx routes 661–772 |
| `pages/verify-email-action.tsx` | Fully unreferenced; superseded by `auth-action-page.tsx` | No imports outside its test file |
| `pages/not-found.tsx` | Imported in AppCore.tsx but never used in `<Switch>` | Catch-all uses `route-failed.tsx` |

**Impact:** Preview world feature is coded but unreachable. Dead code increases maintenance burden.

---

## Hidden / Unguarded Routes (HIGH)

These routes return **HTTP 200 without authentication** on production:

| Route | Page | Auth wrapper | Prod HTTP |
|-------|------|--------------|-----------|
| `/debug-parity` | debug-parity.tsx | None | 200 |
| `/dev/phonics-audio-preview` | phonics-audio-preview.tsx | None | 200 |
| `/dev/rhymes-audio-ab` | rhymes-audio-ab.tsx | None | 200 |

**Evidence:** `curl -sS -o /dev/null -w '%{http_code}' https://www.amynest.in/dev/phonics-audio-preview` → 200

**Risk:** Internal QA tooling exposed to public internet; potential information disclosure about audio pipeline internals.

---

## Protected Admin Routes

| Route | Guard | Notes |
|-------|-------|-------|
| `/admin/dashboard` | ProtectedRoute + server admin check | OK |
| `/admin/feedback` | ProtectedRoute + server admin check | OK |
| `/admin/infant-parenting` | ProtectedRoute + server admin check | OK |
| `/admin/audio-health` | Redirects to `/admin/dashboard` | Deprecated path |

API admin endpoints return **401** without auth (verified: `/api/admin/dashboard` → 401).

---

## Redirect Analysis

### In-router redirects (no loops detected)

```
/login → /sign-in
/profile → /parent-profile
/babysitters → /dashboard
/download → /get-app
/speech-coach/live → /speech-coach/live-session
/parenting-hub/speech-coach → /speech-coach
/parenting-hub/talking-amy → /talking-amy
/admin/audio-health → /admin/dashboard (via page redirect)
```

### SPA fallback

`public/_redirects`: `/* /index.html 200` — all unknown paths serve SPA (client-side routing).

**Potential false 404:** Direct requests to non-existent API paths return proper HTTP errors; SPA paths never return server 404 (by design).

---

## Navigation Structure Gaps

### Desktop sidebar (`layout.tsx`) vs mobile menu (`mobile-menu-config.ts`)

| Route | Desktop | Mobile |
|-------|---------|--------|
| `/learn-with-amy` | Missing | Present |
| `/amy-ai-tutor` | Missing | Present |

**Severity:** MEDIUM — feature discoverability gap on desktop.

### Parenting Hub deep links

Hub tiles correctly link to 18+ learning routes including `/phonics`, `/speech-coach`, `/discovery-worlds`, `/talking-amy`. Verified in `parenting-hub.tsx`.

### Unfinished navigation

| Item | Location | Badge |
|------|----------|-------|
| Kids Control Center | layout.tsx, mobile-menu-config.ts | "Soon 🚀" |

Route `/kids-control-center` is registered and reachable but marked unfinished in nav.

---

## Runtime Route Quarantine (Self-Healing)

Not a static route issue — routes quarantined at runtime after repeated crashes.

- Implementation: `lib/self-healing/route-quarantine.ts`
- Storage: `sessionStorage` key `amynest:quarantined-routes`
- Enforcement: `SafeRoutePage` wrapper

---

## Production Navigation Test Results

**Test:** `playwright/specs/prod-crash-verify.spec.ts`  
**Account:** demo@amynest.in  
**Result:** PASS

Routes traversed without crash overlay:
- `/dashboard` ✓
- `/parenting-hub` ✓
- `/audio-lessons` ✓
- `/amy-coach` ✓
- `/routines` ✓
- `/insights` ✓

No `#amynest-crash-overlay`, no "APP CRASH DETECTED", no React stack leaks.

---

## Broken Links (Static Analysis)

| Link target | Source | Status |
|-------------|--------|--------|
| `/worlds/:slug/preview` | Expected for DiscoveryWorldPreviewPage | **MISSING ROUTE** |
| `/admin/audio-health` | Legacy bookmarks | Redirects to dashboard (OK) |
| `/babysitters` | Legacy nav | Redirects to dashboard (OK) |

No redirect loops detected in static analysis or production probes.

---

## Recommendations (Post-Report)

1. Register route for `discovery-world-preview.tsx` or remove dead code
2. Gate `/debug-parity`, `/dev/*` behind auth or strip from production builds
3. Add `/learn-with-amy` and `/amy-ai-tutor` to desktop sidebar
4. Delete or archive `verify-email-action.tsx` and unused `not-found.tsx` import
