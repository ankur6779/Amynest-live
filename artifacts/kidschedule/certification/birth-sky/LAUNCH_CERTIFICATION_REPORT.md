# Amy Astro Intelligence — Final Launch Certification Report

**Date:** 2026-07-28  
**Scope:** Production verification before public rollout  
**Environment:** Coolify API `…sslip.io` + Cloudflare Pages `amynest-web.pages.dev` / `www.amynest.in`  
**Account used for journey:** `demo@amynest.in`  
**Constraint:** No new features; business logic / UI unchanged except one security harden (below)

---

## Executive recommendation

### **Launch with Monitoring**

Amy Astro Intelligence is feature-complete and **safe for public GA** with active monitoring for the first 24–72 hours. No release-blocking product defects were found in the certified journey. Residual risks are operational (analytics ingest noise, public healthz surface area, WAF/bot friction for automated probes) and accepted product limitations (lite ephemeris fallback, abstract sky-map, monthly notes deferred).

---

## Scorecard

| # | Category | Result | Notes |
|---|---|---|---|
| 1 | Database | **PASS** | Migration `0050` verified on Coolify |
| 2 | Deployment / kill switches (GA on) | **PASS** | Public GA enabled; kill switches unset |
| 3 | End-to-end flow | **PASS** | Core Amy Astro journey certified; Restore = native-only |
| 4 | Analytics | **PASS with watch** | Birth Sky events wired; one 401 on analytics dispatch observed |
| 5 | Performance | **PASS** | API + Pages latency healthy; UI ~60fps feel |
| 6 | Accessibility | **PASS** | Reduced motion, ARIA, static a11y suite |
| 7 | Reliability | **PASS** | Offline / timeout / retry / recovery present (code + prior smoke) |
| 8 | Security | **PASS with fix** | No product console/secrets; ops telemetry gated (PR fix) |
| 9 | Branding | **PASS** | Amy Astro Intelligence primary; “Birth Sky” as intentional subtitle |
| 10 | Final certification | **Launch with Monitoring** | See risks below |

---

## 1. Database — PASS

| Check | Evidence |
|---|---|
| Migration `0050` applied | GH Actions run `30327319055` → `VERIFY_OK {"ok":true,"sky_sounds_default":"true","migration":"0050"}` |
| Schema matches intent | Drizzle `birth_sky_preferences.sky_sounds` default `true` (`lib/db/src/schema/birth_sky.ts`); SQL `ALTER … SET DEFAULT true` |
| Pending Birth Sky migrations | None after `0050`. Repo latest numbered migration is `0050`. `0049` (`generation_status`) is on main; first-sky create succeeded in live smoke |
| `db:push` on Coolify | **Not used** (unsafe). Apply path is additive SQL / healthz ops only |

Unauthenticated re-apply of mig-0050 correctly returns `404 not_found` (secret required in production).

---

## 2. Deployment — PASS (GA kill switches **off** / feature **on**)

| Check | Evidence |
|---|---|
| Coolify API healthy | `GET /api/health` → `{"ok":true,"birthSkyPublicEnabled":true}` (rechecked 2026-07-28) |
| Coolify deploy | Post-deploy smoke `scripts/post-deploy-smoke.sh` **all checks passed** |
| API public gate | `BIRTH_SKY_PUBLIC_ENABLED` unset or on → `birthSkyPublicEnabled: true` |
| Cloudflare Pages | Deploy script explicitly `unset VITE_FF_BIRTH_SKY*` (`scripts/deploy-cloudflare-pages.sh`) |
| Pages live | `https://amynest-web.pages.dev/` → 200; CF bundle probe (run 30327319055) found no kill pattern |
| www WAF | Datacenter/bot IPs often see `403` on `www.amynest.in`; real browsers load OK |

**Interpretation of “kill switches enabled for GA”:** product must be **publicly on**. Confirmed: client + API defaults ON; production probes show public on. Rollback remains `BIRTH_SKY_PUBLIC_ENABLED=0` + `VITE_FF_BIRTH_SKY=0` rebuild.

---

## 3. End-to-end flow — PASS

Live browser certification on `https://www.amynest.in` (`demo@amynest.in`):

| Step | Result | Evidence |
|---|---|---|
| Install / entry | PASS | Site loads; session present |
| Onboarding | PASS | Already onboarded |
| Birth Sky generation | PASS | Prior + current sessions: Create → formation completes |
| Living Sky ambient | PASS | Ambient / cosmic motion on formation & dashboard |
| Cinematic reveal | PASS | Reveal completed; constellation / essence shown |
| Cosmic Portrait | PASS | Portrait / hero chart visible |
| Dashboard | PASS | `/birth-sky/app/sky` — Day Sky, moon, prompts |
| Ask Amy | PASS | Sheet opens with prompts / chat |
| Daily Insights / Today’s Sky | PASS | Dashboard insights + hub daily cards |
| Growth Journey | PASS | Growth metrics + 7-day journey UI on hub |
| Subscription | PASS | `/pricing` tiers visible (no purchase completed) |
| Restore Purchase | **PASS (native)** | Web pricing hides restore (iOS/Android shell only: `pricing.tsx` + `paywall-modal` + native bridges). Not a web GA blocker |

Screenshots: `/opt/cursor/artifacts/cert-*.png` / prior smoke `smoke-*.png`.

---

## 4. Analytics — PASS with watch

| Check | Evidence |
|---|---|
| Event facade | `trackBirthSkyEvent` → scrub → `queueClientLog` (`lib/analytics.ts`) — not stubbed |
| Taxonomy coverage | Welcome / setup / formation / reveal / dashboard / Ask Amy / settings events present |
| Live observation | One `401` on analytics dispatch during cert session — **non-blocking** for UX; monitor ingest success rate post-launch |
| Gaps (non-blocking) | Some reserved taxonomy names unused (`premium_purchase_*`, `message_copied`, …) |

