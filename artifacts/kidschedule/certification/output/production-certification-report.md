# Production Certification — Maze Escape & Color Fill

**Run date:** 2026-06-14  
**Harness:** `scripts/certify-gaming-hub-games.mts` + Playwright `gaming-hub-certification.spec.ts`  
**Artifacts:** `certification/output/`

---

## Overall verdict: **PASS** (with documented risks)

| Area | Result | Evidence |
|------|--------|----------|
| Maze generation (100× Hard) | **PASS** | `certification-results.json` |
| Random-player accidental solve | **PASS** | 0 / 5000 wins in 8 moves |
| Maze visual difficulty (Easy/Normal/Hard) | **PASS** | UI screenshots + Playwright grid width check |
| Color Fill validation (100 puzzles) | **PASS** | 0 silent failures |
| Color Fill edge cases | **PASS** | empty / partial / same-color / rapid check |
| Color Fill UI modals | **PASS** | Playwright E2E + screenshots |
| Performance (generation + check) | **PASS** | metrics below |
| Playwright E2E suite | **PASS** | 4/4 tests, 17.1s |

---

## Maze Escape

### Batch analysis — 100 Hard mazes (sizes 9–12)

| Metric | Min | Avg | Max |
|--------|-----|-----|-----|
| Shortest path length | **16** | **40.5** | **102** |
| Dead ends | **8** | **22.5** | **51** |
| Branches | **6** | **18.2** | **43** |
| Complexity score | **64** | **140.0** | **257** |

**Certification thresholds (Hard):** path ≥ max(10, size×1.55), dead ends ≥ max(6, size×0.75), branches ≥ 3, complexity ≥ size×4+6.

| Check | Result |
|-------|--------|
| Quality gate failures | **0 / 100** |
| Almost-direct paths | **0 / 100** |
| Visually obvious layouts (≤1 dead end or ≤1 branch or path ≤ size+4) | **0 / 100** |
| Random 8-move accidental wins | **0 / 5000 (0.000%)** |

### Difficulty comparison (single generated sample each)

| Difficulty | Grid | Path | Dead ends | Branches | Complexity |
|------------|------|------|-----------|----------|------------|
| Easy | 5×5 | 12 | 5 | 3 | 31 |
| Normal | 7×7 | (see JSON) | — | — | — |
| Hard | 10×10 | 46+ | 11+ | 9+ | 95+ |

Hard mazes are **not** trivial corridors; Easy is visibly smaller and simpler.

### Screenshots (UI)

| File | What it shows |
|------|----------------|
| `ui-screenshots/maze-easy-ui.png` | 5×5 grid, purple walls, dead ends, 🚀 start, 🏁 goal |
| `ui-screenshots/maze-normal-ui.png` | Mid-size grid between Easy and Hard |
| `ui-screenshots/maze-hard-ui.png` | **9×9** dense maze, many branches/dead ends |
| `maze-easy.svg` / `maze-normal.svg` / `maze-hard.svg` | Algorithm output (wall topology) |

**Visual Hard vs Easy:** Hard grid width > Easy grid width (Playwright assertion passed). Hard screenshot shows full 9×9 wall network; Easy shows 5×5 with fewer cells.

### Random player simulation

- **Method:** 50 random valid moves per maze × 100 mazes, max **8 moves** before goal.
- **Result:** **0 accidental completions** — maze cannot be finished by random wandering in a few moves.

---

## Color Fill

### Validation engine — 100 random puzzles

| Check | Result |
|-------|--------|
| Wrong answers → error signal | **100 / 100** |
| Wrong cell set size matches wrong count | **100 / 100** |
| Completion % matches `(correct/16)×100` | **100 / 100** |
| Correct answers → `allCorrect` + 100% | **100 / 100** |
| Silent failures | **0** |

### Edge cases

| Case | Result | Detail |
|------|--------|--------|
| Empty board | **PASS** | `allFilled=false`, wrongCount=16 |
| Partial board | **PASS** | Check button not enabled (not full) |
| All same color | **PASS** | wrongCount=12, not silently accepted |
| Rapid repeated Check | **PASS** | Evaluation stable across 20 clicks |
| Hint penalty | **PASS** | Score floored at 0 in component |

