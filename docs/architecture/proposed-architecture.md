# Proposed commercial architecture

Audit date: 2026-11-19.

Source reviewed: https://github.com/harsha20599/romp at `cb2d97ff020c3fc150d535c6c4b807884fe83907`.

This proposal is for a separately branded motion-controlled browser product. It does not copy ROMP. The Jiggle Personal Use License blocks commercial use of that repository without written approval. See `docs/licences/romp-audit.md`.

Phase 1 should be a clean-room build. Shared knowledge is limited to public platform facts: browsers can capture a camera, MediaPipe can emit pose landmarks, and a WebGL engine can render a game. Thresholds, scene code, UI, names, icons, and the two ROMP games stay out of the new tree.

## Products to support

1. Laptop browser, with the page shown on the laptop display or on a TV attached by HDMI.
2. Android tablet browser, with the page shown on the tablet or on a TV attached by USB-C to HDMI.

Both are the same static web app. No native Android shell is required for the first playable version. A Play Store WebView can be considered later, and only after camera permission, secure origin, and WebGL behaviour are proven in that WebView. ROMP itself ships no native project.

## Recommended shape

A static HTTPS site. Vite, or any other MIT or Apache-2.0 bundler, builds an ES2022 bundle. The host is interchangeable: any static host that serves `application/wasm` correctly. There is no account server in the first version. Camera frames, landmarks, and profiles stay on the device.

```text
browser
  camera manager          getUserMedia, device choice, teardown
  pose tracker            MediaPipe Tasks from npm, worker when possible
  gesture recognizer      our own rules over landmarks
  game controller         gestures to abstract actions
  game modules            original games, loaded on demand
  renderer                PlayCanvas or another MIT/Apache engine, our scene code
  profiles and storage    our own local schema
  calibration             our own distance, latency, and input check
  audio                   our own synth or audio we have a licence for
```

React is a reasonable MIT choice for menus. The 3D canvas should stay outside React renders, so a tracking frame does not reconcile the whole menu tree. That split is a common engine pattern. The new engine module must be written for this product, not taken from ROMP `src/engine.ts`.

## Modules to implement independently

### Camera manager

- Call `getUserMedia` only from a secure context. Show a real error when the page is HTTP on a LAN address.
- Request a user-facing camera. On a laptop, offer a device list when `enumerateDevices` returns more than one camera. On a tablet, default to the front camera and allow the rear camera only if the play space is set up that way.
- Ask for a modest resolution first (1280×720 at 30 fps is a reasonable starting constraint, chosen for this product, not copied as a tuned ROMP preset). Fall back if the device rejects it.
- Stop tracks on route change and when the tab is hidden.
- Never upload frames. Do not add a diagnostic `POST /report` that stores imagery.

### Pose tracking

- Depend on `@mediapipe/tasks-vision` from npm. Use that package's wasm. Add the Apache-2.0 licence and an upstream NOTICE to the product's third-party notices.
- Download pose and hand `.task` files from Google's versioned MediaPipe model URLs. Record SHA-256. Do not point the shipped site at a `latest` alias. The ROMP tree's full pose model matched `float16/latest` and did not match `float16/1`.
- Run the landmarker in `VIDEO` mode. Prefer a worker plus `OffscreenCanvas` when the browser has them. Keep a main-thread fallback for browsers that do not.
- Try the GPU delegate, then CPU. Treat a second WebGL context beside the renderer as a measured risk on Android GPUs, not as something to assume.
- One player uses one landmarker. A second player should be a separate experiment with its own frame budget. ROMP's two-worker split is their design. Measure before copying that structure, and do not copy the worker source.
- Smooth landmarks with a filter we tune on our own recordings. A published One-Euro filter is acceptable as an algorithm. ROMP's coefficients are not a specification for this product.

### Gesture recognition

Own classifiers, fed only by landmark positions and visibility:

- Pointer: a chosen hand in a body-relative frame, for menus.
- Confirm: a defined pose or a short dwell, chosen in calibration.
- Navigate: lean or step, expressed as a value from -1 to 1.
- Vertical: jump and duck from torso height against a baseline taken during calibration.
- Swipe: hand speed and direction for games that need a cut or a throw.

Publish the gestures as named actions. Games should not read raw landmark indexes except inside the recognizer.

### Game controller

