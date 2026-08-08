# AmyNest P0/P1 Remediation — Implementation Map

**Status:** MAP ONLY → then experience-layer SELECT implementation  
**Audit baseline:** `4893a769`  
**HEAD before coding:** `4893a7690ef57c165ed96981128c8cc34cad7f9a`  
**Authority:** Founder Order — Portfolio P0/P1 Remediation  
**Source:** `docs/v2/AMYNEST_FINAL_PORTFOLIO_REMEDIATION_AUDIT.md`

**Law:** Current code is source of truth. No engine / DB / RC / Firebase / Hub IA / entitlement changes.  
**Ambiguous or business/ops items:** STOP + report (not guessed).

---

## P0 — SELECT (implement this pass)

| ID | Finding | Exact current surface | Evidence | Intended fix | Files / components | Risk |
|---|---|---|---|---|---|---|
| **P0-1 (slice)** | Leave-paths break one-house continuity | Speech live/talk leave; Grow leave shell; Assistant deepen | Leave apps return only to module parent; no calm Home/Hub ritual | Add reusable **leave continuity exits** (Home · Hub) on leave shells; light FE/sanctuary chrome where shell already exists — **not** full XL remanufacture of every interior | New `amy-nest-leave-continuity.tsx` (or reuse RG exits pattern); wire `live-speech-coach.tsx`, `pronunciation-companion.tsx` / talk leave, `hub-module-page-shell.tsx`, `assistant.tsx` | Medium — must avoid browse loops / new nav layers |
| **P0-2** | Speech neon/XP theatre on sessions | `SessionXPBar` XP labels; live score/points chrome | `pronunciation-companion.tsx`, `live-speech-coach.tsx` ignore living flag | When `VITE_FF_SPEECH_COACH_LIVING_V1` ON: hide/rename XP/% theatre; keep scoring side-effects silent; soften chrome language | `lib/speech-coach/living-room.ts` helpers; session pages | Low — presentation only |
| **P0-3** | Health XP/shop deepen betrayal | Mostly legacy branch when living OFF | Living home already demotes shop/XP | Verify living ON path; silence any residual XP/shop labels still visible under living | `health-lab-home.tsx`, rewards chrome if still shown under living | Low — mostly verify + residual polish |
| **P0-4** | Grow leave Unlock theatre | `HubModulePageShell` PremiumActionGate / PremiumBenefitsPanel | “Unlock with Premium” / “Unlock All Learning” | Presentation → `PREMIUM_VOICE` continuity copy; entitlements/gates untouched | `hub-module-page-shell.tsx`, `locked-block.tsx` mall branch | Low |
| **P0-5** | Assistant mode desk / Zap | `/assistant` without `?companion=1` | `companionMode` only URL; Zap when `!companionMode` | When Ask Amy living ON: treat as companion chrome by default (modes/Zap theatre off); entitlements/quota unchanged | `assistant.tsx`, `lib/ask-amy/living-room.ts` | Medium trust — copy only; **not** free quota |

## P0 — STOP + report (not implemented)

| ID | Finding | Why STOP |
|---|---|---|
| **P0-6** | Hub peer catalogues (Help/Care/Understand) | Requires Parent Hub **IA / Moments one-room remanufacture**. Hub room IA is **frozen**. |
| **P0-7** | Hard-day / emotional path monetization | Requires **business policy + entitlement/quota** behavior change. Not presentation-only. |
| **P0-8** | Dual living-flag universes / corpse delete | Flags remain **required rollback** until surfaces production-cleared. Deleting dual faces = ops/ship-face decision. Preserve flags. |
| **P0-9 (cert claim)** | A11y “certified” | Can improve labels/targets on touched surfaces; **cannot claim device VO/DT certification** without Founder device pass. |
| **P0-10** | Identity linking / RC ops / consent / tenancy | Backend / ops. Out of experience scope. |

---

## P1 — SELECT (implement this pass)

| ID | Finding | Exact current surface | Evidence | Intended fix | Files / components | Risk |
|---|---|---|---|---|---|---|
| **P1-1** | Tab / Home SKU dialect | Bottom tabs Dashboard / Routines / Parenting Hub | `mobile-tab-bar.tsx`; Coach already “Beside you” | Living places-of-life labels: **Home** · **Today's plan** (or calm Routines) · **Beside you** · **Rooms**; routes unchanged | `mobile-tab-bar.tsx`, living label helpers | Low |
| **P1-6** | Explore Free badge residue | Hub launch `previewBadge` props still compiled | Rooms quiet already suppresses display | Stop passing Explore Free / Premium theatre badges when rooms V1 ON | `parenting-hub.tsx` (props only) | Low |
| **P1-11 (slice)** | Points/XP theatre audible | Speech/Health leave + grow unlock (overlaps P0-2/3/4) | Covered by P0 SELECT chrome silence | Same as P0-2/3/4 | as above | Low |

## P1 — STOP + report / defer

| ID | Why not this pass |
|---|---|
| **P1-2** Birth Sky Astro wing | Larger residual wing; risk of reopening Birth Sky engine-adjacent UI beyond copy — defer unless clear chrome-only residual found during leave shell work |
| **P1-3** Nutrition SaaS tabs | Label-only possible but easy to over-touch Nutrition layout; defer unless trivial living label map exists |
| **P1-4** Curiosity | Soften-only OK; removing from `ROOM_DESTINATIONS` = Hub IA → STOP |
| **P1-5** Discovery Worlds | Hide≠heal; graph removal = Hub IA → STOP |
| **P1-7** Photography after AppLink | Partial via P0-1 leave continuity chrome; full FE ambient remanufacture = XL (slice only) |
| **P1-8** Talking Amy residual | Living already softens; deeper mode grid = reopen module without clear delta |
| **P1-9** Coach/Audio under-fold | Already manufactured; under-fold residue not highest ROI this pass |
| **P1-10** RG resume / soft-edit | Engine policy / FUTURE — STOP |
| **P1-12** Offline/perf proof | Infra proof — STOP |

## Intentionally NOT touched (already resolved / frozen)

- Welcome · Signup · Discovery · Today Home · Parent Hub room IA  
- Routine Generation engine + R1–R5 architecture (only exit href dialect if needed)  
- Amy Coach / Amy Audio / Speech / Nutrition / Health / Grow / Birth Sky / Ask Amy **engines**  
- RevenueCat · Firebase · Auth · Analytics contracts · DB / API  

## Dual-flag policy (this pass)

| Decision | Action |
|---|---|
| Keep all `VITE_FF_*_LIVING_V1` | Rollback preserved |
| Living ON | Apply continuity chrome / silence theatre |
| Living OFF | Legacy path remains reachable |
| No flag deletion | Per Founder dual-flag policy |

## Ambiguity log

| Item | Status |
|---|---|
| P0-7 free crisis path | **STOP** — needs Founder business order |
| P0-8 delete dual corpses | **STOP** — needs production-clear order |
| P0-6 Moments-standard Hub rooms | **STOP** — needs Hub remanufacture order |
| Full P0-1 XL interior remanufacture | **SLICE only** this pass (exits + chrome) — full interiors remain debt |

---

**Next:** Implement SELECT rows only · verify · write Implementation Review · commit · push · STOP.
