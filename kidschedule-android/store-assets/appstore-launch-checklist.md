# Apple App Store Launch Checklist
## AmyNest AI · com.amynest.app · v1.0.1

---

## ✅ Already Done (in code / config)

| Item | Status | Detail |
|---|---|---|
| Bundle ID | ✅ | `com.amynest.app` |
| Apple Team ID | ✅ | `FH3WT32854` (in `app.json`) |
| Version | ✅ | `1.0.1`, Build `2` |
| Export Compliance | ✅ | `ITSAppUsesNonExemptEncryption = false` |
| Privacy Policy page | ✅ | `https://amynest.in/privacy` |
| Terms of Service page | ✅ | `https://amynest.in/terms` |
| App icons | ✅ | `icon.png` + `adaptive-icon.png` |
| Splash screen | ✅ | Dark `#1A1530` with AmyNest logo |
| Screenshots (6.5") | ✅ | 10 screenshots at 1242×2688 in `screenshots/` |
| App Preview video | ✅ | 20-second cinematic video in `artifacts/amynest-splash` |
| Camera permission | ✅ | `NSCameraUsageDescription` set |
| Photos permission | ✅ | `NSPhotoLibraryUsageDescription` set |
| Microphone permission | ✅ | `NSMicrophoneUsageDescription` set |
| ATT permission string | ✅ | `NSUserTrackingUsageDescription` set |
| Privacy Manifest | ✅ | `NSPrivacyAccessedAPITypes` declared via `expo-build-properties` |
| Associated Domains | ✅ | `applinks:amynest.in` for Universal Links |
| Apple App Site Association | ✅ | Hosted at `amynest.in/.well-known/apple-app-site-association` |
| config-plugins fix | ✅ | `@expo/config-plugins` declared as direct dependency |

---

## 🔲 To Do in App Store Connect

### 1. App Information Tab

| Field | Required | What to enter |
|---|---|---|
| **App Name** | ✅ | `AmyNest AI` |
| **Subtitle** | ✅ | `Smart Parenting & Routine Planner` *(max 30 chars)* |
| **Primary Category** | ✅ | `Education` |
| **Secondary Category** | Optional | `Lifestyle` |
| **Content Rights** | ✅ | "No, does not contain third-party content" |
| **Age Rating** | ✅ | See Section 2 below |

---

### 2. Age Rating Questionnaire

Answer every question in the rating interview. For AmyNest:

| Question | Answer |
|---|---|
| Cartoon or fantasy violence | None |
| Realistic violence | None |
| Prolonged graphic or sadistic realistic violence | None |
| Sexual content or nudity | None |
| Profanity or crude humour | None |
| Mature / suggestive themes | None |
| Horror / fear themes | None |
| Medical / treatment information | Infrequent / Mild |
| Gambling | None |
| Alcohol, tobacco, drugs | None |
| Simulated gambling | None |
| Unrestricted web access | None |

**Expected rating: 4+**

---

### 3. Version Information (App Store Listing)

| Field | Character limit | What to enter |
|---|---|---|
| **Promotional Text** | 170 chars | `AI-powered daily routine planner for parents. Personalised schedules, meal plans, behavior tracking, and a parenting coach — all in one app.` |
| **Description** | 4000 chars | See template below |
| **Keywords** | 100 chars | `parenting,routine,kids,schedule,child,meal plan,baby,toddler,homework,AI,planner` |
| **Support URL** | ✅ | `https://amynest.in/privacy` |
| **Marketing URL** | Optional | `https://amynest.in` |

**Description template:**

```
AmyNest AI is the smart parenting companion that helps you build structured, 
personalised daily routines for your child — from newborn to teenager.

🌟 KEY FEATURES

• AI Daily Routine — Generate a full day schedule tailored to your child's 
  age, school timings, and mood in seconds.

• Ask AMY Coach — Get warm, practical parenting advice in Parenting, 
  Nutrition, Behavior, and Learning modes.

• Meal & Nutrition Hub — Age-appropriate Indian meal suggestions with weekly 
  plans, nutrient tracking, and a smart tiffin planner.

• Behavior Tracker — Log daily behaviors and receive rule-based insights to 
  understand your child's patterns.

• Spelling Mastery — Adaptive spelling practice with Learn, Dictation, and 
  Tournament modes across multiple age bands.

• Life Skills Module — Tri-lingual (English / Hindi / Hinglish) activities 
  for building everyday skills.

• Infant & Toddler Hub — Care guidance, lullaby player, and a daily parent 
  task checklist for early years.

• Progress & Streaks — Visualise task completion, streaks, and weekly 
  insights to stay motivated.

AmyNest works offline for core features and syncs across devices. 
Designed for Indian families, with regional meal datasets and bilingual support.

Free to use. Premium subscription unlocks unlimited AI routines, the Amy 
Coach, and advanced insights.
```

---

### 4. Screenshots & Preview

| Asset | Size | Status |
|---|---|---|
| iPhone 6.7" screenshots (required) | 1290×2796 | ⚠️ Generate if not done — use `/appstore.html?n=1` on the web app |
| iPhone 6.5" screenshots | 1242×2688 | ✅ 10 screenshots ready in `screenshots/` |
| App Preview video (6.5") | 1080×1920 `.mov` | ⚠️ Export the `amynest-splash` video using screen recorder |
| iPad screenshots | 2048×2732 | Optional (you said `supportsTablet: false`) |

> **Note:** Apple requires at least iPhone 6.7" screenshots for apps targeting iOS 18+. The 1242×2688 screenshots are for 6.5" (iPhone 11 Pro Max) — upload those as the 6.5" set. For 6.7" you can use the same images scaled or re-capture.

---

### 5. Privacy Nutrition Labels

In App Store Connect → **App Privacy**, declare:

| Data Type | Collected | Linked to User | Used for Tracking |
|---|---|---|---|
| Name | ✅ Yes | ✅ Yes | ❌ No |
| Email Address | ✅ Yes | ✅ Yes | ❌ No |
| User ID | ✅ Yes | ✅ Yes | ❌ No |
| Device ID | ✅ Yes | ❌ No | ❌ No |
| Crash Data | ✅ Yes | ❌ No | ❌ No |
| Performance Data | ✅ Yes | ❌ No | ❌ No |
| Other User Content *(child profile, routines)* | ✅ Yes | ✅ Yes | ❌ No |
| Purchase History | ✅ Yes | ✅ Yes | ❌ No |

For each collected type, purpose = **"App Functionality"** and/or **"Analytics"**. No advertising.

---

### 6. In-App Purchases (RevenueCat)

Before submitting, in App Store Connect → **In-App Purchases**:

1. Create a **Subscription Group** (e.g. "AmyNest Premium")
2. Add your subscription products matching the RevenueCat entitlement IDs:
   - Monthly: `amynest_premium_monthly`
   - Annual: `amynest_premium_annual`
3. Add a **localization** (English - India) with display name and description
4. Set **introductory offer** if you have a free trial
5. Link the subscription group to the app in the build submission

> RevenueCat handles the purchase flow. Apple still requires the products to exist in App Store Connect before your build can be approved.

---

### 7. App Review Information

| Field | What to provide |
|---|---|
| **Demo account - Username** | A test Google account (create one for Apple: `apple.review@amynest.in`) |
| **Demo account - Password** | Set a fixed password for the test account |
| **Notes for reviewer** | See template below |

**Review notes template:**

```
AmyNest AI is a parenting assistant app. To test:

1. Sign in with the provided Google account.
2. You'll be taken to the onboarding — add a child profile (e.g. "Aarav", 6 years).
3. The Dashboard will show a daily routine and a Today's Schedule card.
4. Tap "Ask AMY" (bottom nav, middle) to try the AI coaching feature.
5. Tap "Nutrition" to see meal suggestions.
6. To test the Premium paywall: tap any locked feature (marked with a lock icon).

Note: AI-generated content requires network connectivity. All features work 
without a subscription for the first use.

Support: support@amynest.in
```

---

### 8. Final Submission Checklist

Before clicking **Submit for Review**:

- [ ] All screenshots uploaded (6.5" required minimum)
- [ ] App description, keywords, subtitle filled
- [ ] Age rating questionnaire completed
- [ ] Privacy labels filled in App Privacy tab
- [ ] In-App Purchase products created and localised
- [ ] Demo account credentials entered in Review Information
- [ ] Review notes filled
- [ ] Export compliance answered (Yes → Exempt)
- [ ] Content Rights declared
- [ ] Support URL set to `https://amynest.in/privacy`
- [ ] Confirm build is selected (Build 2, v1.0.1)

---

## ⚠️ One-Time Setup (Before Your First Build)

These must be done once in the Apple Developer portal, not App Store Connect:

- [ ] **Push Notification capability** — enable in your App ID at developer.apple.com → Identifiers → `com.amynest.app` → Capabilities
- [ ] **Associated Domains capability** — enable `applinks:amynest.in` in the App ID
- [ ] **In-App Purchase capability** — enabled by default on new App IDs, verify it's on

---

*Document generated May 2026. Review if app features change before next submission.*
