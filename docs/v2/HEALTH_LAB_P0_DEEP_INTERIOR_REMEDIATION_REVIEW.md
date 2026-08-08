# Health Lab P0 — Deep Interior Remediation Review

**Status:** IMPLEMENTED — awaiting Founder review  
**Authority:** Founder Order — Health Lab P0 Deep Interior Remediation  
**Flag:** `VITE_FF_HEALTH_LAB_LIVING_V1` (default ON; OFF = legacy neon adventure)  
**Source audit:** `docs/v2/AMYNEST_PRE_FINAL_APPLE_PORTFOLIO_CONSISTENCY_AUDIT.md`  
**Branch:** `cursor/product-execution-model-v2`

**Frozen (not modified):**

- Grow · Birth Sky · Speech Coach · Parent Hub · P0-7 · Routine Generation · Amy Coach · Amy Audio  
- Health engines · scoring · anti-cheat · motion sensor math · shop purchase logic · sync · analytics event names  
- DB · API · RevenueCat · Firebase · Auth · entitlements · routes · deep links  

**Law:** Experience only. Living ON → Care sanctuary practice. Living OFF → legacy rollback preserved.

---

## 1. Before state

Living **entry** (Phase 2) was already AmyNest Care house.

Deep practice still hard-cut into a neon wellness/game OS:

| Surface | Pre-state |
|---|---|
| Onboarding | “Mission Briefing”, Reward chip, Zap + “Start Adventure” |
| Motion prep | `#0a0f2e` galaxy dialog, world CTAs |
| Stage chrome | Violet topbar, Zap CTAs, neon chips/timers |
| Hold control | Cyan→violet→fuchsia glow orb + ripple theatre |
| Mid-game victory | SPACE EXPLORER / Sky Kingdom / Crystal Reactor + confetti |
| Reaction | “LAUNCH — TAP NOW!”, fireworks launch pad |
| Progress | XP / coins / Unlocked / Daily Quests first |
| Completion audio | Level-up / quest / achievement SFX |
| Leave | Back to Care only — no Today Home / Hub continuity |

**Blind House (before):** Did I enter a separate health/game application? **YES.**

---

## 2. Deep interior inventory (remediated under living ON)

| Element | Action |
|---|---|
| Galaxy starfield | Already null when living; preserved |
| Stage mesh / neon orbs | Living stage cream night; game overrides demoted |
| Onboarding Mission / Reward / Zap | Care briefing · Begin gently · no reward theatre |
| Motion prep neon shell | Sanctuary panel · I'm ready · Care practice |
| TopBar / Timer / Chips / CTA / Panel | Cream sanctuary chrome |
| `HealthLabHoldOrb` + Balloon hold button | Cream hold · no neon glow/ripples |
| PhaseFlash | Soft sand flash (not cyan/violet) |
| Mission banners / round rail | Quiet Care tones |
| Launch pad fireworks / smoke | Suppressed; calm signal pad |
| Balloon / Sky / Reactor mid-victory | “We did this” · confetti off · Continue |
| Reaction rocket dialect | Attention practice copy |
| Breath/Flamingo/Freeze/Finger world skins | Demoted or hidden; sanctuary stage |
| Progress page | Practice notes · no XP-first / Unlocked journey |
| Celebration / session SFX | Silenced when living |
| Session rewards leave | `AmyNestLeaveContinuity` + Back to Care |

**Living OFF:** full neon adventure face preserved.

---

## 3. Practice experience

Parent can answer:

| Question | Living answer |
|---|---|
| What are we doing? | Named Care practice (Breath & focus, Balance, …) |
| Why? | Calm wellness step — Amy with you |
| What now? | Begin gently / Hold gently / Tap now |
| What next? | Quiet practice note → Back to Care / life exits |
| What did we accomplish? | “We did this” / Effort · Together · Noted |

Exercise remains the hero; UI supports activity rather than competing as a game world.

---

## 4. Visual changes

