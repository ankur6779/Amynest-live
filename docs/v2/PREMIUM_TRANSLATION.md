# Premium Translation — Nest Presence from Day One

**Mode:** Translation only. No code. No mockups. No redesign exploration.  
**Frozen:** Constitution · Product · Features · Brain · Architecture · Routes · Billing / RevenueCat / entitlements  
**Surface:** `PremiumJourney` · `AccountRequiredGate` · Today Premium entry (related) · legacy `/pricing` when flag off  
**Jury rule:** Apple · Headspace · Airbnb · Linear — if **all four say NO → DELETE.**

---

## Day One question

Does Premium feel like **pricing** or **continuing care**?

**Pricing wearing continuity copy.**

The header says “Keep going with Amy” and support can name the child and concern — then the eye hits a **plan table**: title · ₹ price · badge · selected Soft Plate rows · dual CTAs (Continue + Restore). That is a store catalog with Nest lipstick. Cancel/success copy often sounds like care; the ready state feels like App Store subscription UI.

If Premium had been Nest Presence from Day One, it would feel like a **continuity letter**: Amy asking to keep walking with you — one clear yes — with price as a quiet necessity, not the composition hero.

---

## Review by lens

### Plans

| Current | Decision | WHY |
|---------|----------|-----|
| Plan list rows (title + formattedPrice / ₹) | **KEEP** (capability) · **MERGE** (presentation) | Billing product frozen — parents must choose a SKU. Plan *table* as visual hero = pricing. Recede plans; care leads. |
| Plan badges | **WHISPER** or **DELETE** | Promo stickers = store energy. Unanimous NO as loud chrome. |
| Selected Soft Plate denser fill | **KEEP** | Quiet selection — not Bloom rim / neon. |
| Multiple equal plan cards competing with H1 | **MERGE** | One primary recommendation if product allows; others whisper. Democracy of SKUs = catalog. |
| `data-v2-law="recede"` on plan list | **DELETE** as strategy | Opacity on a price list still reads as pricing page. Hierarchy must be compositional. |
| Legacy `/pricing` redirect when flag off | Out of Nest path | Nest Premium must not inherit catalog DNA when on. |

### Cards

| Current | Decision | WHY |
|---------|----------|-----|
| Soft Plate plan buttons | **MERGE** | Necessary choosers — not a benefit feature grid. Keep minimal; kill “card feed” feel. |
| Loading Soft Plate + twin skeleton bars | **DELETE** skeleton theatre | Fake plan ghosts = SaaS. Pulse + one line enough. |
| Offline card + WifiOff icon | **MERGE** | Offline truth **KEEP**; WifiOff icon theatre **DELETE** — calm copy, not ops chrome. |
| Success / already Elevated Plate + check | **MERGE** | Relief close OK; primary check = achievement (see Mission Success). Quiet honor. |
| Cancel card “You're still with Amy” | **KEEP** | Continuity care — Nest. |
| Account gate Soft Plate wrapping whole screen | **MERGE** | Letter, not a boxed upsell panel. |
| Today Premium section card/CTA | **DELETE** from Today | Conversion chapter on home (see `TODAY_TRANSLATION.md`). |

### CTA

| Current | Decision | WHY |
|---------|----------|-----|
| “Continue with Amy” purchase Bloom | **KEEP** | Continuity verb — protect. One primary. |
| “Restore previous care” outline peer | **WHISPER** | Needed commerce; must not peer Bloom. Caption / tertiary. |
| Dual CTA stack (Continue + Restore) | **MERGE** | One Bloom; Restore whisper below or in edge. |
| Account gate: “Save progress & continue” | **KEEP** | Care framing. |
| Account gate: Sign in outline + Back ghost | **WHISPER** | Three buttons = decision stack — Sign in/Back whisper. |
| Success “Continue” → Today | **KEEP** | Relief door home. |
| Cancel “Choose again” | **KEEP** | Soft re-entry. |
| Purchase label that sounds like “Subscribe / Buy” | N/A (already care-named) | **KEEP** that instinct — never revert to pricing verbs. |

### Copy

| Current | Decision | WHY |
|---------|----------|-----|
| H1 “Keep going with Amy” | **KEEP** | Continuity hero. |
| Support `buildPremiumJourneySupport` (name/concern) | **KEEP** | Continuing care truth. |
| Account headline “Stay with {name}'s {concern} journey” | **KEEP** | Letter, not SKU. |
| Success “You're all set” + care body | **KEEP** · **MERGE** tone | Slightly receipt-like (“all set”) — prefer relief continuity; body is good. |
| Already premium same pattern | **KEEP** | Quiet. |
| Cancel “You're still with Amy” | **KEEP** | Anti-shame. Best Nest line on the surface. |
| Offline / error utility copy | **KEEP** | Honest. |
| Prepare “continuing care” / “restore care” | **KEEP** | Right language during wait. |
| Any feature-benefit bullet list | Absent on V2 journey — **KEEP absent** | Do not add SaaS benefit walls. |
| Price as loud inline hero next to title | **MERGE** | Price must exist; should whisper beside care, not equal the plan name. |

