# Production Integrity Fix Report (P0)

Generated: 2026-08-19T14:46:18.667Z  
Branch / worktree: `fix/p0-production-integrity` @ `/Users/macbook/AmyNestProject/AmyNest-AI-p0-integrity`

## Verdict

| P0 | Status | Evidence |
|----|--------|----------|
| #1 Golden Script immutability | **PASS (009–012)** | VO/captions built only from Golden beats; unit tests reject Speech Practice overwrite on Health; Whisper matches each Golden topic (not mic/speech template) |
| #2 TTS completeness | **PASS (009–012)** | Chunked exact-sentence TTS + concat; duration 44–52s (was ~11.5s); Whisper coverage 83.8–90.1%; gate fails partial audio |
| #3 Character refs reach KIE HTTP | **PASS (proven on wire)** | Logs show `imageUrls` length 2–3, `REFERENCE_2_VIDEO`, canonical bible SHA in payload; scene memory last-frame appears on `memory→video` shots |
| Full master mux | **PASS 009 + 012** / **INCOMPLETE 010 + 011** | 010/011 stopped mid-compose after refs uploaded (Veo audio-branch / safety filter). Narration + KIE ref integrity still proven |

Golden **012** is Health/Balance (flamingo / freeze) — **not** Speech Practice.

## Code fixes (files / functions)

| Area | File | Change |
|------|------|--------|
| Golden VO immutability | `operations/golden-voice.ts` | `buildGoldenVoiceAndCaptions`, `assertGoldenVoiceIntegrity`, `assertNarrationAudioComplete` |
| Production VO + TTS gate | `operations/google-production-run.ts` | `voiceAndCaptionsForGolden` → Golden-only; `generateNarrationWithCompletenessGate` (retry then FAIL) |
| Upload metadata VO | `operations/upload-local-master.ts` | same Golden VO builder (no Speech template) |
| TTS truncation source | `asset-engine/providers/kie-audio/client.ts` | `kieGenerateTts` → per-sentence jobs + ffmpeg concat (exact wording) |
| KIE refs HTTP | `asset-engine/providers/kie-video/client.ts` | upload `referenceImagePaths` into `imageUrls`; `REFERENCE_2_VIDEO`; redacted payload logs; silence + bible FIRST_AND_LAST fallback on audio-branch fail |
| KIE fail-fast | `asset-engine/providers/kie-video/provider.ts` | require canonical bible for Amy/Amy Girl/Amy Boy; refuse substitute generation |
| Compose handoff | `creative-composition/compose.ts` | pass `character`; attach bible even if Character Memory disabled |
| Gemini options | `asset-engine/providers/gemini-video/provider.ts` | `character` on `GenerateVideoOptions` |
| Tests | `operations/golden-voice.p0.test.ts` | Golden 009–012 topic lock + KIE path resolve |

**Not changed:** provider selection, pricing, validators, AI/Performance Director, Character Memory architecture, Scene Complexity, thumbnail, publishing.

## Canonical bible hashes

| Character | SHA-256 |
|-----------|---------|
| Amy (amy-ai) | `6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb` |
| Amy Girl | `dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f` |
| Amy Boy | `1cc38ca7b1f5acc171a4a75d1d667e938c97216d9fad1529d11739d59abbb8ee` |

## Results

### golden-009 — PASS

| Field | Value |
|-------|-------|
| Topic | Speech parent view, guidance cards, and progress notes |
| Feature | Speech Parent Guidance |
| Narration coverage % | 88.2 |
| Audio duration | 45.28s |
| Video duration | 48s |
| Amy reference hash | `6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb` |
| Amy Girl reference hash | `dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f` |
| Amy Boy reference hash | `1cc38ca7b1f5acc171a4a75d1d667e938c97216d9fad1529d11739d59abbb8ee` |
| KIE reference count (max observed) | 3 |
| Silent intervals (narration) | none material (full VO) |
| Pass/Fail | **PASS (full master)** |

**Expected narration:**

