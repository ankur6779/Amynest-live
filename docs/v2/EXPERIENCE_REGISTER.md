# Experience Register

**Scope:** `artifacts/kidschedule/src/v2/`  
**Class:** EXPERIENCE — built around the old product story  
**Opposite:** [`FOUNDATION_REGISTER.md`](./FOUNDATION_REGISTER.md)  
**Mode:** Module audit · no code  

**Definition:** Surfaces and compositions that stage the prior Nest / V2 product story (rooms as currently told, tab IA, discovery chrome, hope pages, founder observation). Not reusable as-is when the product story changes — even if craft or memory underneath survives.

---

## Classification rule

| EXPERIENCE | Not EXPERIENCE |
|------------|----------------|
| Old emotional composition / room staging | Memory, decision, adapters, packs |
| Navigation as product story | Flags as infrastructure |
| “Living / Hearing / Study / Child / Continuity” as shipped pages | Prepare/token primitives without page story |

---

## Experience modules

### Living / Practice story

| Module | Old story role | Fate class |
|--------|----------------|------------|
| **Today page** | Living Room — hero, Mission Bloom, Amy whispers | Rewrite with new spine |
| **Today content** | Greeting / message / focus copy for Living | Rewrite / replace copy model |
| **Today mission (Mission Play / Success / section)** | Practice Room ritual chrome | Rewrite (keep speech mission *data* ties via Foundation packs) |

### Hearing story

| Module | Old story role | Fate class |
|--------|----------------|------------|
| **Ask Amy page + entry copy** | Hearing Room shell over assistant black box | Rewrite entry; Brain/AI stays outside V2 |

### Study story

| Module | Old story role | Fate class |
|--------|----------------|------------|
| **Coach Discovery page / cards / prepare progress UI** | Study discovery composition | Rewrite (stash/eligibility → Foundation) |

### Child story

| Module | Old story role | Fate class |
|--------|----------------|------------|
| **For Child page + hope copy** | Child’s Room expectant surface | Rewrite or delete if hollow |

### Vestibule story

| Module | Old story role | Fate class |
|--------|----------------|------------|
| **Front Door page** | Vestibule ritual composition | Rewrite (state machine → Foundation) |

### Continuity story UI

| Module | Old story role | Fate class |
|--------|----------------|------------|
| **Premium Journey / Paywall pages / AccountRequiredGate presentation** | Continuity / monetization story | Rewrite timing & framing (billing adapters → Foundation) |

### Shell story chrome

| Module | Old story role | Fate class |
|--------|----------------|------------|
| **V2 Mobile Tab Bar + tab history** | Today · Ask Amy · For Child product IA | Rewrite or delete with new journey hierarchy |
| **V2 Calm Loading / section skeleton pages** | Nest route loading as product weather | Rewrite to new entry timing (primitives may stay Foundation) |

### Guest presentation (not session store)

| Module | Old story role | Fate class |
|--------|----------------|------------|
| **GuestAccountCta / Sheet chrome** | Soft-save / account UI as composed today | Rewrite (mechanics → Foundation) |

### Founder / dogfood

| Module | Old story role | Fate class |
|--------|----------------|------------|
| **Founder Observation host + store** | Invisible founder path observation | Delete from product path (keep only if dogfood tooling desired) |

---

## Experience mass (estimate)

| Bucket | Approx file weight | Share of V2 |
|--------|-------------------:|------------:|
| Today page + content + mission | ~15–20 | medium |
| Coach discovery UI | ~8–10 | low–medium |
| Ask Amy + For Child | ~10 | low |
| Front Door page | ~4 | low |
| Premium journey UI | ~8–10 | low–medium |
| Navigation + shell pages | ~10 | low |
| Guest CTA chrome + Founder observation | ~10–12 | low |
| **Experience total** | **~90–120 / 349** | **~28–34%** |

---

## Portfolio estimate (entire V2)

Think in **module destiny**, weighted by approximate mass:

| Destiny | Meaning | Estimate |
|---------|---------|---------:|
| **Reusable %** | Keep as Foundation (ship forward unchanged in role) | **~55%** |
| **Rewrite %** | Experience (and hybrid UI) that must be retold for new story / conversion spine — salvage patterns, not composition | **~35%** |
| **Delete %** | Experience that should not return (founder observation in product, hollow hope chrome, tab IA as equal product doors, story-only dead weight) | **~10%** |

### How to read the numbers

- **Reusable ≠ “all Foundation files forever without touch.”** It means the *module role* survives.  
- **Rewrite ≠ redesign CSS.** It means the *product story surface* cannot ship as the old Nest room composition when the story changes.  
- **Delete** is small by file count but high by clarity: observation tooling and equal-tab product mall are story debt.

### Cross-check

| Class register | Mass share |
|----------------|----------:|
| Foundation | ~66–72% of files |
| Experience | ~28–34% of files |
| Of Foundation → mostly **Reusable** | |
| Of Experience → mostly **Rewrite**, minority **Delete** | |
| Blended → **~55% / ~35% / ~10%** | |

---

## Hybrid split reminder

| Hybrid folder | Foundation half | Experience half |
|---------------|-----------------|-----------------|
| **today/** | adapters, resolver, hero-activation | TodayPage, content, mission UI |
| **premium/** | unlock, purchase-flow, RC, flags | Journey / paywall pages |
| **front-door/** | state machine, options | FrontDoorPage |
| **guest/** | session / soft-save / claim | Account CTA / sheet |
| **coach-discovery/** | stash / eligibility | Page / cards |
| **shell/** | prepare contract | Loading shells as Nest weather |

---

## STOP

Register only. No code.
