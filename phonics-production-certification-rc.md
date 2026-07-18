# AmyNest Phonics — Final Production Certification (Release Candidate)

**Date:** 2026-07-18  
**Role:** Principal QA / Mobile / UX / Perf / A11y / DevOps / Release  
**Method:** Full code audit of phonics-v2 + phonics-v3 + audio/deploy ops; regression suite **139/139** passed; critical defects fixed in this certification pass.  
**Stance:** Certify for public family release. No redesign. No feature creep.

---

## Scores

| # | Metric | Score |
|---|--------|------:|
| 1 | Functional QA | **88** |
| 2 | Performance | **84** |
| 3 | Accessibility | **85** |
| 4 | Reliability | **83** |
| 5 | Security & Privacy | **86** |
| 6 | Cross-platform | **84** |
| 12 | **Final Production Certification** | **85 / 100** |

---

## 13. Final Verdict

# **GO WITH CONDITIONS**

Safe for **public family rollout** of the core Phonics learning path  
(Start Here → Mission → Lesson → AI Coach → Books → Parent → optional Adventure).

Not certified as a full classroom Teacher Mode product, and not as a complete “group assessment UI” product, until those surfaces ship or are explicitly out-of-scope in marketing.

---

## Critical issues

| ID | Status | Issue | Resolution |
|----|--------|-------|------------|
| C1 | **Fixed this RC** | Mic skip marked `correct: true` and still granted identified mastery / fluency / retention | `readOk` / `blendOk` now require `!skipped`; `wordsRead` only on non-skipped independent read |
| C2 | **Scoped out** | `group-assessment.ts` library exists; **no UI** | Do not market “group assessments” as a live child flow; unlock remains curriculum-driven |
| C3 | **Ops open** | `CLOUDFLARE_API_TOKEN` empty → gated Pages CI deploy fails | Restore secret **or** use documented manual `wrangler pages deploy` |
| C4 | **Ops open** | `artifacts/audio-health-gate/latest.json` = **FAIL** (static-audio content invalid / TTS URL; gate secrets skipped) | Re-probe Coolify GCS audio before calling audio ops GO; CI health job is non-blocking |

**No remaining critical product UX blockers on the supervised family path after C1.**

---

## Medium issues (non-blocking for family GO)

| ID | Issue | Recommendation |
|----|-------|----------------|
| M1 | Lesson celebration may unmount immediately when parent closes runner | Soften only if field sessions report confusion |
| M2 | “My level story” card is display-only | Leave or wire later — not on critical path |
| M3 | Offline Whisper coach needs network; skip is escape hatch | Document; keep skip |
| M4 | Dual header (JourneyHub + Start Here) | Optional collapse next sprint |
| M5 | Fine-grained phonics playback telemetry muted in prod | Rely on crash boundary; optional Sentry |
| M6 | DLQ / processing window still briefly holds audio until redact completes | Acceptable; redaction now on complete/fail/timeout |

---

## Nice-to-have (do not block release)

- Wire `pnpm phonics:certify` into CI  
- Treasure / pet SFX polish  
- Teacher Mode enablement  
- Cloud sync of pet / local gamification badges  
- Offline banner on phonics page  

---

## Leave unchanged (certification freeze)

- SATPIN curriculum progression & letter-group order  
- Pure phoneme audio pedagogy  
- 10-step lesson engine sequencing  
- AI Reading Coach evaluation logic  
- Adaptive mastery / integrity gates  
- Decodable story unlock-by-group  
- Parent dashboard structure (summary-first)  
- UX redesign primitives (Start Here, PulseCta, Amy cues)  
- Gamification as **presentation-only** (adventure drawer, pet, daily strip)  

---

## Phase summaries

### Functional QA (88)
Verified wired: Start Here, Mission (`lessonCompleteNonce`), ReadingLessonRunner, coach, blend/segment, academy books, parent dashboard, adventure drawer, SATPIN via curriculum `letterGroupIndex`, sticky CTA → `#phonics-start-here` / `#phonics-reading-lesson`.  
Group assessment: library-only → scoped out of claims.

### E2E journeys
| Persona | Verdict |
|---------|---------|
| New child | Clear FTUE → Start lesson; mic skip available |
| Existing / returning | Compact Start Here; progress hydrate + sync queue |
| Parent | Summary + next practice + privacy note |
| Offline | Prefetch + IndexedDB + localStorage; coach STT needs net |

### Audio QA (ops caveat)
Manifest **1393** phonics assets; SW cache-first for library/static paths; local `audio-pack` subset. Latest health-gate artifact **FAIL** — treat as **ops condition**, not a curriculum regression. Device smoke required (see checklist).

### AI Reading Coach
Transcript scoring + encouraging tiers + confusion store (no client audio persist). Skip no longer inflates mastery (C1). Parent + coach privacy copy added. Server: speech jobs `removeOnComplete: true` + payload redact after processing.

