# Journey Translation

**Mode:** Experience Architecture only  
**Lens:** Apple Experience Architecture · tired first-time parent  
**Lived subject:** Production journey at `www.amynest.in` (observed)  
**Out of scope:** Visual polish · colors · type · CSS · components · Constitutions · Room Translation · implementation  

This document does **not** redesign screens.  
It redesigns the **experience**: journey · entry · transitions · timing · hierarchy.

**Reuse only:** existing modules · routes · AI · billing · memory.  
**Invent nothing** as a new product.

---

## Founder vision (target experience)

A parent arrives carrying worry.  
Amy quietly receives them.  
Amy gives one meaningful next step.  
Trust grows.  
Everything else becomes invisible.

---

## Current lived spine (as shipped)

```
Landing
  → Marketing scroll
  → Install / Get App
  → Signup
  → Dashboard
  → Modules
  → AI
  → Premium
```

This is a **funnel for a platform**.  
It is not a **reception for a worried parent**.

---

# Part A — Transition audit

For each transition: emotion carried · question asked · does the next moment answer? · verdict.

| # | From → To | Emotion carried | Question asked | Does next answer? | Verdict |
|---|-----------|-----------------|----------------|-------------------|:-------:|
| T0 | World → Cold splash (glowing ring) | Anxiety, impatience | “Is this safe? What is this?” | No name, no promise, no human | **BROKEN** |
| T1 | Splash → Landing hero | Still scanning | “What is AmyNest for *me*?” | Partially — “parenting companion” — then drowned by science/patent/store CTAs | **BROKEN** |
| T2 | Landing → “Get Today’s Parenting Plan” | Hope, urgency | “Help me with today / tonight” | No — lands on **Get App** store pitch | **BROKEN** |
| T3 | Landing → “Try on Web” | Cautious curiosity | “Can I try without installing?” | Lands on **Sign up** wall — not help | **BROKEN** |
| T4 | Landing → Store buttons | Mild intent | “Should I install?” | Store — before any care received | **BROKEN** *(timing)* |
| T5 | Any start → Sign up / Sign in | Guarded | “Must I commit before I’m held?” | Account forms before one meaningful step | **BROKEN** |
| T6 | Auth → Dashboard | Relief mixed with overwhelm | “What do I do now?” | Weather, scores, coins, streaks, multiple generates, four tabs | **BROKEN** |
| T7 | Dashboard first paint | Alert fatigue | “Why are you interrupting me?” | Reconnect notifications banner | **BROKEN** |
| T8 | Dashboard → Routines / Coach / Hub / Ask Amy | Fragmented attention | “Which door is for my worry?” | Product department names; no single next step | **BROKEN** |
| T9 | “Generate routine” promise → generator / modules | Expectation of relief | “Will this calm tonight?” | Feels like producing a schedule artifact, not being received | **BROKEN** *(emotional)* |
| T10 | Care moment → Premium / upgrade DNA | Trust fragile | “Are you here for me or for revenue?” | Commerce can appear before trust is earned | **BROKEN** *(timing)* |
| T11 | Deep link / Front door | Hope to enter | “Let me in” | “Something went wrong” | **BROKEN** |
| T12 | Return visit → same Dashboard spine | Habit or dread | “Does Amy remember us?” | Memory not felt; modules still compete | **BROKEN** |

**Audit summary:** The parent’s question is almost never “show me the platform.” It is “help me with this worry.” Almost every transition answers a **business** or **module** question instead.

---

# Part B — Moment spine (reconstructed)

Do not think in pages. Think in moments.

```
Moment 1  "I don't know if I'm doing okay."
    ↓
Moment 2  "You are not alone."
    ↓
Moment 3  "Tell me about tonight."
    ↓
Moment 4  "Let's do one small thing."
    ↓
Moment 5  "That helped."
    ↓
Moment 6  "Amy will remember."
    ↓
Moment 7  "Would you like Amy to stay with your family?"
```

---

## Moment specifications

Each moment: emotion · parent question · Amy’s answer · **existing** substrate to reuse · what becomes invisible · timing rule.

### Moment 1 — Arrival with worry

| | |
|--|--|
| **Emotion** | Worry, fatigue, mild shame |
| **Question** | “I don’t know if I’m doing okay.” |
| **Amy answers** | Presence only — not features, not patent, not store |
| **Reuse** | Threshold / landing entry · Amy presence · age / worry selection already on landing (`What is your child's age?`) · Front Door / Vestibule intent (`/front-door`) when healthy |
| **Invisible** | Research carousels · patent blocks · dual store CTAs · feature mall |
| **Timing** | First seconds. No account. No install demand. |

**Transition out:** Parent has named (or felt) that they are in the right place for *tonight’s* kind of worry — not that they joined a SaaS.

---

### Moment 2 — Received

| | |
|--|--|
| **Emotion** | Softening, testing trust |
| **Question** | “Am I alone in this?” |
| **Amy answers** | “You are not alone.” — held, not pitched |
| **Reuse** | Amy presence · Vestibule / Front Door welcome · short welcome copy already in Nest guest paths · Ask Amy entry tone (`/ask-amy` / assistant care) without mode catalogue |
| **Invisible** | Dashboard · coins · AQI strip · “Start Parenting Smart” performance language |
| **Timing** | Before signup. Before install. |

**Transition out:** Parent feels received. Only then may Amy ask one thing.

---

### Moment 3 — One question about tonight

