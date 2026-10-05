# GITHUB HANDOVER

**Date:** 2 October 2026 (minimum-action addendum) / original inventory 24 September 2026  
**No secret values.** Do **not** transfer the repository in this pass. Do **not** send invitations.

## Minimum action to make the repo buyer-transferable

Cosmetic GitHub changes (topics, README polish, branch-protection theatre) **do not** close SB-B01.

| Who | Exact action | Evidence of completion |
|-----|----------------|------------------------|
| **BUYER** | Create a GitHub **organization** and an org **Owner** user (not `ankur6779`) | Org URL + Owner screenshot |
| **SELLER** | When that org exists: **Settings → General → Transfer repository** to the buyer org. Do not add random collaborators “for show.” | GitHub transfer confirmation email / pending-transfer screen |
| **BUYER** | **Accept** the repository transfer | `gh repo view` owner = buyer org; `ankur6779` no longer Owner |
| **SELLER + BUYER** | Recreate **every** Actions secret on the destination from the **offline escrow**, not from Git | `gh secret list` on buyer repo (names only) |
| **SELLER** | Re-point Coolify git source (App / webhook / poll — **method still UNKNOWN**; screenshot Coolify source **before** transfer) | Coolify source URL = buyer repo |
| **BUYER** | Edit `deploy-production.yml` repository-name gate from `ankur6779/Amynest-live` to the new path | Green Actions on buyer secrets |
| **SELLER** | Remain admin until acceptance tests pass; then remove self | Collaborators API without founder Owner |

**Not required before a buyer exists:** transferring now, inviting a hypothetical user, making the repo private, adding LICENSE.

**Does not prove copyright title.** Possession transfer ≠ SB-A01.

## Current control (VERIFIED 2 Oct 2026)

| Item | Finding | Evidence |
|------|---------|----------|
| Remote | `https://github.com/ankur6779/Amynest-live.git` | `git remote -v` |
| Owner | Personal user `ankur6779` | `gh repo view` `isInOrganization=false` |
| Visibility | **Public** | `isPrivate=false` |
| GitHub license metadata | `licenseInfo=null` | `gh` — consistent with no LICENSE file |
| Collaborators (API) | Only `ankur6779` (admin) | `gh api …/collaborators` |
| Fork | Not a fork; 0 forks | `gh api` |
| Production branch | Workflows deploy on `push` to `main` | `.github/workflows/deploy-production.yml` |
| Branch protection on `main` | **None** | `gh api …/branches/main/protection` → 404 |
| Deploy keys | **None** | `gh api …/keys` → `[]` |
| Repo webhooks | **None returned** | `gh api …/hooks` → `[]` |
| GitHub Environments | 8 names, mostly historic Render (`Amynest-backend-dykj`, `amynest-db-dykj`, …) + `copilot` | `gh api …/environments` |
| Environment protection rules | Empty / admins can bypass | Same API |

Can a buyer operate the repository **without** `ankur6779`? **NO.**

## Actions / CI (VERIFIED names only)

Live production workflow: `.github/workflows/deploy-production.yml`

- Gated on `github.repository == 'ankur6779/Amynest-live'`
- Deploys Cloudflare Pages, Cloudflare Worker `amynest-api-proxy`, and (path-filtered) Hetzner worker
- Coolify API is **not** deployed by this workflow (comment: Git webhook / Coolify auto-deploy)

Repository **secret names** returned by `gh secret list` (values not read):

`ADMIN_AUTH_TOKEN`, `API_PUBLIC_URL`, `CLOUDFLARE_API_TOKEN`, `DATABASE_URL`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `GCS_SERVICE_ACCOUNT_JSON`, `GEMINI_API_KEY`, `HETZNER_HOST`, `HETZNER_SSH_PRIVATE_KEY`, `INTERNAL_HEALTH_SECRET`, `KIE_API_KEY`, `OPENAI_API_KEY`, `REDIS_URL_EXTERNAL`, `RENDER_API_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`

Workflow **also references** secret names not returned by that list (may live in Coolify, Environments, or be unset):

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_VAPID_KEY`, `VITE_GA4_MEASUREMENT_ID`

**UNKNOWN — OWNER ACTION REQUIRED:** where those Vite/GA4 secrets actually live, and whether Coolify is wired by GitHub App, polling, or a webhook not visible on the repo hooks API.

## Exact operational transfer (not executed)

These are the documented vendor operations. They are **not** complete until verification tests pass.

1. Buyer creates a GitHub **organization** (recommended) and an admin user.
2. Seller (`ankur6779`) uses GitHub **Settings → General → Transfer repository** to that org, **or** adds the buyer as admin and later transfers. GitHub documents this as a repository transfer; the new URL must be accepted.
3. After transfer (or immediately if remaining on the same URL with buyer admin): recreate **every** Actions secret on the destination. Do not copy-paste into git.
4. Update Coolify’s git source / deploy key / GitHub App installation to the new owner. Mechanism is **UNKNOWN** today (hooks API empty).
5. Edit `deploy-production.yml` repository-name gate from `ankur6779/Amynest-live` to the buyer repo path (code change after transfer).
6. Rotate Cloudflare, Hetzner SSH, GCS JSON, OpenAI, Gemini, and any other keys **after** buyer control (credential **rotation**, not the same as account transfer).
7. Confirm `main` is the production branch; optionally enable branch protection (currently **absent** — operational risk, not a transfer mechanism).
8. Invite buyer; remove `ankur6779` only after acceptance tests pass.

**Account transfer** = GitHub repo/org ownership.  
**Credential rotation** = new Actions secret values.  
**Service migration** = Coolify/Cloudflare/Hetzner pointing at the new repo.

These three are not equivalent.

## Blockers (buyer cannot operate without founder)

1. Only admin is `ankur6779`.
2. All listed Actions secrets sit on that personal repo.
3. Deploy workflow hard-codes that repository name.
4. Coolify git integration owner **UNKNOWN**.
5. Hetzner deploy uses `HETZNER_SSH_PRIVATE_KEY` from those secrets.
6. Cloudflare deploy uses `CLOUDFLARE_API_TOKEN` from those secrets.
7. No documented escrow of secret values to the buyer.

## Buyer acceptance test

Buyer, logged in as an account that is **not** `ankur6779`, can: (a) push a no-op to `main` or dispatch the production workflow, (b) see Pages + Worker jobs authenticate with **buyer-controlled** secrets, (c) confirm Coolify still watches the repo. **Not met.**
