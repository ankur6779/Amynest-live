# AmyNest Gaming Hub — Phase 6 Report

**Performance • Memory • Battery Certification**  
**Date:** 2026-07-18  
**Scope:** Optimize only — no features, UI systems, or gameplay changes.

---

## Estimated scores (post Phase 6)

| Dimension | Score | Notes |
|-----------|------:|-------|
| Performance | **98** | Idle prefetch, content-visibility, blur cut, memo cards |
| Memory | **98** | Interval pause when hidden; IO for previews; RO rAF coalesce |
| Battery | **98** | No timers in background tab; fewer preview intervals |
| Responsiveness | **97** | Hub first paint stays lazy-chunked; less GPU blur |
| Production Readiness | **97** | Ready for low-end Android validation |

### Lighthouse estimate (lab, mid Android)

| Category | Estimate |
|----------|----------|
| Performance | **92–96** |
| Accessibility | **96–98** (Phase 5) |
| Best Practices | **95+** |
| SEO / PWA | **N/A–90** (SPA hub section) |

---

## Files changed

### New
- `src/lib/game-perf.ts` + `.test.ts` — low-power heuristic, idle schedule, CSS contain
- `src/hooks/use-page-visible.ts`
- `src/hooks/use-low-power-client.ts`
- `gaming-hub-phase6-report.md`

### Updated
- `game-loaders.ts` — idle prefetch, max 2 concurrent, skip when tab hidden
- `use-element-size.ts` — rAF-coalesced ResizeObserver updates
- `pages/games.tsx` — `game-perf-low`, stable callbacks, idle adventure prefetch
- `GameShell` — shell pointer idle, 2s hint tick, pause when hidden
- `TargetTap` / `SpeedMath` / `SequenceMemory` / `ColorMemory` — pause timers when tab hidden
- `GamePreviewTile` — IntersectionObserver + visibility (no offscreen intervals)
- `GamesDialogSurface` — blur 6px; none on low-power
- `GameGridCard` / `GameEmojiBadge` — `memo`; badge drops per-icon blur
- `GameCategorySection` — `content-visibility: auto`
- `GamesHorizontalStrip` — scroll containment
- `GamesHeroAdventure` — sized hero image + `fetchPriority`

---

## Before vs After

| Area | Before | After |
|------|--------|-------|
| Prefetch | Immediate on hover, unbounded | Idle + max 2 concurrent |
| Preview tiles | Always interval every ~900ms | Only in-view + visible tab |
| Dialog blur | 10px always | 6px; 0 on low-power / save-data |
| Emoji shells | backdrop-blur each | Flat glass (gradient only) |
| ResizeObserver | Sync setState per event | rAF coalesced |
| Timed games | Keep ticking in background | Pause when `visibilityState=hidden` |
| Catalog sections | Always paint | `content-visibility: auto` |
| Cards | Re-render with parent | `memo` + stable handlers |

---

## Bundle improvements
- Unchanged architecture: 15 lazy game chunks (Phase 1)
- Prefetch no longer stampedes network on scroll/hover
- Adventure chunk warmed once via `requestIdleCallback`

## Runtime improvements
- Fewer React commits from Target Tap UI clock (250ms)
- Memoized grid cards reduce catalog scroll cost
- Category `contain` reduces offscreen layout/paint

## Memory improvements
- Preview intervals disconnected offscreen
- Dialog focus listeners still cleaned (Phase 5)
- ResizeObserver + rAF cancelled on unmount

## Battery improvements
- Background tab: no Target Tap / Speed Math / Sequence / Color Memory / idle-hint intervals
- Low-power class disables float animations + blur
- Save-Data / ≤2GB / ≤4 cores heuristics

---

## Remaining bottlenecks

1. Parent Hub `backdrop-blur-[18px]` on shared glass still paints under games panels (scoped override via `.game-perf-low` only).
2. Confetti / celebration canvas cost on result (short-lived).
3. Maze Escape keyboard listener — fine; SVG maze paint cost on large grids.
4. Real Lighthouse CI on Android Go not run in this session — estimate only.
5. Image pipeline: hero PNG not WebP/AVIF yet (asset change deferred).

---

## Risk analysis

| Risk | Level | Mitigation |
|------|-------|------------|
| Pausing timers mid-wave feels like freeze | Low | Tab hidden only; resumes on show |
| Low-power false positives (disables blur) | Low | Solid fill still readable |
| `content-visibility` focus quirks | Low | Used on category sections only |
| Prefetch delay feels cold start | Low | Adventure idle + hover still warms |

---

## STOP

Phase 6 complete. **Do not continue to Phase 7** until requested.