| Asset | Role |
|---|---|
| `health-lab-living-deep.css` | Shared deep sanctuary materials (Speech-deep analogue) |
| `HEALTH_LAB_LIVING_DEEP_PALETTE` + helpers in `living-room.ts` | Copy / CTA / complete / progress voice |
| Shared chrome in `health-lab-game-ui.tsx` | TopBar · Hero · CTA · Chips · Panel · Timer · HoldOrb |
| Immersive host | `hl-living-deep` + `data-hl-living` |

Reuses Care night `#120e18` + champagne sand — **no new Health Lab design system**.

---

## 5. Motion

| Motion | Living ON |
|---|---|
| Constant galaxy / starfield | Off |
| Hold neon pulse / ripples | Off |
| Victory confetti / shake | Off |
| Launch fireworks / smoke | Off |
| Phase response flash | Soft sand, shorter |
| Dance lights / reactor hum theatre | Off / quieted |
| Reduced motion | Deep CSS + framer gates respect preference |

Motion communicates: start · interaction · response · completion.

---

## 6. Progress

| Data | Presentation when living |
|---|---|
| Scoring / XP / quests / badges / coins | **Logic preserved** |
| XP-first / coins / Unlocked journey / Daily Quests UI | **Hidden or demoted** |
| Quiet face | Practice notes · Quiet bests · Moments noted |
| Grown-ups dashboard | Still reachable; not remanufactured as primary |

---

## 7. Premium

- Pricing / RevenueCat / entitlements / quotas **unchanged**
- P0-7 Hard-Day Law **unchanged** (no P0-7 file edits)
- No Unlock / FOMO / PRO marketplace added
- Living completion uses continuity exits, not reward theatre

---

## 8. Loading

No neon spinner / game loading theatre added. Existing calibration / ready dialogs use Care language when living.

---

## 9. Empty

Living progress hides unearned badge wall noise; empty bests show “—”. No feature catalogue fallback invented.

---

## 10. Error

Motion simulation / device limits retain truthful copy (softened living simulation card already present). Recovery: Back / leave continuity / retry via existing controls. No science-app error skin added.

---

## 11. Completion

| Before | After (living) |
|---|---|
| SPACE EXPLORER / Amazing! / confetti | **We did this** · Continue |
| XP / quest / stars theatre | Effort · Together · Noted |
| Browse loop | Back to Care + Today Home / Parent Hub leave |

---

## 12. Accessibility (STATIC ONLY)

| Item | Status |
|---|---|
| Dialog roles on prep / victory / rewards | Preserved |
| Hold / CTA `min-h-[48px]` / 48px+ targets | Living hold + primary CTAs |
| `aria-label` on hold / exit / tap zone | Preserved / calm labels |
| Live region messages | Preserved |
| Reduced motion | Deep CSS + living flash/victory gates |
| Semantic eyebrow / title / panel | Living deep classes |
| VoiceOver / Dynamic Type / TalkBack | **NOT claimed** — P0-9 separate |

---

## 13. Performance

- No new API / polling / duplicate fetches  
- No large new assets  
- Living **removes** heavy confetti / fireworks / city/sky layers in several games  
- CSS + conditional render only  

---

## 14. Production safety

| Risk | Mitigation |
|---|---|
| Dual face regression | Flag OFF restores neon adventure |
| Engine drift | Scoring / sensors / storage untouched |
| Route / deep-link break | `/health-lab` unchanged |
| Cross-portfolio freeze | Grow / Birth Sky / Speech / Hub / P0-7 / Routine / Coach / Audio untouched |

---

## 15. Tests

| Suite | Result |
|---|---|
| `living-room.test.ts` (incl. deep helpers) | **PASS** |
| `health-lab.test.ts` (engines) | **PASS** |
| P0-7 `hard-day-monetization.test.ts` | **PASS** |
| P0-6 `parent-hub-room.test.tsx` + `room-living.test.ts` | **PASS** |
| Speech `living-room.test.ts` | **PASS** |
| Portfolio nav / locked-block quiet | **PASS** |
| TypeScript `pnpm run typecheck` | **PASS** |
| Production build | **PASS** |

Flag default ON verified by living-room tests. Legacy OFF path retained in code (no deletion).

---

## 16. Build

