# Production Validation Sprint — Evidence Report

- **Date (UTC):** 2026-07-25 (live AI window ~18:31–18:38Z)
- **Environment:** Production web `https://www.amynest.in` + production `/api/birth-sky/*` (Coolify-backed origin via www)
- **Account:** allowlisted `demo@amynest.in` (Firebase session in Cursor IDE browser)
- **Host collecting evidence:** macOS 26.5.1, Cursor agent + IDE browser (desktop Chromium)
- **Artifact:** `live-ai-50-production-2026-07-25.json`

---

## TASK 1 — Live AI validation

### What was demonstrated (runtime)

| Item | Evidence |
|---|---|
| Endpoint | `POST /api/birth-sky/conversations/{id}/messages/stream` on production |
| Auth | Firebase Bearer token from live `demo@amynest.in` session |
| Profile | `6b72735c-1c7e-4862-81d0-529af33b92f5` (childId 2), snapshot `ss_ca30deb3-…` |
| Conversation | `1235103d-87bd-454b-8a4b-9b2accd336b7` (created for this run) |
| Model | `gpt-4o-mini` |
| Turns | **50/50** HTTP 200 with SSE `job` → `chunk`+ → `done` (or moderated) |
| Persistence | GET conversation after run → **100 messages** (50 user + 50 assistant) |
| Moderation | **15/50 (30%)** returned identical safety stub |

### Quantitative results (from live SSE + hydrate GET)

| Metric | Value |
|---|---|
| `streamOk` | 50/50 |
| `moderatedN` | 15/50 (30%) |
| `errorN` (HTTP/fatal) | 0 |
| Avg stream wall time | 5265 ms |
| Repeated opening (exact) | `"i can stay with gentle, parent-only reflection about the sky"` × **15** (all moderated stubs) |
| Repeated ending | `"what would you like to notice together today?"` × **15** |
| Non-moderated unique openings | **35/35** |
| Repeated metaphors (regex hits) | `/sky /i` ×23, `/horizon/i` ×7, `/like a /i` ×7 |
| Advice-heavy replies (≥2 advice cues) | 13/50 |
| Hallucination rate (initial harness) | 0.08 — **false positive** (`/aries/i` matched inside `Sagittarius`) |
| Hallucination rate (word-boundary corrected) | **0.00** on stored previews |
| Grounding rate (Cancer/Sagittarius/Waxing/Rising cues) | **0.70** |
| Practical usefulness rate (try/tonight/this week cues) | **0.16** |
| Hydration consistency (stream body vs last assistant body) | **0.52** |
| Unique assistant bodies persisted | 36/50 (15 identical stubs) |

### UI rendering of the 50 turns

**Not demonstrated.** The 50 turns were executed through the **production streaming API** inside an authenticated browser context (real moderation + SSE + DB persistence). The Ask Amy chat sheet was **not** driven for those 50 prompts.

### Screenshots / logs

- Welcome UI (allowlist access): browser screenshots under Cursor screenshot temp (`page-2026-07-25T18-29-34-532Z.png` and related)
- Full machine-readable run: `live-ai-50-production-2026-07-25.json`
- CDP raw: `live-ai-50-cdp-raw-2026-07-25.json`

---

## TASK 2 — Device validation

| Device | Result |
|---|---|
| Android phone | **Not run** — `adb` not installed; no device attached |
| Android tablet | **Not run** |
| iPhone | **Not run** — simulators present but Shutdown; no VoiceOver lab |
| Desktop | **Partial** — production welcome + dashboard + setup/child observed in IDE browser; Amy Astro dashboard/chat/kundli/export surfaces not fully captured (second tab hit “Connection issue detected”) |

**Keyboard / safe areas / orientation / scrolling / print:** not evidenced on physical devices.

### External environment required

1. Physical Android phone + tablet with TalkBack + Chrome/WebView build of AmyNest  
2. Physical iPhone (+ optional iPad) with VoiceOver  
3. Desktop Safari + Chrome matrix  
4. Screenshot/log package per form factor for: Keyboard, Safe areas, Orientation, Scrolling, Chat, Reveal, Kundli, Export, Ask Amy  

---

## TASK 3 — Accessibility