| | |
|--|--|
| **Emotion** | Willing to share a little |
| **Question** | “What do you need to know to help?” |
| **Amy answers** | “Tell me about tonight.” — one prompt, not a form stack |
| **Reuse** | Age radios (landing) · worry / challenge pick already in coach & onboarding flows · child context if guest memory exists · Ask Amy composer for free text worry · Coach discovery goal stash (`/today/coach-plan`) |
| **Invisible** | Full profile builders · multi-child manager · notification reconnect |
| **Timing** | Still pre-commitment if possible (guest-aware routes already exist: `/today`, `/ask-amy`, `/today/mission`, `/today/coach-plan`) |

**Transition out:** Amy has enough to offer **one** next step — not a catalogue.

---

### Moment 4 — One meaningful next step

| | |
|--|--|
| **Emotion** | Cautious hope |
| **Question** | “What should I do right now?” |
| **Amy answers** | “Let’s do one small thing.” |
| **Reuse (pick one by worry — do not show all):** | |
| | Sleep / day structure → routine generate / today’s plan (`/routines/generate` or Nest Living `/today` first step) |
| | Behavior / tantrum / screen → Coach discovery → coach plan (`/today/coach-plan` → `/amy-coach`) |
| | Need to talk now → Ask Amy (`/ask-amy` / `/assistant`) |
| | Short ritual / speech practice → Mission play (`/today/mission` / speech mission) |
| | Child play discovery → For Child (`/for-child` path) only if that *is* the worry |
| **Invisible** | Other modules · Parenting Hub mall · Astro · coins · secondary CTAs |
| **Timing** | One action in viewport. Everything else waits. |

**Transition out:** Parent did the thing — or began it — not “browsed the app.”

---

### Moment 5 — Relief mark

| | |
|--|--|
| **Emotion** | Exhale, small pride |
| **Question** | “Did that matter?” |
| **Amy answers** | “That helped.” — quiet acknowledgment |
| **Reuse** | Mission success close · routine completion · coach step done · Ask Amy held reply · existing streak/win signals **demoted to whisper** (do not lead) |
| **Invisible** | Scoreboards · coin bursts · “Parent Score” as hero |
| **Timing** | Immediate after the one step. No upsell. |

**Transition out:** Trust tick — not engagement tick.

---

### Moment 6 — Memory felt

| | |
|--|--|
| **Emotion** | Attachment beginning |
| **Question** | “Will you still know us tomorrow?” |
| **Amy answers** | “Amy will remember.” |
| **Reuse** | Home memory / child profile · family intelligence already on dashboard (“Amy is learning…”) · guest→account keep (`/sign-up` as **Keep**, not gate) · existing auth providers |
| **Invisible** | Module tour · “explore the hub” |
| **Timing** | After one helped moment. Signup is optional **keep**, not the price of entry. |

**Transition rule:** Account exists to **preserve** what Amy already knows — not to unlock the first kindness.

---

### Moment 7 — Continuity (stay)

| | |
|--|--|
| **Emotion** | Consideration, not ambush |
| **Question** | “Should Amy stay with our family?” |
| **Amy answers** | Continuity invitation — calm, after trust |
| **Reuse** | Premium / Continuity routes · RevenueCat / billing already wired · account-required gates already used for paid paths |
| **Invisible** | Quota theater inside Ask Amy care · upgrade cards mid-worry |
| **Timing** | Only after Moments 4–6. Never as Moment 2. |

---

# Part C — Journey map (moments ↔ existing routes)

Hierarchy is **moment order**, not sitemap order.

| Moment | Primary existing routes / modules | Must not lead |
|--------|-----------------------------------|---------------|
| 1 Arrival | `/` (stripped to reception) · healthy `/front-door` | `/get-app` as first answer |
| 2 Received | `/front-door` · Nest guest shell · Amy presence | `/dashboard` |
| 3 Tonight | Age/worry on `/` · `/ask-amy` · `/today/coach-plan` | Full child CRM |
| 4 One step | **One of:** `/today` · `/today/mission` · `/ask-amy` · `/amy-coach` · `/routines/generate` | Four-tab module choice |
| 5 Helped | Success/close states of the same module | Premium interrupt |
| 6 Remember | `/sign-up` as Keep · existing memory/child APIs | Marketing re-pitch |
| 7 Stay | Premium / Continuity · billing SDK | Care-thread paywall |

**Return visits:** Land on Moment 4 equivalent for *this* hour (Living `/today` or remembered next step) — not Moment 0 marketing and not Dashboard module mall.

**Install:** Store (`/get-app`, Play, App Store) is an **optional later convenience** after Moment 4 or 5 — never the answer to “help me tonight.”

**Classic `/dashboard`:** Demoted. Not the emotional home. Living `/today` (guest-aware) is the continuity surface for Nest spine; dashboard modules remain available as depth, not entry.

---

# Part D — Timing & hierarchy laws (experience only)

1. **Receive before convert** — care before signup, install, premium.  
2. **One question before one step** — never catalogue before clarity.  
3. **One step before many modules** — hierarchy is depth, not tabs-as-equals.  
4. **Remember before monetize** — Continuity is Moment 7.  
5. **Invisible is a feature** — everything not serving the current moment stays out of the path.  
6. **Broken transitions are product defects** — even if screens are “complete.”

---

# Part E — What this translation is not

- Not a visual redesign  
- Not new features  
- Not new AI capabilities  
- Not new billing products  
- Not Room / CSS / Constitution work  
- Not implementation  

It is **reordering when the parent meets what already exists**.

---

# Final question

## Would a tired parent trust AmyNest tonight?

# **NO**

**Why:**  
Tonight the lived journey still answers with splash void, marketing, store, signup, and a dashboard of modules before it answers with reception and one small next step. A tired parent trusts what helps them in the next ten minutes — not what proves patents, weather instruments, or four product doors. Until the spine is Moments 1→7, trust stays unearned.

---

## STOP

Experience architecture only. No implementation in this order.
