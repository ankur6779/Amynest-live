# Ask Amy Translation — Nest Presence from Day One

**Mode:** Translation only. No code. No mockups. No redesign exploration.  
**Frozen:** Constitution · Product · Features · Brain · Architecture · Routes · Assistant black box (AI/prompt/streaming)  
**Surface:** `AskAmyPage` entry · suggested prompts · conversation mount · `GuestAccountRequiredSheet` (ask_amy) · Today Quick Help entry (related)  
**Jury rule:** Apple · Headspace · Airbnb · Linear — if **all four say NO → DELETE.**

---

## Day One question

Does this feel like ChatGPT?

**Yes.**

### WHY?

1. **Prompt wall** — Three Soft Plate starter chips (“How can I help my child talk more?” …) are the universal LLM home pattern: suggestion tiles → open chat.  
2. **Static prompts ignore the parent's worry** — Template AI, not “Amy who already knows bedtime.” ChatGPT does not know your child; Nest claims to — then shows generic chips.  
3. **Conversation = legacy `AssistantPage` black box** — Mounted in a Soft Plate frame after “Start.” Whatever that assistant is, the silhouette is chatbot: thread + composer. Nest entry does not dissolve it; it unveils it.  
4. **Guest sheet before help** — Tap for care → account gate. At the vulnerable moment, the product behaves like a freemium AI tool, not a companion who answers first.  
5. **Hierarchy still reads as AI feature** — Tool header + Back + prompt catalogue + Bloom “Let's talk…” = productized assistant, not a held parenting moment.  
6. **“Quick help” copy fights the UI** — Words say care; layout says chat starter pack.

If Ask Amy had been Nest Presence from Day One, it would not open as a prompt gallery into a chatbot. It would open as Amy responding to *this* worry — one breath of help — with account, if ever, after trust.

---

## Review by lens

### Prompt wall

| Current | Decision | WHY |
|---------|----------|-----|
| Three Soft Plate suggested prompts | **DELETE** | ChatGPT starter wall. Unanimous NO as Nest entry. |
| Prompts as `data-v2-law="recede"` peers | **DELETE** | Opacity does not stop them from defining the screen. |
| Static copy (talk / mornings / sleep) ignoring session worry | **DELETE** | Template AI. Betrays “Amy knows.” |
| Prompt tap → `beginConversation` (same as Start) | **DELETE** with wall | Duplicate doors into the same gate/chat. |
| Worry-aware *meaning* of what to ask | **MERGE** into hero/support/Start | One invitation aligned to today's focus — not a menu of prompts. |

### Composer

| Current | Decision | WHY |
|---------|----------|-----|
| Composer inside `AssistantBlackBox` | **KEEP** (capability) | Product frozen — parents must be able to ask. |
| Composer as the emotional center of entry | **DELETE** | Entry should not *be* a blank input waiting like ChatGPT. |
| Nest shell wrapping black-box chat | **MERGE** | If conversation opens, it should feel like continuing Amy — not dropping into a second app chrome. (Presentation around the box; box internals frozen.) |
| Soft Plate “conversation container” | **WHISPER** / Atmosphere | Card-around-chat = AI widget. |

### Conversation

| Current | Decision | WHY |
|---------|----------|-----|
| Thread via Assistant black box | **KEEP** (capability) | Real help delivery — frozen engine. |
| “Back to suggestions” dismiss | **DELETE** or **MERGE** | Returning to prompt wall re-ChatGPTs the moment. Prefer Back to Today. |
| Entry → conversation two-mode shell | **MERGE** | Prefer one care surface: help now — not lobby then chat. |
| Conversation as ChatGPT silhouette | **DELETE** (as Nest identity) | Capability stays; Nest framing must not celebrate chatbot UI. |

### Guest sheet

| Current | Decision | WHY |
|---------|----------|-----|
| Sheet opens *before* any help (`beginConversation` if guest) | **DELETE** (timing) | Gate at vulnerability = AI freemium. Help first. |
| Soft-save / account capability | **KEEP** | Progress protection — later. |
| Title = CTA string (“Ask about bedtime”) | **MERGE** | Title should be care/trust — not reuse the button label (P0.7 defect). |
| Body: knows focus + Coach distinction | **KEEP** · **WHISPER** | Useful truth; don't make it the first thing before help. |
| “Save & get quick help” → `/sign-up` | **KEEP** (route) · **WHISPER** (when shown) | After first help, or when saving — not as the price of knocking. |
| “Not right now” | **KEEP** | Relief exit. |
| Sheet as ChatGPT paywall moment | **DELETE** | Nest does not charge admission to be heard. |

