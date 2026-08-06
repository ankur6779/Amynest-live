# For Child Translation — Nest Presence from Day One

**Mode:** Translation only. No code. No mockups. No redesign exploration.  
**Frozen:** Constitution · Product · Features · Brain · Architecture · Routes  
**Surface:** `ForChildPage` · guest sheet (`for_child`) · nav tab For {Child}  
**Jury rule:** Apple · Headspace · Airbnb · Linear — if **all four say NO → DELETE.**

---

## Day One question

Does this feel **alive** or **empty**?

**Empty.**

Signed-in: a title (“For {name}”) and a hope line — then silence. No preview, no activity, no next breath. The hollow Soft Plates were correctly deleted (P0.4); what remained is an honest void that still occupies a primary nav tab. That is not Nest Presence. That is a reserved parking space.

Guest: the same void, plus a quiet “save progress” outline CTA that is marked primary but styled outline — a manufacturing shrug over emptiness.

Hope copy (“You're just getting started. Amy will build this with you.”) is kind. Kindness without a living object is still empty.

If For Child had been Nest Presence from Day One, this tab would either **hold one real, alive next step for the child** — or **not exist in the bar** until it does. Nest does not ship a named room with no furniture and call it calm.

---

## Review by lens

### Preview

| Current | Decision | WHY |
|---------|----------|-----|
| No child-world preview (play / learn / care) | **DELETE** (absence as product) | Empty tab pretending to be a surface. Either preview arrives (product frozen — if no feature, don't fake cards) or tab whispers away. |
| Sheet body teases “Play, Learn, and Care” | **MERGE** / conflict | Promises a world the page does not show — empty bait. Do not pitch shelves that aren't there. |
| Atmosphere-only shell (no hollow plates) | **KEEP** (craft instinct) | Correct: no fake Soft Plate shelves. Emptiness must not be filled with lies. |
| Redirect to `/parenting-hub` when flag off | Out of Nest path | Nest For Child must not be a blank promise. |

**Alive preview** would be one true glimpse of the child's space. **None exists.** Translation: do not invent feature previews; **do not keep an empty hero tab.**

### Activities

| Current | Decision | WHY |
|---------|----------|-----|
| Zero activities / missions / play entries | **DELETE** empty state as “the product” | A For Child tab with no activity is a broken promise. |
| Activity capability elsewhere in app (legacy hubs) | **KEEP** (product elsewhere) | Not wired into V2 For Child — so V2 must not claim the room. |
| Fake activity cards to look alive | **DELETE** | Hollow shelves already rejected — stay rejected. |

### Guest

| Current | Decision | WHY |
|---------|----------|-----|
| Guest hope + “save progress so Amy can keep this space” | **MERGE** | Soft intent OK; “this space” is empty — saving nothing. |
| `GuestAccountCta` outline + `data-v2-law="primary"` | **MERGE** | Bloom law broken (P0.7). If CTA remains, it must be true Bloom — or whisper until the room is alive. |
| `forceAccountSheet` on For Child | **WHISPER** / delay | Gate before any child joy = empty → signup. Wrong order. |
| Sheet title “For {name}” | **KEEP** | Human. |
| Sheet “Save & continue” / Play Learn Care pitch | **DELETE** Learn/Care pitch until real | Don't sell a museum with no exhibits. |
| Guest CTA “Save progress for {name}” | **WHISPER** | Only meaningful when there is progress/space to keep. |

### Emotion

| Current | Decision | WHY |
|---------|----------|-----|
| H1 “For {name}” | **KEEP** | Warm dedication — the only alive signal. |
| Hope line `V2_HOPE_EMPTY` | **KEEP** (words) · **MERGE** (role) | Hope is support, not a substitute for life. Alone on a tab = lonely. |
| Soft, non-shaming empty language | **KEEP** | Never “nothing here” — craft rule stands. |
| Emotional climax = account CTA (guest) | **DELETE** | Emptiness monetized / gated. |
| Emotion of returning signed-in parent | **Empty → betrayal** | Named tab, no next step. |

### Hope

| Current | Decision | WHY |
|---------|----------|-----|
| “You're just getting started. Amy will build this with you.” | **KEEP** | Nest hope sentence. |
| Hope as the only content forever | **DELETE** | Hope without a horizon becomes hollow. |
| Hope + one real next step | **MERGE** (required for alive) | Product frozen: if no step exists yet, **hide/whisper the tab** rather than park hope alone. |
| Hope used to excuse shipping empty nav | **DELETE** | Translation refuses that excuse. |

### Hierarchy

| Current | Decision | WHY |
|---------|----------|-----|
| Hero = “For {name}” | **KEEP** | Correct when the room is real. |
| Support = hope | **KEEP** | When paired with life. |
| Primary = outline save CTA (guest) | **DELETE** / **MERGE** | False primary on empty stage; Bloom law broken. |
| Signed-in: no primary | **DELETE** composition | Law of Three fails — hero + support, no action, no living object. |
| Nav weight `For {name}` | **WHISPER** or remove until alive | Personalized label on an empty room over-promises. |
| Law of Three lived | **Broken** | Empty cannot satisfy Primary / Support object with substance. |

**Law of Three after translation (only if tab ships alive):**

| Role | Survives |
|------|----------|
| Emotional hero | For {name} |
| Primary action | One real child next step (Bloom) — or tab does not ship |
| Supporting object | Hope line · quiet save later |

If no real step exists (features frozen / not ready): **DELETE the tab from lived nav** (whisper elsewhere) — do not KEEP an empty Nest room.

---

## Full element table

| Current element | Decision | WHY |
|-----------------|----------|-----|
| Nest Atmosphere shell | **KEEP** | Honest field. |
| H1 “For {name}” | **KEEP** | Dedication. |
| Hope line | **KEEP** | Soft truth — not solo act. |
| Hollow Soft Plate shelves | **DELETE** (already) | Stay deleted. |
| Signed-in empty-only page | **DELETE** as shippable surface | Empty tab. |
| Guest save CTA on empty | **DELETE** or **WHISPER** until life | Gate on void. |
| Outline-as-primary | **DELETE** | Manufacturing defect. |
| Guest sheet Play/Learn/Care pitch | **DELETE** until real | False preview. |
| Sheet soft-save capability | **KEEP** | When there is something to save. |
| Nav For Child tab while empty | **DELETE** / **WHISPER** hide | Apple would remove the icon. |
| Fake activities to fill | **DELETE** | Lies. |
| One real next step (when product has it) | **KEEP** | Only path to alive. |

---

## Alive vs empty scoreboard

| Signal | Now | After translation |
|--------|-----|-------------------|
| Name in H1 | Alive spark | Alive spark (**KEEP**) |
| Hope copy | Soft | Soft (**KEEP**) |
| Preview | None | None — so no tab theatre |
| Activities | None | One real step or no surface |
| Guest CTA | Empty gate | Whisper / after life |
| Signed-in return | Empty | Must not ship empty |
| Nav presence | Over-promise | Earn the slot |

---

## Verdict

| Question | Answer |
|----------|--------|
| Alive or empty? | **Empty.** |
| Would Apple ship an empty primary tab? | **NO** |
| Would Headspace ship hope-only as a destination? | **NO** |
| Would Linear ship a nav item with no object? | **NO** |
| Nest rule | **One living next step — or no For Child in the bar.** |

---

## What For Child would feel like if AmyNest had never been a SaaS product

You open For {name} and the room is not a placeholder. There is one clear, gentle thing waiting for your child — a sound to try, a story to open, a calm play breath — something alive that belongs to them. Hope is the soft light around it, not the only furniture.

If that living thing is not ready yet, the door simply is not in the hallway. Amy does not ask you to save progress for an empty room. She does not put your child's name on a vacant tab.

When the space is ready, it feels like a small world beginning — not a SaaS “coming soon” wearing Nest hope.

---

## STOP

Translation complete. No code. No mockups. No next screen.