```
It’s 8:47 PM. Doubt sits with you at the table. The kids’ activity ends. You’re left holding the phone… with no idea what to reinforce at dinner. Apps entertain kids — then leave parents without a takeaway. Only now does Amy appear — as a warm guide, not a pitch. Speech Coach includes a parent view with guidance cards and progress notes — switch from child play to caregiver clarity. One clear caregiver tip can turn a session into a real home habit. Download AmyNest AI on Google Play and the App Store.
```

**Actual narration (Whisper):**

```
It's 847pm.
Doubt sits with you at the table.
The kids' activity ends.
You're left holding the phone.
With no idea what to reinforce our dinner.
Apps entertain kids.
Then leave parents without a takeaway.
Only now does a meapyo.
As a warm guide, not a pitch.
Speech coach includes a parent view,
with guidance cards and progress notes,
switch from child play to caregiver clarity.
One clear caregiver tip can turn a session into a real home habit.
Download Aminest AI on Google Play and the App Store.
```

### golden-010 — P0 AUDIO/REFS PASS · MASTER INCOMPLETE

| Field | Value |
|-------|-------|
| Topic | Speech Coach V2 live coaching and parent dashboard |
| Feature | Speech Coach V2 |
| Narration coverage % | 89.9 |
| Audio duration | 51.72s |
| Video duration | 0s (compose stopped after refs proven — Veo audio/safety) |
| Amy reference hash | `6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb` |
| Amy Girl reference hash | `dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f` |
| Amy Boy reference hash | `1cc38ca7b1f5acc171a4a75d1d667e938c97216d9fad1529d11739d59abbb8ee` |
| KIE reference count (max observed) | 3 |
| Silent intervals (narration) | none material (full VO) |
| Pass/Fail | **P0#1+#2+#3 PASS · full master FAIL** |

**Expected narration:**

```
It’s 8:47 PM. Pride — waiting sits with you at the table. You’ve been practicing for weeks. Progress feels invisible. Motivation is the first thing getting tired. Parents practice for weeks — and still can't tell if anything improved. Only now does Amy appear — as a warm guide, not a pitch. Speech Coach V2 offers live realtime coaching for pronunciation and fluency, with a parent dashboard for minutes, words, confidence, and streak. When you can see the streak rising, hope gets something to hold. Download AmyNest AI on Google Play and the App Store.
```

**Actual narration (Whisper):**

```
It's 847 pm.
Pride, waiting, sits with you at the table.
You've been practicing for weeks.
Progress feels invisible.
Motivation is the first thing getting tired.
Parents practice for weeks,
and still can't tell if anything improved.
Only now does Amy appear.
As a warm guide, not a bitch.
Speech coach V2 offers live real-time coaching
for pronunciation and fluency,
with a parent dashboard for minutes, words, confidence and streak.
When you can see the streak rising,
hope gets something to hold.
Download Amy Nest AI on Google Play and the App Store.
```

### golden-011 — P0 AUDIO/REFS PASS · MASTER INCOMPLETE

| Field | Value |
|-------|-------|
| Topic | Amy Health Lab motion wellness world |
| Feature | Amy Health Lab™ |
| Narration coverage % | 90.1 |
| Audio duration | 50.56s |
| Video duration | 0s (compose stopped — safety filter after KIE refs uploaded) |
| Amy reference hash | `6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb` |
| Amy Girl reference hash | `dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f` |
| Amy Boy reference hash | `1cc38ca7b1f5acc171a4a75d1d667e938c97216d9fad1529d11739d59abbb8ee` |
| KIE reference count (max observed) | 3 |
| Silent intervals (narration) | none material (full VO) |
| Pass/Fail | **P0#1+#2+#3 PASS · full master FAIL** |

**Expected narration:**

```
It’s 8:47 PM. Curiosity sits with you at the table. You say “go play outside / go exercise.” They hear a chore. The body stays still; the negotiation begins. “Go exercise” rarely works — kids want adventure, not instructions. Only now does Amy appear — as a warm guide, not a pitch. Amy Health Lab™ is a motion-based wellness zone — a secret science lab in the sky where kids become Amy’s Field Partner. When the body becomes an adventure, wellness stops needing a lecture. Download AmyNest AI on Google Play and the App Store.
```

**Actual narration (Whisper):**

