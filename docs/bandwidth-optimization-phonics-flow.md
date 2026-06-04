# Phonics prefetch — before / after

## Before

```mermaid
sequenceDiagram
  participant Main as main.tsx
  participant Warm as initGlobalAudioWarmup
  participant Phonics as prefetchEntirePhonicsLibrary
  participant GCS as /api/phonics-library

  Main->>Warm: on app boot (line 89)
  Warm->>Phonics: warmPhonicsLibraryFull()
  Phonics->>GCS: ~151 MP3s (~2 MB) every session
  Note over Main,GCS: Also triggered from Parent Hub learning-tab prewarm
```

## After

```mermaid
sequenceDiagram
  participant Main as main.tsx
  participant Warm as initGlobalAudioWarmup
  participant Route as /phonics page
  participant Open as warmPhonicsRouteOnOpen
  participant Phonics as prefetchEntirePhonicsLibrary
  participant GCS as /api/phonics-library

  Main->>Warm: boot — spelling + speech coach only
  Route->>Open: useEffect on mount
  Open->>Phonics: warmPhonicsLibraryOnRouteOpen()
  Phonics->>GCS: ~2 MB only when user opens Phonics
```

**Code:** `warmPhonicsLibraryOnRouteOpen()` in `global-audio-warmup.ts`; called from `warmPhonicsRouteOnOpen()` in `app-audio-prefetch.ts` when `phonics.tsx` mounts.
