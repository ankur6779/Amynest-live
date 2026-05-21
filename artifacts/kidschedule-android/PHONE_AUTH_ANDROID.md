# Phone OTP in the Android WebView

Firebase **web** phone sign-in uses invisible reCAPTCHA inside the WebView (not Play Integrity / SafetyNet — those apply to the native Firebase Android SDK).

## Firebase Console

1. Open the same Firebase project as the web app.
2. **Project settings → Your apps → Android** (`com.amynest.app`).
3. Add **SHA-1** and **SHA-256** from your release keystore:
   ```bash
   keytool -list -v -keystore /path/to/release.jks -alias kidschedule
   ```
4. **Authentication → Sign-in method → Phone** — ensure enabled.
5. **Authentication → Settings → Authorized domains** — include `amynest.in`, `www.amynest.in`, and any staging host the wrapper loads.

## WebView (this repo)

- `WebViewUserAgent.kt` — Chrome-like mobile UA + `AmyNestAndroid/<version>` for shell detection.
- `MainActivity` — `javaScriptEnabled`, `domStorageEnabled`, third-party cookies for reCAPTCHA.
- `AndroidManifest` — `hardwareAccelerated`, `usesCleartextTraffic` (HTTPS remains primary via `network_security_config`).

## Web app behavior

The kidschedule bundle detects the shell via `isNativePhoneAuthShell()` and runs OTP + reCAPTCHA in-app. Browser redirect is **optional** only for installed PWAs after a failed attempt.

## Smoke test

1. Install debug/release APK with `google-services.json` present.
2. Sign-in → **Continue with Phone** → enter number → **Send OTP**.
3. Complete reCAPTCHA if prompted → enter OTP → signed in without leaving the app.
