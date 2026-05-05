# AmyNest

## Overview

AmyNest is an AI-powered daily routine planner for parents, designed to simplify parenting tasks and enhance family well-being. It provides personalized guidance and tools for managing children's routines, nutrition, and development. Key features include child profile creation, AI-structured daily schedules, behavior tracking, and a comprehensive summary dashboard, offering data-driven insights to streamline daily activities. The project aims to provide a comprehensive, AI-driven solution for modern parenting challenges, with a vision to enhance family life through intelligent automation and personalized support, addressing the market need for efficient and empathetic parenting tools.

## User Preferences

- I prefer a responsive layout with a bottom navigation on mobile and a full sidebar on desktop.
- I want a time-based personalized greeting on the dashboard.
- I expect the system to handle age detection for children automatically.
- I want to see conditional fields for school/travel based on child profiles.
- I prefer a 2-section Parent Hub layout: "For {Child Name}" (current age band) and "Explore Next Stage for {Child Name}" (next age band, dimmed with a "Coming Next · For Age X+" label) so retention scales with the child's growth.
- I want the Olympiad Zone to have adaptive difficulty and track progress.
- I prefer the Life Skills Mode to be tri-lingual (English / Hindi / Hinglish) with an in-section language toggle.
- I want to track task status (Complete/Delay/Skip) with auto-shift on delay.
- I expect browser notifications for routines.
- I want inline task editing with time-cascade.
- I prefer a "Regenerate Remaining Day" option that keeps completed tasks.
- I want an "Add Activity" dialog to inject new activities and refit the schedule.
- I prefer next-day routine auto-generation to be triggered after marking bedtime complete.
- I want a share routine option to copy as formatted text or send via WhatsApp.
- I want to log positive, negative, or neutral behaviors per child per day.
- I prefer rule-based parenting insights generated from behavior data.
- I want weekend auto-detection for routines to automatically set `hasSchool=false`.
- I prefer a "Today's Schedule Card" on the dashboard highlighting the "NOW" slot.
- I want a compact streak card on the dashboard linking to the progress page.
- I expect age-based intelligence to classify age groups and format age appropriately.
- When in "Infant Mode," I want to see care guidance, a lullaby music player, and a parent tasks checklist.
- I prefer to see age-appropriate skill activities and moral stories.
- I want a checkable daily parent task list based on age group.
- I want an "AI Feature" badge on AI-powered functionalities.
- I expect a freemium model with clear caps and a trial period.
- I want weekly insights to be cached locally and refreshable.
- I prefer a secondary violet button for Smart AI Routine generation.
- I want the parenting assistant to provide warm, practical advice.

## System Architecture

The system is a monorepo utilizing pnpm, Node.js 24, and TypeScript 5.9. The frontend is built with React, Vite, Tailwind CSS, and shadcn/ui. The API backend uses Express 5, PostgreSQL, and Drizzle ORM. Clerk handles authentication, and Zod is used for validation. Orval generates API clients from an OpenAPI spec. All AI features use a unified client, prioritizing user-provided OpenAI keys or falling back to Replit AI Integration with `gpt-4o-mini`.

**UI/UX Decisions:**
- **Branding:** "Amy AI Brand" with a character (AmyIcon), a floating assistant button (AmyFab), and consistent branding.
- **Responsiveness:** Mobile-first design with bottom navigation on mobile and a full sidebar on desktop.
- **Specific Hubs:** Dedicated Amy Coach with a 4-phase coaching flow, and Infant & Toddler Hubs with glass tabs and contextual AI insights.
- **Design System:** Indigo/purple theme with specific hex codes and Inter fonts.

