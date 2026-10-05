# GITHUB TRANSFER PACKAGE

**Date:** 24 September 2026  
**No secret values.** Transfer eligibility on GitHub’s side: **UNKNOWN** (not independently verified beyond current owner control).

## Current repository (VERIFIED this pass)

| Item | Finding |
|------|---------|
| URL | `https://github.com/ankur6779/Amynest-live` |
| Owner | Personal user `ankur6779` |
| Visibility | Public |
| Default / production branch | `main` (`origin/HEAD` → `main`; Actions `on.push.branches: [main]`) |
| Current local branch | `main` |
| Release branches | No dedicated `release/*` convention verified this pass |
| Tags (sample, newest first) | `pre-instrumentation-release-main-a1d874a1`, `final-phase4-main-5bb33cc0`, `welcome-v3-production-foundation`, `v2-foundation-snapshot-2026-08-06`, `brand-v1.0.0` |
| License on GitHub | `licenseInfo=null` |
| Collaborators API | Only `ankur6779` admin |
| Branch protection `main` | **None** |
| Deploy keys | **None** |
| Repo webhooks | **None returned** |
| GitHub Pages | **Not configured** (API 404) |
| Environments | 8 historic names (Render-era `*-dykj` + `copilot`); no protection rules |
| Repository **variables** (names/values are non-secret flags) | `AMYNEST_CONTENT_FACTORY_LIVE`, `AMYNEST_CONTENT_FACTORY_REF`, `AUDIO_GATE_API_URL` |
| Secret **names** | See `GITHUB_HANDOVER.md` (`gh secret list`) |
| Production workflow | `.github/workflows/deploy-production.yml` (Pages, Worker, Hetzner; Coolify not in this workflow) |
| Other workflows | audio-gates, routine-engine-gates, chat-platform, crash-release-gates, health-lab-*, content-factory, tts-orphan, generate-static-audio, user-retention-db-migrate, deploy-hetzner-worker (deprecated entry), ai-evaluation-gates, birth-sky-public-launch-ops |

External integrations **inferred** from secrets/workflows (live wiring **UNKNOWN**): Cloudflare, Hetzner SSH, GCS, OpenAI, Gemini, KIE, YouTube, Render API key leftover, Coolify (not via visible webhook).

## Buyer handover procedure (not executed)

```
CURRENT OWNER (ankur6779)
  → BUYER ORGANIZATION (buyer creates GitHub org)
  → REPOSITORY TRANSFER (GitHub Settings → General → Transfer repository)
  → VERIFY ACTIONS (workflow runs on new owner; edit `github.repository == 'ankur6779/Amynest-live'` gate)
  → VERIFY SECRETS (recreate every secret name; rotate values — rotation is POST-accept, not this pass)
  → VERIFY WEBHOOKS (reconnect Coolify/GitHub App — method UNKNOWN today)
  → VERIFY DEPLOYMENT (Pages + Worker + Coolify origin healthz)
  → BUYER ACCEPTANCE (buyer admin ≠ ankur6779)
```

GitHub’s documented transfer exists for repos the owner can transfer. **Whether this public repo has any GitHub-side hold** (org policy, marketplace, etc.) is **UNKNOWN**.

Do **not** transfer in this pass.
