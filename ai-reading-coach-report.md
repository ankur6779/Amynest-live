# AmyNest Phonics — Phase 3: AI Reading Coach

**Date:** 2026-07-17  
**Constraints:** SATPIN unchanged · No regression to 10-step lessons, blending, segmenting, mastery, or parent dashboards  

---

## 1. AI Reading Coach architecture

```
Amy model audio (TTS / phonics cache)
        ↓
Child speaks (mic)
        ↓
STT: Web Speech (on-device) OR short Whisper transcript API
        ↓
speech-coach evaluateCoachResponse (local score)
        ↓
ai-reading-coach evaluateReadingCoachAttempt
  • normalize scores
  • phoneme confusion detection
  • schwa / noise heuristics
  • encouraging feedback + articulation tips
        ↓
Persist: pronunciation scores + confusion counts (NO audio)
        ↓
Adaptive focus + spoken mastery (integrity-gated) + parent report
```

**Entry UI:** `AiPronunciationCoach` inside `ReadingLessonRunner` steps `repeat` and `read_independent`.

---

## 2. Speech recognition pipeline

| Path | Behavior |
|------|----------|
| Desktop Chrome/Edge | Native Web Speech — transcript local, no upload |
| iOS / Android WebView / Firefox | `POST /api/speech/transcribe` — short clip → text only |
| Scoring | Always local (`@workspace/speech-coach` + `ai-reading-coach`) |

Reuse: `useSpeechRecognition`, `usePhonicsVoiceRound` (extended for phoneme/word + coach eval).

---

## 3. Pronunciation scoring methodology

1. Speech-coach returns score (0–100) + confidence (0–1) + correctness.  
2. `normalizeScore01` unifies scales (fixes prior 0–100 vs 0–1 mismatch).  
3. `evaluateReadingCoachAttempt` produces:
   - `pronunciationScore` / `accuracyPct` (0–100)
   - `confidencePct` (0–100)
   - `tier`: excellent / good / almost / try_again
   - `retryRecommended`
   - quality flags: schwa, background noise, empty transcript  

Integrity still requires `activity: "voice"`, `passed`, and confidence ≥ 0.55 for `spoken` mastery credit.

---

## 4. Error detection capabilities

| Detection | Example |
|-----------|---------|
| Phoneme confusions | s↔sh, m↔b, t↔d, k/c↔g, f↔v, r↔w, ch↔sh… |
| Added schwa | “muh”, “buh” on single consonants |
| Empty / noisy transcript | Longer multi-word dumps vs short target |
| Word-level mismatch | CVC cold-read via STT + coach compare |

Confusions stored in `coach-confusions` (grapheme pairs + counts only).

---

## 5. Adaptive learning strategy

- Confusion counts → `focusGraphemesForPractice` surfaced on “My level story” card  
- Weak sounds feed parent “Needs practice” (e.g. `r→w`)  
- Successful voice attempts credit `spoken` mastery via existing integrity gates  
- Lesson skills EMA unchanged; coach layers on top  

---

## 6. Reading fluency evaluation

`fluencyBandFromMetrics` → Emerging / Developing / Confident / Fluent / Advanced  
Parent dashboard shows band + skill fluency % + readiness narrative.

Full WPM/hesitation from timed STT is a future enhancement; current band uses accuracy proxies from skills + pronunciation avg.

---

## 7. Parent dashboard enhancements

`ReadingParentDashboard` now reports:

- Current SATPIN group  
- Words read / stories completed  
- Pronunciation accuracy  
- Blending & segmenting %  
- Fluency band  
- Sound mix-ups (AI confusions)  
- Strengths / needs  
- Reading readiness tip  
- Stars & badges  

---

## 8. Accessibility review

| Feature | Support |
|---------|---------|
| Skip without mic | Yes (every coach step) |
| Slow playback | Lesson toggle |
| Large mic target | `min-h-12` button |
| Articulation tips | Mouth cues + step lists |
| High contrast | Lesson prop preserved |
| Speech delay friendly | Retry + never “wrong/failed” language |
| Offline | On-device STT where available; Whisper needs network |

---

## 9. Performance impact

- Coach evaluation is synchronous, CPU-light string compare  
- No new persistent media  
- Mic path reuses frozen STT stack  
- Decodable story generation is pure in-memory  

Negligible battery impact vs prior digraph voice assessment.

---

## 10. Testing results

| Suite | Result |
|-------|--------|
| `ai-reading-coach.test.ts` | **8/8 pass** |
| `reading-lesson-engine.test.ts` | **pass** (no SATPIN regress) |
| `speech-feedback.test.ts` | **pass** |

Manual mic smoke recommended on iOS Capacitor + Android WebView.

---

## 11. Security & privacy (children’s voice)

| Principle | Implementation |
|-----------|----------------|
| Minimize storage | **No raw audio persisted** by coach modules |
| Purpose limitation | Transcript used only for immediate scoring |
| On-device first | Web Speech when available |
| Server STT | Transient transcript only (`/api/speech/transcribe`) |
| Parent-visible data | Scores, confusion labels, skill % — not recordings |
| Local device keys | `amynest:phonics-coach-confusions:*`, pronunciation scores |

---

## 12. Remaining recommendations

1. Timed fluency (WPM + hesitation) from STT timestamps  
2. Server sync for confusion/pronunciation aggregates (metadata only)  
3. Full group-assessment UI hosting coach items  
4. Richer Lottie mouth animations per grapheme  
5. Optional parent toggle: disable server STT (on-device only)  

---

## 13. Final Production Readiness Score

**82 / 100**

| Strength | Score |
|----------|------:|
| Architecture fit | 90 |
| Encouraging feedback | 92 |
| Confusion detection | 85 |
| Privacy posture | 88 |
| Lesson integration | 86 |
| Fluency depth | 70 |
| Story generation | 78 |
| Device QA coverage | 65 |

Ready for staged rollout behind existing phonics journey; mic steps degrade gracefully to self-report when STT unavailable.

---

### Key files

- `lib/phonics-v3/ai-reading-coach.ts`  
- `lib/phonics-v3/coach-confusions.ts`  
- `lib/phonics-v3/ai-decodable-stories.ts`  
- `components/phonics-v2/lesson/AiPronunciationCoach.tsx`  
- `components/phonics-v2/voice/usePhonicsVoiceRound.ts` (score normalize + phoneme targets)  
- `ReadingLessonRunner` / `PhonicsV2` / `ReadingParentDashboard` wiring  