**Technical Implementations:**
- **Authentication:** Clerk-based login with email/Google OAuth and protected routes.
- **Profiles:** Management of child and parent profiles with smart logic for school, goals, and availability.
- **Parenting Hub:** A 2-section layout driven by an age-band engine for current and next-stage content.
- **Routine Generation:** Rule-based engine providing age-appropriate templates, handling conditions like school, mood, and parent availability.
- **Smart Nutrition:** Localized meal options (veg/non-veg) with seeded rotation and regional tailoring.
- **Routine Management:** Includes task status tracking (Complete/Delay/Skip) with auto-shift, progress bars, browser notifications, inline editing, partial regeneration, and sharing.
- **Behavior Tracking:** Logs positive, negative, or neutral behaviors per child.
- **Age-Based Features:** Infant Mode offers specific care guidance, lullaby player, and parent tasks. Age-appropriate skill activities and moral stories are also included.
- **Hybrid AI & Freemium:** Combines free rule-based features with opt-in, rate-limited AI functionalities, supported by a freemium model.
- **Spelling Mastery:** A comprehensive learning module with adaptive difficulty across multiple age bands and modes (Learn, Practice, Dictation, Competition, Tournament, Battle, Parent Mode). Features server-side word selection, grading, and score computation for enhanced security.
- **Coach Read-Aloud:** Utilizes ElevenLabs for tri-lingual (English/Hindi) audio synthesis of coaching wins, with content-addressed caching.
- **Reels App:** Standalone vertical video player streaming from Google Drive.
- **Smart Tiffin & Meal Suggestions:** Local-only meal recommender with rule-based ranking and regional datasets.
- **Nutrition Hub:** Module with age-group-specific nutrient library, weekly Indian meal plans, and a daily nutrition score checklist.
- **AmyNest Mobile App:** Expo React Native app for iOS and Android, mirroring web functionalities, including a WebView wrapper for Android with native FCM integration.
- **Android WebView Wrapper (`android/`):** Native Android app (package `com.amynest.app`) that wraps `https://amynest.in` in a full-screen WebView. Exposes `window.AmyNestPushNative` via `WebViewCompat.addWebMessageListener` so the web app can request the native FCM token and register it with `/api/push/register?platform=android`. `KidScheduleFcmService` shows system-tray notifications when app is backgrounded. `PushBridge` uses a companion-object singleton to share the live `JavaScriptReplyProxy` between FCM service and MainActivity. `assetlinks.json` hosted at `kidschedule/public/.well-known/assetlinks.json` enables App Links (SHA-256 fingerprint must be replaced from the release keystore).
- **Debug & Parity System:** Cross-platform debug overlay for comparing Web vs Mobile. Includes a global DEBUG_MODE toggle (URL param `?debug=1` or localStorage on web; AsyncStorage on mobile), floating DebugPanel with real-time API call ring buffer, "Push to Server" button to POST snapshots to `/api/debug/log`, and a parity report page at `/debug-parity` that diffs feature flags and API call patterns between platforms. DB table: `debug_logs`. API endpoints: `POST /api/debug/log`, `GET /api/debug/parity`, `DELETE /api/debug/logs`.
- **TTS / Read Aloud:** Uses ElevenLabs "Amy" voice with content-hashed caching for meal recipe read-aloud.
- **Paywall System:** Features in the Parent Hub are gated with "first-time free" access, then locked behind a paywall.
- **Referral System:** Users receive unique referral codes for bonus premium time.
- **Firebase Auth Module Boundaries:** Structured to prevent Fast Refresh issues.
- **iOS Safari Memory Crash Fix:** Implements two-stage code splitting and a lite splash screen to reduce bundle size and prevent crashes on lower-RAM devices.

## External Dependencies

- **PostgreSQL:** Primary database.
- **Clerk:** Authentication service.
- **OpenAI:** AI-powered features.
- **RevenueCat:** Subscription management for iOS.
- **Razorpay:** Payment gateway for web and Android in India.
- **ElevenLabs:** Text-to-speech for "Amy" Read Aloud voice.
- **Google Drive API:** Video streaming for Reels and Kids Story Hub.
- **Google Fonts:** For `inter` font.
- **Expo:** React Native framework.
- **Zod:** Schema validation.
- **Drizzle ORM:** TypeScript ORM.
- **Orval:** API client code generator.
- **Tailwind CSS:** CSS framework.
- **Shadcn/ui:** UI component library.
- **Zustand:** State management.