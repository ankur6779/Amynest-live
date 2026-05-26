# AGENTS.md

## Cursor Cloud specific instructions

### Services overview

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| API server | `pnpm run dev:api` | 5000 | Express 5, hot-reloads via `tsx watch`. Loads `.env.development` from repo root |
| Web app | `pnpm run dev:web` | 3000 | Vite React SPA (kidschedule). Set `VITE_USE_LOCAL_API=1` to proxy to local API |

See `docs/dev-environment.md` for full dev workflow and `package.json` root scripts for all commands.

### Database

PostgreSQL must be running locally. The dev database is configured via `DATABASE_URL` in `.env.development`. After schema changes in `lib/db/`, push with:

```
DATABASE_URL=postgresql://amynest:amynest@localhost:5432/amynest_dev pnpm db:push
```

### Environment setup

`.env.development` is created from `.env.development.example`. Minimum required: `DATABASE_URL` with a working PostgreSQL connection. Firebase vars (`VITE_FIREBASE_*`) are needed for auth flows but the app loads and API runs without them.

### Testing

- **API tests:** `pnpm --filter @workspace/api-server test` (Node.js built-in test runner)
- **Web tests:** `pnpm --filter @workspace/kidschedule test` (Vitest)
- **Typecheck:** `pnpm run typecheck:libs` (shared libs) — the full `pnpm run typecheck` includes a `scripts` package audit that has pre-existing failures referencing archived mobile paths
- **Pre-commit hook:** runs `pnpm run codegen` to verify OpenAPI codegen is up to date. If you modify `lib/api-spec/`, run `pnpm run codegen` and stage the generated files in `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`

### Gotchas

- The `assertCriticalEnvAtBoot()` in the API server will `process.exit(1)` if `DATABASE_URL` is missing. Always ensure it is set before starting the API.
- Vite cache can become stale after `pnpm install`. If you see "splash then blank screen", run `pnpm clean:vite` or `pnpm reset`.
- Redis is optional in dev — BullMQ falls back to in-memory processing. The AI worker (`pnpm --filter @workspace/api-server run worker:start`) is also optional.
- Some API and web test failures are pre-existing (routine generation tests, golden voice tests). These are not caused by environment setup.
- The `typecheck` for api-server and kidschedule both reference `lib/study-zone/src/topic-practice.ts` which has a pre-existing type error (`Level` type missing values 9, 10).
