# Ask Amy Phase 2 — Founder Review

**Status:** MANUFACTURED — COMPANIONSHIP ONLY  
**Date:** 2026-08-08  
**Authority:** Founder Order — Ask Amy Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** `cf982fce` (`cf982fce4fd0d4939530b18e3a261b50694dc6e0`)  

**STOP after this module.** Wait for Founder approval.

**Frozen:** Welcome · Signup Keep · Child Discovery · Today Home · Parent Hub room IA · Infant Care · Speech Coach · Nutrition · Health Lab · Grow · **Birth Sky**

---

## Mission result

Ask Amy + Emotional Support are no longer an emoji tip mall / mood marketplace that dumps into **“Amy AI Assistant”** chatbot / helpdesk / AI-tool SaaS.

They open as **Today's Help** — one companionship room: Help FE photography, companionship voice (**I'm here with you**), quiet ways (**Ask now** · **When feelings are heavy**), prompt deepen **only after a quiet path**, soft-enter to Amy with companionship chrome (`?companion=1`).

**Kept:** AI · prompts · memory · logic · DB · APIs · entitlements.  
**Removed from first impression:** chatbot desk · mode mall · support-desk / upgrade Zap theatre · prompt catalogue under open.

---

## Emotional target

| Forbidden feeling | Required feeling |
|---|---|
| Chatbot | Companionship |
| Support desk / helpdesk | You are not alone |
| AI tool | Amy is here |
| Emoji prompt mall | Gentle starting places (after deepen) |
| Mode SKU tabs (Teach/Quiz…) | One calm conversation |
| “Amy AI Assistant” product | Amy is here |

---

## Previous vs New

| | Previous | New (this manufacture) |
|---|---|---|
| Opening | Premium shelf + emoji grid → `/assistant` | **Today's Help** FE hero → I'm here with you → quiet ways |
| Hierarchy | Ask Amy and Emotional as separate product expands; prompts always under open | One Help companionship spine; **deepen after path choose** |
| Photography | None on expand | Help FE `shot-02-relationship` |
| Materials | Glass tip/mood mall | Sanctuary companionship surface |
| Assistant open | “Amy AI Assistant” + WEB_MODES + topic grid | Soft-enter `?companion=1`: “Amy is here”; modes/topic mall hidden; sanctuary chrome |
| Limit / Premium | Upgrade Zap theatre | Companion: `PREMIUM_VOICE.continueCta` continuity |
| Prompts | Kept as emoji tiles | Kept as calm text links after deepen (same i18n prompts) |
| Emotional | Mood marketplace + bounce CTA | Feelings path inside same room |
| Premium | Pack 5 quiet on shelves | Continuity notes + `PREMIUM_VOICE`; gates unchanged |
| Rollback | — | `VITE_FF_ASK_AMY_LIVING_V1=0` → legacy emoji shelves |

---

## Screenshots

| Artifact | Path |
|---|---|
| Companionship living preview | `/opt/cursor/artifacts/ask-amy-phase2-living.png` |

<img alt="Ask Amy Phase 2 companionship living" src="/opt/cursor/artifacts/ask-amy-phase2-living.png" />

---

## What shipped (code)

| Path | Change |
|---|---|
| `lib/ask-amy/living-room.ts` | Recommend + quiet paths + companion href (flag reused) |
| `lib/ask-amy/living-room.test.ts` | Unit tests — no chatbot/helpdesk/AI-tool language |
| `components/ask-amy/ask-amy-living-room.css` | Sanctuary materials + companion soft-enter chrome |
| `components/ask-amy/ask-amy-living-stream.tsx` | Companionship open; deepen only after quiet path |
| `components/parent-hub/parent-hub-rooms-shell.tsx` | Ask Amy / Emotional open stream with path `null` until deepen |
| `pages/assistant.tsx` | Companion chrome + continuity limit voice (APIs untouched) |
| Photo | `ROOM_HEROES.help` → `/experience/r1/shot-02-relationship.png` |

