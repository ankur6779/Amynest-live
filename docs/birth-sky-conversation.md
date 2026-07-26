# Birth Sky Conversation Intelligence Engine

## Architecture

```
Astronomy (unchanged)
  → Meaning (unchanged)
    → Development (unchanged)
      → Adaptive (unchanged)
        → ConversationEngine (deterministic, no LLM)
          → ConversationPlan (versioned)
            → AI Context / LLM
```

## Version

`conversation-engine/1.0.0` — stored on every `ConversationPlan`.

Computed at AI assemble time from Meaning + Development + Adaptive snapshots,
user question, optional entry point, and optional history summary.

## Planning pipeline

1. **Intent classification** — keyword / entry-point rules  
2. **Priority engine** — primary / secondary / avoid topics + depth  
3. **Response strategy** — tone, detail, evidence preference, examples  
4. **Safety flags** — always attached  

## Intents

`parent_question` · `routine_help` · `learning_guidance` · `sleep_guidance` ·
`emotional_support` · `behaviour_guidance` · `milestone_question` ·
`astrology_insight` · `general_conversation` · `unknown`

## Safety strategy

Every plan includes:

- no_absolute_predictions  
- no_medical_diagnosis  
- no_financial_advice  
- no_fear_based_statements  
- no_deterministic_future  
- label_tradition_as_tradition  
- parent_audience_only  

`avoidTopics` always includes fatalistic / medical / financial / fear tags.

## AI context

Structured facts only (not advice prose):

- `conversation_intent`
- `conversation_depth`
- `conversation_tone`
- `conversation_priority`
- `conversation_avoid`
- `conversation_order`
- `safety_flags`

## Package

`@workspace/birth-sky-conversation`

## Downstream

See [birth-sky-evidence.md](./birth-sky-evidence.md) — Evidence Engine traces
ConversationPlan decisions (debug / QA only by default).

## Future roadmap

- Richer history-summary demotion of covered topics  
- Locale-aware intent lexicons  
- Multi-turn plan continuity tokens  
