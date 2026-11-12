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

Cloud Agents do **not** inherit the laptop `.env`. Put the same keys in [Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents) as **Runtime Secrets** (API keys, tokens, `HETZNER_SSH_PRIVATE_KEY`) or **Environment Variables** (`HETZNER_HOST`, public `VITE_*` flags). `.cursor/cloud-bootstrap.sh` writes `~/.ssh/id_ed25519_hetzner` and `.env.development` from those injected vars at Build/start.

Hetzner AI worker (from a Cloud Agent):

```
export HETZNER_HOST=167.233.39.146
export HETZNER_SSH_KEY=~/.ssh/id_ed25519_hetzner
ssh -i "$HETZNER_SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes root@$HETZNER_HOST 'hostname; docker ps --format "{{.Names}}"'
```

Use the passphrase-free deploy key stored as `HETZNER_SSH_PRIVATE_KEY` (same key as GitHub Actions). Do not paste production `DATABASE_URL` unless the task explicitly needs prod data. Dev default is `postgresql://amynest:amynest@localhost:5432/amynest_dev` — start Postgres with `docker compose --profile local up -d postgres` when Docker is available.

### Testing

- **API tests:** `pnpm --filter @workspace/api-server test` (Node.js built-in test runner)
- **Web tests:** `pnpm --filter @workspace/kidschedule test` (Vitest)
- **Typecheck:** `pnpm run typecheck:libs` (shared libs) — the full `pnpm run typecheck` includes a `scripts` package audit that has pre-existing failures referencing archived mobile paths
- **Pre-commit hook:** runs `pnpm run codegen` to verify OpenAPI codegen is up to date. If you modify `lib/api-spec/`, run `pnpm run codegen` and stage the generated files in `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`

### Gotchas

- The `assertCriticalEnvAtBoot()` in the API server will `process.exit(1)` if `DATABASE_URL` is missing. Always ensure it is set before starting the API.
- Vite cache can become stale after `pnpm install`. If you see "splash then blank screen", run `pnpm clean:vite` or `pnpm reset`.
- Redis is optional in dev — BullMQ falls back to in-memory processing. The AI worker (`pnpm --filter @workspace/api-server run worker:start`) is also optional.
- `abacus.test.ts` and `speech.test.ts` use `--experimental-test-module-mocks` which has issues on Node 20 (tests cancelled by parent). This is a known Node compatibility issue.
- 3 kidschedule vitest files (`hub-support-utils`, `routine-timeline-ui`, `safe-import`) fail with Vite module resolution errors (0 test assertions fail). These are import setup issues, not test logic failures.
- The full `pnpm run typecheck` may show pre-existing errors in `lib/content-orchestration` and `lib/phonics-curriculum`. The lib-level typecheck (`pnpm run typecheck:libs`) and scripts typecheck pass clean.

Domain-specific gates (Speech Coach, ChatPlatform, audio release) live in `.cursor/rules/` — loaded when you work on those files.