Kidschedule production build **PASS** (`health-lab-*.js` emitted). SEO asset generation OK.

---

## 17. Screenshots

Auth-gated cloud environment blocked signed-in immersive practice capture (same constraint as Speech P0 deep review).

**Documented living ON evidence (code):**

- `hl-living-deep` / cream hold / Begin gently / We did this / leave continuity  
- Neon hold orb / SPACE EXPLORER / LAUNCH / XP progress gated behind `!living`

**Founder device screenshot pack:** remaining debt (authenticated).

---

## 18. Blind test

Hide AmyNest branding. Living ON deep practice:

| Question | Target | Result |
|---|---|---|
| Separate health/game application? | **NO** | **MOSTLY NO** — sanctuary stage + quiet victories; some world motifs may still peek in wellness/calmness paths |
| Feel like Care inside AmyNest? | **YES** | **YES** on briefing · hold · reaction · major victories · completion |
| Exercise more important than UI? | **YES** | **YES** — glow/confetti/XP theatre removed from default face |

Honest residual: Calmness / wellness-journey and some world motif components were softened via shared chrome + stage; full motif remanufacture of every decorative sub-scene is listed as debt if Founder wants pixel-perfect stillness.

---

## 19. Founder score

| Dimension | Score (0–10) | Note |
|---|---|---|
| Care house continuity (deep) | **8.5** | Blocker neon stage remade |
| Practice clarity | **9** | What / why / now / next clear |
| Motion calm | **8.5** | Theatre suppressed |
| Progress humility | **8** | XP-first removed on living progress |
| Completion trust | **9** | We did this + leave |
| Rollback safety | **10** | Flag OFF intact |
| Engine safety | **10** | Untouched |

**Overall deep-interior craft:** **8.5 / 10** (was ~3 as foreign game OS).

---

## 20. Apple readiness

| Question | Answer |
|---|---|
| Health Lab deep practice still a portfolio blocker? | **NO** (living ON) |
| Ready for Final Apple Audit now? | **NOT YET** — Grow leave + Birth Sky Astro deepen + device a11y remain from pre-final audit |
| Health Lab contribution to one-house claim | **PASS** under living defaults |

---

## 21. Remaining debt

1. Authenticated screenshot pack on Founder device  
2. Calmness / wellness-journey decorative residual polish (P2)  
3. Dashboard grown-ups insights still violet SaaS if opened (secondary)  
4. Shop remains legacy if deep-linked / flag OFF  
5. Some i18n keys still adventure dialect when living OFF (intentional)  
6. Final Apple Audit — **not started**  
7. Grow / Birth Sky blockers — **not started** (frozen here)

---

## 22. Rollback

```bash
VITE_FF_HEALTH_LAB_LIVING_V1=0
```

Restores: Mission Briefing · neon hold · galaxy prep · rocket dialect · XP progress · confetti victories · celebration SFX · adventure home (Phase 2 OFF face).

---

## 23. Commit SHA

_Fill after commit:_

| Item | Value |
|---|---|
| Implementation commit | _(pending)_ |
| Review doc commit | _(same or follow-up stamp)_ |

---

## 24. Files touched (experience layer)

- `lib/health-lab/living-room.ts` (+ test)  
- `components/health-lab/health-lab-living-deep.css` **(new)**  
- `features/health-lab/components/health-lab-game-ui.tsx`  
- `health-lab-onboarding.tsx` · `health-lab-motion-prep.tsx` · `health-lab-cinematic.tsx`  
- `health-lab-immersive-host.tsx` · `health-lab-zone.tsx`  
- `health-lab-progress.tsx` · `health-lab-session-rewards.tsx`  
- Games: breath · flamingo · freeze · finger · reaction  
- Victories/hold: balloon-journey · sky-island · crystal-reactor  

**Not touched:** scoring, storage, shop math, sync, analytics taxonomy, RC, Firebase, Hub, Speech, Grow, Birth Sky, P0-7.

---

**END — STOP FOR FOUNDER REVIEW**

No Final Apple Audit performed.  
No Grow / Birth Sky / Speech / Hub / P0-7 / Routine / Coach / Audio changes.
