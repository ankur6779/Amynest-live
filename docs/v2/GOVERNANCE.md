# AmyNest Governance

**Status:** BINDING  
**Canon:** [`AMYNEST_CANON.md`](./AMYNEST_CANON.md)  
**Authority:** Founder  

This file defines **how the stack may change**.  
It does not add laws, philosophy, or architecture.

---

## Principles

1. **Higher wins** — see Canon hierarchy.  
2. **No silent amendment** — every change to a binding document is a Founder act.  
3. **No new philosophy documents** — deepen or amend existing Canon instruments only.  
4. **No new laws by PR** — features cannot mint L22.  
5. **Programs are temporary** — Platform versions may turn; soul documents may not churn with them.

---

## Who may change what

| Layer | May propose | Approves | Notes |
|-------|-------------|----------|-------|
| Founder Intent | Founder only | Founder | Highest will |
| Immutable Laws | Founder only | Founder | L01–L04 hardest |
| Home Contract | Founder (or designee draft) | Founder | Must still obey Immutable Laws |
| Design Constitution | Founder / design authority draft | Founder | LOCKED until amendment |
| Visual Constitution | Founder / design authority draft | Founder | Soul; Founder decree |
| Room Architecture | Founder | Founder | Rooms otherwise FROZEN per Implementation Law |
| Platform Architecture | Platform lead draft | Founder | Before implementation |
| Implementation Laws | Founder | Founder | Process only |
| Founder Oath | Founder | Founder | Align to Immutable Laws |
| Law Index | Maintainer (links) / Founder (substance) | Founder if meaning shifts | Not a law source |
| Canon / Governance | Founder only | Founder | Meta-stack |
| Engineering (code) | Engineers | Review + must cite law obeyed | Lowest layer |

**Designee drafts do not ship.** Only Founder approval binds.

---

## Amendment Process

### Step 0 — Classify the change

| Class | Examples | Bar |
|-------|----------|-----|
| **A — Supreme** | L01–L04 · Nest Presence identity · Home vs app | Founder decree + Death Test still YES |
| **B — Law** | L05–L21 wording | Founder decree + decision matrix still coherent |
| **C — Craft** | Design / Visual Constitution token or material rule | Founder decree · no fifth material without explicit A/B check |
| **D — Feeling** | Room Architecture prose · room reopen | Founder · Implementation Law status board |
| **E — Program** | Platform V3→V4 pillars / phases | Founder architecture approval |
| **F — Process** | Implementation Law sequencing | Founder |
| **G — Index / links** | LAW_INDEX paths | Maintainer OK if no meaning change |

If Class unclear → treat as **higher** class (harder bar).

---

### Step 1 — Motive

State in writing:

- What breaks if we do **not** change?  
- Which Immutable Law still holds after the change?  
- Is this a better resident — or a bigger building?  

If the motive is “add a product,” **stop**.

---

### Step 2 — Draft

- Edit the **existing** document.  
- Do **not** create a parallel philosophy file.  
- Update [`LAW_INDEX.md`](./LAW_INDEX.md) if law IDs or maps shift.  
- Update Canon registry row only if scope/authority of a document changes.

---

### Step 3 — Conflict check

Walk Canon conflicts:

1. Still obey Founder Intent?  
2. Still obey Immutable Laws?  
3. Home Contract / Constitutions / Platform still nested correctly?  
4. Run Founder Tests in Immutable Laws §7 that apply.

Any fail → revise draft or abandon.

---

### Step 4 — Founder decree

Founder records approval:

| Field | Required |
|-------|----------|
| Document | path |
| Class | A–G |
| Date | |
| Verdict | APPROVED / REJECTED |
| Note | one sentence why soul still holds |

Without this → **not amended**.

---

### Step 5 — Close

- Rejected drafts do not linger as alternate Constitutions.  
- Approved amendments supersede prior text in that file.  
- Engineering may proceed only after approval when the change unblocks code.

---

## Special case — Design / Visual Constitution

Future Founder changes Constitution as follows:

1. Confirm change is **craft or soul clarification**, not a new product identity.  
2. Check Immutable **L09 · L10 · L11 · L12 · L13**.  
3. Design and Visual stay paired: soul (Visual) and system (Design) must not diverge into two languages.  
4. Founder decree (Step 4).  
5. Nest Presence manufacturing remains one language — no “Phase 4 philosophy.”

**Forbidden Constitution moves:** new materials family without Founder Class A/B awareness · second nav · second shell · EdTech / dashboard relapse labeled as “refresh.”

---

## Special case — Platform versions

- Platform Architecture may be replaced (V3 → V4) as a **program**.  
- Replacement must cite obedience to Immutable Laws and Home Contract.  
- Platform approval ≠ Constitution reopen.  
- Implementation remains forbidden until Founder approves that Platform document’s status.

---

## Special case — Room reopen

- FROZEN rooms do not reopen for curiosity.  
- Reopen only by Founder under Implementation Law + Room Architecture feeling authority.  
- Reopen is **translation/recovery under law**, not redesign philosophy.

---

## Emergency engineering

If production is on fire:

- Hotfix code may ship to restore prior Nest behavior.  
- Hotfix may **not** invent new UX language, second shell, or new law.  
- Follow-up must restore Canon compliance within the next Founder-approved cycle.

---

## Forbidden forever (unless Founder Class A decree)

- New philosophy documents outside Canon registry  
- New immutable laws by feature teams  
- Parallel “v2 soul” docs that compete with Visual / Design / Immutable Laws  
- Treating Platform or SDKs as equal to Immutable Laws  

---

## STOP

Governance only.  
Canon is closed.  
No new philosophy after [`AMYNEST_CANON.md`](./AMYNEST_CANON.md).