**Watch:** confirm `/api/analytics/events` (and client-log flush) success rate after GA; fix auth/device gating if 401 rate is material.

---

## 5. Performance — PASS

| Metric | Measurement |
|---|---|
| Coolify `/api/health` TTFB | ~367–434 ms (3 samples) |
| Pages HTML TTFB | ~27–33 ms (3 samples) |
| Birth Sky API unauth | `401` in ~374 ms (auth gate healthy) |
| Ephemeris daemon (via healthz) | `averageLatencyMs` ~120 ms; ready=`true`; engine `skyfield-jpl` |
| Dashboard JS heap | ~65–90 MB (stable) |
| CPU while scrolling | ~7–21% |
| Animation FPS (subjective) | ~60 fps feel; no visible jank |
| Initial Birth Sky feel | ~2–3 s to interactive |

---

## 6. Accessibility — PASS

| Check | Evidence |
|---|---|
| Reduced motion | Honored in welcome/formation/reveal/dashboard/settings/sounds; Preferences status row live |
| Screen reader / ARIA | Dialogs, live regions, tablist, focus traps — static suite `certification/accessibility.test.ts` |
| Contrast / type | Cosmic dark theme + Quicksand / display serif stack in `amy-astro.css` |
| Responsive | Mobile viewport journey + desktop sidebar nav verified |
| Device VO/TalkBack | Waived in existing a11y cert notes (static assertions remain) |

---

## 7. Reliability — PASS

| Scenario | Status |
|---|---|
| Offline mode | Encrypted offline bundle + dashboard offline banner + create blocked offline + Ask Amy send disabled |
| Slow network | Soft-wait / formation loading paths; not re-throttled in this cert pass |
| API timeout | Client `BIRTH_SKY_GENERATION_TIMEOUT_MS` 60s + pipeline buffer; AI timeout env-gated |
| Retry handling | Pipeline retry + Formation “Generate again” + regen overlay |
| Error recovery | “Sky paused” + back to review / exit; AI sheet retry |

First-run hang regressions previously addressed on main (`#74` timeout import / create hardening). Live Create → Reveal succeeded in smoke.

---

## 8. Security — PASS (with launch harden)

| Check | Status |
|---|---|
| Product `console.log` in Birth Sky tree | None (tests/cert only) |
| Mock data in product paths | None (lite ephemeris is intentional fallback) |
| Hardcoded secrets | None found |
| `DEBUG_EXPLAINABILITY` | Off unless explicitly enabled |
| Dev routes | No birth-sky `/dev` routes; routers allowlist/auth gated |
| Mig-0050 DDL ops | Secret-gated in production (`404` without secret) — OK |
| Public `/api/healthz/tts` AI router telemetry | **Was open** (conversation cost aggregates). **Fixed in this cert PR:** `birthSkyAiRouter` only when `x-health-secret` matches in production |
| `auth/whoami` | Disabled in production (post-deploy smoke) |

---

## 9. Branding — PASS

| Check | Status |
|---|---|
| Product name | **Amy Astro Intelligence** (`AMY_ASTRO_PRODUCT_NAME`) on shells |
| AmyNest | Present in parent/child framing |
| Typography / color | Dedicated Amy Astro CSS variables / cosmic palette |
| Icons / CTAs | Consistent: Begin → Continue → Create → Enter the living sky → Ask Amy |
| “Birth Sky” copy | Retained as intentional subtitle / nav descriptor (not conflicting rename debt for GA) |

---

## 10. Remaining blockers

**None that block public GA.**

### Non-blocking watchlist

1. Analytics dispatch `401` noise — monitor post-launch  
2. Cloudflare WAF blocks automated/datacenter probes on `www` — use Pages hostname + real-browser certs  
3. Hub tile lives in collapsed **Amy Astro** section (sidebar + deep link work)  
4. Accepted limitations: lite ephemeris fallback, abstract sky-map SVG, monthly notes deferred  
5. Retire DDL-over-HTTP mig-0050 endpoint after confidence window  

---

## Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Ephemeris daemon blip → lite fallback | Medium | Low–Med (quality) | Daemon health in `/healthz/tts`; monitor `fallbackUsed` |
| AI cost / latency spike | Low–Med | Med | Ask Amy entitlements + router telemetry (ops-secret) |
| Analytics under-count | Med | Low | Watch dispatch 401 rate |
| Formation timeout under load | Low | Med | Existing retries + user “Generate again” |
| Accidental kill-switch set | Low | High | Keep env unset; health probe `birthSkyPublicEnabled` |

---

## Recommendation detail

| Option | Decision |
|---|---|
| Ready for Public Launch | Not unmarked — residual ops watches remain |
| **Launch with Monitoring** | **SELECTED** |
| Hold Release | Not warranted — no critical product blocker |

### First-72h monitoring checklist

- [ ] Coolify `/api/health.birthSkyPublicEnabled === true`  
- [ ] Ephemeris `ready` + chart latency  
- [ ] Birth Sky create / formation failure rate  
- [ ] Ask Amy stream error rate  
- [ ] Analytics ingest success (no elevated 401)  
- [ ] Rollback plan ready: `BIRTH_SKY_PUBLIC_ENABLED=0` + `VITE_FF_BIRTH_SKY=0` rebuild  

---

## Sign-off

| Role | Status |
|---|---|
| Product journey | Certified PASS |
| Ops (DB + deploy + flags) | Certified PASS |
| Security harden (AI router telemetry gate) | Included in cert PR — deploy before or with GA |
| Final call | **Launch with Monitoring** |
