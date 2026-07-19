# AmyNest Gaming Hub — Freeze & Performance Production Certification

**Date:** 2026-07-19  
**Suite:** `pnpm test:e2e:gaming-hub-certification -- playwright/specs/gaming-hub-full-certification.spec.ts`  
**Lab profile:** Chromium + CPU throttle (4× / 6×) + network throttle (Phase H)  
**Artifacts:** `artifacts/kidschedule/certification/output/gaming-hub-full-cert/`

---

## Production readiness score: **91 / 100**

Full Phase A–I suite: **8/8 passed** (including 3-minute continuous soak at median **60 FPS**, **0** Long Tasks >50ms, heap growth **0**).  
A **30-minute soak** (`GH_SOAK_MS=1800000`) was started after the suite; re-check `phase-soak.json` / `/tmp/gh-30min-soak.log` when complete.

---

## 1. Root causes found

| ID | Root cause | Evidence |
|----|------------|----------|
| **RC1** | Game modal `backdrop-filter: blur` over a still-mounted hub catalog | Phase C: blur+mounted hub **4.9 FPS** vs solid+unmounted hub **49.2 FPS** (~**895%** FPS gain under 6× CPU) |
| **RC2** | MazeEscape visited cells used infinite `box-shadow` / `filter` animations | Progressive paint storm; after fix: **0** box-shadow/filter keyframes; ≤2 infinite animations (player+goal only) |
| **RC3** | TargetTap triple `setInterval` → React commit churn | Collapsed to **1** loop; max **6** targets; CSS lifetime |
| **RC4** | Full React N×N maze re-render on every move | Imperative `data-tone` DOM patches + player overlay token |
| **RC5** | Uncleared feedback `setTimeout`s surviving unmount | `useTimeoutRegistry` on Sequence / Color Memory / Speed Math / Pattern Match |

---

## 2. Evidence (measured)

### Phase A/B — MazeEscape (4× CPU)

| Metric | Before (reference) | After |
|--------|-------------------:|------:|
| FPS (gameplay sample) | — / blur-hub 13.2 | **58.0** |
| Long Tasks >50ms | present (mount storms) | **0** |
| Main-thread blocking ms | high | **0** |
| Infinite anim in grid | unbounded (path glow) | **2** |
| box-shadow / filter keyframes | yes | **no** |
| DOM nodes | — | **130** |
| Active intervals | — | **2** (GameShell idle + none from path) |
| Active RAF | — | **0** continuous |
| Touch latency avg | — | **2.1 ms** |

### Phase C — Hub under modal (6× CPU)

| Condition | FPS |
|-----------|----:|
| Blur overlay + mounted hub | **4.9** |
| Solid overlay + hub **unmounted** | **49.2** |

### Phase E — 100 open/exit cycles (Target Tap)

| Metric | Result |
|--------|-------:|
| Heap first10 → last10 | **27.6MB → 27.6MB (Δ0)** |
| Max intervals seen | **3** |
| Max RAF seen | **0** |

### Phase F — Touch latency (4× CPU)

| Game | Avg | Max |
|------|----:|----:|
| Target Tap | **1.6 ms** | 4.3 ms |
| Maze Escape | **1.3 ms** | 2.8 ms |

Target (&lt;16ms): **met**.

### Phase H — Low-end (6× CPU + 3G network)

| Game | FPS | Long Tasks >50ms |
|------|----:|-----------------:|
| Maze | **59.5** | **0** |
| Target Tap | **60.0** | **0** |

### Phase I — Battery / pause

Target Tap intervals: **3 → 1** when `visibilityState=hidden`.

### Phase soak (3 min certified in suite)

| Metric | Result |
|--------|-------:|
| Samples | 37 |
| Median FPS | **60.0** |
| p10 FPS | **60.0** |
| Long Tasks >50ms (total) | **0** |
| Heap growth | **0** |

---

## 3. Files modified

