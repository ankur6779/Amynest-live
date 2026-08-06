# Conversion Recovery Blueprint

**Mission:** Install → Sign up  
**Metric that matters:** ~100 installs → ~10 signups today. Raise that ratio.  
**Mode:** Product growth · UX research · parent psychology  
**Lived evidence:** `www.amynest.in` (first-time parent path, Aug 2026)  
**Constraint:** Reuse existing backend · APIs · AI · routes. No new features. No code. No UI polish work in this document.

**Founder rule:** Optimize only INSTALL → SIGN UP. Nothing else until this moves.

---

# Step answers (current lived product)

### STEP 1 — Ad click → Landing

**Expectation after ad:**  
“This will help me with my child’s sleep / tantrum / routine / tonight — soon.”

**Does Landing fulfill it?**  
**NO**

**Why:**  
Landing leads with companion + science/patent badges + four competing starts. The button that sounds like help (“Get Today’s Parenting Plan”) goes to `/get-app` (store pitch), not a plan. Expectation of help is broken in one tap.

---

### STEP 2 — Within 5 seconds, do they know what AmyNest does?

**NO** (cold start) / **WEAK YES** (after landing paints)

Cold splash is a glowing ring with no meaning.  
When landing appears: “parenting companion… daily plans…” — category is clear; *tonight’s job* is not.

---

### STEP 3 — Within 10 seconds, do they know what to click?

**NO**

Visible choices fight each other:

- Get Today’s Parenting Plan → `/get-app`  
- Try on Web → `/sign-up`  
- Google Play / App Store  
- Get the app (header)  

A tired parent does not know which one is “help me now.”

---

### STEP 4 — Meaningful value without account?

**NO** (on the primary paths)

| Path | Result |
|------|--------|
| Get Today’s Plan | Store wall |
| Try on Web | Sign-up wall |
| Install | Account before care (same pattern) |

Guest-capable surfaces already exist in the product (`/today`, `/ask-amy`, `/today/coach-plan`, `/today/mission`, `/front-door`) but **are not the default install/web conversion path**.

**Is that why they leave?**  
**YES — primary reason.**  
Parents install hoping for relief. Meeting a signup form (or another store/marketing wall) before any understanding feels like bait. They keep the app icon and never convert — or bounce.

---

### STEP 5 — When does the user first trust Amy? Where?

**Nowhere on the primary funnel.**

Trust requires a felt moment: “she got *my* situation.”  
Primary funnel offers: patent claims, feature mall, store, account fields, then (if they persist) a dashboard of modules.  
That is credibility theater, not trust.

---

### STEP 6 — Why create an account? Emotional gain? Obvious today?

**Real emotional gain (what signup should buy):**  
“Don’t lose what Amy just understood about my child. Keep tonight’s help. Remember us tomorrow.”

**Is that obvious today?**  
**NO**

Today signup is priced as a **toll to enter**, not a **lock to keep something already valuable**. Emotionally it feels like: give email to maybe get value later.

---

### STEP 7 — Friction points (ranked) · leave estimate

Base: **100 people who installed** (or completed install intent from ad).  
Focus: who never reaches **signed-up**.

| Rank | Friction | Est. leave / stall here | Why |
|-----:|----------|------------------------:|-----|
| 1 | **Account before any personal help** (Try on Web → `/sign-up`; app first-run same shape) | **35–45** | Toll booth before relief |
| 2 | **“Plan” CTA lies → `/get-app` again** (web) / post-install still marketing | **15–20** | Expectation violation → distrust |
| 3 | **No single primary action** (plan / web / Play / App Store / Get app) | **10–15** | Decision fatigue; abandon |
| 4 | **Cold splash / MEET AMY void** before meaning | **5–10** | “Broken or weird AI app” |
| 5 | **Science / patent / feature mall** before one worry | **5–8** | Feels like a pitch deck |
| 6 | **Sign up copy is product, not keep** (“Start Parenting Smart”) | **5–8** of those who reach form | No emotional reason to finish |
| 7 | **Social + long form + legal** on create account | **3–5** | Friction after already doubtful |
| 8 | **If they skip signup and somehow enter later: dashboard overwhelm** | **3–5** of engagers | Confirms “too much app,” still no signup motive |

