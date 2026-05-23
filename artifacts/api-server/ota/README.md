# AmyNest OTA (Over-The-Air) — Apple-compliant web updates

OTA updates **only the Capacitor `www` web bundle** (HTML/JS/CSS). Native code, permissions, and SDK changes still require an **App Store / Play Store** build.

## Apple policy (what we allow)

| Allowed via OTA | Requires store build |
|-----------------|----------------------|
| Bug fixes in JS | New native plugins |
| Copy / styling tweaks | New permissions |
| Performance tweaks | IAP / subscription flow changes |
| Content loaded from API (already) | Major new features / new app purpose |

Server enforces **`patch-only`**: `1.0.4` → `1.0.5` OK; `1.0.x` → `1.1.0` or `2.0.0` **rejected** (client must use the store).

## Files

- `manifest.production.json` — active production manifest (or set `OTA_MANIFEST_PATH`)
- `bundles/*.zip` — optional local hosting; production usually uses CDN URL in manifest

## Publish a patch (after `build:web`)

From repo root:

```bash
cd artifacts/amynest-capacitor
pnpm run build:web
node scripts/publish-ota-bundle.mjs --version 1.0.1 --upload-url https://your-cdn/ota/bundles/1.0.1.zip
```

Then set `enabled: true` in the manifest on the API server and deploy.

## Environment (api-server)

| Variable | Description |
|----------|-------------|
| `OTA_ENABLED` | `false` disables checks |
| `OTA_MANIFEST_PATH` | Absolute path to manifest JSON |
| `OTA_BUILTIN_BUNDLE_VERSION` | Version baked into store binary `www` (default `1.0.0`) |

## App Review

Mention in Review Notes: *"The app may download minor web asset patches (bug fixes) using Capacitor Updater; no executable native code is installed. Major features ship via App Store updates."*
