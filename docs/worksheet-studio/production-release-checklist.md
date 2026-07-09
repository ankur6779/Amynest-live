# Worksheet Studio v6.0 — Production Release Checklist

**Target:** Commercial SaaS quality. Nothing ships until all **P0** items pass.

## P0 — Ship blockers

- [ ] `pnpm --filter @workspace/kidschedule run typecheck` — zero errors
- [ ] `pnpm --filter @workspace/kidschedule exec vitest run src/features/worksheet-studio/` — all tests pass
- [ ] Generate worksheet (online + offline fallback) — success toast, editor opens
- [ ] Canvas edits sync to autosave (text move/edit survives refresh)
- [ ] PDF, DOCX, PNG export — no silent failures; error toasts on failure
- [ ] Branding profile applies to generate + export
- [ ] Error boundary recovers without data loss message contradiction

## P1 — UX & accessibility

- [ ] All home chips have `aria-pressed`
- [ ] Export sheet print modes have `aria-pressed` + 44px touch targets
- [ ] Editor keyboard shortcuts skip when typing in inputs
- [ ] Loading overlay for generate + improve actions
- [ ] Empty states: templates search, library, version history
- [ ] Focus-visible rings on chips and toolbar buttons

## P2 — Performance

- [ ] Editor lazy-loaded (`React.lazy`)
- [ ] Fabric loaded only on editor mount
- [ ] Canvas not recreated on page navigation
- [ ] Pinch zoom RAF-throttled
- [ ] Lighthouse Performance ≥ 90 on `/worksheet` (target 99 on production CDN)

## P3 — Mobile certification (manual)

- [ ] Chrome Android — generate, edit, export
- [ ] Safari iOS — safe areas, keyboard, share sheet
- [ ] Portrait + landscape — editor usable
- [ ] Samsung Internet / Edge Mobile — smoke test

## P4 — Stress (automated + spot check)

- [ ] `worksheet-production-v6.test.ts` — 50 bulk worksheets
- [ ] 4-page worksheet generates
- [ ] All print modes export pipeline
- [ ] Multi-school branding export

## P5 — Security

- [ ] Image upload via `readFileAsDataUrl` only (no raw HTML injection)
- [ ] Branding JSON import — parse try/catch, no eval
- [ ] API inputs validated server-side (existing Zod/OpenAPI)

## P6 — Documentation

- [ ] `docs/worksheet-studio/architecture.md`
- [ ] `docs/worksheet-studio/developer-guide.md`
- [ ] `docs/worksheet-studio/teacher-quick-start.md`
- [ ] `docs/worksheet-studio/troubleshooting.md`
- [ ] `docs/worksheet-studio/deployment-guide.md`
- [ ] `docs/worksheet-studio/future-extensions.md`

## Sign-off

| Role | Name | Date | Pass |
|------|------|------|------|
| Engineering | | | |
| QA | | | |
| Product | | | |

## Post-launch monitoring

- Watch `worksheet_error` analytics events
- API `/worksheet-studio/generate` 5xx rate
- Export failure reports from support