### Performance (84)
Gamification localStorage-only; adventure collapsed by default; SW + IndexedDB dual cache on PWA. Field soak still needed for battery / low-end Android.

### Accessibility (85)
Primary CTAs ≥44px; Amy `aria-live`; step dots; reduced-motion on PulseCta; skip control enlarged to `min-h-11`.

### Cross-platform (84)
Shared kidschedule UI. Android WebView + iOS Capacitor force Whisper path (network). PWA may use Web Speech. Layouts responsive; landscape not a dedicated redesign.

### Regression
**139** phonics-v2/v3 + mount + roadmap tests passed after RC fixes. Gamification remains non-authoritative for unlocks.

### Security & Privacy (86)
Client: scores/confusions only. Notices on coach + parent dashboard. Server speech audio redacted post-process. Third-party STT (Whisper) still processes audio per provider policy — disclose in privacy policy if not already.

### Deployment readiness
| Item | Status |
|------|--------|
| Pages hosting / `_headers` / SW versioning | Good |
| Gated CI Pages token | **Condition** |
| Coolify API + GCS phonics bucket | Required for audio |
| `VITE_APP_API_ORIGIN=https://www.amynest.in` | Required |
| Crash boundary → `/api/crash-events` | Good |

---

## Release risks

1. **Audio ops FAIL artifact** — child may hit bad static-audio Amy phrases even if phonics library is healthy.  
2. **Gated deploy broken** without Cloudflare token — manual deploy discipline required.  
3. **Mic permission friction** on first session (mitigated by skip; mastery no longer inflated).  
4. **Over-claiming** group assessments or Teacher Mode.

---

## Deployment checklist

### Must do before / with ship
- [ ] Restore `CLOUDFLARE_API_TOKEN` **or** run approved manual Pages deploy of this SHA  
- [ ] Confirm Coolify has GCS credentials for `phonics/*` (+ static-audio if Amy phrases used)  
- [ ] Smoke `https://www.amynest.in` phonics: letter sound, CVC, one full lesson, one book  
- [ ] Confirm sticky CTA lands on Start Here / Continue Lesson  
- [ ] Confirm mic allow + “Continue without mic” both work; skipped read does **not** spike mastery  
- [ ] Do not advertise Teacher Mode or in-app group assessment UI  

### Should do within 7 days
- [ ] Re-run audio health gate with `INTERNAL_HEALTH_SECRET` + `ADMIN_AUTH_TOKEN` against Coolify  
- [ ] Moderated session with 3–5 families (Day 1)  
- [ ] Verify Android WebView + iOS Capacitor builds load production phonics  

---

## Real device checklist (manual)

### Devices
- [ ] Android low-end (WebView shell)  
- [ ] Android high-end  
- [ ] iPhone (Capacitor)  
- [ ] iPad  
- [ ] Small phone portrait + landscape  
- [ ] Tablet portrait  

### Network / audio
- [ ] Slow 4G: lesson start < ~5s after warm cache  
- [ ] Offline after first online session: phoneme replay from cache  
- [ ] Offline: coach skip path works without crash  
- [ ] Bluetooth headphones playback  
- [ ] Device speaker playback  
- [ ] Mic permission grant → score feedback  
- [ ] Mic deny → Continue without mic → lesson finishes without false mastery  

### Flows
- [ ] New child FTUE dismiss + Start lesson  
- [ ] Complete 10-step lesson  
- [ ] Open unlocked decodable book  
- [ ] Parent dashboard shows next practice + privacy note  
- [ ] Adventure drawer optional; does not block lesson  
- [ ] Letter group advance still follows curriculum (not pet/map)  

---

## Fixes included in this RC certification

1. Mastery/fluency/retention ignore skipped lesson steps (`PhonicsV2.tsx`)  
2. `wordsRead` ignores skipped independent read (`reading-skills.ts` + test)  
3. Privacy notices on coach + parent dashboard  
4. Larger “Continue without mic” touch target  
5. Speech.transcribe: BullMQ `removeOnComplete: true` + payload/DLQ audio redaction (`queue/index.ts`, `ai-service.ts`, `job-results.ts`)  

---

## Automated evidence

```
pnpm --filter @workspace/kidschedule exec vitest run \
  src/lib/phonics-v3 src/components/phonics-v2 \
  src/__tests__/phonics-v2-mount.test.tsx \
  src/lib/phonics-journey-roadmap.test.ts
→ Test Files 24 passed | Tests 139 passed
```

Post-fix spot checks (skills + mount + roadmap): **16/16 passed**.

---

**Certification statement:** AmyNest Phonics is **production-ready for family use** at certification score **85**, under the ops conditions above. Ship the learning spine; keep the freeze list frozen; clear audio/deploy conditions before claiming full ops green.
