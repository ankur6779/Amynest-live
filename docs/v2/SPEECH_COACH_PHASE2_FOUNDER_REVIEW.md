# Speech Coach Phase 2 — Founder Review

**Status:** MANUFACTURED — ENTRY · OPENING · HERO · HIERARCHY · MATERIALS · PREMIUM · EXIT  
**Date:** 2026-08-08  
**Authority:** Founder Order — Speech Coach Manufacturing (Phase 2)  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:**  ()

**STOP after this module.** Do **not** begin Nutrition. Wait for Founder approval.

---

## Mission result

Speech Coach is no longer a feature mall, chatbot, course, or session catalogue as the first impression.

It opens as **another quiet room inside AmyNest** — Help-room FE photography, companionship voice (“I'm here with you”), **one** recommended practice act, quiet practice paths that **deepen one path at a time**, and everything else under **More practice**.

A parent should feel: *I have someone walking beside me.*  
Never: *I opened another feature.*

Speech engines, conversation logic, AI logic, DB, API, analytics, RevenueCat, Firebase, auth, feature-flag definitions, routing tables, and business rules remain untouched.

---

## Previous vs New

| | Previous (pre / early Phase 2) | New (this manufacture) |
|---|---|---|
| Opening | Ecosystem welcome · neon V2/live heroes · emoji session carousel · five peer section cards always under fold | **Today's Help** FE hero → one recommend → quiet paths only |
| Hierarchy | Feature catalogue / marketplace under calm open | **Deepen-in-place** — mount **one** path section after choose; no peer catalogue under open |
| Photography | Violet SaaS / none | Help FE `shot-02-relationship` + ambient continuity |
| Materials | Violet / fuchsia / sky product glass | FE / sanctuary night light + Hub door glass |
| Typography | Tool / session / discover chips | Quicksand sanctuary · companionship sentence first |
| Premium | `TryFreeBadge` · Unlock theatre on locks | Hidden Try Free; `ParentHubQuietModuleProvider` → `PREMIUM_VOICE` / **Continue with AmyNest**; continuity: *We'll continue helping as your child grows* |
| Navigation | Back to Hub shell title | Back to **Help** room · **Back to Today Home** exit |
| Loading | Generic loading card | Calm companionship copy + sanctuary skeleton |
| Empty | Hub empty body | Gentle guidance + add child + Home exit |
| Completion | Catalogue restart energy | Continuity invitation + life exit |
| Recommend | Could divert open to `/speech-coach-v2` neon | Stays **inside the room** (deepen); V2/live/talk remain under More |
| More nest | Raw session keys (`quick`, `bedtime`…) | Human labels · quiet purpose lines |
| Rollback | — | `VITE_FF_SPEECH_COACH_LIVING_V1=0` → legacy catalogue (flag unchanged) |

---

## Screenshots

| Artifact | Path |
|---|---|
| Living hierarchy (open + deepen) | `/opt/cursor/artifacts/speech-coach-phase2-living.png` |
| Opening crop | `/opt/cursor/artifacts/speech-coach-phase2-opening.png` |

<img alt="Speech Coach Phase 2 living hierarchy" src="/opt/cursor/artifacts/speech-coach-phase2-living.png" />

---

## What shipped (code)

| Path | Change |
|---|---|
| `lib/speech-coach/living-room.ts` | Deepen recommend (no V2 divert); quiet paths; human more-session labels; quiet-id guard |
| `lib/speech-coach/living-room.test.ts` | Unit tests for deepen hierarchy + labels |
| `components/speech-coach/speech-coach-living-room.css` | Active path · deepen panel · more-session sanctuary materials |
| `pages/speech-coach/index.tsx` | Living layout: deepen-only body · quiet provider · companionship voice · Home exit · More nest |
| `components/route-skeletons/speech-coach-skeleton.tsx` | Sanctuary skeleton copy continuity |
| Import | `first-experience-material.css` (reuse only — Welcome CSS not edited) |
| Photo source | `ROOM_HEROES.help` → `/experience/r1/shot-02-relationship.png` |

**Untouched / frozen:**  
Welcome · Signup Keep · Child Discovery · Today Home · Parent Hub room IA · Infant Care · `@workspace/speech-coach` engines · `@workspace/speech-coach-v2` engines · mic/voice ownership · conversation logic · API client contracts · analytics funnels · RevenueCat / entitlements / quotas · Firebase · Auth · routing tables · deep-link section anchors (`speech-section-*`) · feature-flag **definitions** (existing `VITE_FF_SPEECH_COACH_LIVING_V1` reused).

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Help quiet path continuity; first route frame uses FE Help light; no marketing hero / patent / XP |
| Opening O1–O5 | **PASS** — one Help companionship sentence; no catalogue / dashboard first |
| Hero H1–H4 | **PASS** — FE relationship photography |
| Typography T1–T5 | **PASS** — Quicksand sanctuary rhythm; no UNLOCK shout |
| Materials M1–M5 | **PASS** — FE / Hub glass; violet storefront removed from opening |
| Navigation N1–N6 | **PASS** — back to Help path; Home exit present |
| Premium P1–P5 | **PASS** — entitlements unchanged; quiet-room `PREMIUM_VOICE` only |
| Loading L1–L4 | **PASS** — calm companionship copy + sanctuary skeleton |
| Empty X1–X3 | **PASS** — gentle guidance; Home path; no upsell |
| Error R1–R4 | **PASS** — existing section errors unchanged; no unlock-to-fix framing added |
| Success S1–S3 | **PASS** — opening manufacturing does not add confetti/XP chrome |
| Completion C1–C4 | **PASS** — Home exit + quiet continuity invitation |

---

## Apple Checklist

| Rule | Result |
|---|---|
| Same home | **YES** |
| Same light | **YES** |
| Same material system | **YES** (opening + deepen chrome) |
| Same emotional voice | **YES** |
| Same calm | **YES** (opening; catalogue no longer under fold) |
| Same photography language | **YES** |
| No product marketing | **YES** (living opening) |
| No SaaS energy | **YES** (living open / deepen; More still hosts tools) |
| Blind recognition without logo | **YES** |
| Opening does not feel like another app | **YES** |

---

## Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** migrations / schema changes |
| API | **Zero** contract changes |
| Firebase | Unchanged |
| RevenueCat / entitlements / quotas | **Zero** changes (`hub_speech_session` = 3 remains) |
| OAuth / Auth | Unchanged |
| Routing tables | Unchanged — `/speech-coach*` paths preserved |
| Deep links | `speech-section-*` ids preserved; deepen mounts matching section |
| Feature flags | Existing `VITE_FF_SPEECH_COACH_LIVING_V1` reused (default ON) — **not redefined** |
| Speech engines / AI / conversation | **Frozen — untouched** |
| Analytics | No rewrite |
| Accessibility | Recommend / quiet / More are buttons; `aria-expanded` on More; `aria-current` on active path; quiet-room lock aria uses `PREMIUM_VOICE`; reduced-motion honored |
| Performance | Catalogue not mounted until deepen; More deferred |

### Rollback

1. `VITE_FF_SPEECH_COACH_LIVING_V1=0` → legacy catalogue home  
2. Git revert of this Phase 2 manufacture commit  
3. Never flip entitlements to “fix” UI  

---

## DB Review

| Item | Result |
|---|---|
| Schema / migrations | **NONE** |
| Soft tenancy / FKs | Untouched |
| Child data writes | Existing section behavior only after deepen |

**PASS**

---

## API Review

| Item | Result |
|---|---|
| OpenAPI / Orval clients | Untouched |
| Speech STT / coach endpoints | Untouched |
| Expert waitlist | Still under More / empty legacy path only |

**PASS**

---

## Analytics Review

| Item | Result |
|---|---|
| Funnel rewrites | **NONE** |
| New tracking plane | **NONE** |
| AppLink `source=` tags | Preserved / additive for back · exit · more links only |

**PASS** — no analytics product change.

---

## Accessibility Review

| Item | Result |
|---|---|
| Hierarchy | One h1 companionship title; path buttons labeled by title+purpose |
| Active path | `aria-current` + `data-active` |
| More nest | `aria-expanded` |
| Locked sections (after deepen) | Quiet-room continuity voice via provider |
| Motion | `prefers-reduced-motion` honored in living CSS |
| Loading / empty | `role="status"` / clear CTA + Home exit |

**Accessibility Score: 8.7 / 10**

---

## Regression Review

| Surface | Result |
|---|---|
| Welcome / Signup / Discovery / Today Home | **Frozen — untouched** |
| Parent Hub room IA | **Frozen — untouched** |
| Infant Care | **Frozen — untouched** |
| Legacy Speech Coach (`VITE_FF_SPEECH_COACH_LIVING_V1=0`) | Preserved |
| Live / Talk / V2 routes | Still reachable under More when configured — not opening truth |
| Games rewards / neon interiors | Residual debt (nested routes) — not opening chrome |

**PASS** for manufacturing scope.

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts`) |
| Production build | **PASS** |
| Founder Review | **PASS** vs order (manufacture experience only) |
| Production Safety | **PASS** |
| Regression Review | **PASS** |
| Accessibility Review | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **9.0 / 10** | Companionship room + deepen hierarchy; engines frozen |
| **Apple Score** | **8.7 / 10** | Opening same-home; nested V2/live/talk neon still residual under More |
| **Accessibility Score** | **8.7 / 10** | Active path + quiet locks + calm states |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured opening and deepen chrome.

---

## Remaining Debt (does not reopen this order)

1. **`/speech-coach-v2` session interior** — still product/sky language after More leave  
2. **Live session / Talk with Amy** — neon immersive debt (legacy; subordinated under More when living)  
3. **Games rewards / coins chrome** inside `speech-game-flow` — not opening chrome; future polish  
4. **Hub speech-coach Stories card config** — neon gradients on collapsed tile remain Hub presentation debt (room IA frozen; Pack 5 softens quiet open)  
5. **Nutrition** — **not started** — wait for Founder approval  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Feature mall removed from opening | **YES** |
| Catalogue no longer always under fold | **YES** |
| Today's Help + one recommendation | **YES** |
| Quiet supporting destinations deepen one path | **YES** |
| FE photography + sanctuary materials | **YES** |
| Premium continuity voice (no Unlock / Try Premium) | **YES** |
| No RC / entitlements / API / DB / engine changes | **YES** |
| Reuse Before Rewrite | **YES** |
| Existing flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Speech Coach Phase 2 complete.  
**Do not begin Nutrition or any next module.**  
Wait for Founder approval.
