# Secret Configuration Guide

## Rules

- Never commit secrets
- Never log raw secret values
- Startup masks present secrets (`ab**********yz`)
- Production should use `AMYNEST_SECRET_VALIDATION_MODE=strict`

## Required by provider

| When configured | Required secrets |
|-----------------|------------------|
| `scriptProvider=openai` | `OPENAI_API_KEY` (GPT — not Gemini) |
| `preferredProviders` includes `google-veo` | `GEMINI_API_KEY` (Google AI Studio — Veo/Gemini) |
| `publishingProvider=youtube` | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` (access token auto-refreshed) |
| `analyticsProvider=youtube` | Same YouTube OAuth **or** `ANALYTICS_ACCESS_TOKEN`; requires `yt-analytics.readonly` scope |

### Recommended YouTube OAuth scopes

- `https://www.googleapis.com/auth/youtube.force-ssl` (preferred full Data API)
- `https://www.googleapis.com/auth/youtube.upload` + `youtube.readonly` (minimum upload path)
- `https://www.googleapis.com/auth/yt-analytics.readonly` (live Analytics reports)

Re-consent with `pnpm run youtube:oauth-setup` after changing scopes.
| `trendProvider=google-trends` | `GOOGLE_TRENDS_API_KEY` |
| ops channel `telegram` | `TELEGRAM_BOT_TOKEN` |
| ops channel `email` | `SMTP_URL` or `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` |
| ops channel `webhook` | `WEBHOOK_URL` |
| ops channel `slack` | `SLACK_WEBHOOK_URL` |
| ops channel `discord` | `DISCORD_WEBHOOK_URL` |

## Diagnostics

```bash
pnpm amynest:doctor
```

The doctor report includes masked secret diagnostics and missing-required names only — never plaintext values.