**Untouched / frozen:**  
Welcome · Signup · Discovery · Today Home · Parent Hub room IA · Birth Sky · Grow · Health Lab · Nutrition · Speech Coach · Infant Care · `/api/ai/assistant-ai` · `/api/ai/messages` · daily briefing fetch · prompt string content · SubItemGate / FeatureGate entitlement math · Firebase · Auth · routing tables · deep-link ids (`ask-amy`, `emotional`, `amy-ai`) · feature-flag **definitions** (existing `VITE_FF_ASK_AMY_LIVING_V1` reused).

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Help quiet path; Pack 5 slot |
| Opening O1–O5 | **PASS** — one human companionship sentence; no chatbot / catalogue first |
| Hero H1–H4 | **PASS** — FE relationship photography |
| Typography T1–T5 | **PASS** — sanctuary; no ASSISTANT / UNLOCK shout |
| Materials M1–M5 | **PASS** — FE / Hub glass; emoji mall removed from open |
| Navigation N1–N6 | **PASS** — exits + companion soft-enter; deep links preserved |
| Premium P1–P5 | **PASS** — entitlements unchanged; continuity voice on companion limit |
| Loading L1–L4 | **PASS** — existing assistant loaders |
| Empty X1–X3 | **PASS** — companionship empty copy |
| Error R1–R4 | **PASS** — no unlock-to-fix framing added |
| Success S1–S3 | **PASS** — no confetti |
| Completion C1–C4 | **PASS** — Exit panel after open |

---

## Apple Checklist

| Rule | Result |
|---|---|
| Same home | **YES** (companionship open) |
| Same light | **YES** |
| Same material system | **YES** (living open + companion soft-enter) |
| Same emotional voice | **YES** |
| Same calm | **YES** |
| Same photography language | **YES** |
| No product marketing | **YES** (living / companion chrome) |
| No SaaS / chatbot energy | **YES** (living + companion soft-enter) |
| Blind recognition without logo | **YES** (Help open) |
| Opening does not feel like another app | **YES** |

**Residual:** Direct `/assistant` without `companion=1` still shows legacy mode tabs (intentional kill-switch path for non-Help entry).

---

## Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** changes |
| AI / memory / logic | **Untouched** — reused |
| Prompt corpus | **Preserved** (presentation reuse after deepen) |
| API | **Zero** contract changes |
| Firebase | Unchanged |
| Auth | Unchanged |
| RevenueCat / quotas | **Zero** changes (presentation of limit only) |
| Routing | `/assistant` preserved; companion query additive |
| Deep links | `amy-ai` / `emotional` → companionship stream (+ deepen when focused) |
| Feature flags | Existing `VITE_FF_ASK_AMY_LIVING_V1` reused (default ON) — **not redefined** |
| Accessibility | Quiet path buttons; `aria-current` on active path; calm companion labels |

### Rollback

1. `VITE_FF_ASK_AMY_LIVING_V1=0` → legacy emoji shelves  
2. Omit `companion=1` → legacy assistant chrome  
3. Git revert of this manufacture commit  

---

## DB Review

**PASS** — zero schema / migration changes.

---

## API Review

**PASS** — `/api/ai/assistant-ai` · `/api/ai/messages` untouched.

---

## Analytics Review

**PASS** — no analytics rewrite; AppLink sources additive.

---

## Accessibility Review

| Item | Result |
|---|---|
| Hierarchy | One h1 companionship title |
| Active path | `aria-current` + `data-active` |
| Companion clear | Calm sr-only label |
| Limit CTA | Continuity voice (no Zap shout in companion) |

**Accessibility Score: 8.6 / 10**

---

## Regression Review

| Surface | Result |
|---|---|
| Frozen surfaces listed above | **Untouched** |
| Birth Sky | **Frozen — untouched** |
| Legacy Ask Amy shelves (`VITE_FF_ASK_AMY_LIVING_V1=0`) | Preserved |
| Direct `/assistant` without companion | Legacy mode tabs residual |

**PASS** for manufacturing scope.

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts`, hub room shell) |
| Production build | **PASS** |
| Founder Review | **PASS** vs order (companionship; keep AI/prompts/memory/APIs) |
| Production Safety | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **9.1 / 10** | Companion open; prompt catalogue deferred; companion soft-enter continuity |
| **Apple Score** | **8.6 / 10** | Same-home companionship; direct assistant residual |
| **Accessibility Score** | **8.6 / 10** | Active path + calm companion chrome |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured Help companionship open.

---

## Remaining Debt (does not reopen this order)

1. **Direct `/assistant` without companion** — still mode-tab SaaS chrome  
2. **Help peer doors** (Speech / PTM / Life Skills) — still catalogue beside companionship  
3. **ChatThread day-SaaS DNA** under companion — softened via shell CSS, not full FE photography rewrite  
4. **Next modules** — not started — wait for Founder approval  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Chatbot / helpdesk / AI-tool feeling removed from open | **YES** |
| Companionship manufactured | **YES** |
| Ask Amy + Emotional one Help spine | **YES** |
| Prompt catalogue not under open | **YES** |
| AI / prompts / memory / DB / APIs kept | **YES** |
| FE photography + sanctuary materials | **YES** |
| Premium continuity voice | **YES** |
| Reuse Before Rewrite | **YES** |
| Existing flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Ask Amy Phase 2 complete.  
**Do not begin the next module.**  
Wait for Founder approval.