| Check | Result |
|---|---|
| VoiceOver | **Not run** |
| TalkBack | **Not run** |
| Keyboard-only | **Not run** as a full pass |
| Reduced Motion | **Not run** |
| Dynamic Type | **Not run** |
| Contrast | **Not measured** (no axe/contrast lab this sprint) |
| Switch navigation | **Not run** |

Repo RC3 cells remain **WAIVED** historically — **not accepted** as evidence here.

### External environment required

Device a11y lab with VoiceOver, TalkBack, Switch Control, Dynamic Type, Reduce Motion, and contrast measurement tooling. No waivers.

---

## TASK 4 — Performance

| Surface | FPS | LCP | CLS | INP | CPU | GPU | Memory |
|---|---|---|---|---|---|---|---|
| Reveal | — | — | — | — | — | — | — |
| Dashboard (Amy Astro) | — | — | — | — | — | — | — |
| Chat | — | — | — | — | — | — | — |
| Export | — | — | — | — | — | — | — |
| Kundli | — | — | — | — | — | — | — |

Incidental desktop sample on harness tab after AI run (not a certification surface): FCP ≈ 684 ms; JS heap used ≈ 25.8 MB. **Not** accepted as Task 4 pass evidence.

### External environment required

Chrome DevTools / Web Vitals on mid-tier Android + iPhone + desktop during Reveal, Dashboard, Chat, Export, Kundli with FPS/INP/LCP/CLS/CPU/GPU/Memory recorded.

---

## TASK 5 — Observability

| Signal | Runtime evidence this sprint |
|---|---|
| AI failures logged | **Not retrieved** from Coolify/log drain |
| Timeouts | None observed in the 50-run client metrics (`errorN=0`) |
| Hydration | Client-side mismatch rate **0.52** measured; server log correlation **not** pulled |
| Streaming | Client observed SSE job/chunk/done for 50 turns |
| Popup failures | **Not exercised** |
| Analytics | **Not verified** in production analytics sink |
| Render MCP logs | `list_services` returned null after workspace select |

### External environment required

Coolify (or active log backend) read access + analytics property access for birth-sky events; optional Sentry/error DSN verification.

---

## TASK 6 — Rollback / flags

| Check | Evidence |
|---|---|
| Unauthenticated API | `GET/POST /api/birth-sky/*` → **401** (runtime) |
| Internal allowlist ON path | `demo@amynest.in` reached Amy Astro welcome + AI entitlement `canRequestAiInsight:true` |
| Public flags OFF→ON drill | **Not performed** (no Coolify/Cloudflare env write access in session) |
| Rollback drill | **Not performed** |
| Partial rollout | **Not performed** |

### External environment required

Operator access to Coolify API env (`BIRTH_SKY_PUBLIC_ENABLED`, `BIRTH_SKY_ALLOWLIST`) and Cloudflare Pages build flags (`VITE_FF_BIRTH_SKY*`) with a documented ON/OFF/partial/recovery drill and timestamps.

---

## Verified defects / risk signals from runtime (not fixed in this sprint)

1. **30% moderation stub rate** with identical opening/ending across 15 turns — repetition concentration is moderation-path, not LLM variety.  
2. **Hydration consistency 52%** under post-stream GET comparison — needs investigation (stream assemble vs persisted body / ordering).  
3. **Practical usefulness cue rate 16%** on production model output for the 50-prompt set.  
4. UI navigation flake: second browser tab entered **Connection issue detected** during device/UI capture.

---

## FINAL VERDICT

**NO-GO**

### Missing evidence blocking GO (Public)

1. Task 1: UI rendering of Ask Amy for the 50 live turns (API-only so far)  
2. Task 2: Android phone, Android tablet, iPhone device labs + screenshots  
3. Task 3: VoiceOver, TalkBack, keyboard-only, reduced motion, Dynamic Type, contrast, Switch — no waivers  
4. Task 4: FPS/LCP/CLS/INP/CPU/GPU/Memory on Reveal/Dashboard/Chat/Export/Kundli  
5. Task 5: Production log/analytics proof for AI failures, timeouts, hydration, popups  
6. Task 6: Controlled flag ON/OFF/rollback/partial rollout drill on Coolify + Cloudflare  