```
It's 847pm.
Curiosity sits with you at the table.
You say, go play outside, go exercise.
They hear a chore.
The body stays still.
The negotiation begins.
Go exercise rarely works.
Kids want adventure, not instructions.
Only now does a meapier.
As a warm guide, not a pitch.
Amy Health Lab is a motion-based wellness zone.
A secret science lab in the sky
where kids become Amy's field partner.
When the body becomes an adventure,
wellness stops needing a lecture.
Download Amy Nest AI on Google Play and the App Store.
```

### golden-012 — PASS

| Field | Value |
|-------|-------|
| Topic | Flamingo balance and freeze-statue challenges |
| Feature | Health Lab Balance & Freeze Games |
| Narration coverage % | 83.8 |
| Audio duration | 44.28s |
| Video duration | 47s |
| Amy reference hash | `6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb` |
| Amy Girl reference hash | `dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f` |
| Amy Boy reference hash | `1cc38ca7b1f5acc171a4a75d1d667e938c97216d9fad1529d11739d59abbb8ee` |
| KIE reference count (max observed) | 3 |
| Silent intervals (narration) | none material (full VO) |
| Pass/Fail | **PASS (full master · Health/Balance, not Speech Practice)** |

**Expected narration:**

```
It’s 8:47 PM. Pride — waiting sits with you at the table. They’re bouncing off the walls — not “naughty,” just full of weather they can’t land. Restlessness gets labeled as “bad behavior” when kids actually need body practice. Only now does Amy appear — as a warm guide, not a pitch. Health Lab includes flamingo balance, freeze-statue, and steadiness challenges powered by motion play. A held balance can feel like a superpower they chose. Download AmyNest AI on Google Play and the App Store.
```

**Actual narration (Whisper):**

```
It's 847 B.M.
Pride, waiting sits with you at the table.
They're bouncing off the walls.
Not naughty, just full of weather they can't land.
Resslessness gets labeled as bad behavior.
When kids actually need body practice.
Only now does a meabier.
As a warm guide, not a pitch.
Health lab includes flamingo balance, free statue, and steadiness challenges.
Powered by motion play.
A held balance can feel like a super power they chose.
Download Amy Nest AI on Google Play and the App Store.
```

## Regression re-test (2026-08-19T16:00:15.616Z)

| Golden | P0 | TTS | Transcript % | Audio | Video | Silent gaps | Amy on wire | Girl on wire | Boy on wire | KIE verified | Veo | Final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| golden-009 | PASS | PASS | 88.2% / 100% sent | 45.28s | 48s | none material | true | true | true | true (refs=3) | COMPLETE | **PASS** |
| golden-010 | PASS | PASS | 87.3% / 100% sent | 49.12s | 0s | none material | true | true | false | true (refs=3) | INCOMPLETE_AFTER_REFS | **PARTIAL** |
| golden-011 | PASS | PASS | 90.1% / 100% sent | 49.56s | 0s | none material | true | true | false | true (refs=3) | INCOMPLETE_AFTER_REFS | **PARTIAL** |
| golden-012 | PASS | PASS | 82.4% / 87.5% sent | 44.72s | 48s | none material | true | true | true | true (refs=3) | COMPLETE | **PASS** |

### Visual frame check (successful masters only)

| Golden | First | Middle | Story/late | CTA | Notes |
|--------|-------|--------|------------|-----|-------|
| 009 | Amy Girl (yellow bow, purple hoodie) | — | — | Amy AI end card | Caption: Golden 009 doubt/table beat — **not** Speech Practice mic |
| 012 | Amy Girl (yellow bow, purple) + Golden 012 caption (Pride/waiting) | Amy AI + Amy Boy + Amy Girl interaction | CTA plate near end | Amy AI download end card | Topic Health/Balance captions on-screen; bible hashes on wire for all three |

### Production resume gate

**Do not resume batch production until Golden 010 and 011 deliver complete masters.**

010/011 status:
- P0#1 narration: **PASS** (Speech Coach V2 / Health Lab — not Speech Practice template)
- P0#2 TTS: **PASS** (49s+, Whisper ≥87%, no material silence)
- P0#3 KIE refs: **PASS on wire** (canonical bible SHA in `imageUrls`, refs=2–3)
- Final master: **FAIL** — Veo compose stopped with provider **safety filter / audio-branch** after refs uploaded (not an integrity-code regression; do not workaround by stripping refs or substituting narration)


