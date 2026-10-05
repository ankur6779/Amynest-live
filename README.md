# AmyNest AI

Parenting product monorepo: web SPA, Express API, Android WebView shell, iOS Capacitor shell.

**Production web:** `https://www.amynest.in`  
**Play:** `com.amynest.app`  
**App Store ID:** `6767664343`

This README is an engineering entry point. It is **not** a sale listing and does **not** state valuation, user counts, or granted patent rights.

## What ships

| Surface | Path |
|---------|------|
| UI / product | `artifacts/kidschedule/` |
| API | `artifacts/api-server/` |
| Android (Play) | `android/` — WebView of production site |
| iOS | `artifacts/amynest-capacitor/ios/` |
| Shared libs | `lib/` |

Do not treat `artifacts/amynest-capacitor/android/` as the Play app. Expo is archived at `archive/amynest-mobile-expo/`.

## Local development

Node `>=22.12.0 <23.0.0`. Postgres required.

```
cp .env.development.example .env.development
pnpm install
pnpm run dev:api    # :5000
pnpm run dev:web    # :3000  (set VITE_USE_LOCAL_API=1 to proxy)
```

See `AGENTS.md` and `docs/dev-environment.md`. Note: some older docs still mention Render; **current production plane is Coolify + Cloudflare** (`.env.production.example`).

## IP / patent (status only)

Indian Patent **Application** No. `202611059355` (filed; **not granted**). Applicant on filing papers: Ankur Raman. Do not describe the product as patented.

## Operator handbook

`docs/sale-readiness/handover/` — architecture, deploy, billing, transfer templates. **No secrets.**

## License

`package.json` currently says `MIT`. There is **no** root `LICENSE` file. Counsel has not decided outbound license for a sale — see `docs/sale-readiness/handover/LICENSE_DECISION.md`.
