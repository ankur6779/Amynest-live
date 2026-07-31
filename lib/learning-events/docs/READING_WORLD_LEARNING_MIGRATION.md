# Reading World → Learning Platform consumer (final migration notes)

Reading World (Phonics / Reading Academy at `/phonics`) is a **presentation-only Learning Platform consumer**. It owns rendering, page flow, interactions, pronunciation playback, and animations.

It must **never** own difficulty, mastery, recommendations, review scheduling, or adaptive progression — those belong to Learning Runtime (+ Knowledge Graph evidence).

## Architecture (acyclic)

```
learning-events ← knowledge-graph ← learning-runtime ← kidschedule adapters
```

| Layer | Owns | Does not own |
|-------|------|--------------|
| PhonicsV2 / DailySessionRunner / ReadingLessonRunner | Playback, steps, SATPIN unlock gates, pet/UI chrome | Adaptive difficulty, review schedulers, mastery engines |
| `reading-world-learning-adapter` | Session lifecycle, event publish, apply Runtime guidance | Scoring / next-item algorithms |
| Learning Runtime | Difficulty, hint level, narration, celebration, review, recommendations, attention overlays | Lesson HTML / animations |
| Knowledge Graph | Letters, words, phonemes, blends, syllables, sentences, reading concepts | UI storytelling |

## Session flow

1. `beginReadingSession()` → `reading.session_started` (+ attention snapshot)
2. Runtime guidance consumed:
   - `difficulty`, `hintLevel`, `celebrationLevel`, `narrationLength`
   - `reviewQueue`, `recommendedWords`, `recommendedLetters`, `recommendedPhonemes`
   - `attentionProfile`
3. During session: `page_started` → `word_completed` / `phoneme_practiced` / `new_word` → `page_completed`
4. Runtime updates → next lesson order via preferred letters (still constrained by letter-group unlocks)
5. `endReadingSession()` → `reading.session_completed`
6. Host: `recordActivity({ section: "reading" })` (dual-credits `phonics` for legacy unlocks)

## Event types (schema v1, bus-local — no OpenAPI codegen)

| Type | When |
|------|------|
| `reading.session_started` | Session open |
| `reading.page_started` | Lesson phase / page begins |
| `reading.word_completed` | Practice word finished |
| `reading.page_completed` | Lesson page / lesson complete |
| `reading.phoneme_practiced` | Pronunciation coach phoneme/word |
| `reading.new_word` | New vocabulary introduced |
| `reading.session_completed` | Session close |

Builders: `readingLearningEvent(phase, …)` in `@workspace/learning-events`.  
Host: `publishReadingLearningEvent` in `learning-events-bridge.ts`.

## Progress engine section + backward compatibility

| Concern | Value |
|---------|-------|
| Product name | Reading World |
| Learning-events module | `reading` |
| `recordActivity` section | **`reading`** (new `SectionKey`) |
| Dual-credit | Completing `reading` also advances **`phonics`** section progress so legacy unlocks/reports stay warm |
| Legacy callers | `recordPlay` / `recordActivity({ section: "phonics" })` continue to work unchanged |
| Guidance aliases | `hints` → `hintLevel`, `recommendedVocabulary` → `recommendedWords` (deprecated fields kept) |

No OpenAPI / DB migration for learning-events (client bus + offline queue).

## Knowledge Graph structure

`ensureReadingLearningStructure` / `ensureReadingConcepts` upserts:

- letters / graphemes (`reading:{letter}`)
- words (`word:{w}`)
- phonemes (`phoneme:{p}`)
- blends (`entity:blend-{bl}`)
- syllables (`entity:syllable-{s}`)
- sentences (`entity:sentence-{slug}`)
- reading concepts / patterns (`entity:pattern-*`, concept tags)

Observations map from completed reading events (including blends/sentences metadata).

## Parent surfaces

| Surface | Source |
|---------|--------|
| Knowledge Summary | `ReadingKnowledgeInsightsCard` |
| Reading Timeline | `getReadingWorldParentInsights().timelineLabels` (+ study curriculum merge) |
| Reading Skills | `readingSkills` chips on parent card |
| Learning Journey | `journeyLine` on parent card + skill graph via `section: "reading"` |

## What stays local (not Learning Platform)

- **SATPIN / letter-group unlocks** — curriculum safety rails (never bypassed by Runtime)
- **Daily session resume** (`DailySessionState` localStorage)
- **Reading pet / journey map / gated mastery chrome** — engagement UI only; adaptivity prefers Runtime
- **`buildAdaptiveReadingPlan`** — presentation helper; overlay Runtime difficulty/hints via `mapRuntimeDifficultyToReadingBand`

## Anti-patterns (do not reintroduce)

- Reading-local difficulty / recommendation / mastery engines for next-lesson selection
- Bypassing letter-group unlocks because Runtime preferred a locked grapheme
- Writing KG from `knowledge.updated` (fan-out only)
- Recording Reading World completions only under `phonics` without `reading` (use `reading` + dual-credit)

## Verification

```bash
pnpm --filter @workspace/learning-events test
pnpm --filter @workspace/learning-runtime test
pnpm --filter @workspace/knowledge-graph test
pnpm --filter @workspace/learning-progress-engine test
pnpm --filter @workspace/kidschedule exec vitest run src/lib/reading-world-learning-adapter.test.ts
```
