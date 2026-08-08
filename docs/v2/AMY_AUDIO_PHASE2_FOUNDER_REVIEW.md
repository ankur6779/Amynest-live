# Amy Audio Phase 2 — Founder Review

**Status:** MANUFACTURED — QUIET PRESENCE THROUGH SOUND  
**Date:** 2026-08-08  
**Authority:** Founder Order — Amy Audio Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  
**Also binding:** AmyNest Philosophy · Parent Hub Constitution · Pack 5 Premium Continuity  

**Commit SHA:** `PENDING_COMMIT_SHA`  

**STOP after this module.** Wait for Founder approval.  
Do **not** begin Routine Generation.  
Do **not** run the Final Apple Audit.  
Do **not** modify Amy Coach.

**Frozen / LOCKED:** Welcome · Signup Keep · Child Discovery · Today Home · Parent Hub · Infant Care · Speech Coach · Nutrition · Health Lab · Grow · Birth Sky · Ask Amy · Guidance · Moments · Talking Amy · Amy Coach  

---

## Mission result

Amy Audio is no longer a **Spotify-like / podcast catalogue / neon audio marketplace** as the living face of presence through sound.

It opens and continues as **another quiet room inside the AmyNest home**: FE Moments photography · companionship · one natural listen invitation · quiet paths · sanctuary shell · soft Premium continuity · usable player controls preserved · Hub entry softened to **Quiet listen**.

The parent should feel they can **stay for a few quiet minutes** — not that they opened an audio product.

**Kept (untouched):** Playback engine · lesson audio identity / warmup · static audio maps · TTS pipeline · lesson corpus · series progress logic · localStorage resume/complete · DB · APIs · Firebase · RevenueCat · entitlements · auth · analytics contracts · business rules · routing `/audio-lessons` · deep links `?goal=` · Amy Coach (frozen).

---

## 1. Current Experience Audit

| Area | Pre-manufacture finding |
|---|---|
| Entry | `/audio-lessons` · Parent Hub Activities nest · Amy Coach quiet link (living) / marketplace tile (legacy) · trial spotlight · `?goal=` |
| Catalogue | Six age Explore tiles · Quick Play · Daily Pick · Emergency CTA · series playlists |
| Player | Full sheet + mini bar — paragraph scrub, rate, prev/next |
| Progress | localStorage complete / resume maps |
| Favorites | None (reason string only) |
| Premium | Free sample per age · unlock banner · PREMIUM series lock · paywall `audio_lessons` |
| Living flag | **None** before this manufacture |
| Visual debt | `#0f0c29` neon night · Explore mall · Unlock / ✦ FREE · Now playing / playlist language |

---

## 2. Previous vs New

| | Previous | New (living ON) |
|---|---|---|
| Opening | Catalogue intro + age Explore wall | FE Moments photography + companionship |
| Primary path | Quick Play / Daily Pick / Explore equal | One recommend + three quiet paths |
| Product name | Amy Audio Lessons | **Quiet listen** |
| Hub tile | Amy Audio Lessons · cyan marketplace | Quiet listen · soft Moments continuity |
| Premium note | Unlock full library | Continue with AmyNest whenever you're ready |
| Free badge | ✦ FREE | Start free |
| Series | Series & playlists | Gentle paths |
| Emergency | Need help right now? | Need a calm minute? |
| Player / mini bar | Neon violet night | Sanctuary materials (controls preserved) |
| Age tiles | Explore CTA + neon gradients | Listen gently · soft tiles under “More ages…” |
| Rollback | — | `VITE_FF_AMY_AUDIO_LIVING_V1=0` |

---

## 3. Emotional Journey

1. **Arrive** — same house light; Moments photography; “I'm here with you.”  
2. **Begin** — one quiet listen invitation.  
3. **Stay** — player remains clear and calm while audio plays.  
4. **Pause / leave** — resume place saved (existing storage).  
5. **Return** — quiet path “Where we left off.”  
6. **Exit** — back to Parent Hub / life (stack unchanged).

---

## 4. Entry / Opening

- Living opening: `amy-audio-living-opening.tsx`  
- Photo: `ROOM_HEROES.moments` → `/experience/r1/shot-04-transition.png`  
- Recommend: `A quiet listen with {child}`  
- Quiet paths: A quiet listen · Need a calm minute · Where we left off  
- Route `/audio-lessons` and `?goal=` **unchanged**

---

## 5. Player Experience

| Control | Living treatment |
|---|---|
| Play / pause | **Preserved** (sheet + mini bar) |
| Paragraph seek / prev / next | **Preserved** |
| Rate | **Preserved** |
| Progress / duration | **Preserved** |
| Minimize / expand | **Preserved** |
| Accessible labels | Retained |
| Visual | Sanctuary shell — no neon night |

Usability was not sacrificed for minimalism.

---

## 6. Audio Completion

- Completion + series auto-advance logic **unchanged**  
- Living face softens series / completion chrome only  
- Resume maps **unchanged**

---

## 7. Context & Continuity

| Item | Result |
|---|---|
| Coach goal deep link | Untouched |
| Age / resume / Amy signals | Existing engines only |
| Surveillance language | **Not introduced** |
| Emergency calm sheet | Softened CTA; same engine |

---

## 8. Premium Continuity

| Rule | Result |
|---|---|
| RevenueCat / plans / pricing | **Unchanged** |
| Free sample / consume / paywall reason | **Unchanged** |
| Living banners / badges | Continuity voice only |
| No Unlock Audio / FOMO | **YES** on living face |

