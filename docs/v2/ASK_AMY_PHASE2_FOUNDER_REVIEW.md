# Ask Amy Phase 2 — Founder Review

**Status:** MANUFACTURED — COMPANIONSHIP ONLY  
**Date:** 2026-08-07  
**Authority:** Founder Order — Ask Amy Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** `6856759a` (`6856759aa29184f0bafd2c39a124592d7fc6f268`)

**STOP after this module.** Next destination only after Founder acceptance.

Birth Sky remains frozen.

---

## Mission result

Ask Amy + Emotional Support are no longer an emoji tip mall / mood marketplace that dumps into **“Amy AI Assistant”** chatbot SaaS.

They open as **Today's Help** — one companionship room: Help FE photography, one human sentence (**Amy is here for {name}**), quiet ways (**Ask now** · **When feelings are heavy**), gentle prompt deepen, soft-enter to Amy with companionship chrome.

**Kept:** AI · prompts · memory · APIs · entitlements.  
**Removed from first impression:** chatbot desk · mode mall · support-desk energy.

---

## Emotional target

| Forbidden feeling | Required feeling |
|---|---|
| Chatbot | Companionship |
| Support desk | You are not alone |
| Emoji prompt mall | Gentle starting places |
| Mode SKU tabs (Teach/Quiz…) | One calm conversation |
| “Amy AI Assistant” product | Amy is here |

---

## Previous vs New

| | Previous | New (Phase 2) |
|---|---|---|
| Opening | Premium shelf + emoji grid → `/assistant` | **Today's Help** FE hero → Amy is here → quiet ways |
| Hierarchy | Ask Amy and Emotional as separate product expands | One Help companionship spine |
| Photography | None on expand | Help FE `shot-02-relationship` |
| Materials | Glass tip/mood mall | Sanctuary companionship surface |
| Assistant open | “Amy AI Assistant” + WEB_MODES + topic grid | Soft-enter `?companion=1`: “Amy is here”; modes/topic mall hidden |
| Prompts | Kept as emoji tiles | Kept as calm text links (same i18n prompts) |
| Emotional | Mood marketplace + bounce CTA | Feelings path inside same room |
| Premium | Pack 5 quiet on shelves | `PREMIUM_VOICE` on living; gates unchanged |
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
| `lib/ask-amy/living-room.ts` | Recommend + quiet paths + companion href + flag |
| `lib/ask-amy/living-room.test.ts` | Unit tests |
| `components/ask-amy/ask-amy-living-room.css` | Sanctuary companionship materials |
| `components/ask-amy/ask-amy-living-stream.tsx` | FE Help hero + paths + prompt deepen (prompts reused) |
| `components/parent-hub/parent-hub-rooms-shell.tsx` | Ask Amy / Emotional open companionship stream |
| `components/parent-hub/parent-hub-room.test.tsx` | Companionship case |
| `pages/parenting-hub.tsx` | Wires `renderAskAmyStream` |
| `pages/assistant.tsx` | Companionship chrome when `?companion=1` (APIs untouched) |
| Photo | `ROOM_HEROES.help` → `/experience/r1/shot-02-relationship.png` |

**Untouched:**  
Welcome · Signup · Discovery · Today Home · Parent Hub room IA · Birth Sky · `/api/ai/assistant-ai` · `/api/ai/messages` · daily briefing fetch · prompt string content · SubItemGate / FeatureGate entitlement math · Speech Coach · Firebase · routing tables · deep-link ids (`ask-amy`, `emotional`, `amy-ai`).

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Help quiet path; Pack 5 slot |
| Opening O1–O5 | **PASS** — one human sentence; no chatbot / catalogue first |
| Hero H1–H4 | **PASS** — FE relationship photography |
| Typography T1–T5 | **PASS** — sanctuary; no ASSISTANT / UNLOCK shout |
| Materials M1–M5 | **PASS** — FE / Hub glass; emoji mall removed from open |
| Navigation N1–N6 | **PASS** — exits + companion soft-enter; deep links preserved |
| Premium P1–P5 | **PASS** — entitlements unchanged; `PREMIUM_VOICE` on living |
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
| Same material system | **YES** (living open) |
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
| AI APIs / memory | **Untouched** |
| Prompt corpus | **Preserved** (presentation reuse) |
| Firebase | Unchanged |
| RevenueCat / quotas | **Zero** changes |
| Routing | `/assistant` preserved; companion query additive |
| Deep links | `amy-ai` / `emotional` → companionship stream |
| Feature flags | New `VITE_FF_ASK_AMY_LIVING_V1` (default ON) |

### Rollback

1. `VITE_FF_ASK_AMY_LIVING_V1=0` → legacy emoji shelves  
2. Omit `companion=1` → legacy assistant chrome  
3. Git revert of Phase 2 commit  

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts`, hub room shell) |
| Production build | **PASS** |
| Founder Review | **PASS** vs order (companionship; keep AI/prompts/memory/APIs) |
| Apple Review | **PASS approaching** — Help open companionship; non-companion assistant residual |
| Parent Review | **PASS** — Amy is here first |
| Engineering Review | **PASS** — flag + reuse + APIs frozen |
| Database Review | **PASS** |
| Growth Review | **PASS** — Premium continuity; no desk upsell on open |
| Production Safety | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **8.7 / 10** | Chatbot/desk feeling removed from Help open |
| **Apple Score** | **8.3 / 10** | Same-home companionship; direct assistant residual |
| **Accessibility Score** | **8.3 / 10** | Hero contrast + calm links + exits |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured Help companionship open.

---

## Remaining Debt (does not reopen this order)

1. **Direct `/assistant` without companion** — still mode-tab SaaS chrome  
2. **Quota / upgrade Zap banner** — entitlement UI residual inside thread  
3. **Help peer doors** (Speech / PTM / Life Skills) — still catalogue beside companionship  
4. **Next modules** — not started  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Chatbot / support-desk feeling removed from open | **YES** |
| Companionship manufactured | **YES** |
| Ask Amy + Emotional one Help spine | **YES** |
| AI / prompts / memory / APIs kept | **YES** |
| FE photography + sanctuary materials | **YES** |
| Premium continuity voice | **YES** |
| Reuse Before Rewrite | **YES** |
| Flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Ask Amy Phase 2 complete.  
**Do not begin the next module.**  
Wait for Founder approval.