**Rough truth:** Most of the 90 non-signups never experienced Amy understanding them. They experienced gates.

---

# 1. Current funnel

```
Ad
 → Landing (claims + competing CTAs)
 → Get App / Store  OR  Try on Web → Sign up wall
 → Install
 → Splash / Meet Amy
 → Sign up / Sign in
 → (maybe) Dashboard / modules
 → Amy help (late, if ever)
```

**Signup ask:** Before wow.  
**Value:** After commitment.  
**Conversion math:** ~10 / 100.

---

# 2. Ideal funnel (install → signup)

```
Ad (one worry promise)
 → Landing confirms that worry in 5s + ONE primary: “Help me with tonight”
 → Guest reception (existing guest routes)
 → One question (age + tonight’s worry — already collected in product surfaces)
 → ONE help moment via existing AI/module
      (Ask Amy  /  Coach discovery  /  Today next step  /  Mission — pick by worry)
 → FIRST WOW: “Amy actually understands me.”
 → Keep ask: Sign up to save this for your family
 → Account created
 → Return to the SAME thread/plan (memory keep) — not a module mall
```

Install may happen:

- **Before** guest web wow (ad → store → app guest path), or  
- **After** web wow (save on phone),

…but **signup always after wow**, never before.

**Reuse (no new features):**

| Step | Existing substrate |
|------|-------------------|
| Worry / age | Landing age radios · coach challenge pick · onboarding worry patterns |
| Guest shell | `/today` · `/ask-amy` · `/today/coach-plan` · `/today/mission` · `/front-door` |
| AI understand | Ask Amy / Assistant · Amy Coach · routine personalization APIs |
| Keep | `/sign-up` (Apple / Google / Facebook / email already there) |
| Memory | Existing child/family persistence after auth |

---

# 3. Biggest conversion killers

1. **Signup before wow**  
2. **Primary CTA that means “install again / store” instead of help**  
3. **Multiple peer CTAs** (no inevitable next click)  
4. **Trust claims (patent/science) substituting for a personal answer**  
5. **Signup framed as start, not keep**  

---

# 4. Emotional timeline (ideal)

| Time | Emotion | Must be true |
|------|---------|--------------|
| Ad tap | Hope | Promise matches one worry |
| 0–5s | Orientation | “This is for my kind of night” |
| 5–30s | Safety | Received, not sold |
| 30s–3min | Vulnerability | Shared age + one worry |
| First reply / first plan step | **Relief / wow** | Felt understood |
| Keep ask | Attachment | “I don’t want to lose this” |
| After signup | Continuity | Same help still there |

---

# 5. Trust timeline

| Trust tick | How earned | Current funnel |
|------------|------------|----------------|
| T0 Category trust | Clear parenting help | Weak / delayed by splash |
| T1 Honesty trust | Button does what it says | **Fails** (Plan → get-app) |
| T2 Care trust | Amy reflects their worry in their words | **Missing** before signup |
| T3 Keep trust | Account protects the care | **Inverted** (account before care) |

Signup converts at **T2→T3**, not at T0.

---

# 6. First wow moment

**Definition:**  
Parent thinks: *“Wow… Amy actually understands me.”*

**What produces it (reuse only — one path, not all):**

- They named age + a real worry (tonight).  
- Amy (Ask Amy or Coach or Today step) answered in that context — specific, calm, usable in the next hour.  
- No catalogue, no patent, no coins.

**Where it must occur:**  
On guest path — **before** `/sign-up`.

**If “impossible”?**  
It is **not** impossible: guest-aware routes and AI already exist.  
What is impossible is getting wow on the **current primary path**, because that path never opens those routes before the gate.

---

