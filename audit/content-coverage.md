# Phase 4 — Content Coverage Audit

**Generated:** 2026-06-11T18:45:00Z

---

## Content vs Asset Matrix

| Content Domain | Content Count | Audio Count | Image Count | Video Count | Gap |
|----------------|---------------|-------------|-------------|-------------|-----|
| Content bank | 1,100 items | 446 unique phrases | text-only lessons | 0 | Audio map complete |
| Static speakable corpus | 4,159 phrases | 4,171 mapped + 119 pending | N/A | N/A | **119 audio gaps** |
| Phonics | 1,393 audio assets + 150+ V3 stories (text) | 1,393 | tile visuals | 0 | Stories text-only narration |
| Spelling | 2,645 catalog / 1,731 unique words | 1,731 target | N/A | 0 | Map aligned |
| Discovery worlds | 265 items | 795 audio assets | 795 visuals | 0 | **100% coverage** |
| Amy audio lessons | 46 | TTS per paragraph | cover art | 0 | OK |
| Parenting articles | 15 | TTS via static corpus | N/A | 0 | OK |
| Parent hub speak | 33 daily + 75 facts + 54 puzzles + 16 origami | static TTS | some visuals | 0 | OK |
| Infant poems | 10 | TTS on demand | N/A | 0 | Requires infant child |
| Infant sleep catalog | 17 catalog / 34 manifest | 34 MP3 paths | N/A | 0 | **MP3 binaries missing from repo** |
| Story Hub | **224 videos (Drive)** | embedded in video | thumbnails | 224 | OK — prior audit used health probe capped at 3 |
| Rhymes/lullabies | 172 | 172 registered / 4 probe fail | N/A | 0 | 4 broken |
| Talking Amy achievements | 10 | none (visual) | badges | 0 | By design |
| Life skills | 300 (content bank) | via content bank | N/A | 0 | OK |
| Smart study | 500 (content bank) | via content bank | N/A | 0 | OK |
| Event prep | 200 (content bank) | via content bank | N/A | 0 | OK |
| Reels / art-craft | Drive folder | N/A | N/A | many | Drive-dependent |

---

## Placeholder / Unfinished Content

| Location | Type | Evidence |
|----------|------|----------|
| `layout.tsx` / `mobile-menu-config.ts` | "Soon 🚀" badge | `/kids-control-center` unfinished |
| `pages/kids-control-center.tsx` | Placeholder UI | Feature not complete |
| 119 static-audio phrases | ~~Pending pre-generation~~ **RESOLVED** | `check:static-audio` → 100% full corpus |
| Story Hub production | ~~Only 3 Drive videos~~ **224 videos** | `/api/healthz/drive` was capped at pageSize 3 |
| Infant sleep MP3 pack | Manifest without binaries | `public/infant-sleep-audio/` |

---

## TODO / Draft Content Scan

Grep for `lorem ipsum`, `TODO:`, `FIXME:`, `Coming soon` in `artifacts/kidschedule/src/`:

| Pattern | Hits | Notable |
|---------|------|---------|
| "Soon 🚀" | 2 | Kids Control Center nav badge |
| placeholder (UI) | ~40 files | Mostly HTML input placeholders (benign) |
| lorem ipsum | **0** | None found |

No widespread lorem ipsum or AI draft markers detected in user-facing pages.

---

## Hidden / Unfinished Content

| Item | Status |
|------|--------|
| Discovery World Preview page | Coded, unrouted |
| Admin audio health page | Redirects away |
| Debug learning page | Protected, not in nav |
| Dev phonics/rhymes AB pages | Public, not in nav |

---

## Age-Section Coverage

### Infant
- Milestones, sleep coach, feeding, growth, cry insight APIs present
- Infant mode UI in parenting hub
- **Gap:** Demo account lacks infant child → infant poem/story E2E blocked
- Bundled sleep audio not verifiable from repo

### Toddler
- 5 toddler stories in parent-hub-speak
- Phonics V1/V2 entry points
- Life skills, games, discovery worlds

### Preschool
- 6 preschool stories
- Phonics V3 mastery, spelling, olympiad, study zone
- Smart math tricks, abacus

---

## Content Completeness Score Evidence

**Score: 72/100**

Deductions:
- ~~Story Hub critically sparse (3 videos)~~ **RESOLVED** (224 videos; health probe bug)
- ~~119 static audio gaps~~ **RESOLVED** (100% corpus coverage)
- Infant bundled audio unverified
- Kids Control Center unfinished
- 4 broken rhyme assets
