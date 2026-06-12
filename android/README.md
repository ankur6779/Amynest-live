# AmyNest Android — WebView wrapper + native FCM

Full-screen Android wrapper for **https://amynest.in** with native Firebase Cloud Messaging push.

## How it works

| Layer | What it does |
|---|---|
| `MainActivity` | Full-screen `WebView` — no browser chrome, no address bar |
| `PushBridge` | Exposes `window.AmyNestPushNative` to the web page via `WebViewCompat.addWebMessageListener` |
| `KidScheduleFcmService` | Receives FCM messages in background/killed state, shows system tray notifications |
| `AmyNestApp` | Creates notification channels + custom sounds at app start |
| `NotificationSounds` | Declares `res/raw/amynest_*.mp3` bundled push sounds |
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
- Convenience copies: `releases/amynest-<version>-<versionCode>.{aab,apk}` after a local release build

Signing keystore (not in git): copy `Amynest` from `artifacts/kidschedule-android/` backup into `android/keystore/Amynest`, then create `android/keystore.properties` (see `artifacts/kidschedule-android/keystore.properties` for field names).

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

## Google Sign-In (native, not browser OAuth)

Play Store Android does **not** use Capacitor. Google Sign-In runs in **`AuthBridge.kt`**:

- Web client ID: `res/values/strings.xml` → `amynest_google_web_client_id` (also auto-read from `google-services.json` → `default_web_client_id` when present)
- JS bridge: `window.AmyNestAuthNative` (see `artifacts/kidschedule/src/lib/native-auth.ts`)
- Web route: `handleGoogleLogin()` → `loginAndroidWebViewGoogle()` when UA contains `AmyNestAndroid/1.0`

After changing `AuthBridge` or the web client ID, rebuild the APK. After changing web auth logic, deploy **www.amynest.in** (Render) — the app loads the live site.

## Facebook Sign-In (native, same bridge as Google)

Facebook Login uses the same **`AuthBridge.kt`** / `window.AmyNestAuthNative` pattern as Google:

1. Meta App ID → `res/values/strings.xml` → `facebook_app_id` (already set)
2. **Client token** → Meta → App Settings → Advanced → **Client token** → add to `android/local.properties`:
   ```properties
   facebook.clientToken=YOUR_META_CLIENT_TOKEN
   ```
   (gitignored — never commit this file)
3. Meta → Facebook Login → Android → package `com.amynest.app`, class `com.amynest.app.MainActivity`, **key hashes** (release + debug)
4. Firebase Console → Authentication → Sign-in method → **Facebook** enabled with same App ID + App Secret
5. Rebuild APK (`versionCode` bump) and deploy web (`handleFacebookLogin()` → `loginAndroidWebViewFacebook()`)

Web exchanges the native **access token** with Firebase via `FacebookAuthProvider.credential()`.

### Fix "Google Sign-In is not configured for this app build"

This message maps to Google Sign-In **`DEVELOPER_ERROR` (status 10)** — almost always a **Firebase / OAuth SHA-1 mismatch**, not a WebView bug.

Native sign-in requires an **Android OAuth client** (`client_type: 1` with `certificate_hash`) for package **`com.amynest.app`** in `google-services.json`. The web-only client (`client_type: 3`) is not enough.

#### 1. Add SHA-1 fingerprints in Firebase Console

Firebase Console → Project Settings → Your apps → Android **`com.amynest.app`** → Add fingerprint:

| Certificate | Where to get SHA-1 |
|---|---|
| **Upload / release keystore** | `./android/scripts/print-signing-fingerprints.sh` |
| **Play App Signing key** | Play Console → Your app → Setup → App signing → **App signing key certificate** |

Play Store builds are re-signed by Google — you **must** add the **Play App Signing** SHA-1 for production users, not only your upload keystore.

For local debug APKs (`com.amynest.app.debug`), add a separate Firebase Android app or fingerprint for the debug keystore (`~/.android/debug.keystore`).

#### 2. Re-download `google-services.json`

After adding SHA-1 fingerprints, download an updated `google-services.json` and copy to `android/app/google-services.json`.

Validate before uploading to Play Store:

```bash
node android/scripts/validate-google-services.mjs --strict
```

Release AAB builds run this automatically via Gradle (`validateGoogleSignInConfig`).

#### 3. Keep web client ID in sync

These must match the Firebase **Web client** ID:

- `android/app/src/main/res/values/strings.xml` → `amynest_google_web_client_id`
- `artifacts/kidschedule/src/lib/google-auth-defaults.ts` → `webClientId`

#### 4. Debugging in the app

Filter logcat for tags **`AuthBridge`**, **`GoogleSignInConfig`**, and web console **`[amynest:native-auth]`** / **`[amynest:google-auth]`**.

On app load the web layer calls `getDiagnostics` on the native bridge and logs package name + signing SHA-1. Compare `signingSha1` with the fingerprints registered in Firebase.

---

## UserAgent detection

The WebView appends `AmyNestAndroid/1.0` to the Chrome UA string. Your web code can use:

```ts
const isNativeAndroid = /AmyNestAndroid/.test(navigator.userAgent);
```

The existing `native-push-bridge.ts` checks for `window.AmyNestPushNative` instead —
use that for push-specific logic as it's more reliable than UA sniffing.

---

## Custom notification sounds

Five ElevenLabs-generated MP3 files ship in **`android/app/src/main/res/raw/`**:

| File | Channel / category |
|------|------------------|
| `amynest_nest_chime.mp3` | routine, routine_item, good_night |
| `amynest_sparkle.mp3` | milestone, weekly, engagement |
| `amynest_soft_bell.mp3` | insights, parenting_tips, infant_care |
| `amynest_story_ping.mp3` | story_time |
| `amynest_learning_pop.mp3` | nutrition, phonics, learning_activity |

- **`NotificationSounds.kt`** — explicit `@RawRes` references (release `shrinkResources` safe).
- **`res/raw/keep.xml`** — keeps raw assets in release builds.
- **`NotificationChannels.kt`** — assigns default sound per notification channel.
- **`KidScheduleFcmService.kt`** — per-category sound on each tray notification.

Regenerate all platforms:

```bash
pnpm run generate:notification-sounds
```

Manifest: `assets/notification-sounds/manifest.json`

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