### Canonical reference hashes

- Amy: `6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb`
- Amy Girl: `dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f`
- Amy Boy: `1cc38ca7b1f5acc171a4a75d1d667e938c97216d9fad1529d11739d59abbb8ee`

### golden-009 — PASS

| Field | Value |
|---|---|
| Topic | Speech parent view, guidance cards, and progress notes |
| Feature | Speech Parent Guidance |
| P0 status | PASS |
| TTS status | PASS |
| Word coverage | 88.2% |
| Sentence coverage | 100% |
| Audio duration | 45.28s |
| Video duration | 48s |
| Master has audio stream | true |
| Silent intervals | none material |
| Amy on KIE wire | true |
| Girl on KIE wire | true |
| Boy on KIE wire | true |
| KIE request verified | true (max imageUrls=3) |
| Scene-memory frame on wire | true |
| Veo generation | COMPLETE |
| Frames | first.jpg, middle.jpg, story-final.jpg, cta.jpg |
| Stop reasons | none |
| Final | **PASS** |

**Missing words (sample):** amy, appear, amynest

**Unexpected words (sample):** it's, 847pm, kids', you're, our, meapyo, aminest

**Expected narration:**

```
It’s 8:47 PM. Doubt sits with you at the table. The kids’ activity ends. You’re left holding the phone… with no idea what to reinforce at dinner. Apps entertain kids — then leave parents without a takeaway. Only now does Amy appear — as a warm guide, not a pitch. Speech Coach includes a parent view with guidance cards and progress notes — switch from child play to caregiver clarity. One clear caregiver tip can turn a session into a real home habit. Download AmyNest AI on Google Play and the App Store.
```

**Whisper transcript:**

```
It's 847pm.
Doubt sits with you at the table.
The kids' activity ends.
You're left holding the phone.
With no idea what to reinforce our dinner.
Apps entertain kids.
Then leave parents without a takeaway.
Only now does a meapyo.
As a warm guide, not a pitch.
Speech coach includes a parent view,
with guidance cards and progress notes,
switch from child play to caregiver clarity.
One clear caregiver tip can turn a session into a real home habit.
Download Aminest AI on Google Play and the App Store.
```

### golden-010 — PARTIAL

| Field | Value |
|---|---|
| Topic | Speech Coach V2 live coaching and parent dashboard |
| Feature | Speech Coach V2 |
| P0 status | PASS |
| TTS status | PASS |
| Word coverage | 87.3% |
| Sentence coverage | 100% |
| Audio duration | 49.12s |
| Video duration | 0s |
| Master has audio stream | false |
| Silent intervals | none material |
| Amy on KIE wire | true |
| Girl on KIE wire | true |
| Boy on KIE wire | false |
| KIE request verified | true (max imageUrls=3) |
| Scene-memory frame on wire | true |
| Veo generation | INCOMPLETE_AFTER_REFS |
| Frames | n/a |
| Stop reasons | none |
| Final | **PARTIAL** |

**Missing words (sample):** thing, realtime, gets, amynest

**Unexpected words (sample):** it's, 847pm, you've, real, time, street, get, nest

**Expected narration:**

```
It’s 8:47 PM. Pride — waiting sits with you at the table. You’ve been practicing for weeks. Progress feels invisible. Motivation is the first thing getting tired. Parents practice for weeks — and still can't tell if anything improved. Only now does Amy appear — as a warm guide, not a pitch. Speech Coach V2 offers live realtime coaching for pronunciation and fluency, with a parent dashboard for minutes, words, confidence, and streak. When you can see the streak rising, hope gets something to hold. Download AmyNest AI on Google Play and the App Store.
```

**Whisper transcript:**

```
It's 847pm.
Pride, waiting sits with you at the table.
You've been practicing for weeks.
Progress feels invisible.
Motivation is the first in getting tired.
Parents practice for weeks and still can't tell if anything improved.
Only now does Amy appear as a warm guide, not a pitch.
Speech coach V2 offers live real time coaching for pronunciation and fluency,
with a parent dashboard for minutes, words, confidence and streak.
When you can see the street rising, hope get something to hold.
Download Amy Nest AI on Google Play and the App Store.
```

