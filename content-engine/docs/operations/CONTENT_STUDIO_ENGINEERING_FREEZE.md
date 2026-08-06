# Content Studio — Engineering Freeze

**Effective:** immediately  
**Status:** Feature complete · architecture frozen  
**Default decision:** **REJECT**

Related: [CONTENT_STUDIO_CERTIFICATION.md](./CONTENT_STUDIO_CERTIFICATION.md)

---

## Policy

Content Studio architecture is **feature complete**.

Future engineering work must **not** expand the creative stack.

### Forbidden

| Category | Action |
|----------|--------|
| Director | No new Director |
| Engine | No new Engine |
| Memory | No new Memory Layer |
| Validator | No new Validator |
| Intelligence | No new Intelligence Layer |

Also forbidden without an allow-list justification:

- Parallel pipelines that duplicate existing orchestration
- Architecture redesigns “for cleanliness” or speculative future scale
- New abstraction layers above AI Director / Performance Director / Character Performance Studio / Scene Complexity / Character Memory / Story Memory / Thumbnail Engine / Thumbnail Learning

Frozen creative stack (do not grow):

1. AI Director  
2. Performance Director  
3. Character Performance Studio  
4. Scene Complexity  
5. Character Memory  
6. Story Memory  
7. Thumbnail Engine  
8. Thumbnail Learning Engine (CTR feedback)  
9. Content Diversity (production quality gate — script-driven scenes/metadata; not a new Director)

---

## Allow list (must satisfy ≥1)

Work is allowed **only** if it satisfies **at least one**:

1. **Fixes a production bug**
2. **Improves a measurable KPI**
   - CTR
   - Retention
   - Watch Time
   - Installs
   - Subscriptions
3. **Reduces infrastructure cost**
4. **Improves generation speed**

If none apply → **REJECT**.

---

## Focus shift: architecture → execution

Priority loop:

```
Publish → Measure → Learn → Optimize → Repeat
```

### Prefer

- Shipping daily Shorts / production runs
- YouTube Analytics ingestion (existing providers only)
- Using Thumbnail Learning / Continuous Learning outputs
- Tuning prompts, calendars, topics, schedules, budgets
- Fixing flaky publish/render/auth failures
- Cutting provider spend / latency on the **existing** path

### Do not prefer

- New packages under `content-engine/*-engine/`
- New `*-director` modules
- New validators “for safety completeness”
- New intelligence reports that do not change a KPI

---

## Change gate (required in PR / agent response)

Before implementing Content Studio changes, state:

| Field | Required |
|-------|----------|
| Allow-list item (1–4) | Yes |
| Evidence (bug id / KPI / cost / speed) | Yes |
| Touches frozen stack? | Yes / No |
| Rollback plan | If production path |

No evidence → do not write code.

---

## Thaw

Architecture expansion requires explicit product + engineering approval to lift this freeze. Until then, treat new Directors / Engines / Memory / Validators / Intelligence layers as **out of scope**.
