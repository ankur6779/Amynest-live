# Apple App Store — Export Compliance Declaration
## AmyNest AI · com.amynest.ai

**Prepared for:** Apple App Store Connect submission  
**App Name:** AmyNest AI  
**Bundle ID:** com.amynest.ai  
**Version:** 1.0.0 (Build 1)  
**Date:** May 2026

---

## 1. Summary Answer (what to click in App Store Connect)

| App Store Connect Question | Your Answer |
|---|---|
| "Does your app use encryption?" | **Yes** |
| "Does your app qualify for any of the exemptions?" | **Yes** |
| Exemption selected | **I use only encryption that is exempt from export documentation requirements** |
| ERN / Annual Self-Classification Report required? | **No** |

> **The `ITSAppUsesNonExemptEncryption = false` key is already set in `app.json` → ios → infoPlist. This suppresses the App Store Connect encryption prompt on future uploads.**

---

## 2. Step-by-Step in App Store Connect

1. Open **App Store Connect → My Apps → AmyNest AI → [Version] → iOS App**.
2. Scroll to **Export Compliance**.
3. Answer **"Yes"** to "Does this app use encryption?"
   *(HTTPS is encryption — answering No is incorrect and can trigger rejection.)*
4. On the next screen, check **"Yes, our app is designed to use standard encryption and is exempt from the EAR"**.
5. Select exemption reason: **"Your app uses encryption for authentication, digital signature, or data integrity verification only, and not for the confidentiality of data"** — or the blanket exemption below (both apply).
6. Click **Save**. No further documentation upload is required.

---

## 3. Encryption Used in AmyNest AI

All encryption in AmyNest AI is **standard, OS-provided, and exempt** from EAR requirements.

| Technology | Encryption Type | How Used | Exempt? |
|---|---|---|---|
| **HTTPS / TLS 1.2+** | AES-256, RSA/ECDSA (OS-provided) | All API calls to AmyNest server, OpenAI, ElevenLabs, Firebase, Clerk | ✅ Yes |
| **Firebase Auth** | TLS over HTTPS (Google-managed) | User sign-in and authentication tokens | ✅ Yes |
| **Clerk (OpenID Connect)** | TLS / OAuth 2.0 / JWT (RS256) | Authentication and session management | ✅ Yes |
| **Firebase Cloud Messaging (FCM)** | TLS (Google-managed) | Push notification delivery | ✅ Yes |
| **Razorpay SDK** | TLS (PCI-compliant, Razorpay-managed) | Payment processing | ✅ Yes |
| **ElevenLabs TTS** | TLS over HTTPS | Audio stream for Amy Read Aloud | ✅ Yes |
| **Expo / React Native runtime** | iOS-native TLS (NSURLSession) | Underlying HTTP transport | ✅ Yes |

**No custom cryptographic algorithms, proprietary ciphers, or non-standard encryption libraries are used.**

---

## 4. Legal Basis for Exemption

The app qualifies for the **License Exception ENC** under **EAR §740.17(b)(4)**:

> *"Publicly available encryption source code and corresponding object code which is not subject to payment of a licensing fee or royalty for commercial use."*

Additionally, since the app uses only **authentication-grade encryption** (login, session tokens, secure transport) and not encryption for the purpose of concealing data content from a government, it qualifies under:

- **EAR §742.15(b)** — encryption used for authentication
- **EAR §740.17(b)(4)** — publicly available / standard encryption

**No Export Administration Regulations (EAR) filing, Encryption Registration Number (ERN), or Annual Self-Classification Report to the Bureau of Industry and Security (BIS) is required.**

---

## 5. What Is Already Configured in the Project

The Expo `app.json` already contains the correct Info.plist key:

```json
"ios": {
  "bundleIdentifier": "com.amynest.ai",
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false
  }
}
```

This key tells Apple's automated tooling that the app does **not** use encryption that requires export documentation. When a new `.ipa` is uploaded via EAS Build or Xcode, App Store Connect will read this key and **skip the manual export compliance prompt** automatically.

---

## 6. Countries Cleared for Distribution

Because no non-exempt encryption is used, AmyNest AI may be distributed in **all countries available on the App Store**, including:

- United States, Canada, United Kingdom, European Union
- India, Singapore, Australia, Japan
- All other App Store territories

The only standard geographic restrictions that may apply are Apple's own country availability settings (e.g. Cuba, Iran, North Korea, Syria, Crimea region) — these are Apple's restrictions, not encryption-related.

---

## 7. Contacts & Responsibility

| Role | Detail |
|---|---|
| App Developer / Publisher | AmyNest AI |
| Support Contact | support@amynest.in |
| Developer Responsible for Compliance | App owner / submitting Apple Developer account holder |

*This document should be retained for at least 5 years per US export record-keeping requirements (EAR §762.2), even though no license or ERN is required.*

---

*Document prepared May 2026. Review if new encryption libraries are added to the app.*
