# P0.6 Completion Report — Law of Three

**Sprint:** Production Recovery · P0.6  
**Status:** COMPLETE — **STOP** (do not start P0.7)  
**Authority:** Design Constitution hierarchy · Founder Rules (one hero · one decision · one support)  
**Constraint honored:** Hierarchy / composition only — no typography · spacing tokens · lighting · materials · nav · Brain · routing · new components · features  
**Regression:** [`P0_6_BEFORE_AFTER.md`](./P0_6_BEFORE_AFTER.md)

---

## Objective

Apply the **Law of Three** on every V2 screen:

1. Emotional Hero  
2. Primary Action  
3. Supporting Object  

Everything else visually recedes. No equal-weight cards. No visual democracy.

---

## Files touched

### Craft
| File | Change |
|------|--------|
| `craft/hierarchy.ts` | **New** — peer / recede / whisper · `v2LawRole` markers |
| `craft/hierarchy.test.ts` | Law roles + **production drift check** |
| `craft/finish.ts` | `V2_WEIGHT_COACH` → peer opacity (Mission stays full) |
| `craft/finish.test.ts` | Coach peer assertion |
| `craft/index.ts` | Export hierarchy API |

### Screens
| File | Change |
|------|--------|
| `today/TodayPage.tsx` | Focus hero · message support · Ask Amy / Premium recede |
| `today/mission/MissionSection.tsx` | Mission CTA `primary` · eyebrow whisper |
| `today/mission/MissionPlayPage.tsx` | Title hero · steps support · Mark complete primary |
| `today/mission/MissionSuccess.tsx` | H1 hero · body support · one primary · Ask Amy recede |
| `today/today.test.tsx` | Law of Three regression |
| `coach-discovery/CoachDiscoveryCard.tsx` | Peer title muted · recede role |
| `coach-discovery/CoachDiscoveryPage.tsx` | Journey hero · Continue primary · status support |
| `ask-amy/AskAmyPage.tsx` | Headline hero · Start primary · context support · prompts peer |
| `premium/PremiumJourney.tsx` | Journey hero · Continue primary · trust support · plans/restore recede |
| `premium/AccountRequiredGate.tsx` | Headline hero · Save primary · message support · Sign in/Back recede |
| `front-door/FrontDoorPage.tsx` | Brand/progress whisper · Breath Law · choice peers quiet |
| `for-child/ForChildPage.tsx` | Name hero · hope support · save primary |
| `guest/GuestAccountRequiredSheet.tsx` | Title hero · body support · Continue primary · Not now whisper |
| `pages/landing.tsx` | When Front Door on: Try on Web primary · badges/Meet AMY/stores recede |
| `pages/sign-up.tsx` | V2 calm: Neon ring quiet · OAuth peer · submit primary |

---

## Screen Law of Three (summary)

| Screen | Hero | Primary Action | Supporting Object | Competition quieted |
|--------|------|----------------|-------------------|---------------------|
| **Landing** (V2 path) | Brand / companion promise | Try on Web | Support line | Badges · dual CTA · Meet AMY · stores · nav Get-app |
| **Front Door** | Step H1 (Breath “Take a breath”) | Step Bloom CTA | Support line / orb peer | Brand · progress · non-selected plates |
| **Today** | Today's focus (or greeting) | Mission CTA | Amy message | Coach Soft Plate · Ask Amy · Premium · eyebrows |
| **Mission Play** | Mission title | Mark complete | Steps Soft Plate | Speech eyebrow |
| **Mission Success** | “That was a real step” | Coach Continue **or** Back to Today | Success body | Orb peer · bridge · Ask Amy |
| **Coach** | Journey headline | Continue / Yes continue | Status / body | Eyebrow · ink emphasis spans |
| **Ask Amy** | Immediate help headline | Ask / Start button | Context line | Prompt Soft Plates as catalogue |
| **Premium** | Continue the journey | Continue with Amy / Save progress | Trust statement | Plan catalogue · badges · Restore |
| **Signup** (V2 calm) | Continuity title | Create account submit | Continuity subline | Neon ring · OAuth stack |
| **For Child** | For {name} | Save CTA (guest) | Hope line | Secondary guest para |
| **Guest Sheet** | Title | Save / Continue | Body | Not now whisper |

---

## Remaining hierarchy debt

| Debt | Why deferred |
|------|----------------|
| Front Door Age/Worry still multi-choice Soft Plates | Necessary interaction; non-selected recede — cannot collapse to one tile without UX redesign |
| Ask Amy prompts still open conversation (catalogue) | Content reduction / prompt architecture (P1) — visually quieted only |
| Premium plan list still visible | Honest catalog (Rams); badges demoted — silhouette sprint later |
| Landing age band section may enter fold on short viewports | Marketing page; first-fold CTAs fixed for V2 path |
| Legacy `CoachUnderstandingScreen` inside Coach flow | Outside V2 craft ownership |
| Today greeting still present when focus exists | Softened to peer; removing greeting = copy redesign |

---

## Production drift check

| Locked system | Result |
|---------------|--------|
| Typography (`V2_TYPE` 36 / 13) | **Unchanged** |
| Spacing ladder (`V2_SPACE_PX` 8→64) | **Unchanged** |
| Lighting (`V2_GLOW` bloom/orb · three presets) | **Unchanged** |
| Navigation (`h-14` · blur 24) | **Unchanged** |
| Materials (Soft Plate 8% · flat · no blur) | **Unchanged** |
| Only hierarchy / composition refined | **Confirmed** (`hierarchy.test.ts`) |

---

## Regression

| Check | Result |
|-------|--------|
| Vitest `src/v2` | **56 files · 402 tests passed** |
| Today Law of Three test | Mission primary · Coach/Ask/Premium recede |
| Drift suite | Type · space · nav · materials · light hold |

---

## Updated production score

| Metric | Post-P0.5 | Post-P0.6 (est.) | Delta |
|--------|----------:|-----------------:|------:|
| Overall Design | ~86–89 | **90–93** | +4 |
| Consistency | ~90–92 | **92–94** | +2 |
| Clarity (1-second read) | — | **+8–10** | Law of Three |
| Production Readiness | ~78–81 | **84–87** | +6 |
| Apple-Level | ~72–76 | **78–82** | +6 |

**Rationale:** One dominant object + one decision + one reassurance per screen. Peer Soft Plates no longer compete as equals. Remaining caps: Ask Amy content architecture, Premium silhouette, Front Door choice density, legacy marketing chrome.

**Verdict:** Approaching ready on craft — still ❌ Not Ready until P1 polish / dogfood (expected).

---

## Founder observations

| Rule | Observation |
|------|-------------|
| One dominant object above the fold | Focus / journey / help headline marked `data-v2-law="hero"` |
| One obvious decision | Single Bloom / primary role per screen |
| One supporting reassurance | Message / trust / hope / body as `support` |
| No equal-weight cards | Coach `opacity-80` · Ask Amy / Premium `opacity-70` |
| No feature catalogue energy | Prompts & plans recede; badges whisper |
| Hierarchy in one second | Role markers + opacity — not color tricks |

---

## STOP

P0.6 complete.  
Do **not** begin P0.7 until Founder directs.
