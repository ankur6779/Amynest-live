# AmyNest iOS — Final Upload Checklist (App Store)

Use this **right before** Archive → Upload. Code in repo is aligned for review; you must still complete **App Store Connect** steps.

---

## A. Xcode (Mac) — binary

1. Pull latest `main` and rebuild:
   ```bash
   cd artifacts/amynest-capacitor
   pnpm run build:ios
   cd ios/App && pod install
   ```
2. Open `ios/App/App.xcworkspace` (not `.xcodeproj`).
3. **App target → Signing & Capabilities** — confirm:
   - **Sign in with Apple** capability present
   - **Push Notifications**
   - **Background Modes**: only **Remote notifications** + **Background fetch** (no **Audio**)
   - **Associated Domains**: `applinks:amynest.in`, `applinks:www.amynest.in`, `webcredentials:…`
4. **App target → General** — bump **Build** number (e.g. 19+).
5. **Product → Clean Build Folder**, then **Archive** → **Distribute** → App Store Connect.

---

## B. App Store Connect — metadata (reject if missing)

| Field | Value |
|--------|--------|
| Privacy Policy URL | `https://amynest.in/privacy` |
| Support URL | `https://amynest.in/support` |
| App Description (include) | `Terms of Use (EULA): https://amynest.in/terms` and `Privacy Policy: https://amynest.in/privacy` |

### App Privacy (Guideline 5.1.2)

- “Do you or third-party partners use data for **tracking**?” → **No**
- Every data type → **Used for Tracking** = **unchecked**
- Match `ios/App/App/PrivacyInfo.xcprivacy` (`NSPrivacyTracking` = false)

### Age Rating

- **Parental Controls** → None  
- **Age Assurance** → None  
- Result: **4+**

### Export compliance

- Question “Uses encryption?” → **No** or exempt (Info.plist has `ITSAppUsesNonExemptEncryption` = false)

---

## C. Sign in with Apple + social login (Guideline 4.8)

Repo already provides:

- **Sign in with Apple** first on sign-in / sign-up (with Google + Facebook + email)
- Native Apple / Google / Facebook on Capacitor iOS
- **No phone OTP** on iOS (reduces review friction)
- Auth screens link to **/terms** and **/privacy**

**Apple Developer portal** (verify once):

- App ID `com.amynest.app` → **Sign In with Apple** enabled  
- Services ID / redirect for web: `https://www.amynest.in/auth/apple/callback`  
- Firebase Auth → Apple provider enabled with same team / key

---

## D. Subscriptions (Guideline 3.1.2)

- iOS app: **Apple IAP only** (RevenueCat) — Razorpay hidden on iOS  
- Paywall shows plan name, duration, price, **Privacy Policy** + **Terms** links  
- **Restore Purchases** visible  

---

## E. Account deletion (Guideline 5.1.1(v))

- In app: **Menu → My Profile → Delete Account** (two-step confirm)  
- Attach a **screen recording** in App Review Information showing this flow  

---

## F. App Review Information → Notes

Paste from `ios-config/APPSTORE-REVIEW-NOTES.md` (Reviewer Access, What To Test, OTA paragraph).

Suggested test account:

- `apple.review@amynest.in` / `AmyNestReview2025!`

---

## G. Quick self-test on device (not Simulator for Apple Sign-In)

1. Sign in with **Apple**  
2. Sign in with **Google**  
3. Sign in with **Facebook**  
4. Email + password  
5. Pricing → IAP sheet opens; Restore Purchases works  
6. Delete Account flow  

---

Full detail: `APPSTORE-REVIEW-CHECKLIST.md`, reviewer text: `APPSTORE-REVIEW-NOTES.md`.