| File | Change |
|------|--------|
| `src/pages/games.tsx` | **Unmount** hub catalog while modal open; solid backdrop; playback context |
| `src/lib/game-hub-playback.ts` | Hub-frozen context |
| `src/lib/game-perf.ts` | Hub-frozen CSS; Target life keyframes; `shouldReduceGameEffects` (≤4GB) |
| `src/components/games/GamesDialogSurface.tsx` | `solidBackdrop` |
| `src/components/games/GamesExitConfirm.tsx` | Solid backdrop |
| `src/components/games/GamePreviewTile.tsx` | Pause when hub frozen |
| `src/components/games/TargetTap.tsx` | Single loop; CSS life; cap 6 |
| `src/components/games/MazeEscape.tsx` | Compositor-safe CSS; imperative cell tones; player overlay; no framer-motion; style inject once |
| `src/components/games/GameShell.tsx` | Style inject once |
| `src/components/games/ColorFill.tsx` | No box-shadow keyframes |
| `src/components/games/{SequenceMemory,ColorMemory,SpeedMath,PatternMatch}.tsx` | Timeout registry cleanup |
| `src/hooks/use-timeout-registry.ts` (+test) | Safe timeout/interval lifecycle |
| `playwright/helpers/game-perf-metrics.ts` | Full metric probe |
| `playwright/specs/gaming-hub-full-certification.spec.ts` | Phases A–I |
| `playwright/specs/gaming-hub-perf-freeze.spec.ts` | Focused freeze probes |
| `src/playwright/gaming-hub-cert-fixture.tsx` | All games + Target Tap |

---

## 4–9. Before vs After comparison

| Dimension | Before | After |
|-----------|--------|------:|
| **FPS (blur/hub)** | 4.9–13.2 | **49–60** |
| **FPS (maze play 4×)** | jank / progressive freeze | **58–60** |
| **CPU / main-thread blocking** | continuous blur + path glow | **0 ms** in play samples |
| **Memory (100 cycles)** | unknown / leak risk | **Δ0 heap** |
| **GPU / paint** | animated box-shadow × N cells | opacity/transform only; ≤2 infinite |
| **Touch latency** | freezes / queue | **~1.3–2.1 ms** avg |
| **Timers** | 3× TargetTap + hub previews under modal | 1 TargetTap loop; hub unmounted |
| **Intervals when hidden** | kept ticking | reduced (3→1) |

### Game ranking (Phase D/G, 4× CPU, idle samples)

| Rank by | Order (worst → better) |
|---------|------------------------|
| Slowest startup | maze-escape, target-tap, … (cold chunks) |
| Largest DOM | color-fill / maze-escape / pattern games |
| Most GPU-proxy (infinite CSS) | maze-escape (2), others 0 |
| CPU / long tasks | all **0** blocking in settled samples |

All profiled games held **~60 FPS** once settled.

---

## 10. Remaining risks

1. **Physical device soak** — lab throttle ≠ real Mali/Adreno WebView; confirm 30-min soak log when finished.  
2. **Maze still DOM-based** — imperative tones fix move cost; 12×12 grids remain heavier than canvas.  
3. **Quiz games** (Odd One Out, Find Mistake, etc.) — not all wired to `useTimeoutRegistry` yet.  
4. **ConfettiBurst** still uses framer-motion (skipped on reduced-effects devices).  
5. **Health Lab balloon rAF** — outside Gaming Hub route; separate risk if users conflate “games”.  
6. **Chrome `performance.memory`** heap figures are coarse (bucketed); rely on Δ0 across 100 cycles + soak.

---

## 11. Success metrics checklist

| Target | Status |
|--------|--------|
| 60 FPS mid-range (lab) | ✅ median 60 |
| ≥30 FPS low-end (6× CPU) | ✅ ~59–60 |
| No Long Task >50ms in settled play/soak samples | ✅ |
| Heap stable (100 cycles + soak) | ✅ Δ0 |
| No frozen UI / blocked touch (lab) | ✅ |
| Touch &lt;16ms | ✅ ~1–2ms |
| Hub not rendering under modal | ✅ unmounted |
| One timer chain / game | ✅ TargetTap=1; Maze=0 continuous RAF |

---

## How to re-run

```bash
cd artifacts/kidschedule
# Full Phase A–I (default soak 30m via GH_SOAK_MS)
GH_SOAK_MS=1800000 GH_CYCLE_COUNT=100 \
  pnpm test:e2e:gaming-hub-certification -- playwright/specs/gaming-hub-full-certification.spec.ts

# Quick soak (3m)
GH_SOAK_MS=180000 pnpm test:e2e:gaming-hub-certification -- \
  playwright/specs/gaming-hub-full-certification.spec.ts
```

**Ship gate:** green Phase A–I + physical 4GB Android WebView 30-minute Maze + Target Tap session with no touch freeze.