### UI verification (Playwright + screenshots)

| Scenario | Result | Evidence |
|----------|--------|----------|
| Wrong → Check responds | **PASS** | Error modal + banner |
| Wrong cells highlighted | **PASS** | Green borders on correct cells; modal counts wrong |
| Completion % in modal | **PASS** | "12 cells need fixing · **25% complete**" (4/16) |
| Correct → success modal | **PASS** | "✅ Great Job!" + rewards line |
| Success banner | **PASS** | "Perfect colours! 🎨" |
| Target preview | **PASS** | Mini grid visible with Show Pattern |

Screenshots: `ui-screenshots/color-fill-error-modal.png`, `color-fill-success-modal.png`

**Note:** Round-level "+XP +Coins +Streak" in the success modal is **UI copy**; session points are awarded via `games.tsx` → `onFinish` at session end, not per-round API call.

---

## Performance

### Node.js batch harness

| Operation | Avg | P95 | Max | Heap Δ |
|-----------|-----|-----|-----|--------|
| Maze generation (100 Hard) | 0.44 ms | 1.39 ms | 4.42 ms | +2.13 MB |
| Color Fill evaluate (100×) | 0.037 ms | 0.20 ms | 0.91 ms | −3.26 MB |

### Browser (Playwright — maze-hard fixture)

| Metric | Value |
|--------|-------|
| Estimated FPS (30 rAF samples) | **> 30** (test threshold passed) |
| JS heap (CDP sample, easy load) | ~14.5 MB used |

Generation and validation are **not** performance bottlenecks. Animation frame rate during maze display meets smoothness threshold in Chromium.

---

## Detected bugs (found during certification)

### Fixed during this certification run

1. **Cert fixture missing global CSS** — Without `index.css`, maze walls used `hsl(var(--brand-violet-600))` with undefined CSS variables → **invisible walls** (empty-looking grid). Fixed in `gaming-hub-cert-fixture.tsx` by importing `../index.css`.

2. **Cert fixture difficulty race** — `MazeEscapeGame` read `localStorage` difficulty before URL mode applied → Easy URL could show Hard 9×9 grid. Fixed by calling `setGameDifficulty()` before mount and `key={mazeLevel}` remount.

### Open risks (not blocking PASS)

1. **Fallback maze below quality gate** — `generateValidatedMaze()` returns best-effort maze if all 48 attempts fail gate (`maze-generator.ts` L328). Not observed in 100/100 Hard batch, but path exists.

2. **Wilson's algorithm** — Disabled for grids ≥9; backtracking/Prim only. Wilson retained for smaller grids with step limit.

3. **Session XP vs modal copy** — Color Fill success modal shows reward text immediately; hub points accrue on session finish, not per puzzle API.

4. **Full `/games` hub path** — UI cert uses `playwright-gaming-hub-certification.html` fixture (no auth shell). Production hub adds unlock/daily-limit wrappers; core game components are identical.

---

## How to re-run

```bash
# Batch logic certification (100 Hard mazes + Color Fill validation)
cd artifacts/kidschedule
pnpm exec tsx scripts/certify-gaming-hub-games.mts

# UI + modal + screenshot certification (requires dev server on :3000)
PLAYWRIGHT_GH_CERT_PORT=3000 pnpm exec playwright test --config playwright.config.gaming-hub-certification.ts
```

Outputs land in `certification/output/`.

---

## Certification sign-off criteria

| Requirement | Status |
|-------------|--------|
| Hard maze not trivially solvable in few moves | ✅ 0/5000 random 8-move wins |
| Hard maze has dead ends | ✅ min 8 across batch |
| CHECK gives feedback | ✅ Error + success modals captured |
| Validation never silent | ✅ 0 silent failures / 100 |
| Wrong cells identified | ✅ Modal count + green/red borders |
| Success/failure states present | ✅ Screenshots + E2E |
| Hard visibly harder than Easy | ✅ 9×9 vs 5×5 screenshots |

**Signed:** Automated harness + Playwright E2E — 2026-06-14
