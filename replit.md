# AmyNest

## Overview

AmyNest is an AI-powered daily routine planner for parents. It aims to simplify parenting tasks by offering personalized guidance and tools to manage children's routines, nutrition, and development. Key capabilities include creating child profiles, generating AI-structured daily schedules, tracking behavior, and providing a comprehensive summary dashboard. The project seeks to enhance family well-being by streamlining daily activities and offering data-driven insights.

## User Preferences

- I prefer a responsive layout with a bottom navigation on mobile and a full sidebar on desktop.
- I want a time-based personalized greeting on the dashboard.
- I expect the system to handle age detection for children automatically.
- I want to see conditional fields for school/travel based on child profiles.
- I prefer a 7-section collapsible layout for the Parenting Hub.
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

The system is a monorepo utilizing pnpm workspaces, Node.js 24, and TypeScript 5.9. The frontend uses React, Vite, Tailwind CSS, and shadcn/ui. The API backend is built with Express 5, and PostgreSQL with Drizzle ORM. Authentication is managed by Clerk. Zod is used for validation, and Orval generates API clients from an OpenAPI spec. All AI features route through a unified client, preferring user-provided OpenAI keys or falling back to Replit AI Integration, using `gpt-4o-mini` as the active model.

**UI/UX Decisions:**
- **Branding:** Features an "Amy AI Brand" with a character (AmyIcon), floating assistant button (AmyFab), and consistent branding.
- **Responsiveness:** Mobile-first design with bottom navigation on mobile and a full sidebar on desktop.
- **Specific Hubs:** Dedicated Amy Coach with a 4-phase coaching flow and Infant & Toddler Hubs with glass tabs and contextual AI insights. Amy Coach goal categories include behaviour, focus, eating, sleep, parent self-care, special situations, and a research-grounded "Kids Health Concern" section (Childhood Obesity, Nutrition Deficiency, Immunity, Dental Health, Digital Health & Eye Care, Early Development 0–5).
- **Design System:** Indigo/purple theme with specific hex codes and Inter fonts.

**Technical Implementations:**
- **Authentication:** Clerk-based login with email/Google OAuth and protected routes.
- **Profiles:** Management of child and parent profiles with smart logic for school, goals, and availability.
- **Parenting Hub:** A 7-section collapsible layout offering AI prompts, articles, daily tips, and specialized zones like Smart Olympiad Zone and Life Skills Mode (tri-lingual).
- **Routine Generation:** Rule-based engine (`routine-templates.ts`) providing age-appropriate templates, handling various conditions like school, mood, and parent availability.
- **Smart Nutrition:** Offers localized meal options (veg/non-veg) with seeded rotation and regional tailoring. Custom recipes can be saved and integrated.
- **Routine Management:** Features include task status tracking (Complete/Delay/Skip) with auto-shift, progress bars, browser notifications, inline editing, partial regeneration, and sharing options.
- **Behavior Tracking:** Logs positive, negative, or neutral behaviors per child.
- **Age-Based Features:** Infant Mode provides specific care guidance, lullaby player, and parent tasks. Age-appropriate skill activities and moral stories are also included.
- **Hybrid AI & Freemium:** Combines free rule-based features with opt-in, rate-limited AI functionalities. A freemium model with trial periods and subscription plans is enforced server-side.
- **Reels App:** Standalone vertical video player streaming from Google Drive.
- **Smart Tiffin & Meal Suggestions:** Local-only meal recommender with rule-based ranking and regional datasets.
- **Nutrition Hub:** Comprehensive, science-backed module with age-group-specific nutrient library, weekly Indian meal plans, and a daily nutrition score checklist.
- **AmyNest Mobile App:** Expo React Native app mirroring web functionalities for iOS and Android.
- **TTS / Read Aloud (ElevenLabs "Amy" voice):** Meal recipe Read Aloud uses ElevenLabs Turbo v2.5 with content-hash (SHA256 of model|voice|text) caching. The api-server exposes `POST /api/tts/synthesize` (authed) returning a JSON envelope `{ audioUrl, cacheKey, cached, ... }`, and a public-by-key `GET /api/tts/audio/:key.mp3` (mounted before requireAuth) that streams the cached MP3 with a fixed `audio/mpeg` content type and `X-Content-Type-Options: nosniff`. Single-flight de-dup on the server prevents concurrent identical synth calls. Cached blobs live in `data/tts-cache/` plus a `tts_cache` Drizzle table. Web (`use-amy-voice`) plays via blob URL + `<audio>`; mobile (`useAmyVoice`) plays via `expo-audio`. Both hooks use AbortController + a request-id token so Stop / voice-switch / unmount cancels in-flight fetches and stale responses are ignored. Replaces previous browser SpeechSynthesis (web) and `expo-speech` (mobile) in the meal recipe modal.
- **Paywall System:** Parent Hub features have a "first-time free" with subsequent access locked behind a paywall. Gated features also use a "one-free-use-then-locked" global paywall enforced by middleware.
- **Referral System:** Users receive unique referral codes to invite friends, earning bonus premium time.

## External Dependencies

- **PostgreSQL:** Primary database.
- **Clerk:** Authentication service.
- **OpenAI:** AI-powered features.
- **RevenueCat:** Subscription management for iOS.
- **Razorpay:** Payment gateway for web and Android in India.
- **ElevenLabs:** Text-to-speech for the "Amy" Read Aloud voice (Turbo v2.5), accessed via the Replit ElevenLabs connector.
- **Google Drive API:** Video streaming for Reels app.
- **Google Fonts:** For `inter` font.
- **Expo:** React Native framework.
- **Zod:** Schema validation.
- **Drizzle ORM:** TypeScript ORM.
- **Orval:** API client code generator.
- **Tailwind CSS:** CSS framework.
- **Shadcn/ui:** UI component library.
- **Zustand:** State management.