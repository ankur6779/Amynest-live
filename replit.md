# AmyNest

## Overview

AmyNest is an AI-powered daily routine planner designed for parents. It enables them to create child profiles, generate AI-structured daily schedules, track behavior, and view a comprehensive summary dashboard. The project aims to simplify daily parenting tasks, offering personalized guidance and tools to manage children's routines, nutrition, and development, ultimately enhancing family well-being.

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

The system is built as a monorepo using pnpm workspaces, Node.js 24, and TypeScript 5.9. The frontend is developed with React, Vite, Tailwind CSS, and shadcn/ui. The API backend is powered by Express 5, using PostgreSQL with Drizzle ORM for database management. Authentication is handled by Clerk, with `@clerk/react` for the frontend and `@clerk/express` for the backend, proxied at `/api/__clerk`. Zod is used for validation, and Orval generates API codegen from an OpenAPI spec. The build process uses esbuild for CJS bundles.

### AI / OpenAI Configuration
All AI features (Amy Chat, Smart Routine, Recipe, AI Coach) route through `lib/integrations-openai-ai-server/src/client.ts`. The client prefers user-provided `OPENAI_API_KEY` (direct OpenAI); falls back to the Replit AI Integration (`AI_INTEGRATIONS_OPENAI_API_KEY` + `AI_INTEGRATIONS_OPENAI_BASE_URL`) if the user key is absent. Active model across all endpoints: **`gpt-4o-mini`** — cheap (~₹0.005 / chat hit), non-reasoning (so `max_completion_tokens` maps directly to reply length), consistent ChatGPT-like tone. Note: gpt-5.x "mini" variants are reasoning models and consume most tokens internally before producing visible output, so they require much higher `max_completion_tokens` and are not used here. All calls use `max_completion_tokens` (not `max_tokens`) for forward-compatibility.

**UI/UX Decisions:**
- **Amy AI Brand:** Features a cute SVG character (AmyIcon), a floating assistant button (AmyFab), and Amy avatars/copy throughout.
- **Mobile-friendly:** Responsive layouts with bottom navigation on mobile and full sidebar on desktop.
- **Amy Coach:** Implements a 4-phase coaching flow with goal grids, a 5-question flow, loading screens, and a horizontal swipeable "Win-card" pager with haptics.
- **Infant & Toddler Hub:** Features 5 glass tabs with an active glow, contextual AI insights, and tip cards.
- **Design System:** Indigo/purple theme with specific hex codes for primary, accent, and background colors, and Inter fonts.

