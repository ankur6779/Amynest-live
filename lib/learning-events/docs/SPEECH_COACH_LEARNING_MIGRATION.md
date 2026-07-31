# Speech Coach → Learning Platform consumer (migration notes)

Speech Coach is a **Learning Platform consumer**. Presentation owns practice UI and pronunciation playback. Adaptivity (difficulty, hints, celebration, review targets) comes from Learning Runtime + Knowledge Graph.

## Adapter

`artifacts/kidschedule/src/lib/speech-coach-learning-adapter.ts`

- `beginSpeechCoachSession` / `recordSpeechCoachAttempt` / `endSpeechCoachSession` (as implemented)
- Publishes `speech.practice_*` (+ attention when wired)
- Consumes Runtime guidance — no local mastery engine for adaptivity
- Parent: `getSpeechCoachParentInsights` → `SpeechKnowledgeInsightsCard`

## Events

- `speech.practice_started`
- `speech.practice_completed`

## Progress section

`recordActivity({ section: "speech" })` via existing speech/LPE paths.

## Architecture freeze

Part of Architecture v1.0 — see `docs/learning-platform/v1/`.
