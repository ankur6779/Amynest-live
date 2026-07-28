# Production Deployment Guide

## Goal

Run the AmyNest YouTube Content Automation Engine unattended: generate, render, publish, analyze, learn, and plan campaigns every day.

## Fresh server checklist

1. Install Node.js 22+ and enable Corepack/`pnpm`
2. Clone the repository and run `pnpm install`
3. Copy `content-engine/deployment/.env.production.example` → `/etc/amynest/content-engine.env`
4. Fill required secrets (see [Secret Configuration Guide](./secrets.md))
5. Validate: `pnpm amynest:doctor`
6. Health: `pnpm amynest:health`
7. Deploy with Docker Compose, Coolify, or systemd (see `content-engine/deployment/`)
8. Confirm first daily run: `pnpm amynest:daily-short`

## Deployment options

| Backend | Path |
|---------|------|
| Docker Compose | `content-engine/deployment/docker-compose.yml` |
| Dockerfile | `content-engine/deployment/Dockerfile` |
| Coolify | `content-engine/deployment/coolify.md` |
| systemd timer | `content-engine/deployment/systemd/` |

## Persistent volumes

- `/data` — workflows, analytics, learning, campaigns, publishing history
- `/backups` — backup manifests
- `/renders` — rendered media

## Restart & recovery

Containers use `restart: unless-stopped`. After crash/restart:

```bash
pnpm amynest:resume
```

Recovery resumes from the latest checkpoint and never duplicates completed uploads.