A small adapter from actions to the active game: pointer position, confirm, steer, jump, duck, swipe. Keyboard, mouse, and touch remain available so the game can be developed without a camera and so a player can pause. Pause on pointer or Escape. Do not reuse ROMP's `?sim` key map as a compatibility contract.

### Game engine

Use PlayCanvas under MIT, or another engine with a commercial-compatible licence, as a direct dependency. Write scene, lighting, asset loading, and resize code for this product.

Keep one canvas for the game. Resize with the layout viewport, including tablet browser chrome and TV overscan. Cap device pixel ratio on mid-range Android GPUs.

Load each game with a dynamic import so the menu does not download every mode.

### Games

Design new games. Do not port Run or Slice, their spawn scripts, scores, modes, or copy. A lane runner or a slicing game is a genre question for counsel and for other companies' trade dress, even when no ROMP file is copied. Prefer at least one game whose fantasy and rules are obviously this product's own.

### Player profiles

Local profiles only at first: display name, calibration blob, per-game bests. Schema version under our own key prefix. Do not read or write `romp.v1` or `romp.*`.

No account, no camera upload, and no third-party analytics in the first version. If analytics are added later, they must be disclosed and must not include frames or raw landmarks.

### Local storage

`localStorage` or IndexedDB for profiles and settings. Quota failures and private-mode exceptions need a visible fallback, not a thrown menu. Export and delete-all are part of the profile screen so a shared tablet can be wiped.

### Calibration

ROMP's README says the demo has no automatic exposure control and no screen-delay calibration. Those gaps are product requirements for TV play, and they are ours to design:

- Framing: the player stands until head and both feet are visible, with a distance hint.
- Stillness sample: record noise while the player holds still, and use it to set the smoothing floor.
- Action check: one jump and one swipe, accepted or rejected with a retry.
- Display delay: a simple flash-to-action test when the page is on a TV. Store the offset on this device. Laptop and tablet each keep their own value.
- Lighting hint: if landmark visibility stays low, ask for more light. Do not try to own camera exposure unless a browser API actually exists on that device.

### Audio

Original music, or tracks with a written commercial licence. Kenney CC0 packs may be downloaded from Kenney if sound design wants them. Do not copy `public/assets/sfx`, `voice`, or `jingles` from the ROMP tree. Do not copy the procedural theme tables.

Unlock `AudioContext` on the first gesture. Compress the mix so a TV does not clip. Duck music under voice only if the voice licence allows that recording.

### UI and brand

New name, mark, type, and color. Fredoka may be used from the OFL distribution with `OFL.txt` in the repo. It is not required. The ROMP stick-figure icons and the word ROMP in the menu cannot be used.

Manifest: `display: standalone` or `fullscreen`, landscape for play, portrait allowed for a short menu if design wants it. Add a service worker only when offline caching is an explicit feature, with a cache version. ROMP has a manifest and no service worker.

## Deployment

- The shipped site is static files on HTTPS. Camera APIs fail on a plain LAN IP unless the browser treats that origin as secure.
- Development: localhost with a camera, plus a mouse path for desks without one.
- Cache hashed JS and CSS for a long time. Cache wasm and `.task` files with a hash in the filename so a model update cannot stick in a tablet cache.
- Source maps can stay on for internal builds. Do not ship them on a public commercial origin if they would publish more than the minified app.
- No runtime dependency on Vercel, Instagram, Sketchfab, Poly Pizza, or Poly Haven.

## What not to take from the ROMP tree

- `src/`, `tools/`, `serve.mjs`, `public/icons`, `public/wasm`, `public/assets`, `public/fonts`, `public/manifest.json`.
- Names, badge copy, and the two-game catalog.
- The test server's `POST /report` body format.
- `tools/models.mjs`. If we need CC0 models, download them with a tool we write, and store publisher, URL, licence, and hash next to the file.

## Suggested first milestone

One original game, one player, laptop Chrome and Android Chrome. Calibration, pause, and a local profile. HDMI to a TV checked on one laptop and one tablet, with the delay offset stored. Second player only after the single-player frame budget is known.

## Open points before implementation

- Counsel confirms the clean-room boundary in `docs/licences/romp-audit.md`.
- Engine choice recorded: PlayCanvas MIT, or an alternative with its licence attached.
- Game concepts cleared against third-party trade dress, separate from the ROMP licence.
- Third-party notice file created before the first build that vendors wasm or a font.