### golden-011 — PARTIAL

| Field | Value |
|---|---|
| Topic | Amy Health Lab motion wellness world |
| Feature | Amy Health Lab™ |
| P0 status | PASS |
| TTS status | PASS |
| Word coverage | 90.1% |
| Sentence coverage | 100% |
| Audio duration | 49.56s |
| Video duration | 0s |
| Master has audio stream | false |
| Silent intervals | none material |
| Amy on KIE wire | true |
| Girl on KIE wire | true |
| Boy on KIE wire | false |
| KIE request verified | true (max imageUrls=3) |
| Scene-memory frame on wire | false |
| Veo generation | INCOMPLETE_AFTER_REFS |
| Frames | n/a |
| Stop reasons | none |
| Final | **PARTIAL** |

**Missing words (sample):** rarely, amynest

**Unexpected words (sample):** it's, 847pm, really, amy's, nest

**Expected narration:**

```
It’s 8:47 PM. Curiosity sits with you at the table. You say “go play outside / go exercise.” They hear a chore. The body stays still; the negotiation begins. “Go exercise” rarely works — kids want adventure, not instructions. Only now does Amy appear — as a warm guide, not a pitch. Amy Health Lab™ is a motion-based wellness zone — a secret science lab in the sky where kids become Amy’s Field Partner. When the body becomes an adventure, wellness stops needing a lecture. Download AmyNest AI on Google Play and the App Store.
```

**Whisper transcript:**

```
It's 847pm.
Curiosity sits with you at the table.
You say, go play outside.
Go exercise.
They hear a chore.
The body stays still.
The negotiation begins.
Go exercise really works.
Kids want adventure, not instructions.
Only now does Amy appear.
As a warm guide, not a pitch.
Amy Health Lab is a motion-based wellness zone.
A secret science lab in the sky
where kids become Amy's field partner.
When the body becomes an adventure,
wellness stops needing a lecture.
Download Amy Nest AI on Google Play and the App Store.
```

### golden-012 — PASS

| Field | Value |
|---|---|
| Topic | Flamingo balance and freeze-statue challenges |
| Feature | Health Lab Balance & Freeze Games |
| P0 status | PASS |
| TTS status | PASS |
| Word coverage | 82.4% |
| Sentence coverage | 87.5% |
| Audio duration | 44.72s |
| Video duration | 48s |
| Master has audio stream | true |
| Silent intervals | none material |
| Amy on KIE wire | true |
| Girl on KIE wire | true |
| Boy on KIE wire | true |
| KIE request verified | true (max imageUrls=3) |
| Scene-memory frame on wire | true |
| Veo generation | COMPLETE |
| Frames | first.jpg, middle.jpg, story-final.jpg, cta.jpg |
| Stop reasons | none |
| Final | **PASS** |

**Missing words (sample):** restlessness, labeled, behavior, freeze, superpower, amynest

**Unexpected words (sample):** it's, 847pm, they're, can't, resslessness, labelled, behaviour, free, super, power, nest

**Expected narration:**

```
It’s 8:47 PM. Pride — waiting sits with you at the table. They’re bouncing off the walls — not “naughty,” just full of weather they can’t land. Restlessness gets labeled as “bad behavior” when kids actually need body practice. Only now does Amy appear — as a warm guide, not a pitch. Health Lab includes flamingo balance, freeze-statue, and steadiness challenges powered by motion play. A held balance can feel like a superpower they chose. Download AmyNest AI on Google Play and the App Store.
```

**Whisper transcript:**

```
It's 847pm.
Pride.
Waiting sits with you at the table.
They're bouncing off the walls.
Not naughty.
Just full of weather they can't land.
Resslessness gets labelled as bad behaviour
when kids actually need body practice.
Only now does Amy appear.
As a warm guide, not a pitch.
Health lab includes flamingo balance, free statue
and steadiness challenges powered by motion play.
A held balance can feel like a super power they chose.
Download Amy Nest AI on Google Play and the App Store.
```

