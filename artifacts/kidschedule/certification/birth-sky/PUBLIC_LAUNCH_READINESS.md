# Amy Astro Intelligence — Public Launch Readiness

**Date:** 2026-07-28  
**Scope:** Polish, enable production-ready experiences, remove launch blockers.  
**Out of scope:** Subscription / paywall / business-logic changes.

---

## 1. Features enabled

| Experience | Status |
|---|---|
| Public GA (client `VITE_FF_BIRTH_SKY`) | ON by default; kill with `=0` |
| Public GA (API `BIRTH_SKY_PUBLIC_ENABLED`) | ON by default; kill with `=0`/`false`/`off` |
| Living Sky ambient + meteors | ON (`ambientIntensity="full"` on welcome / formation / reveal) |
| Dynamic constellation / cinematic reveal | ON (reduced-motion short path preserved) |
| Cosmic Portrait premium visuals | ON |
| Amy companion idle / Living Sky gaze | ON |
| Nebula / cosmic ambient backgrounds | ON |
| Camera / ceremony motion | ON (respects reduced motion) |
| Ambient lighting (cosmic ambient) | ON |
| Daily Cosmic Insights / Today’s Sky | ON |
| Growth Journey / cosmic progress animations | ON |
| Ask Amy conversational experience | ON |
| Premium loading / formation animations | ON |
| Glass morphism (`amy-astro-glass`) | ON |
| Haptic feedback | ON (dashboard + portrait; no-op when unsupported) |
| Sound effects (Web Audio soft chimes) | ON by default; Settings toggle; honors reduced motion |
| Success / milestone celebrations | ON + sound wired to prefs |
| CTA polish (tap haptic + soft_tap cue) | ON |
| Empty / error / offline states | ON (production UX, not debug) |
| Skeleton loaders + transitions | ON |
| Hub tile, sidebar, burger, discovery strip | Surfaced when feature enabled |
| Nav kill-switch respect | ON — nav no longer leaks `/birth-sky` when flag off |

---

## 2. Features removed / intentionally not shipped

| Item | Action |
|---|---|
| IM-0 `setup-boundary-page.tsx` | Deleted (orphaned temporary seam) |
| IM-1 `dashboard-boundary-page.tsx` | Deleted (orphaned temporary seam) |
| `BIRTH_SKY_DASHBOARD_BOUNDARY_SEAM` export | Removed from public index |
| Monthly notes Preferences toggle | Kept removed — no delivery path yet (`monthlyNotesOptIn` sync field only) |
| Lens marketplace / extension lenses | Framework-only; not product UI |
| `DEBUG_EXPLAINABILITY` | Remains off in production |
| Temporary placeholders / Lorem / debug banners | None found in product UI |
| Mock / test content in product routes | None found |

---

## 3. Optimizations applied

| Optimization | Detail |
|---|---|
| Sky sounds default aligned | Client + API + DB column default → `true` (migration `0050`) |
| Prefs parse | Missing `skySounds` key treats as ON (`!== false`) |
| Celebration respects Settings | Dashboard passes `soundsEnabled` from prefs |
| Soft tap cues | Dashboard interactions play `soft_tap` when sounds on |
| Ambient intensity | Cinematic screens use `full`; shell default remains lighter |
| Lazy / reduced-motion | Heavy motion gated by `prefers-reduced-motion` |
| Nav gating | Sidebar / burger / discovery strip honor `isBirthSkyEnabled` |
| Env examples | Document public-on default + kill switches clearly |

---

## 4. Remaining launch blockers / accepted limitations

| Item | Severity | Notes |
|---|---|---|
| Staging live auth+API E2E (`W-STAGING-LIVE`) | Process | Waived in cert register — close before hard GA if required by ops |
| Lite ephemeris fallback | Accepted | Daemon → lite; monitor `fallbackUsed` |
| Abstract / temporary sky-map SVG renderer | Accepted | Shipping visual; Swiss Ephemeris upgrade later |
| Monthly notes delivery | Deferred | Pref reserved; no email/push yet |
| Pack 11 Birth Sky ops dashboards | Deferred | Admin JSON ops endpoint exists |
| Older cert docs (GO/NO-GO canary framing) | Docs drift | Runtime is public-on; refresh RC docs in a follow-up if needed |

None of the above block enabling the polished public product surface in this change set.

---

## 5. Production readiness checklist

- [x] Master client flag defaults ON  
- [x] Master API public gate defaults ON  
- [x] Hub tile / deep links follow master  
- [x] Nav surfaces gated by enablement (no kill-switch leak)  
- [x] Living Sky + cinematic reveal + ambient ON  
- [x] Ask Amy + dashboard segments live  
- [x] Sky sounds wired (reveal, celebration, soft taps) + Settings toggle  
- [x] Haptics on key interactions  
- [x] Offline / empty / error / skeleton states present  
- [x] Reduced-motion respected  
- [x] No product `console.log` / TODO / FIXME / Lorem in feature tree  
- [x] Dead IM-0/IM-1 boundary pages removed  
- [x] Monthly notes UI not re-exposed without delivery  
- [x] Subscription / paywall logic untouched  
- [x] Branding: Amy Astro Intelligence + AmyNest assets  
- [x] Operator: Coolify public GA confirmed — `/api/health.birthSkyPublicEnabled=true` (run 30327319055)  
- [x] Operator: Cloudflare Pages leaves `VITE_FF_BIRTH_SKY` unset (deploy script + live bundle probe)  
- [x] Operator: migration `0050` applied — `VERIFY_OK {"sky_sounds_default":"true"}` via `POST /api/healthz/ops/birth-sky-mig-0050`  
- [ ] Operator: authenticated smoke first-sky → reveal → dashboard → Ask Amy → sounds toggle  

## 6. Ops execution log (2026-07-28)

| Item | Result | Evidence |
|---|---|---|
| Migration 0050 | **PASS** | GH Actions `Birth Sky public launch ops` run `30327319055` → `VERIFY_OK` |
| Coolify kill switch | **PASS** | `birthSkyPublicEnabled: true` on Coolify `/api/health` |
| Cloudflare kill switch | **PASS** | Deploy unsets `VITE_FF_BIRTH_SKY*`; no kill pattern in Pages assets |
| Post-deploy health smoke | **PASS** | `scripts/post-deploy-smoke.sh` all checks passed |
| Authenticated journey smoke | **BLOCKED** | demo@amynest.in reached welcome once; setup Continue hung after birth time; hub tile not found in infant Parenting Hub scroll; Ask Amy / sounds not reached |

## 7. Accepted limitations (unchanged)

- Lite ephemeris fallback (daemon → lite) — monitor `fallbackUsed`
- Abstract / temporary sky-map SVG renderer
- Monthly notes delivery deferred (`monthlyNotesOptIn` sync-only)

**Verdict:** Ops enablement (migration + kill switches + platform smoke) is **complete**. Authenticated first-sky / Ask Amy / sounds-toggle smoke is a **remaining launch blocker** on the demo account path (setup Continue hang) and needs a follow-up fix before calling the journey certified.
