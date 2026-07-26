# Birth Sky Explainability / Evidence Engine

## Architecture

```
Astronomy → Meaning → Development → Adaptive → Conversation
  → ExplainabilityEngine (read-only reconstruction)
    → EvidenceSnapshot
      → (optional) AI Context when DEBUG_EXPLAINABILITY=true
```

Existing engines are **not** modified. Traces are reconstructed from public
APIs (`evaluateRules`) and snapshot fields.

## Version

`evidence-engine/1.0.0`

## Rule trace model

Each `EvidenceNode`:

| Field | Meaning |
|-------|---------|
| `id` | Stable concept path e.g. `meaning:leadership` |
| `engine` | meaning / development / adaptive / conversation |
| `engineVersion` | Source engine version |
| `rules` | `{ id: "M-104", key: "sun_sign_Leo" }` |
| `supportingFacts` | Astronomy / history tags |
| `confidence` | 0–1 |
| `dependencies` | Upstream node / fact ids |

Rule codes (`M-###`, `D-###`, `A-###`, `C-###`) are deterministic hashes of
engine rule keys.

## Evidence graph

Directed edges: `derives` · `boosts` · `adapts` · `prioritizes`

Example path:

`astronomy:sun_sign=Leo` → `meaning:leadership` → `development:priority:confidence`
→ `adaptive:prefer:focus` → `conversation:priority:attention`

## Explanation levels

- **compact** — short engine:concept@rule tags  
- **debug** — traces + edges  
- **developer** — full JSON nodes + confidence breakdown  

Parent-facing prose is **not** generated here.

## Debug workflow

1. Run pipeline to obtain Meaning / Development / Adaptive / Conversation snapshots  
2. `computeEvidenceSnapshot({ astronomy, meaning, development, adaptive, conversation })`  
3. Inspect `ruleTrace` / `dependencyGraph` / `views.debug`  

### AI Context

By default EvidenceSnapshot is **not** sent to the LLM.

Enable with:

```bash
DEBUG_EXPLAINABILITY=true
```

or request flag `includeEvidence: true` on AI context input.

## Package

`@workspace/birth-sky-evidence`
