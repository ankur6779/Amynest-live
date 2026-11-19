# Platform compatibility

Audit date: 2026-11-19.

Repository: https://github.com/harsha20599/romp

Commit: `cb2d97ff020c3fc150d535c6c4b807884fe83907`

This note records what that tree requires, and what a separate commercial browser product should target. It is a static reading of the README, manifest, Vite config, and source. This audit did not install the app or run it on a laptop, tablet, or TV.

Licence context: commercial reuse of this repository is blocked without written approval (`docs/licences/romp-audit.md`). The target column is for a clean-room product (`docs/architecture/proposed-architecture.md`).

## What ROMP documents and implements

| Topic | Evidence in the tree |
| --- | --- |
| Intended client | README: Chrome on an Android tablet. Optional USB-C to HDMI. Landscape. "Add to Home screen" after a Vercel or other HTTPS deploy. |
| Laptop | The same static site. No laptop-only code. A webcam satisfies `facingMode: 'user'`. README development URL is `http://localhost:5180`. `?sim` plays without a camera. |
| TV | README: enable Game mode and turn motion smoothing off. The code has no display-latency calibration. The README says screen-delay calibration is not part of this demo. |
| Secure context | README: camera needs HTTPS or `localhost`. A plain HTTP LAN address does not get the camera unless the browser already trusts that origin. |
| Camera | `getUserMedia` in `src/pose.ts`: user-facing, ideal width 1280, height 720, ideal frame rate 30. No device enumeration UI was found. No exposure API. |
| Pose | MediaPipe Pose Landmarker from `/models/pose_landmarker_lite.task` or `pose_landmarker_full.task`, wasm from `/wasm`. GPU delegate, then CPU. Worker path needs `OffscreenCanvas` and `createImageBitmap`. Otherwise detection runs on the main thread. |
| Hands | `HandLandmarker` in the worker, `numHands: 1`, model `/models/hand_landmarker.task`, used for fist and open-palm. |
| Second player | A second worker can track the other half of the frame with the lite model, CPU forced. README: solo, together, or take turns. |
| Renderer | PlayCanvas `WebglGraphicsDevice` on one persistent canvas. Build target `es2022`. |
| Audio | Web Audio API. Samples are fetched as OGG. Music is synthesized. `AudioContext` starts when `audio()` is first called. |
| Storage | `localStorage` keys `romp.v1`, `romp.model`, `romp.frames`, `romp.look`, `romp.press`, `romp.fx`. |
| Install | `public/manifest.json`: `display: fullscreen`, `orientation: landscape`, name "Romp Demo". No service worker, so there is no offline asset cache in the repo. |
| Node for development | README: Node.js 22 or newer. `npm run dev`, `check`, `build`, `play`. |
| Native apps | None. `tools/tablet-diag.sh` is an optional `adb` script. It greps Qualcomm `kgsl` nodes and One UI properties. It is not shipped to players. |
| Servers | Runtime game does not call an API. `serve.mjs` is a local test server on port 5191 with `POST /report`. README play uses Vite preview on port 4173. |
| External services at runtime | None required. Hosting may be Vercel, Netlify, Cloudflare Pages, or GitHub Pages at a domain root, per the README. |

## Browser features the ROMP client assumes

Required for a real camera game:

- Secure context.
- `navigator.mediaDevices.getUserMedia`.
- WebGL, via PlayCanvas.
- WebAssembly, for MediaPipe.
- ES2022 JavaScript, the Vite build target.
- `fetch` of `.task`, `.wasm`, `.glb`, and `.ogg`.
- `localStorage` for profiles. The code catches private-mode failures for settings and continues.
- A user gesture before reliable audio playback. Browsers gate `AudioContext`.

Preferred, with a fallback in `src/pose.ts`:

- `Worker`.
- `OffscreenCanvas`.
- `createImageBitmap`.

The worker file is loaded as a classic worker because comments say MediaPipe's loader uses `importScripts()`. Module workers are not the path this tree uses.

Not present:

- WebGPU device for the game. PlayCanvas is constructed with WebGL.
- Service worker.
- WebXR.
- Native camera2, ARCore, or ML Kit.

## Android tablet

ROMP's README makes this the primary device. From the code, a compatible tablet browser needs:

- Chrome, or another browser with `getUserMedia`, WebGL, and wasm. The README names Chrome. This audit did not compare Samsung Internet, Firefox, or an in-app WebView.
- Permission prompt for the camera. The front camera is what `facingMode: 'user'` selects.
- Landscape, matching the manifest. A portrait tablet will letterbox or crop unless the page is rotated.
- Enough GPU memory for PlayCanvas and a second GL context when the pose delegate is GPU. The CSS comment in `src/ui.css` says blur filters were avoided because the GPU is busy with the pose model. That is a design comment, not a benchmark.
- Heat and battery headroom. `tools/tablet-diag.sh` exists because the author was inspecting thermal state, clocks, and camera FPS ranges over `adb`. No results from that script are stored in the repo.