**Technical Implementations:**
- **Auth:** Clerk login with email and Google OAuth, protected routes for signed-in users.
- **Children/Parent Profiles:** Add/edit/delete profiles with smart school logic, conditional fields, wake/sleep times, goals, and babysitter assignments. Parent profiles include role, work type, hours, availability, food preferences, and allergies.
- **Parenting Hub:** A 7-section collapsible layout including AI prompts, research articles, daily tips, emotional support, activities, Smart Olympiad Zone (MCQs, practice, progress, adaptive difficulty), and Life Skills Mode (daily tasks across categories, tri-lingual support).
- **Routine Generator:** A fully rule-based, zero-cost engine (`routine-templates.ts`) providing age-appropriate templates, handling school/no-school, mood, parent availability, and food type.
- **Smart Nutrition & Regional Meal Localization:** Offers 5 veg + 5 non-veg options per meal type with seeded rotation and regional cuisine tailoring (North Indian, South Indian, Bengali, Gujarati, Maharashtrian, Punjabi, Global, Pan-Indian default).
- **Recipe Viewer:** Static recipe database with keyword matching. Parents can also save their own custom recipes (stored in the `custom_recipes` PostgreSQL table via `lib/db/src/schema/custom_recipes.ts`). Full CRUD at `GET/POST/PUT/DELETE /api/recipes` (authenticated, 50-recipe cap). Custom recipes are fetched during routine generation and override the static recipe if the meal name matches (case-insensitive substring). Web UI at `/recipes` (kidschedule); mobile screen at `app/recipes.tsx` (amynest-mobile), linked from the profile tab.
- **Routine Detail:** Task status tracking (Complete/Delay/Skip) with auto-shift, progress bar, browser notifications, inline editing, "Regenerate Remaining Day," and "Add Activity" dialog.
- **Next-Day Auto-Generation:** Triggers a dialog to auto-generate tomorrow's routine upon task completion, with weekend detection.
- **Partial Regeneration:** `POST /api/routines/:id/partial-regenerate` endpoint to regenerate pending tasks, supporting new activity injection.
- **Share Routine:** Functionality to copy routines as formatted messages or share via WhatsApp.
- **Behavior Tracker:** Logs positive/negative/neutral behaviors per child per day.
- **Amy Coach - Infant Parent Problems:** A static, research-based topic group for 0-2 yrs, bypassing AI for direct guidance on common infant issues.
- **Infant & Toddler Hub (0-24 months):** Premium hub with research-based content across 5 categories (Sleep, Feeding, Development, Behavior, Daily Care), contextual AI suggestions, and tips.
- **Family Routine System:** Multi-child generation with handler-specific routine simplification (Mom/Dad/Grandparent/Babysitter), Amy AI suggestions for sibling synchronization, family points, and shared family activities.
- **AI Parenting Assistant:** Full chat interface with suggested questions for parenting advice.
- **Weekly Calendar View:** Routines page with a Mon-Sun week grid, navigation, and color-coded day indicators.
- **Progress & Insights Dashboard:** Streaks, completion charts, 7-day bars, and per-child breakdowns.
- **Smart Insights:** Rule-based parenting insights from completion data, cached weekly.
- **Age-Based Intelligence:** Child profiles include `ageMonths`, age group classification (Infant/Toddler/Preschool/School Age/Pre-Teen).
- **Infant Mode:** Replaces routine form with care guidance, lullaby player, and parent tasks checklist for infants.
- **Skill Focus & Story Sections:** Age-appropriate skill activities and moral stories with TTS.
- **Hybrid AI Architecture:** Freemium model with rule-based features always free and AI features (`POST /ai/assistant-ai`, `POST /routines/generate-ai`) being opt-in and rate-limited.
- **Freemium Subscription:** Implements free, monthly, six-month, and yearly plans with a 3-day trial and caps enforced server-side.
- **Razorpay Integration:** Second payment provider for India (web + Android) for Razorpay Subscriptions. Handles webhook verification, subscription lifecycle mapping, and requires specific environment variables for configuration.
- **Reels App:** Standalone YouTube Shorts/Instagram Reels-style vertical video player streaming from Google Drive, with paginated randomized video lists and video streaming.
- **Smart Tiffin & Meal Suggestions:** Local-only (zero external API) meal recommender. Backend dataset of regional Indian + global meals (`api-server/src/lib/meal-suggestions.ts`) with rule-based ranking by region match (+40), fridge-ingredient overlap (×50), quick/healthy bonuses, age gating, optional veg filter, and a local-template Amy AI message. Endpoint: `GET /api/meals/suggest?region&audience&fridge&childAge&isVeg` (auth-gated, input-validated). Web: Netflix-style horizontal cards + recipe modal with browser SpeechSynthesis "Read Aloud" + Female/Male Indian voice toggle (`kidschedule/src/components/smart-meal-suggestions.tsx`, mounted on dashboard below NowNextTimeline). Mobile: same, using `expo-speech` + AsyncStorage for fridge/voice persistence (`amynest-mobile/components/SmartMealSuggestions.tsx`, mounted on home tab).
- **Nutrition Hub:** Comprehensive science-backed nutrition module available on both web (`/nutrition`) and mobile (`/nutrition`). Features: 9 age groups (0–6 months through postpartum), nutrient library (Protein, Iron, Calcium, Vitamins A/B/B12/C/D/K) with benefits/sources/deficiency/daily needs based on ICMR-NIN 2020 RDA & WHO guidelines, weekly Indian meal plans (veg + non-veg, 4 age categories), Family Mode (same meal → age-appropriate portions table), Daily Nutrition Score checklist with AI tip, medical disclaimer with WHO/ICMR references, Hindi/Hinglish labels throughout, and link to progress tracking. Static data in `artifacts/kidschedule/src/lib/nutrition-data.ts` (mirrored to `artifacts/amynest-mobile/lib/nutrition-data.ts`). Web nav item: "Nutrition Hub" (Salad icon) in sidebar. Mobile: accessible via "Nutrition Hub" card on Hub tab.
- **AmyNest Mobile App:** Expo React Native app mirroring the web product for iOS and Android, including full authentication, onboarding, dashboards, child management, routines, coaching, and profile management.
- **Smart Usage-Based Paywall:** Tracks per-user, per-section feature usage and surfaces a paywall after the first sample. Implemented with `useSectionUsage` + `LockedBlock` on web (Parenting Hub: Activities/Olympiad/Life Skills) and mobile (Activities/Life Skills); paywall reason `section_locked` shared across platforms.
- **Global Paywall (one-free-use-then-locked):** Free tier gets exactly ONE lifetime use of each gated feature — Amy AI chat, routine generation (rule-based + AI), behavior log. Backend enforces via generic `featureGate(feature)` middleware (`api-server/src/middlewares/featureGate.ts`) reusing the `usage_daily` table with `day="lifetime"`. Per-feature limits in `FREE_FEATURE_LIMITS` (`subscriptionService.ts`). On exceed, returns 402 `{ error: "feature_locked", feature, limit, used }`. Frontend (web + mobile) detects 402 and opens the paywall (web: `amynest:open-paywall` event → `PaywallModal`; mobile: `router.push("/paywall")`). New paywall reason: `behavior_locked`. Counters are clamped at 0 (`GREATEST(0, ...)`) to prevent double-refund races between the middleware's res.end interceptor and route-level manual refunds (e.g. ai-coach stream disconnect).
- **Referral System:** Each user gets a unique referral code (auto-generated on first dashboard visit). Friends sign up with `?ref=CODE` (captured in localStorage on web, AsyncStorage + deep-link on mobile, submitted post-signin). Referrals progress `pending → valid → paid` (valid on first child creation, paid on subscription activation). Reward = 30 days bonus premium per milestone (3 valid + 1 paid), capped at 3 rewards / 90 days lifetime. Bonus time tracked separately on `subscriptions.bonusExpiresAt` so paid renewals never shrink it; `isPremiumNow` honors both. Routes: `GET /api/referrals/me`, `POST /api/referrals/attribute`. UI: web `/referrals` + nav link + "or invite friends" CTA in paywall modal; mobile `/referrals` route + profile-screen CTA.

## External Dependencies

- **PostgreSQL:** Primary database.
- **Clerk:** Authentication service (`@clerk/react`, `@clerk/express`, `@clerk/clerk-expo`).
- **OpenAI:** For AI-powered parenting assistant (`gpt-5.2`) and routine generation.
- **RevenueCat:** Subscription management for iOS.
- **Razorpay:** Payment gateway for web and Android in India.
- **Google Drive API:** For streaming videos in the Reels app.
- **Google Fonts:** For `inter` font in the mobile app.
- **Expo:** React Native framework for mobile app development.
- **Zod:** Schema validation library.
- **Drizzle ORM:** TypeScript ORM for PostgreSQL.
- **Orval:** API client code generator.
- **Tailwind CSS:** Utility-first CSS framework.
- **Shadcn/ui:** UI component library.
- **Zustand:** State management for mobile app (`useSubscriptionStore`).