---

## 9. Visual Manufacturing

| Path | Change |
|---|---|
| `lib/amy-audio/living-room.ts` | Flag + companionship / premium / player copy helpers |
| `lib/amy-audio/living-room.test.ts` | Anti-catalogue / anti-unlock tests |
| `components/amy-audio/amy-audio-living-room.css` | Sanctuary materials |
| `components/amy-audio/amy-audio-living-opening.tsx` | FE Moments open + quiet paths |
| `pages/audio-lessons.tsx` | Living home hierarchy |
| `age-tile` / `age-detail-screen` / `lesson-card` / `series-card` | Soft catalogue face |
| `player-sheet` / `audio-player-bar` | Sanctuary player (controls intact) |
| `parenting-hub.tsx` Activities audio nest | Quiet listen continuity |

---

## 10. Accessibility

| Item | Result |
|---|---|
| Hierarchy | Living h1 companionship title |
| Play / pause aria-labels | Preserved |
| Expand player label | Preserved |
| Touch targets | Mini bar / sheet controls unchanged sizes |
| Motion | Existing reduced-friendly springs retained; no new spectacle |

**Accessibility Score: 8.5 / 10**

---

## 11. Performance

| Item | Result |
|---|---|
| Playback / warmup | Untouched |
| Photo | Reused FE Moments asset |
| Production build | **PASS** |

---

## 12. Offline / Recovery

| Item | Result |
|---|---|
| Offline dedicated empty UI | Still residual (pre-existing; not invented) |
| Playback error copy in player | Engine / sheet messages retained |
| Resume after leave | Existing localStorage resume |

---

## 13. DB Review

**PASS** — zero schema / migration changes.

---

## 14. API Review

**PASS** — `/api/audio-lessons/pregenerate` · `/api/features/audio_lesson/consume` · TTS/static paths untouched.

---

## 15. Analytics Review

**PASS** — `audio_*` content-gating events retained; playback telemetry untouched.

---

## 16. Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** changes |
| API | **Zero** contract changes |
| Playback engine / assets | **Untouched** |
| Firebase | Unchanged |
| RevenueCat / entitlements / pricing | **Zero** changes |
| Auth | Unchanged |
| Routing / deep links | Unchanged |
| Feature flags | New experience-only `VITE_FF_AMY_AUDIO_LIVING_V1` (default ON) |
| Amy Coach | **Not modified** (frozen) |
| Existing users | Resume / complete storage keys unchanged |
| Rollback | Available |

### Rollback

1. `VITE_FF_AMY_AUDIO_LIVING_V1=0` → legacy neon catalogue face  
2. Git revert of this manufacture commit  
3. Never flip entitlements to “fix” UI  

---

## 17. Regression Review

| Surface | Result |
|---|---|
| Locked surfaces listed above | **Untouched** |
| Amy Coach | **Frozen — untouched** |
| Legacy Amy Audio (`VITE_FF_AMY_AUDIO_LIVING_V1=0`) | Preserved |
| Playback E2E contracts / test ids | Retained (`age-tiles-grid`, `audio-player-sheet`, `audio-player-bar`, `emergency-cta`) |

**PASS** for manufacturing scope.

---

## 18. Founder Score

| Dimension | Score |
|---|---|
| House continuity (living face) | **9.0 / 10** |
| Presence / calm purpose | **9.0 / 10** |
| Anti-catalogue / anti-Spotify | **8.5 / 10** |
| Player usability preserved | **9.5 / 10** |
| Premium continuity | **9.0 / 10** |
| Production safety | **10 / 10** |
| Residual age-grid under fold | **7.5 / 10** |

**Overall Founder Score: 8.9 / 10** (living path)

---

## 19. Apple Readiness

| Question | Answer |
|---|---|
| Does living Amy Audio feel like the same home? | **YES** |
| Is the complete app ready for Final Apple Audit? | **Not claimed** — STOP per order |
| Remaining risk | Age grid still available under “More ages…”; marketing pages outside app still SKU |

---

## 20. Remaining Debt

Documented — **not reopened**:

1. Age tile grid still present (subordinate, not opening)  
2. Quick Play / Daily Pick cards only on legacy flag path — living uses recommend/quiet paths instead  
3. No dedicated offline empty state (pre-existing)  
4. Marketing / trial spotlight may still say “Audio Lessons” outside living room  
5. Routine Generation still unmanufactured  

---

## 21. Rollback

See Production Safety → Rollback.

---

## 22. Commit SHA

**Feature commit:** `PENDING_COMMIT_SHA`

---

## Final Blind Test

Hide: AmyNest logo · AmyNest name · Amy Audio / Quiet listen name · product branding.

**Question:** Does this feel like the same AmyNest home, or did I just open another audio application?

**Answer: YES** — the same AmyNest home.

**Why:** Living path uses the same FE Moments photography, sanctuary materials, companionship voice, one-primary-path hierarchy, soft Premium continuity, and calm exit as manufactured Moments / Amy Coach rooms — while keeping a clear, usable player. It does not present as a Spotify player, podcast app, or audio catalogue.

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Unit tests (`living-room.test.ts`) | **PASS** |
| Production build | **PASS** |
| Accessibility | Reviewed above |
| Production safety | **PASS** |
| Regression | **PASS** (scope) |
| DB / API review | **PASS** |
| Founder review | This document |

---

**STOPPED. Waiting for Founder approval.**
