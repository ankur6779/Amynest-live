# Phonics Production Checklist

Manual QA for staging verification after curriculum deploy. Use a test child profile at each level (or override `currentLevel` via API/admin if available).

---

## L1 Child — Letter Sounds

### Visible content
- [ ] Letter tiles / learning pack (a–z phonemes)
- [ ] Letter sound games only
- [ ] Journey map shows L1 active

### Locked content
- [ ] **Word Families** — locked card (“Unlocks at Level 3”)
- [ ] **Karaoke / CVC blending** — hidden or empty (no practice words)
- [ ] **Phonics Games Hub** — not rendered
- [ ] **Digraph / Blend / CVCC pathways** — locked
- [ ] **Decodable stories** — none unlocked

### Missions
- [ ] Daily mission picks contain **letters only** (no CVC words like cat/hat/dog)
- [ ] Mission count may be sparse — acceptable if weak pool empty

### Assessments
- [ ] Daily curriculum test with `curriculumLevel: 1` returns **empty or 409** (not age-band CVC questions)
- [ ] No CVC words in test UI

### Stories
- [ ] Story reader shows no auth-* or V2 stories
- [ ] No digraph/blend/cvcc story tiles

---

## L2 Child — CVC Decoding

### Visible content
- [ ] CVC word tiles from curriculum filter (cat, hat, dog, etc.)
- [ ] Karaoke initializes from **first unlocked tile** (not hardcoded defaults)
- [ ] Games Hub uses filtered `practiceWords` only

### Locked content
- [ ] **Word Families** — locked
- [ ] Digraph words (ship, chat) — not in tile grid
- [ ] Sight words (the, and) — not in tile grid
- [ ] Blend/CVCC pathways — locked

### Missions
- [ ] Adaptive picks are CVC words only
- [ ] No story task unless a story is actually unlocked

### Assessments
- [ ] Daily test questions drawn from **L2 CVC pool only**
- [ ] No fallback to full age-band content when filter is empty

### Stories
- [ ] Auth stories unlock only when **mastery ≥ 10** AND level ≥ 2
- [ ] At mastery 5 / L2 — no auth stories
- [ ] At mastery 25 / L2 — some auth-* stories visible

---

## L4 Child — Digraphs

### Visible content
- [ ] Digraph pathway unlocked (mastery ≥ 60%, level ≥ 4)
- [ ] Digraph words (ship, chat, thin, etc.)
- [ ] CVC words still visible for review

### Locked content
- [ ] **Word Families** — unlocked at L3+ (should be visible if at L4)
- [ ] Blend words (frog, flag) — locked
- [ ] CVCC words (lamp, nest) — locked
- [ ] Sight words — locked

### Missions
- [ ] Mission words respect `isContentUnlocked()` — no blend/CVCC picks

### Assessments
- [ ] Daily/weekly tests include L4-appropriate question types
- [ ] No age-band-only fallback when `curriculumLevel` set

### Stories
- [ ] Digraph stories (`dig-*`) unlock at L4 + per-digraph mastery threshold
- [ ] Blend stories still locked

---

## L7 Child — Fluency & Stories

### Visible content
- [ ] Sight words (the, and, is, it, to)
- [ ] Fluency sentences
- [ ] Full story catalog (subject to mastery gates)
- [ ] All pathways available at sufficient mastery

### Locked content
- [ ] Nothing below L7 should be hidden (all prior content unlocked)

### Missions
- [ ] Missions may include review words from lower levels
- [ ] Story task only when `missionStoryId` passed and story unlocked

### Assessments
- [ ] Weekly test uses 40/30/30 curriculum mix
- [ ] Listening / fluency question types at L7

### Stories
- [ ] Tier 5 stories require **L7 + mastery ≥ 65**
- [ ] Story unlock requires **both** curriculum level and mastery threshold

---

## Regression automation (run before staging sign-off)

```bash
pnpm run audit:phonics
```

Expected: **PASS** with no new findings vs baseline.

---

## Sign-off

| Area | Tester | Date | Pass |
|------|--------|------|------|
| L1 journey | | | |
| L2 journey | | | |
| L4 journey | | | |
| L7 journey | | | |
| `audit:phonics` CI | | | |
