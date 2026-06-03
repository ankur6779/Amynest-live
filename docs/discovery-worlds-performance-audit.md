# Discovery Worlds — Performance Audit

Generated: 2026-06-03T03:58:08.970Z

## Routes audited

| Route | Entry |
|-------|-------|
| `/discovery-worlds` | `src/pages/discovery-worlds-hub.tsx` |
| `/worlds/vehicles` | `src/pages/discovery-world-live.tsx` (slug vehicles → vehicle_world) |

Build analyzed: no dist — run kidschedule build for chunk sizes

## Bundle (production dist)

_No dist assets — run `pnpm --filter @workspace/kidschedule build`_



## Static import surface

### /discovery-worlds (186 modules)

- `src/pages/ai-coach.tsx` (3517 lines)
- `src/lib/amy-voice-pipeline.ts` (2031 lines)
- `src/lib/audio-manager.ts` (1525 lines)
- `src/lib/amy-voice-controller.ts` (1129 lines)
- `src/lib/audio-reliability-telemetry.ts` (1099 lines)
- `src/lib/native-push-bridge.ts` (979 lines)
- `src/lib/amy-speech-mode.ts` (819 lines)
- `src/lib/static-audio.ts` (714 lines)

### /worlds/vehicles (195 modules)

- `src/pages/ai-coach.tsx` (3517 lines)
- `src/lib/amy-voice-pipeline.ts` (2031 lines)
- `src/lib/audio-manager.ts` (1525 lines)
- `src/lib/amy-voice-controller.ts` (1129 lines)
- `src/lib/audio-reliability-telemetry.ts` (1099 lines)
- `src/lib/native-push-bridge.ts` (979 lines)
- `src/lib/amy-speech-mode.ts` (819 lines)
- `src/lib/static-audio.ts` (714 lines)

## Largest static assets (public mirror)

- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/nature/ocean/ocean-waves/waves-01.mp3` — 55.6 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/nature/weather/rain/rain-01.mp3` — 47.8 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/home/living_room/vacuum/vacuum-01.mp3` — 39.6 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/nature/weather/thunder/thunder-01.mp3` — 32.3 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/vehicles/space/rocket/launch-01.mp3` — 32.3 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/vehicles/emergency/fire-truck/narration-sound.mp3` — 30.2 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/home/bathroom/electric-toothbrush/narration-sound.mp3` — 26.6 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/home/bedroom/window-rain/narration-sound.mp3` — 26.6 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/home/kitchen/garbage-disposal/narration-sound.mp3` — 26.6 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/nature/ocean/ocean-waves/narration-sound.mp3` — 26.6 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/home/bathroom/electric-toothbrush/narration-intro.mp3` — 25.8 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/home/kitchen/stove-sizzle/narration-sound.mp3` — 25.8 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/nature/forest/leaves/narration-sound.mp3` — 25.8 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/nature/forest/spring-peepers/narration-sound.mp3` — 25.8 KB
- `artifacts/kidschedule/public/discovery-worlds-audio/worlds/vehicles/space/lunar-rover/narration-sound.mp3` — 25.8 KB

## Blocking render risks

1. **Hub** — Multiple dashboards + LearningMap render in one pass; no route-level Suspense boundaries between parent ops and kid cards.
2. **Live** — `DiscoveryWorldExperience` mounts grid + audio manager + offline warmer on first paint.
3. **Images** — 320×400 heroes on many visible cells without thumbnail-first policy in all modes.
4. **Audio** — Synchronous validation paths in QA scripts; runtime should not decode all clips on open.

## Top 10 optimizations (recommendations only — not implemented)

| # | Optimization | Impact | Estimated effect |
|---|--------------|--------|------------------|
| 1 | Serve hero/card/thumbnail from CDN with immutable cache | high | LCP −0.8–1.5s on hub grids when images were blocking |
| 2 | Lazy-load discovery-world-experience mode panels | high | TTI −200–500ms on /worlds/vehicles first paint |
| 3 | Defer UnifiedParentDashboard + AssetCoverageDashboard on hub | medium | Hub JS −30–80 KB parsed |
| 4 | Cap concurrent audio preload on world open | high | Main-thread jank −100–300ms |
| 5 | VirtualizedGrid overscan tuning for 40-item worlds | medium | INP −50–150ms on scroll |
| 6 | Split world-engine platform quiz helpers | medium | Route chunk −20–40 KB |
| 7 | Avoid duplicate manifest JSON in client bundle | medium | −15–35 KB gzip per world if manifests inlined twice |
| 8 | Hub: lazy LearningMap + daily adventure | low | FCP −50–120ms |
| 9 | Thumbnail-first image loading on grids | high | LCP −0.3–0.6s |
| 10 | Lighthouse on authenticated shell, not public SPA shell | low | Accurate perf score (diagnostic only) |

## Details

### 1. Serve hero/card/thumbnail from CDN with immutable cache

2.3 MB local visual mirror; ensure GCS + /api/worlds-library proxy, not bundled in JS.

### 2. Lazy-load discovery-world-experience mode panels

Live route imports VirtualizedGrid, quiz/hear-find/toddler panels in one chunk — split by mode.

### 3. Defer UnifiedParentDashboard + AssetCoverageDashboard on hub

Parent/ops dashboards on /discovery-worlds are not kid-critical; dynamic import below fold.

### 4. Cap concurrent audio preload on world open

10.2 MB discovery audio mirror; warmDiscoveryWorldOfflineCache should batch ≤4 URLs.

### 5. VirtualizedGrid overscan tuning for 40-item worlds

Reduce initial mount nodes; keep 320×400 fixed slots (already set).

### 6. Split world-engine platform quiz helpers

discovery-world-experience imports buildPlatformHearFindQuestion from full world-engine surface.

### 7. Avoid duplicate manifest JSON in client bundle

Verify tree-shaking for @workspace/vehicle-world etc. only on live route.

### 8. Hub: lazy LearningMap + daily adventure

discovery-worlds-hub pulls LearningMap, teasers, progress — defer until hero visible.

### 9. Thumbnail-first image loading on grids

Load thumbnail.webp before hero on cards; hero on detail only.

### 10. Lighthouse on authenticated shell, not public SPA shell

Public URLs under-report; measure Android WebView + logged-in session.


## Performance status

- **Bundle:** unknown — build required
- **Assets:** 1295 files in public mirrors
- **Routes:** lazy-loaded via `lazyPage` in AppCore (code-split entry OK); heavy work inside pages