# 7. Best point to ask for sign up

**Immediately after the first wow** — while relief is warm:

> Keep this for your family. Amy will remember what you shared.

Use existing `/sign-up` (social + email).  
Return them to the **same** Ask Amy thread / coach goal / today step they just had.

---

# 8. Why that point is better than today

| Today | After wow |
|-------|-----------|
| Signup = ticket price | Signup = save what already helped |
| Emotion: suspicion | Emotion: attachment |
| Gain: unclear | Gain: obvious (“don’t lose this”) |
| Drop: ~90% | Drop: people who were never helped leave earlier; **helpers convert** |

Parents do not sign up for apps.  
They sign up to **not lose a person who finally got it.**

---

# 9. Estimated signup improvement

Conservative, if ONLY install→signup spine changes (wow before keep; one CTA; honest labels):

| | Installs | Signups | Rate |
|--|----------|---------|------|
| Today | 100 | ~10 | ~10% |
| After recovery | 100 | **25–35** | **~25–35%** |
| Stretch (strong wow + seamless return) | 100 | **35–45** | **~35–45%** |

**Not a promise — a growth estimate.**  
Upside comes from converting people who today install and feel nothing.  
If wow quality is weak, gains collapse — the lever is still “understand me,” not prettier gates.

---

# 10. What must be deleted (from the conversion path)

Not deleted from the company — **deleted from the Install→Signup path**:

- Plan/help CTAs that route to `/get-app` as the first answer  
- Signup as the first web “try”  
- Patent / science / feature-mall as first-session content  
- Competing equal CTAs (Play + App Store + Get app + Plan + Try web)  
- Dashboard / module tour as the post-auth landing for new signups  
- “Start Parenting Smart” as the emotional reason to create an account  

---

# 11. What must move

| Thing | From | To |
|-------|------|-----|
| Store / install push | Before help | After wow **or** parallel optional, never as fake “plan” |
| `/sign-up` | Entry toll | Keep moment after wow |
| Age + worry | Buried under marketing | First interactive act |
| Guest `/ask-amy` or `/today` or `/today/coach-plan` | Hidden / flag side path | **Default post-ad / post-install spine** |
| Premium / upsell | Anywhere early | After keep + trust |

---

# 12. What must become primary

**One primary action everywhere in this funnel:**

> Help me with tonight.

That action must open **guest help** (existing guest routes + AI), not store, not signup.

Secondary (whisper): Sign in (returning).  
Install: available, never disguised as the plan.

---

# 13. What must become invisible

Until after signup (or forever in first session):

- Module mall (Hub / Astro / multiple Explore in app)  
- Weather / scores / coins / streaks  
- Research name-drops  
- Notification reconnect as greeting  
- Four-tab product navigation as first chrome  

Invisible ≠ destroyed. Invisible = **not in the way of Install→Wow→Keep**.

---

# Personal signup test (growth team gate)

**Would this journey convince me to sign up tonight?**

**YES — only in this shape:**

1. I tap an ad about a real worry (e.g. bedtime / tantrum).  
2. I am not asked for email first.  
3. I answer age + tonight’s worry in under a minute.  
4. Amy answers in a way that is clearly about *my* night.  
5. Then: “Keep this so Amy remembers your family.”  
6. I use Apple/Google because I don’t want to lose that answer.

**Rejected intermediate idea:** “Guest dashboard lite then signup.”  
Still no wow — I would not sign up.

**Rejected intermediate idea:** “Install first, then guest wow in app, signup after.”  
Acceptable **only if** first app open is guest help, not Meet Amy → Create account.  
If first app open is still signup, I reject the journey again.

**Final accepted spine:**  
**Wow (guest) → Keep (signup) → Same help continues.**

---

# One-line strategy

Stop selling the app before Amy earns a place in the parent’s night.  
Sell **keeping Amy** after she has.

---

## STOP

No code. No UI redesign pack. No CSS. No new laws.  
Solve only: **INSTALL → SIGN UP**.