### Benefits

| Current | Decision | WHY |
|---------|----------|-----|
| No benefit / feature checklist on V2 PremiumJourney | **KEEP** (absence) | Correct Nest instinct. Do not invent “Unlimited Ask Amy” grids. |
| Badge as pseudo-benefit (“Best value” etc.) | **WHISPER** / **DELETE** | Store promo, not care. |
| Continuity itself as the benefit | **KEEP** | The only Nest benefit: keep going with Amy for this child/worry. |
| Marketing benefit strips from legacy pricing | **DELETE** from Nest path | Catalog DNA. |

### Journey

| Current | Decision | WHY |
|---------|----------|-----|
| Guest → AccountRequiredGate (no fake checkout) | **KEEP** | Honest. |
| Auth → load plans → select → purchase / restore | **KEEP** (flow) | Product frozen. |
| Journey *feeling*: letter → price table → buy | **MERGE** | Lead with letter; price as quiet instrument; one yes. |
| Loading / purchasing / restoring phases | **KEEP** | Use care prepare copy (already). |
| Success / already → Today | **KEEP** | Return to companion. |
| Cancel without shame | **KEEP** | Nest. |
| Today → Premium as home chapter | **DELETE** | Premium is earned continuity moment — not a dashboard tile. |
| Premium after Mission Success | **DELETE** | Never (already avoided — **KEEP** that absence). |
| Premium as “pricing page” destination energy | **DELETE** | Route may be `/premium`; emotion is continuing care. |

---

## Full element table

| Current element | Decision | WHY |
|-----------------|----------|-----|
| Nest Atmosphere shell | **KEEP** | Same world. |
| “Keep going with Amy” | **KEEP** | Hero of continuity. |
| Personalized support line | **KEEP** | Care. |
| Plan SKU list (capability) | **KEEP** | Billing frozen. |
| Plan table as visual center | **DELETE** / **MERGE** | Pricing silhouette. |
| Price display | **WHISPER** | Necessary, mist. |
| Plan badges | **DELETE** or **WHISPER** | Promo. |
| Continue with Amy Bloom | **KEEP** | One primary. |
| Restore outline peer | **WHISPER** | Commerce tertiary. |
| Twin skeleton loaders | **DELETE** | Fake catalog. |
| WifiOff icon | **DELETE** | Ops chrome. |
| Offline / error truth | **KEEP** | Honest care. |
| Success check primary paint | **MERGE** | Relief, not receipt trophy. |
| Success / already copy | **KEEP** | Continuity. |
| Cancel care copy | **KEEP** | Nest gold. |
| Account gate care headline | **KEEP** | Letter. |
| Triple CTA on account gate | **MERGE** | One Bloom; others whisper. |
| Today Premium entry | **DELETE** | Home conversion. |
| Benefit feature lists | **DELETE** (stay absent) | SaaS. |

---

## Law of Three (Premium after translation)

| Role | Survives |
|------|----------|
| Emotional hero | “Keep going with Amy” (+ child/concern support) |
| Primary action | One Bloom — Continue with Amy (purchase) or Save progress (gate) |
| Supporting object | Quiet plan choice (price whisper) · Restore / Sign in / Back as mist |

Not: plan rows as hero. Not: dual Bloom-weight CTAs. Not: badge stickers.

---

## Pricing vs continuing care scoreboard

| Signal | Now | After translation |
|--------|-----|-------------------|
| Header / support | Care | Care (**KEEP**) |
| Plan rows + prices | Pricing | Whisper instrument |
| Badges | Pricing | Gone / mist |
| Primary CTA | Care verb | Care verb (**KEEP**) |
| Restore | Commerce peer | Whisper |
| Benefits wall | Absent | Stay absent |
| Today entry | Pricing door | Deleted from home |
| Cancel / success | Care | Care (**KEEP**) |

---

## Verdict

| Question | Answer |
|----------|--------|
| Pricing or continuing care? | **Copy wants care. Composition is pricing.** |
| Would Apple ship the plan table as hero? | **NO** |
| Would Headspace ship dual commerce CTAs? | **NO** |
| Would Airbnb ship this as hospitality continuity? | **NO** — still a rate card. |
| Nest Premium is… | A letter to keep walking with Amy — price is the quiet how, not the why. |

---

## What Premium would feel like if AmyNest had never been a SaaS product

You open the door because you want the journey to keep going — for your child's sleep, for the worry you already named. Amy does not unroll a pricing grid. She says she wants to stay with you. One warm yes continues care.

Somewhere soft, the ways to continue are available — monthly or yearly if that is what the store requires — without badges shouting value, without a second button competing like a register. Restore is there if you already belonged, in the margin. Offline is a calm apology, not a wifi pictogram from an IT screen.

If you need an account first, that gate still sounds like protecting the journey — not unlocking a SKU list. When you are done, you are simply all set to come back to Today. You never felt like you shopped. You felt like you chose to stay.

---

## STOP

Translation complete. No code. No mockups. No next screen.
