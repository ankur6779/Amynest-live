# AmyNest iOS — bundled notification sounds

Five custom push notification sounds ship inside the **App Store binary** (Capacitor iOS target).

## Bundle location (Xcode)

| File | Xcode group | APNs `sound` value |
|------|-------------|-------------------|
| `amynest_nest_chime.caf` | `App/NotificationSounds/` | `NotificationSounds/amynest_nest_chime.caf` |
| `amynest_sparkle.caf` | same | `NotificationSounds/amynest_sparkle.caf` |
| `amynest_soft_bell.caf` | same | `NotificationSounds/amynest_soft_bell.caf` |
| `amynest_story_ping.caf` | same | `NotificationSounds/amynest_story_ping.caf` |
| `amynest_learning_pop.caf` | same | `NotificationSounds/amynest_learning_pop.caf` |

All five `.caf` files must be in the **App** target → **Build Phases → Copy Bundle Resources**.

Regenerate from repo root:

```bash
pnpm run generate:notification-sounds
```

## App Review notes

- Sounds play only for **remote push notifications** and optional **in-app UI** (web bundle).
- `UIBackgroundModes` does **not** include `audio` — no background audio playback.
- Users can mute in-app UI sounds under **Notifications → In-app sounds** in the web app.
- System notification sound can still be changed by the user in iOS Settings per channel.
