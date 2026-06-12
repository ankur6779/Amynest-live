# Phase 11 — Security Audit

**Generated:** 2026-06-11T18:45:00Z

---

## Authentication & Authorization

| Endpoint / Route | Unauthenticated probe | Expected | Actual |
|------------------|----------------------|----------|--------|
| `/api/admin/dashboard` | GET | 401/403 | **401** ✓ |
| `/api/debug/logs` | GET | 401 | **401** ✓ |
| `/api/stories/` | GET invalid bearer | 401 | verified |
| `/dev/phonics-audio-preview` | GET (SPA) | should block | **200** ✗ |
| `/debug-parity` | GET (SPA) | should block | **200** ✗ |

Admin API routes correctly reject unauthenticated requests. **Frontend dev routes are publicly reachable.**

---

## Secret Exposure

| Check | Result |
|-------|--------|
| Hardcoded API keys in source | **None found** in grep sample |
| `.env` files in git | Not audited via git history; standard `.env.development.example` present |
| Firebase client keys | `VITE_FIREBASE_*` — **expected** for SPA |
| RevenueCat iOS key | `VITE_REVENUECAT_IOS_API_KEY` — client-side by design |
| OpenAI/ElevenLabs keys | Server-only (`artifacts/api-server/src/lib/env.ts`) |

---

## Debug Endpoints

| Route | Auth | Risk |
|-------|------|------|
| `POST /api/debug/log` | requireAuth | LOW |
| `GET /api/debug/parity` | requireAuth | LOW |
| `GET /api/debug/logs` | requireAuth | LOW |
| `POST /api/log-client-error` | varies | LOW |
| `GET /api/auth/whoami` | public mount | Returns 404 (route may be disabled) |

---

## Public Cron / Webhook Endpoints

| Route | Protection |
|-------|------------|
| `POST /api/stories/gcs-sync/cron` | Cron secret header |
| `POST /api/learning/seed-weekly/cron` | Cron secret header |
| `POST /api/subscription/webhook` | RevenueCat secret |
| `POST /api/subscription/razorpay/webhook` | Signature verification |

---

## Admin Bypass

- `isAdminUser()` check on admin routes in `audio-health.ts` and related
- Frontend admin pages use ProtectedRoute + API 403 for non-admins
- **No admin bypass found** in static review

---

## Client-Side Security

| Concern | Status |
|---------|--------|
| Direct GCS URLs in client | **Blocked** — API proxy pattern |
| Boot debug HUD in production | Gated by `VITE_ENABLE_BOOT_HUD` + DEV only |
| Static audio debug | DEV only per `is-dev.ts` |
| CSP / network security | Android: `network_security_config.xml`; iOS Capacitor config separate |

---

## Dependency / Supply Chain

Not run: `pnpm audit` in this session.

---

## Security Findings Summary

| ID | Severity | Finding |
|----|----------|---------|
| SEC-01 | **HIGH** | `/dev/*` and `/debug-parity` publicly accessible in production |
| SEC-02 | MEDIUM | Firebase/RevenueCat keys in client bundle (inherent to architecture) |
| SEC-03 | MEDIUM | Google Drive embeds depend on public folder sharing |
| SEC-04 | LOW | Debug API stores user context when authenticated |

---

## Security Score Evidence

**Score: 82/100**

Strong API auth on admin/debug. Deduction for unguarded frontend dev routes and Drive dependency.

**Security risks count: 4 documented (1 HIGH)**
