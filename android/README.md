# AmyNest Android — WebView wrapper + native FCM

Full-screen Android wrapper for **https://amynest.in** with native Firebase Cloud Messaging push.

## How it works

| Layer | What it does |
|---|---|
| `MainActivity` | Full-screen `WebView` — no browser chrome, no address bar |
| `PushBridge` | Exposes `window.AmyNestPushNative` to the web page via `WebViewCompat.addWebMessageListener` |
| `KidScheduleFcmService` | Receives FCM messages in background/killed state, shows system tray notifications |
| `AmyNestApp` | Creates the `"default"` notification channel at app start |
| Web: `native-push-bridge.ts` | Talks to `window.AmyNestPushNative`, gets native FCM token, calls `/api/push/register` |
| Server: `notificationDispatchService.ts` | Routes `platform:"android"` tokens via `sendFcmAndroidPush()` (already built) |

### Push registration flow

```
App launch
  └── KidScheduleFcmService.onNewToken()
        └── PushBridge.saveToken() → SharedPreferences
MainActivity (WebView open)
  └── PushBridge.install() → window.AmyNestPushNative available
Web page (amynest.in) auth complete
  └── native-push-bridge.ts: { action: "getStatus" }
        ← PushBridge: { ok: true, data: { fcmEnabled, permission, token } }
  └── native-push-bridge.ts calls /api/push/register { token, platform:"android" }
        → Backend: saved in push_tokens table with platform="android"
FCM notification arrives
  ├── App foreground  → web page handles it (web notification)
  └── App background  → KidScheduleFcmService shows system tray notification
                         Tap → MainActivity opens WebView at deepLink path
```

---

## One-time setup

### 1. Firebase — add `google-services.json`

1. Go to [Firebase Console](https://console.firebase.google.com) → your project → Project Settings → Your apps
2. Add an Android app with package name `com.amynest.app`
3. Download `google-services.json`
4. Copy it to `android/app/google-services.json` (it's git-ignored — never commit it)

```bash
cp ~/Downloads/google-services.json android/app/google-services.json
```

### 2. Generate a signing keystore (first time only)

```bash
keytool -genkey -v \
  -keystore android/app/amynest-release.jks \
  -alias amynest \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Keep `amynest-release.jks` and the passwords safe — losing them means you can never update the app.**

### 3. Get the SHA-256 fingerprint

```bash
keytool -list -v \
  -keystore android/app/amynest-release.jks \
  -alias amynest \
  | grep "SHA256"
```

Copy the colon-separated hex string, e.g. `AB:CD:EF:...`

### 4. Update `assetlinks.json`

Edit `artifacts/kidschedule/public/.well-known/assetlinks.json` and replace
`REPLACE_WITH_SHA256_FINGERPRINT_FROM_KEYSTORE` with the fingerprint from step 3.

**Format** — keep the colons: `"AB:CD:EF:12:34:56:..."` (44 hex pairs separated by colons).

Deploy the kidschedule web app so the file is live at:
`https://amynest.in/.well-known/assetlinks.json`

Verify: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://amynest.in&relation=delegate_permission/common.handle_all_urls`

### 5. Configure signing in `app/build.gradle.kts`

Add to the `android {}` block:

```kotlin
signingConfigs {
    create("release") {
        storeFile = file("amynest-release.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ""
        keyAlias = "amynest"
        keyPassword = System.getenv("KEY_PASSWORD") ?: ""
    }
}
buildTypes {
    release {
        signingConfig = signingConfigs.getByName("release")
        // ... existing minify config
    }
}
```

---

## Build

```bash
cd android
./gradlew assembleRelease          # unsigned (for testing)
./gradlew bundleRelease            # signed AAB for Play Store upload
```

Output:
- APK: `app/build/outputs/apk/release/app-release.apk`
- AAB: `app/build/outputs/bundle/release/app-release.aab`

---

## Icons

Replace the placeholder icons with your brand assets:

| Path | Size | Use |
|---|---|---|
| `res/mipmap-mdpi/ic_launcher.png` | 48×48 | Launcher (old devices) |
| `res/mipmap-hdpi/ic_launcher.png` | 72×72 | |
| `res/mipmap-xhdpi/ic_launcher.png` | 96×96 | |
| `res/mipmap-xxhdpi/ic_launcher.png` | 144×144 | |
| `res/mipmap-xxxhdpi/ic_launcher.png` | 192×192 | |
| `res/mipmap-anydpi-v26/ic_launcher.xml` | adaptive | Android 8+ |
| `res/drawable/ic_notification.xml` | 24dp | System tray icon (monochrome!) |

Use **Android Studio → Image Asset Studio** (File → New → Image Asset) to generate all densities from a single SVG/PNG source.

---

## UserAgent detection

The WebView appends `AmyNestAndroid/1.0` to the Chrome UA string. Your web code can use:

```ts
const isNativeAndroid = /AmyNestAndroid/.test(navigator.userAgent);
```

The existing `native-push-bridge.ts` checks for `window.AmyNestPushNative` instead —
use that for push-specific logic as it's more reliable than UA sniffing.

---

## Notification deep links

The backend sets `deepLink` in the FCM data payload (e.g. `"/hub"`, `"/routine/3"`).
`KidScheduleFcmService` passes this to `MainActivity` via Intent extras.
`MainActivity` converts it to `https://amynest.in/#/hub` so the SPA router handles it.

---

## Digital Asset Links (App Links)

`assetlinks.json` hosted at `https://amynest.in/.well-known/assetlinks.json` does two things:

1. **App Links verification** — links to `https://amynest.in` tapped anywhere on the device open the native app instead of Chrome.
2. **TWA mode** — if you ever switch the launcher activity to a Trusted Web Activity (`com.google.androidbrowserhelper:browserhelper`), the same `assetlinks.json` enables the no-address-bar experience.

The current implementation uses WebView (which also has no address bar) but registering the Digital Asset Links is still recommended for App Links to work.
