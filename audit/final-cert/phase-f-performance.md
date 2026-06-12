# Phase F — Performance

**Validated:** 2026-06-12T07:46:00Z  
**Target:** https://www.amynest.in

## JavaScript Bundle (production)

| Asset | Bytes | MB | Gate |
|-------|-------|-----|------|
| `index-D9y3kfHX.js` (loader) | 2,671 | 0.003 | — |
| **`main-BP5gGGAB.js` (primary app chunk)** | **3,513,396** | **3.35** | **FAIL (>2.5 MB)** |

Evidence: `curl -o /tmp/amynest-main-chunk.js https://www.amynest.in/assets/main-BP5gGGAB.js && wc -c`

Lazy chunks exist (`AppCore-Cdu12y8L.js`, etc.) — initial route still pulls 3.35 MB main chunk before code-split routes.

## Core Web Vitals

| Metric | Value | Gate | Status |
|--------|-------|------|--------|
| LCP | **MISSING** | ≤3s | **PARTIAL FAIL** |
| CLS | **MISSING** | — | **UNTESTED** |
| INP | **MISSING** | — | **UNTESTED** |

Lighthouse not installed; Chrome DevTools MCP not used. **Missing test = FAIL** per board rules.

## Memory Leak

| Check | Status |
|-------|--------|
| Long-session heap growth test | **NOT RUN** |
| Playwright memory profiling | **NOT RUN** |

**UNTESTED = FAIL**

## Phase F Verdict

**FAIL** — Main bundle exceeds 2.5 MB; CWV and memory leak tests absent.