HDMI from the tablet shows the page on a TV and leaves the camera on the tablet. The TV's motion smoothing adds delay. The demo does not measure it.

Add to Home Screen uses the manifest only. Closing the browser can drop a non-installed tab. There is still no offline package.

A Play Store WebView is not part of ROMP. Camera access inside an Android WebView is a separate product decision and is not cleared by this tree.

## Laptop

The stack is the same web page.

- Chrome and Edge on current desktop releases are the closest match to the README's Chrome target. Safari and Firefox were not mentioned and were not tested here. Safari's `OffscreenCanvas` and camera gesture rules should be tested before anyone claims laptop support beyond Chromium.
- A built-in or USB webcam must see the whole body. A laptop lid camera is often too high and too close. The README's "stand back until your whole body is visible" applies.
- HDMI to a TV is a display path only. Game mode and motion smoothing are TV settings, not browser settings. Delay remains uncalibrated in ROMP.
- `?sim` plus mouse and keyboard is a development control, not the product.
- `npm run dev` binds `127.0.0.1`, so another device cannot open the dev server. `npm run play` uses `--host`, which is the LAN preview. Camera on that preview still needs HTTPS.

## TV

The TV is a monitor in both setups. It does not run the page unless it has its own browser, which this repository does not target. Requirements implied by the README:

- Low-latency game mode.
- Motion interpolation off.
- Landscape 16:9. The PlayCanvas stage constants use a 16×9 world.
- The camera stays on the laptop or tablet, pointed at the players, not at the TV.

Two people need to fit in one frame. The code assigns poses to slots by horizontal position. Lighting has to be good enough for landmark visibility. None of that is a TV feature.

## Deployment compatibility

| Method | Fits ROMP? | Note |
| --- | --- | --- |
| Static HTTPS host | Yes | README lists Vercel, Netlify, Cloudflare Pages, GitHub Pages at a domain root. |
| `localhost` dev server | Yes | Port 5180. Camera works as a secure context. |
| Vite preview `--host` port 4173 | Yes for LAN, camera only if the origin is secure. | |
| `serve.mjs` port 5191 | Local test build only. Binds `127.0.0.1`. | |
| Native store build | Not in the repo. | |

Wasm must be served as `application/wasm`. `serve.mjs` sets that type. Vite does as well. A misconfigured static host breaks MediaPipe even when the JS loads.

Large files in the tree: pose full model about 9.4 MB, hand model about 7.8 MB, vendored wasm about 11.8 MB, plus 93 GLBs and 177 OGG files. First load on a tablet network is heavy. A commercial build should hash and cache them, and should not download unused games.

## Gaps that matter for laptop and tablet commercial play

These are properties of the ROMP demo, and they are reasons for a new design rather than a port:

- No screen-delay calibration, while TV game mode is only advice in the README.
- No camera exposure or white-balance control.
- No device picker.
- Pose-full model in the repo matches Google's `float16/latest` URL, not the versioned `float16/1` file. A product should pin a hash.
- Vendored wasm does not match `@mediapipe/tasks-vision@0.10.35`.
- Second-player tracking is a second model on CPU. Frame rate on a tablet is unknown to this audit.
- Manifest orientation is landscape only.
- Profiles disappear if the user clears site data. There is no export.

## Target matrix for the new product

| Surface | Target | First check |
| --- | --- | --- |
| Laptop, Chrome or Edge, webcam, page on the laptop display | Supported goal | Camera permission, full body in frame, one game at 30 fps class, pause, profile saved and reloaded. |
| Laptop HDMI to a TV | Supported goal | Same page in fullscreen. Calibration stores a delay offset. TV motion smoothing documented as off. |
| Android tablet, Chrome, page on the tablet | Supported goal | Front camera, landscape, GPU delegate with a working CPU fallback, audio after a tap. |
| Android tablet USB-C to HDMI TV | Supported goal | Camera stays on the tablet. Delay offset is separate from the laptop's. |
| iPad and Safari | Out of scope until measured | Do not claim it from the ROMP README. |
| Android WebView or Play Store shell | Out of scope for the first milestone | `getUserMedia` in a WebView needs its own test. |
| Offline install | Optional later | Service worker is new work, not a ROMP feature to copy. |

## Unresolved questions

- Which Android versions and which tablet GPU the commercial product will promise. ROMP does not publish a device list. The diagnostic script mentions One UI and `kgsl`, which only shows what the author probed, not a support matrix.
- Whether desktop Safari is in scope. The ROMP tree does not answer that.
- Whether a TV browser (a webOS or Android TV client) is ever required. The repository is built for a computer or tablet that drives the TV.