### Quick Help

| Current | Decision | WHY |
|---------|----------|-----|
| “Quick help” framing (headline / support / Today title) | **KEEP** | Anti-chatbot naming — protect. |
| Concern-aware page headline (“Bedtime help”) | **KEEP** | Companion, not “Ask Amy AI.” |
| Support “Amy knows today's {focus}” | **KEEP** | Nest memory. |
| Start CTA “Let's talk about bedtime…” | **KEEP** | One primary invitation. |
| Today Ask Amy section (title + outline CTA) | **DELETE** from Today home | See `TODAY_TRANSLATION.md` — chapter #3. Access via nav Help. |
| Quick Help as prompt catalogue | **DELETE** | Contradicts Quick Help — becomes Slow Menu. |

### Hierarchy

| Current claimed | Lived | Decision |
|-----------------|-------|----------|
| Hero = headline | Tool header beside Back — weak care air | **MERGE** — hero is help promise + Amy knowing, with air |
| Primary = Start Bloom | Correct when alone | **KEEP** |
| Support = Amy knows line | Correct | **KEEP** |
| Prompts = recede | Still dominate visually | **DELETE** prompts |
| Guest sheet steals hero on tap | Account becomes hero | **DELETE** that sequence |
| Law of Three vs ChatGPT lobby | Lobby wins | Edit to one invitation |

**Law of Three after translation:**

| Role | Survives |
|------|----------|
| Emotional hero | Concern help headline (“Bedtime help”) |
| Primary action | One Start / Let's talk Bloom |
| Supporting object | “Amy knows…” line |

No prompt wall. No account sheet before help. Conversation is the next breath — not a black-box product drop with a suggestion lobby.

---

## Full element table

| Current element | Decision | WHY |
|-----------------|----------|-----|
| Nest Atmosphere shell | **KEEP** | Same world. |
| Back to Today | **WHISPER** | Soft exit. |
| Concern-aware H1 | **KEEP** | Care hero. |
| “Amy knows…” support | **KEEP** | Memory. |
| Soft Plate prompt wall (3) | **DELETE** | ChatGPT. |
| Start Bloom CTA | **KEEP** | One door. |
| Guest sheet before help | **DELETE** (timing) | Freemium AI. |
| Guest sheet capability | **KEEP** | Later soft-save. |
| Sheet title = CTA string | **MERGE** | Care title. |
| Sheet Coach distinction body | **WHISPER** | When sheet appears. |
| Assistant black box | **KEEP** (engine) | Frozen. |
| ChatGPT silhouette as Nest identity | **DELETE** | Framing. |
| “Back to suggestions” | **DELETE** | Returns to prompt wall. |
| Today Quick Help module | **DELETE** from Today | Nav whisper. |
| `text-xl` invent type | **MERGE** | Constitution type roles. |

---

## Decision tally

| Decision | Meaning |
|----------|---------|
| **DELETE** | Prompt wall · pre-help account gate timing · Back to suggestions · Today Ask Amy chapter · ChatGPT lobby identity |
| **KEEP** | Quick help naming · worry headline · Amy knows · Start CTA · Assistant capability · soft-save capability · Not right now |
| **MERGE** | Worry into one invitation · sheet title · chat mount as continuation of Amy |
| **WHISPER** | Back · sheet when after help · Coach distinction · conversation chrome |

---

## Verdict

| Question | Answer |
|----------|--------|
| Feels like ChatGPT? | **YES** |
| Why (shortest)? | Prompt tiles → chatbot box; account before answer. |
| Would Apple ship? | **NO** — AI feature page. |
| Would Headspace ship? | **NO** — gate at need. |
| Nest Ask Amy is… | Immediate help from someone who already knows — not a starter-prompt product. |

---

## What Ask Amy would feel like if AmyNest had never been a SaaS product

You open Help because tonight is hard. Amy does not show you three clever prompts like a model demo. She already knows bedtime is the focus. One line says so. One warm action begins the conversation — or, better, the first helpful breath is already there.

If you are a guest, she does not slam an account sheet over your worry before she has offered anything. She helps. Saving the thread can wait until you have been held.

When you talk, it still feels like Amy — the same Nest light, the same companion — not a drop into a generic assistant product. You never “go back to suggestions.” You go back to Today, lighter.

That is Ask Amy as Nest Presence: care, not ChatGPT with Soft Plates.

---

## STOP

Translation complete. No code. No mockups. No next screen.
