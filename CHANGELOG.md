# Changelog

All notable changes to AmyNest are documented here. Health Lab releases use the `health-lab-v*` tag series.

## [health-lab-v1.0.0] — 2026-07-24

Production release of **Amy Health Lab™** — six wellness mini-games with immersive play, progress sync, and parent dashboard.

### Accessibility

- Add `useHealthLabDialogEscape` for Escape-to-dismiss with focus restore on Session Rewards, Motion Prep, Celebration, and all four victory overlays.
- Mark victory overlays as `role="dialog"` with labelled titles.
- Raise interactive controls to ≥ 48×48 px on Progress, Shop, Dashboard, and Celebration close.

### Testing

- Add RC2 Playwright harness: Escape regression, six-game performance matrix, and 20-minute continuous gameplay soak.
- Add unit test for dialog Escape hook.

### Documentation

- RC2 final hardening certification report with production tag recommendation.

### Verified

- Typecheck, Health Lab unit tests, production build, RC2 Playwright suite (Escape, perf matrix, 20-min soak).
- Responsive certification (320–768 dp) and release regression suite from prior RC passes.

[health-lab-v1.0.0]: https://github.com/amynest/amynest-ai/releases/tag/health-lab-v1.0.0
