# Phase G — Security

**Validated:** 2026-06-12T07:28:52Z  
**Evidence:** `audit/final-cert/security-probe.txt`

## Unauthenticated API Probes

| Route | HTTP | Verdict |
|-------|------|---------|
| `/api/admin/dashboard` | 401 | PASS |
| `/api/admin/users` | 401 | PASS |
| `/api/admin/feedback` | 401 | PASS |
| `/api/admin/audio-health` | 401 | PASS |
| `/api/admin/infant-parenting` | 401 | PASS |
| `/api/debug/health` | 401 | PASS |
| `/api/dev/phonics` | 401 | PASS |
| `/api/health` | 200 | OK (public) |
| `/api/healthz` | 200 | OK (public) |

No privilege escalation via unauthenticated admin API calls.

## Dev / Debug Web Routes (post-ceeb2553)

| Route | curl HTTP | Live client behavior | Verdict |
|-------|-----------|----------------------|---------|
| `/debug-parity` | 200 | **Page loads — no redirect** | **FAIL** |
| `/dev/phonics-audio-preview` | 200 | **Page loads — no redirect** | **FAIL** |
| `/dev/rhymes-audio-ab` | 200 | **Page loads — no redirect** | **FAIL** |
| `/debug/learning` | 200 | **Accessible without sign-in** | **FAIL** |

Playwright verification: all 4 dev-route tests failed 2026-06-12.

## Admin SPA Routes

| Route | curl HTTP | Notes |
|-------|-----------|-------|
| `/admin/dashboard` | 200 | HTML shell; admin gate client-side |
| `/admin/feedback` | 200 | HTML shell |
| `/admin/audio-health` | 200 | HTML shell |

Demo account (`demo@amynest.in`) not confirmed admin — admin UI data exposure not fully tested. API layer correctly returns 401.

## Phase G Verdict

**FAIL** — Production dev/debug surfaces remain reachable despite ceeb2553 intent. `/debug/learning` exposed without authentication.
