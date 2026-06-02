# Discovery Worlds — Final Premiumization Sprint

**Status:** Product completion phase (Tasks 1–5)  
**Constraints:** No new worlds, no route renames, no `WorldProgressV2` schema changes, Animal World keys untouched.

## Quality bar

Target **9.5+/10** — Duolingo Kids / Khan Academy Kids tier: calm premium visuals, obvious parent value, retention loops without clutter.

## Architecture (unchanged)

```
Animal World (/animal-world)     → reference UX, own storage keys
Discovery Hub (/discovery-worlds) → launcher + learning map + daily adventure
Live worlds (/worlds/:slug)      → DiscoveryWorldExperience + platform engines
```

Platform logic lives in `@workspace/world-engine`; UI in `artifacts/kidschedule/src/components/discovery-world/`.

---

## Sprint phases

### Phase 1 — Visual system (P0) ✅ started

| Deliverable | Location | Notes |
|-------------|----------|-------|
| Premium cards | `experience-system` + `premium-polish` | Reuse `CARD_VARIANTS`, `PremiumCard` |
| Glass / depth | `discovery-world/premium-card.tsx` | World-specific wrapper |
| Loading skeletons | `discovery-world-loading.tsx` | Manifest fetch, grid placeholder |
| Delight bursts | `delight-burst.tsx` | `StarBurst` + `useStudyFx`, tier-clamped |
| Progress strip | `experience-progress-strip.tsx` | XP, tier, level title |

**Perf:** 60fps — framer only on enter/exit; no blur on low tier (`performance-tier.ts`).

### Phase 2 — Engagement loops (P0) ✅ started

| Feature | Storage | Implementation |
|---------|---------|----------------|
| Play counts | `amynest:discovery-worlds:stats:v1:{worldId}:{childId}` | **New key** — does not alter progress schema |
| Streaks | `WorldProgressV2.streakDays` | `touchDiscoveryWorldStreak` |
| Session time | `WorldProgressV2.totalSessionMs` | Unmount hook in experience |
| Stickers | `stickersEarned` | `earnPlatformStickers` on engagement |
| Achievements | `achievementsUnlocked` | `commitDiscoveryWorldProgress` |
| Weekly/monthly | `weeklyMinutes`, `monthlyItemsOpened` | Mirror animal-world-progress patterns |

### Phase 3 — Daily adventures (P0) ✅ started

- Generator: `lib/world-engine/src/daily-adventures.ts` (deterministic per child + date)
- UI: `discovery-daily-adventure.tsx` on hub + in-world banner
- Rewards: XP via existing `grantDiscoveryWorldXp`; celebration on complete
- **Does not** merge with Learning Progress wallet (separate surface until Phase 4 cross-product)

### Phase 4 — Streak badges (P1)

- Metadata: `streak-badges.ts` — Explorer / Super Learner / World Master
- Display: hub pulse + parent dashboard
- Weekly/monthly streak views derived from `lastPlayedDate` history (future: optional stats v2)

### Phase 5 — Learning map (P0) ✅ started

- `learning-map.tsx` on `/discovery-worlds`
- States: locked (gate), unlocked (opened), mastered (≥80% items heard)
- Uses aggregated progress per `DISCOVERY_WORLDS_REGISTRY`

### Phase 6 — Sticker book (P0) ✅ started

- `platform-sticker-album.tsx` — pages by category, unlock animation, rare (3+ sounds)
- Wired in experience `stickers` mode

### Phase 7 — Achievement gallery (P0) ✅ started

- `platform-achievements-panel.tsx` — rarity from target, progress bars, tap celebrate

### Phase 8 — Parent insights 3.0 (P0) ✅ started

- `platform-parent-dashboard.tsx` + `platform-parent-charts.tsx`
- Sections: most played, recognition, accuracy, streaks, weekly/monthly bars
- Printable: `@media print` block + Print button

### Phase 9 — Personalization (P1) ✅ started

- `personalization.ts` — favorite world/category/sounds from play counts
- Banner in explore header: “You seem to love…”

### Phase 10 — Offline-first (P1) ✅ started

- `discovery-world-offline-cache.ts` — `buildPlatformOfflineManifest` + Cache API
- Warm on world open (background), playOfflineFirst in audio manager path

### Phase 11 — Premium discovery mode (P0) ✅ started

- `platform-discovery-mode.tsx` — category filter, speed, autoplay, hero image, telemetry

### Phase 12 — Child leveling (P1) ✅ started

- `explorer-levels.ts` — titles at 1, 5, 10, 25, 50 XP thresholds (display layer; XP unchanged)

### Phase 13 — Content diagnostics (P1) ✅ started

- `scripts/discovery-worlds-content-diagnostics.ts` — missing audio/images, empty categories

### Phase 14 — Performance (ongoing)

- Lighthouse: lazy routes already; add skeletons to reduce CLS
- Audio: preload top 6 + offline warm
- Audit: no duplicate cache.add (dedupe in manifest builder)

### Phase 15 — Apple polish pass (P2)

Checklist per screen (`DESIGN_QA` in `experience-system.ts`):

- [ ] Hub — map, daily card, world list spacing
- [ ] Live — mode pills, empty states, parent print
- [ ] Discovery slideshow — controls visible, reduced-motion path
- [ ] Animal World — no regressions (separate pass)

---

## Analytics (extend, do not rename)

Fire existing `discovery_worlds:{worldId}:*` events; add:

- `world_daily_adventure_complete`
- `world_sticker_earned`
- `world_achievement_viewed`
- `world_offline_warm_complete`

---

## Product completion (Tasks 1–5) — shipped

| Task | Deliverable |
|------|-------------|
| 1 Parent Hub | `DiscoveryWorldsHubLaunchCard` in Stories — progress %, worlds/stickers/achievements, streak |
| 2 Content | `scripts/generate-discovery-worlds-catalog.ts` — 27 vehicles, 20×3 other worlds |
| 3 Unified parent | `UnifiedParentDashboard` on `/discovery-worlds` — all 5 worlds aggregated |
| 4 Visual assets | `world-visual-assets.ts` — hero/card/thumbnail paths; image cards in explore & stickers |
| 5 Performance | Fixed image dimensions, hero preload, audio in-flight dedupe, `pnpm run report:discovery-worlds` |

**Ops next:** Upload `hero.webp`, `thumbnail.webp`, `card.webp` per item to GCS; run `pnpm run generate:discovery-worlds-audio`.

## Definition of done

1. Non-animal worlds match Animal World engagement depth (stickers, achievements, parent charts, streaks).
2. Hub communicates value in &lt;5s (map + daily adventure + progress).
3. Parent can print a weekly snapshot.
4. Diagnostics script passes in CI for manifest repos.
5. No changes to `amynest:animal-world:*` keys or `/animal-world` route.

---

## File index (this sprint)

| Area | Path |
|------|------|
| Plan | `docs/discovery-worlds-premiumization-sprint.md` |
| Engine | `lib/world-engine/src/daily-adventures.ts`, `explorer-levels.ts`, `streak-badges.ts`, `personalization.ts`, `content-diagnostics.ts` |
| Client libs | `discovery-worlds-stats.ts`, `discovery-worlds-engagement.ts`, `discovery-world-offline-cache.ts`, `discovery-worlds-cross-progress.ts` |
| UI | `artifacts/kidschedule/src/components/discovery-world/*.tsx` |
| Diagnostics | `scripts/discovery-worlds-content-diagnostics.ts` |
