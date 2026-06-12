# Phase 10 — Performance Audit

**Generated:** 2026-06-11T18:45:00Z

---

## Production TTFB (curl probe)

| URL | HTTP | TTFB |
|-----|------|------|
| https://www.amynest.in/health | 200 | 0.63s |
| https://www.amynest.in/ | 200 | (not isolated) |
| https://www.amynest.in/api/health | 200 | ~0.9s |

**Note:** Not a Lighthouse run — proper LCP/CLS/INP require browser lab (web-perf skill not invoked).

---

## Production Build Bundle Analysis

Source: `pnpm --filter @workspace/kidschedule build` 2026-06-11

### Critical oversized chunks (>500KB minified)

| Chunk | Size | Gzip | Concern |
|-------|------|------|---------|
| main-BQitHoJi.js | **3,317 KB** | 642 KB | Entry bundle — CRITICAL |
| amy-3d-stage-BU3HIxmI.js | 962 KB | 262 KB | Three.js / GLB |
| olympiad-vlfU7bQd.js | 764 KB | 45 KB | Data-heavy |
| parenting-hub-CgdbHDNa.js | 747 KB | 208 KB | Largest route chunk |
| AppCore-DIiIptMA.js | 659 KB | 200 KB | Router + providers |
| static-audio-map-C--3y4pZ.js | 470 KB | 173 KB | Shipped to client |
| pdf-preview-document | 359 KB | 106 KB | PDF.js |
| phonics-BHcGW_QN.js | 249 KB | 71 KB | Acceptable lazy |

**Vite warning:** "Some chunks are larger than 500 kB after minification"

---

## Duplicate Libraries

Not exhaustively analyzed with bundle analyzer. Known heavy deps:
- Three.js (amy-3d)
- PDF rendering
- Large static JSON maps embedded in JS

---

## Audio Loading

| System | Pattern | Risk |
|--------|---------|------|
| Static TTS | API proxy + edge cache | OK when pre-generated |
| On-demand TTS | synthesize → blob | **90s timeout observed** |
| Phonics | Library proxy | 200 on probe |
| Rhymes | 320kbps MP3 | **Bandwidth heavy** (724MB total) |

---

## Image Loading

Discovery worlds: 795 assets at 100% GCS coverage — lazy loaded per world.

---

## Memory Usage

Not profiled in this session. Risk areas:
- Amy 3D WebGL context
- Large static-audio-map in memory
- parenting-hub monolith chunk

---

## Performance Score Evidence

**Score: 62/100**

Deductions:
- 3.3MB main chunk
- No verified LCP/INP/CLS metrics
- 320kbps rhyme files
- 470KB static map in client bundle
- TTFB ~630ms on health endpoint

---

## Recommendations (Post-Report)

1. Code-split main bundle; audit barrel imports
2. Externalize static-audio-map to fetch-on-demand JSON
3. Run Lighthouse CI on /dashboard and /parenting-hub
4. Reencode rhymes to 128kbps (scripts exist)
