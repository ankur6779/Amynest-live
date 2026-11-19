# ROMP licence, source, and dependency audit

Audit date: 2026-11-19.

Repository inspected: https://github.com/harsha20599/romp

Pinned commit: `cb2d97ff020c3fc150d535c6c4b807884fe83907`

Commit: 2026-11-11T11:51:21Z, author Harsha `<harsha20599@gmail.com>`, message `Romp Demo`. That commit has no parent. The clone has no tags and the GitHub releases API returned an empty list. Default branch: `master`.

GitHub licence API: `key: other`, SPDX `NOASSERTION`, path `LICENSE` (blob `a66575c1ba29ce09c538d4f5a6737d7acd1e8c76`).

This document is an engineering compliance review of that public tree. It is not a legal opinion, a licence grant, or permission to copy, fork, redistribute, rebrand, or sell anything from the repository. No ROMP source, asset, or model was copied into application code. The original repository was not modified.

Related records: `docs/licences/dependency-inventory.md`, `docs/architecture/proposed-architecture.md`, `docs/architecture/platform-compatibility.md`.

## Verdict

**BLOCKED** for commercial reuse of the ROMP project.

The declared licence is the custom "Jiggle Personal Use License, version 1.0". It allows personal and non-commercial public sharing. It requires prior written approval for commercial use, and it grants no rights in the names Romp, Wiggle, or Jiggle. A paid browser product, a paid download, and a rebranded commercial build are inside the licence's own examples of commercial use.

Independently published libraries and asset packs (MIT, Apache-2.0, CC0, OFL) can be obtained from their own publishers under those licences. That is not a right to copy them out of this repository, and it is not a right to copy ROMP's integration, games, UI, or music engine.

## 1. Repository inspection

Clone used for the audit: `git clone --depth 1` of `master`, then `git rev-parse HEAD` confirmed `cb2d97ff020c3fc150d535c6c4b807884fe83907`. Working tree about 61 MB, 313 files excluding `.git`.

### README.md

https://github.com/harsha20599/romp/blob/cb2d97ff020c3fc150d535c6c4b807884fe83907/README.md

The README describes a static "basic demo edition" with two camera-controlled games, Run and Slice. It says development of "the full commercial Romp product is separate from this repository." Play instructions target Chrome on an Android tablet, optionally USB-C to HDMI, on HTTPS or `localhost`. Build instructions require Node.js 22+. Scripts: `npm run dev` (port 5180, `?sim` for mouse and keyboard), `npm run check`, `npm run build`, `npm run play` (Vite preview, port 4173). A Vercel deploy button points at this repository. The README points asset terms at `CREDITS.md` and `public/assets/CREDITS.md`, and points the project terms at `LICENSE`.

### LICENSE

https://github.com/harsha20599/romp/blob/cb2d97ff020c3fc150d535c6c4b807884fe83907/LICENSE

Title: "Jiggle Personal Use License, version 1.0". Copyright holder stated in the file: "Copyright (c) 2026 Harsha (@yem.cube on Instagram). All rights not granted below are reserved." There is no `COPYING` file and no `NOTICE` file.

### package.json and lockfile

`package.json` is `"private": true`, `"license": "SEE LICENSE IN LICENSE"`, version `0.1.0`. Direct dependencies declared there: `@mediapipe/tasks-vision` `^0.10.35`, `playcanvas` `^2.22.2`, `react` `~19.2`, `react-dom` `~19.2`. Dev: `@types/node` `^26.6.2`, `@types/react` `^19.3.0`, `@types/react-dom` `^19.3.0`, `typescript` `^7.0.2`, `vite` `^8.3.0`.

`package-lock.json` is lockfileVersion 3, 74 package entries. The lockfile root also lists `@dimforge/rapier3d-compat` `^0.20.0`. That dependency is absent from `package.json` and is not imported under `src/`. Full table: `docs/licences/dependency-inventory.md`.

No `pnpm-lock.yaml`, `yarn.lock`, or `bun.lock` is present.

### Source directories

| Path | Role | Lines |
| --- | --- | --- |
| `src/main.tsx` | React shell, catalog, profiles, results, tracking settings | 569 |
| `src/games/run.ts` | Three-lane body runner | 231 |
| `src/games/slice.ts` | Fruit-slice game, Arcade / Classic / Zen | 301 |
| `src/pose.ts` | Camera, pose state, smoothing, worker startup | 538 |
| `src/pose.worker.ts` | MediaPipe Pose and Hand landmarker worker | 191 |
| `src/engine.ts` | Persistent PlayCanvas application and scene helpers | 752 |
| `src/kit.ts` | Round clock, hands, hit tests, shared game types | 244 |
| `src/stage.tsx` | React shell that mounts a game module | 77 |
| `src/meta.ts` | Stars, stages, XP, badges, daily challenges | 88 |
| `src/stats.ts` | `localStorage` profiles and sessions | 32 |
| `src/audio.ts` | Sample playback and procedural music | 152 |
| `src/pace.ts` | Frame-time stats and effect toggle | 15 |
| `src/cut.ts` | Cut-out sprite constants | 3 |
| `src/check.ts` | Node assertions for input, progression, and demo checks | 150 |
| `src/ui.css` | Menu and HUD styles, Fredoka |  |
| `tools/models.mjs` | Dev-only downloader for Kenney, Poly Pizza, Poly Haven, Sketchfab | 117 |
| `tools/tablet-diag.sh` | Dev-only `adb` thermal and camera dump | 16 |
| `serve.mjs` | Dev static server plus `POST /report` | 49 |

### Public assets

| Location | Count | What |
| --- | --- | --- |
| `public/assets/food/` | 9 GLB + `Textures/colormap.png` | Fruit models. Generator `UnityGLTF`. |
| `public/assets/kit/` | 17 GLB + colormap | Platform props. Generator `UnityGLTF`. |
| `public/assets/city/` | 17 GLB + colormap | Buildings. Generator `UnityGLTF`. |
| `public/assets/camp/` | 28 GLB + colormap | Camp and survival props. Generator `UnityGLTF`. One animated file: `chest.glb`. |
| `public/assets/nature/` | 21 GLB, textures embedded | Trees, plants, rocks. Generator `UniGLTF-1.27`, not `UnityGLTF`. |
| `public/assets/robot.glb` | 1 | 463,988 bytes. Generator `FBX2glTF`. Animations include Dance, Death, Idle, Jump, No, Punch. |
| `public/assets/sfx/` | 147 OGG | Impacts, UI, digital one-shots |
| `public/assets/voice/` | 18 OGG | Short announcer lines |
| `public/assets/jingles/` | 12 OGG | `jingles_HIT*` and `jingles_STEEL*` |
| `public/assets/audio.json` | 1 | Maps sound families to those OGG paths |
| `public/fonts/fredoka.woff2` | 1 | 29,732 bytes |
| `public/models/*.task` | 3 | MediaPipe pose lite, pose full, hand landmarker |
| `public/wasm/` | 3 | `vision_bundle.mjs`, `vision_wasm_internal.js`, `vision_wasm_internal.wasm` |
| `public/icon.svg`, `icon-192.png`, `icon-512.png` | 3 | Stick-figure mark on `#09090b` |
| `public/manifest.json` | 1 | Fullscreen landscape web app manifest named "Romp Demo" |

No file under `public/assets/` carries a `copyright` field in its glTF JSON. There is no `public/assets/CREDITS.md` and no `public/assets/models.json`, even though `LICENSE`, `README.md`, and `tools/models.mjs` refer to those records.

### Build and deployment

- `vite.config.ts`: build target `es2022`, sourcemaps on, dev server `127.0.0.1:5180`.
- `tsconfig.json`: strict ES2022, `jsx: react-jsx`, no emit.
- `index.html`: title "Romp Demo — Run and Slice", manifest, icon, `/src/ui.css`, `/src/main.tsx`.
- `npm run play` is Vite preview on `0.0.0.0:4173` (from the README and the script `vite preview --host --port 4173`).
- `serve.mjs` listens on `127.0.0.1:5191`, serves `./dist`, and accepts `POST /report` into a gitignored `reports/` directory. The README's play command does not use this file.
- No `vercel.json`, Netlify config, Dockerfile, GitHub Actions workflow, or service worker.
- `.gitignore` ignores `node_modules`, `dist`, `test-results`, `playwright-report`, logs, and `reports`. No Playwright dependency is locked.

### Third-party integrations in the running app

The browser app loads camera, models, wasm, audio, and fonts from its own origin. No analytics, Firebase, Sentry, or WebSocket client appears in `src/`. `localStorage` keys found: `romp.v1`, `romp.model`, `romp.frames`, `romp.look`, `romp.press`, `romp.fx`.

`tools/models.mjs` is not part of the runtime. It fetches Kenney, Poly Pizza, Poly Haven, and the Sketchfab API when a developer runs it. Sketchfab download is described as requiring an account token and is left as a link only.

The README links a Vercel import button and an Instagram profile for licence contact: https://www.instagram.com/yem.cube

## 2. Licence analysis

Declared licence: Jiggle Personal Use License, version 1.0. It is not an OSI licence. npm's `license` field does not use an SPDX id. GitHub reports `NOASSERTION`.

The licence says it covers "source code, art, music, sounds, game designs and documentation" and every name the project has used, including Romp, Wiggle, and Jiggle, including versions "published with no license (all rights reserved)." This git history cannot prove or disprove those earlier versions: only one commit is in the repository.

Section 5 says third-party parts keep their own licences and names PlayCanvas (MIT), React (MIT), MediaPipe Tasks Vision and its models (Apache-2.0), Rapier (Apache-2.0), Fredoka (SIL OFL 1.1), and models and sounds "listed in `public/assets/CREDITS.md`" as CC0 or CC-BY. That credits file is not in the tree. Root `CREDITS.md` is a different, shorter document and calls every file under `public/assets/` CC0.

### What the text allows

| Question | Reading of the licence text | Evidence |
| --- | --- | --- |
| Commercial use | Not allowed without prior written approval from the copyright holder | Section 3. Approval "covers only what it says." Contact named in the file: Instagram `@yem.cube`. |
| Modification | Allowed for personal and non-commercial use | Sections 1 and 2 |
| Redistribution | Non-commercial public sharing is allowed with credit and with this `LICENSE` kept beside source | Section 2 |
| Hosting as a paid product | Not allowed without written approval. "Charging for access" is listed as commercial use | Section 3 |
| Downloadable ZIP of the software or of a build made from it, offered as a product | Redistribution. If it earns money or gives a business an advantage, it is commercial and needs approval | Sections 2 and 3 |
| Rebranding | The licence grants no rights to the names Romp, Wiggle, Jiggle, the logos, or the yem.cube name, except to give the required credit. "Do not present your version as the official one." | Section 4 |
| Distribution of modified source | Non-commercial: yes, with visible credit and the `LICENSE` file. Commercial: needs written approval | Sections 2 and 3 |
| Personal private run, including on the reader's own server | Allowed | Section 1 |

Commercial use is defined in section 3 as "any use that earns money or gives a business an advantage," including selling the software or anything built from it, charging for access, ads, in-app purchases, offering it in a gym, studio, school, event, or other paid service, client work, and paid or sponsored content that features it.

### Obligations

| Obligation | Applies? |
| --- | --- |
| Copyright notices | Yes. The copyright line is in `LICENSE`. All rights not granted are reserved. |
| Licence text inclusion | Yes for any copy of the source: "Keep this LICENSE file with any copy of the source." |
| Source-code disclosure | No copyleft source-disclosure duty of the GPL kind is written in the licence. |
| Modification notices | No separate "state your changes" clause. Public sharing still requires the credit and the `LICENSE` file. |
| Attribution | Public sharing, changed or unchanged, requires a clearly visible credit to `@yem.cube` on Instagram (https://www.instagram.com/yem.cube), in the app, the post, or the top of a fork README. |
| Patent provisions | None in this licence. It is not a patent grant. Apache-2.0 dependencies have their own patent grants. |
| Copyleft | This is not GPL, AGPL, LGPL, or MPL. Derivative works are not required to be published under the same licence. Commercial derivatives are reserved. |
| Termination | Rights end on breach and return if the breach is cured within 30 days of notice. Section 7. |
| Warranty | Disclaimed. Section 6 also states a physical-injury warning. |
| Trademarks | Names and logos are withheld except for the credit line. |

Third-party notices are separate. MIT and Apache-2.0 dependencies still require their own copyright and licence texts when those programs are redistributed. OFL requires the font copyright and licence when the font is redistributed. CC0 parts, once identified, do not require attribution as a condition, though the project credits them.

### Questions that need legal review

1. Whether a written Instagram direct message or email is an acceptable form of approval for a paid, separately branded product on laptop browsers and Android tablet browsers, including hosted access and a downloadable build. The licence says a direct message or email can count, and that approval covers only what it says.
2. Whether section 1's claim over "art, music, sounds" can restrict unmodified CC0 files. Section 5 says third-party parts keep their own licences. Counsel should decide whether a copy taken from this repo is safer to treat as blocked even when an upstream hash matches.
3. Whether the selection and arrangement of CC0 files in this tree is a compilation covered by the custom licence.
4. Whether "game designs" in the licence reaches genre mechanics (a lane runner, a fruit slicer) or only this project's expression. Phase 1 should not copy `src/games/`.
5. The retroactive sentence about earlier unlicensed versions, and about the names Wiggle and Jiggle. Those versions are not in this git history.
6. Whether a missing `public/assets/CREDITS.md` means the CC-BY branch of section 5 was never populated, or was omitted from the published commit.
7. Trademark clearance for a new product name, and a separate review of similarity to other companies' games. That is outside this repository's licence.
8. No patent licence is offered by the copyright holder. Counsel should decide whether that matters for a commercial motion-control product.
9. This audit does not review contributor agreements. The only commit author is Harsha.

Do not treat a public GitHub repository, a fork count, or the Vercel button as a commercial licence.

## 3. Third-party asset audit

Status labels:

- **UPSTREAM-MATCH**: bytes matched an upstream file on 2026-11-19.
- **CLAIMED**: the project credits a source, and public pages for that source describe CC0, but this audit did not hash the file against the publisher's zip.
- **BLOCKED**: provenance is incomplete, contradictory, or the file is original project art under the custom licence.

### Models and images

| Item | Source found | Licence evidence | Commercial redistribution | Status |
| --- | --- | --- | --- | --- |
| `public/assets/robot.glb` | Byte-identical to `examples/models/gltf/RobotExpressive/RobotExpressive.glb` on `mrdoob/three.js` `dev`, fetched 2026-11-19. SHA-256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`. README there: model by Tomás Laulhé, CC0 1.0; modifications by Don McCurdy (expression morphs, FBX2glTF). | CC0 1.0 | Allowed by CC0. Re-download from three.js rather than from ROMP. Courtesy credit is appropriate and is not a CC0 condition. | UPSTREAM-MATCH |
| `public/assets/food/*.glb` and `food/Textures/colormap.png` (apple, banana, coconut, lemon, orange, pear, pineapple, strawberry, watermelon) | `CREDITS.md` names Kenney Food Kit. https://kenney.nl/assets/food-kit meta description on 2026-11-19: "Download this package (200 assets) for free, CC0 licensed!" Generator `UnityGLTF`. External colormap. | Claimed CC0. Per-file hash not checked. `models.json` absent. | Kenney's page states commercial use is allowed for the pack. Do not copy the files from ROMP until hashes match a Kenney zip, or download the pack from Kenney. | CLAIMED, copy from this repo BLOCKED |
| `public/assets/kit/*.glb` and colormap (barrel, bomb, coins, crates, fence, flag, flowers, heart, mushrooms, platform, rocks, saw, spike block, star, trees) | `CREDITS.md` names Kenney Platformer Kit. https://kenney.nl/assets/platformer-kit description: CC0, 150 assets. Generator `UnityGLTF`. | Same as food. | Same. | CLAIMED, copy from this repo BLOCKED |
| `public/assets/city/*.glb` and colormap | `CREDITS.md` names Kenney City Kit (Commercial). https://kenney.nl/assets/city-kit-commercial description: CC0, 50 assets. The word "Commercial" is the pack name, not a separate paid licence, according to that page. Generator `UnityGLTF`. | Same. | Same. | CLAIMED, copy from this repo BLOCKED |
| `public/assets/camp/*.glb` and colormap (28 models, including tent, tools, chest, trees) | Not named in `CREDITS.md`. Filenames and `UnityGLTF` match the style of Kenney Survival Kit. https://kenney.nl/assets/survival-kit description: CC0, 80 assets. Used by `src/engine.ts` (`/assets/camp/tree-tall.glb` and the nature set in the clearing helper). | Not recorded per file. | Do not copy from this repo. A fresh Kenney Survival Kit download is CC0 if counsel accepts the publisher's statement. | BLOCKED as stored here |
| `public/assets/nature/*.glb` (21 models) | Not named in `CREDITS.md`. Filenames match Kenney Nature Kit names (`tree_oak`, `flower_purpleA`, `mushroom_redGroup`, and others). https://kenney.nl/assets/nature-kit description: CC0, 330 assets. Generator is `UniGLTF-1.27`, unlike the UnityGLTF Kenney packs above, so these may be a re-export rather than the publisher's original GLB. | Provenance incomplete. | Do not copy. | BLOCKED |
| `public/icon.svg`, `icon-192.png`, `icon-512.png` | No third-party credit. SVG is an original stick figure in `#818cf8` on `#09090b`. PNG text chunks contain no author metadata. | Covered by the Jiggle licence as project art, unless counsel finds otherwise. | Not allowed commercially without written approval. | BLOCKED |
| `public/manifest.json` | Original. Names "Romp Demo". | Project text under the Jiggle licence. | Do not reuse the name or the file. | BLOCKED |
| `public/assets/audio.json` | Original index of OGG paths. | Project file. | Do not copy. Rebuild any index from files obtained upstream. | BLOCKED |

glTF `asset.copyright` is empty on every GLB inspected.

### Audio

`src/audio.ts` states that background music is synthesized in the browser and that samples are Kenney. Root `CREDITS.md` says the same. There is no recorded music bed in the tree. The procedural themes (`run`, `beat`, `dance`, `arcade`, `calm`) are source code under the Jiggle licence. Do not copy `src/audio.ts`.

| Directory | Files | Claim | Commercial status |
| --- | --- | --- | --- |
| `public/assets/sfx/` | 147 OGG. Families include `click`, `confirmation`, `drop`, `error`, `footstep_concrete`, `impact*`, `laser`, `maximize`, `minimize`, `pepSound`, `phaseJump`, `powerUp`, `select`, `switch`, `tick`, `zap`. | `CREDITS.md`: Kenney Impact Sounds, Interface Sounds, and Digital Audio. Those three Kenney pages described the packs as CC0 on 2026-11-19 (https://kenney.nl/assets/impact-sounds, `interface-sounds`, `digital-audio`). | CLAIMED. Hashes not checked. Copy from this repo is BLOCKED. Re-download from Kenney if the product needs these sounds. |
| `public/assets/voice/` | 18 OGG: `1`, `2`, `3`, `congratulations`, `final_round`, `game_over`, `go`, `hurry_up`, `its_a_tie`, `level_up`, `mission_completed`, `new_highscore`, `objective_achieved`, `power_up`, `ready`, `set`, `time_over`, `you_win`. | `CREDITS.md`: Kenney Voiceover Pack (Female). https://kenney.nl/assets/voiceover-pack description: CC0, 90 assets. | CLAIMED. Copy from this repo BLOCKED. A human voice can raise publicity or neighbouring-rights questions even under a CC0 claim. Counsel should confirm Kenney's current voiceover terms before shipping a voice. |
| `public/assets/jingles/` | 12 OGG, `jingles_HIT00`–`05` and `jingles_STEEL00`–`05`. | `CREDITS.md`: Kenney Music Jingles. https://kenney.nl/assets/music-jingles description: CC0, 85 assets. | CLAIMED. Copy from this repo BLOCKED. |
| Procedural music in `src/audio.ts` | No audio file. Oscillators and noise scheduled on `AudioContext`. | Original code. The Jiggle licence names music as covered material. | BLOCKED. Write a new score. |

### Font

`public/fonts/fredoka.woff2`. Name table read with fontTools on 2026-11-19:

- Name ID 0: `Copyright 2016 The Fredoka Project Authors (https://github.com/hafontia/Fredoka-One)`
- Name ID 1: `Fredoka Light`
- Name ID 5: `Version 2.001`
- Name ID 14: `http://scripts.sil.org/OFL`

`CREDITS.md` attributes Fredoka to Milena Brandão and Hafontia and to the SIL Open Font License 1.1. The repository does not include the OFL text. OFL 1.1 allows embedding in commercial software. It does not allow selling the font by itself. The reserved font name must be respected if the font is modified. Redistribution of the font file must include the copyright and the licence. This file is a Light subset (29,732 bytes), not a full family drop.

Status: **B** if a product downloads Fredoka from the upstream OFL distribution and ships the OFL. **BLOCKED** as a copy taken from this repository without the OFL text.

### Machine-learning models

The `.task` files are zip archives of TFLite graphs. Internal strings include `MediaPipe` and BlazePose graph names.

| File | SHA-256 | Upstream comparison on 2026-11-19 | Licence | Status |
| --- | --- | --- | --- | --- |
| `public/models/hand_landmarker.task` | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` | Matches `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` | Apache-2.0, as stated by the ROMP `LICENSE` section 5 and by the MediaPipe Tasks package. The model zip itself has no separate licence file. | UPSTREAM-MATCH. Re-download from Google and ship Apache-2.0 plus NOTICE. |
| `public/models/pose_landmarker_lite.task` | `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a` | Matches `pose_landmarker_lite/float16/1/pose_landmarker_lite.task` | Same | UPSTREAM-MATCH. Same notice duty. |
| `public/models/pose_landmarker_full.task` | `4eaa5eb7a98365221087693fcc286334cf0858e2eb6e15b506aa4a7ecdcec4ad` | Matches `pose_landmarker_full/float16/latest/pose_landmarker_full.task`. Does **not** match `float16/1` (`5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1`). Both files are 9,398,198 bytes. | Same family. Pin a versioned URL in the product. `latest` can move. | UPSTREAM-MATCH to `latest` only. Treat the unversioned alias as a supply-chain risk. |

### WebAssembly runtime

| File | SHA-256 | Comparison | Status |
| --- | --- | --- | --- |
| `public/wasm/vision_bundle.mjs` | `55d7ab624fbb70dcc5adc4ae6d7ea9cfcb569139d3dbfbf2b1deafcb966bc0fe` | Identical to `package/vision_bundle.mjs` inside `npm pack @mediapipe/tasks-vision@0.10.35` | Apache-2.0 package. The tarball has no `LICENSE` or `NOTICE`. |
| `public/wasm/vision_wasm_internal.js` | `e170ee67dd4e16c1a6fcd8840a206687e5a59b22c20e4a902bc445b095454d73` | Not equal to the wasm glue in `@mediapipe/tasks-vision` 0.10.14, 0.10.15, 0.10.17, 0.10.18, 0.10.20, 0.10.21, 0.10.32, 0.10.33, 0.10.34, 0.10.35, or the 0.10.36 release candidates published through `0.10.36-rc.20260617`. Local size 323,377 bytes. Closest published sizes were 0.10.33 (323,589) and 0.10.34 (323,581). | BLOCKED. MediaPipe-family code without a byte-identical upstream package. |
| `public/wasm/vision_wasm_internal.wasm` | `8da277a733926eacd0474b8704b36742d6ec3231c57a860c5b889dff8f1df886` | 11,756,954 bytes. The 0.10.35 npm wasm is 11,153,617 bytes, SHA-256 `6a5c64584c2ab61c763b6e204afbdbc7ce1caf7f5216187322bca8df94f646bc`. | BLOCKED. Same reason. |

`src/pose.ts` loads the fileset from `/wasm` on the same origin. A commercial product should depend on `@mediapipe/tasks-vision` and use that package's wasm, with Apache-2.0 attribution, instead of copying this directory.

## 4. Dependency audit

See `docs/licences/dependency-inventory.md` for every lockfile entry.

Summary of direct lockfile packages:

| Package | Resolved | Licence | Declared in package.json | Used by `src/` |
| --- | --- | --- | --- | --- |
| `@mediapipe/tasks-vision` | 0.10.35 | Apache-2.0 | yes | yes |
| `playcanvas` | 2.22.2 | MIT | yes | yes |
| `react` | 19.2.8 | MIT | yes | yes |
| `react-dom` | 19.2.8 | MIT | yes | yes |
| `@dimforge/rapier3d-compat` | 0.20.0 | Apache-2.0 | no | no |
| `vite` | 8.3.0 | MIT | yes, dev | build |
| `typescript` | 7.0.2 | Apache-2.0 | yes, dev | build |
| `@types/node`, `@types/react`, `@types/react-dom` | 26.6.2, 19.3.0, 19.3.0 | MIT | yes, dev | types |

No locked runtime dependency forbids commercial use. Lightning CSS 1.33.0 (MPL-2.0) is a transitive dev dependency of Vite.

`CREDITS.md` is stale: it lists three.js, React Three Fiber, drei, `@react-three/rapier`, and `@react-three/postprocessing`. Those packages are not in the lockfile. The running renderer is PlayCanvas.

## 5. Technical architecture

### Camera

`startPose` in `src/pose.ts` calls `navigator.mediaDevices.getUserMedia` with `facingMode: 'user'`, ideal 1280×720, ideal 30 fps. The stream is assigned to a `video` element. `?sim` skips the camera and drives a synthetic hand from mouse and keyboard. There is no device picker, no exposure or white-balance control, and no measured display-latency calibration. The README says the same.

### Pose tracking

MediaPipe Pose Landmarker, running mode `VIDEO`. Model path `/models/pose_landmarker_${lite|full}.task`. `localStorage` key `romp.model` chooses lite or full. Default is full. `FilesetResolver.forVisionTasks('/wasm')`. Delegate tries GPU, then CPU. Preferred path is a classic worker (`src/pose.worker.ts`) using `OffscreenCanvas` and `createImageBitmap`. If those are missing, detection runs inline on the main thread. A second worker can track a second player on the lite model, forced to CPU, on a cropped half of the frame. Segmentation masks are optional and described in comments as expensive.

### Gesture recognition

Not a separate recognizer library. Rules over MediaPipe landmarks (33 body points, plus a hand landmarker for finger curl):

- Palm position in a body-relative frame, smoothed with a One-Euro filter.
- Lean and side-step become a `steer` value.
- Shoulder height versus a standing baseline becomes `lift` (jump or duck), with speed thresholds.
- Fist versus open hand uses a curl threshold (`fistAt`, `openAt`). The menu can switch "press" to "hold still" (`romp.press`).
- Slice uses hand speed in stage units (`SLICE_SPEED`, `CRIT_SPEED` in `src/games/slice.ts`).
- Activity points accumulate from limb travel.

These thresholds and the filter wiring are project expression under the Jiggle licence. The One-Euro filter as a published algorithm is not itself the ROMP source. A new product can implement a published filter with its own tuning. It should not copy this file.

### Game engine

One persistent PlayCanvas `AppBase` on a WebGL device (`src/engine.ts`). React does not redraw the 3D scene. Games are dynamic imports. Shared stage is 16×9. Helpers cover materials, instancing, glTF fitting, mesh clipping for fruit slices, sky, ground, and pose cut-outs. Rapier is not called.

### Storage

`src/stats.ts` stores JSON at `localStorage['romp.v1']`: profile names and sessions (time, game, player, score, points, optional stage, stars, xp, variant). Progression in `src/meta.ts` is derived from that list. Tracker settings use separate keys. Comments say saves stay on the device. `serve.mjs` can store developer performance reports on a machine that runs that server. That path is not the README play server.

### Game modules

Only two are registered in `src/main.tsx`: `run` and `slice`. Modes for Slice: Arcade (empty id), Classic, Zen. Play modes: solo, together, take turns. Five stages. Stars, badges, and daily challenges are local.

Run: three lanes, lean, jump, duck, coins and power-ups, forest then city, robot avatar.

Slice: fruit models sliced by a moving hand, bombs, power-ups, combo scoring.

### Browser requirements

Secure context for `getUserMedia` (the README states HTTPS or `localhost`). ES2022. WebGL. WebAssembly. `AudioContext` after a user gesture. `localStorage`. Workers, `OffscreenCanvas`, and `createImageBitmap` for the fast path, with an inline fallback. Dynamic `import()`. Landscape is requested by the manifest. No service worker, so "Add to Home screen" is a manifest install, not an offline cache.

### Android, laptop, deployment, external services

Android tablet Chrome plus HDMI is the documented target. The same page runs on a laptop browser with a webcam. There is no native Android or iOS project in the repository. Deployment is a static `dist/` on any HTTPS host. Runtime calls do not depend on Vercel, Instagram, or a game server. Dev-only tools call Kenney, Poly Pizza, Poly Haven, Sketchfab, and `adb`.

Platform detail: `docs/architecture/platform-compatibility.md`.

## 6. Reuse classification

A. Reusable after licence compliance, obtained from the upstream publisher, not by copying this tree.

B. Reusable only with additional conditions.

C. Must be replaced for a commercial product unless a written grant covers it.

D. Unknown or blocked pending verification.

| Component | Class | Why |
| --- | --- | --- |
| `src/**` application code, including pose, gestures, engine helpers, UI, progression, audio engine | C | Jiggle licence. Commercial use needs written approval. Even then, section 4 withholds the product names. |
| `src/games/run.ts`, `src/games/slice.ts`, and the game-design text in README and comments | C | The licence names game designs. Do not port these modules. |
| Icons, manifest name, procedural music, `audio.json` | C | Project art and music. |
| `tools/models.mjs`, `tools/tablet-diag.sh`, `serve.mjs` | C | Project source. The model tool also scrapes third-party sites. |
| `public/wasm/vision_wasm_internal.js` and `.wasm` | D | MediaPipe-family bytes that did not match the published packages compared here. No NOTICE file. |
| `public/assets/nature/**`, `public/assets/camp/**` | D | Not in `CREDITS.md`. Nature generator does not match the other Kenney-style packs. |
| Kenney GLBs and OGGs that `CREDITS.md` names, as stored in this repo | D for a copy from this repo. A if downloaded again from Kenney under that pack's CC0 statement. | Hashes were not checked against Kenney zips. `public/assets/CREDITS.md` is missing. |
| `robot.glb` | A from three.js under CC0, with courtesy credit. C if the commercial product wants the ROMP integration around it. | Bytes match. |
| MediaPipe `.task` models | B | Apache-2.0. Re-download. Ship licence and NOTICE. Pin a versioned pose-full URL. |
| `@mediapipe/tasks-vision` as an npm dependency of a new app | B | Apache-2.0. Add NOTICE. Do not copy ROMP's worker. |
| `playcanvas`, `react`, `react-dom` as new dependencies | A | MIT, if notices are kept and the import code is original. |
| `@dimforge/rapier3d-compat` | A if added fresh. Not part of the running demo. | Apache-2.0. Unused here. |
| Fredoka | B | OFL 1.1 from upstream, with the licence file. Do not ship the subset copied from this repo without OFL text. |
| Vite, TypeScript, Lightning CSS | A for MIT and Apache dev tools. B for Lightning CSS if its source is modified and distributed. | Dev dependencies. |
| Names Romp, Wiggle, Jiggle, yem.cube, and the stick-figure logo | C | Section 4. |

## 7. What can be reused, with evidence

Only by obtaining it from the upstream publisher and complying with that publisher's licence:

- PlayCanvas 2.22.2, MIT, as recorded in `package-lock.json`.
- React and React DOM 19.2.8, MIT, same.
- MediaPipe Tasks Vision 0.10.35, Apache-2.0, as an npm dependency, plus the versioned `.task` models whose hashes matched Google's storage URLs above.
- RobotExpressive, CC0, from three.js, hash above.
- Kenney packs whose own pages say CC0, if the files are downloaded from Kenney and spot-checked, not taken from `public/assets/`.
- Fredoka from the OFL upstream, with `OFL.txt`.
- The idea of on-device pose tracking in a browser. That idea is not a copy of the source. The implementation has to be written independently.

## 8. What cannot be reused

- Any commercial copy, fork, host, or ZIP of this repository, including a modified one, without a written grant.
- The names Romp, Wiggle, Jiggle, and yem.cube as a product brand.
- `src/` implementation, both games, UI, icons, progression tables, and the procedural score.
- `public/wasm` as vendored in this commit.
- `public/assets/nature` and `public/assets/camp` until each file is identified.
- Kenney, font, and model bytes copied out of this tree instead of from their publishers.
- `CREDITS.md` as a sufficient asset register. It disagrees with the file tree and with the code.

## 9. What requires permission from the original author

Written approval from the copyright holder named in `LICENSE` (Harsha, `@yem.cube`) before any commercial use of ROMP software, art, music, sounds covered by that licence, or game design. The grant should state whether it covers all of the following, because section 3 says approval covers only what it says:

- A separately branded product that is not called Romp, Wiggle, or Jiggle.
- Modification and omission of games.
- Paid hosting and a downloadable build.
- Laptop browsers and Android tablet browsers, including HDMI to a TV.
- Whether the Instagram credit is still required, and where it must appear.
- Whether any asset in `public/` is included.

If the commercial product is a clean-room program and contains none of this repository, that permission is not required for the upstream libraries listed in section 7. Confirm that boundary with counsel before Phase 1.

## 10. Third-party asset risks

- Missing per-file manifest (`public/assets/models.json`, `public/assets/CREDITS.md`).
- `nature/` re-export generator (`UniGLTF-1.27`) may be a derivative even if the mesh started as Kenney.
- `camp/` is used and uncredited.
- Voice lines need a check of Kenney's current voice terms, not only the CC0 slogan.
- Pose full model tracked as `latest` can change under that URL.
- Wasm binary does not match the npm package named in `package.json`.
- Fredoka file has no accompanying OFL.
- Icons are original branded art.
- `tools/models.mjs` is able to import CC-BY models. None are recorded, and none were identified by hash. Unknown imports remain blocked.
- A fruit-slice game and a lane runner can also collide with other companies' trade dress. That risk is not created by Kenney's licence and is not cleared by this audit.

## 11. Blockers before Phase 1

1. Product decision recorded in writing: clean-room application, or a negotiated grant. This audit's recommendation is clean-room. Do not start by forking `harsha20599/romp`.
2. If any ROMP file will be reused, a written grant that lists brand, payment model, platforms, modification, and attribution. Absent that grant, commercial reuse stays blocked.
3. Counsel review of the questions in section 2. This file is not that review.
4. Asset pipeline that downloads models, audio, and fonts from their publishers and stores hashes and licences outside this repository's wording.
5. MediaPipe integrated from npm, with Apache-2.0 text and NOTICE. Do not copy `public/wasm`.
6. New product name and logo. Do not use Romp, Wiggle, Jiggle, or the stick-figure mark.
7. New games. Do not port `run.ts` or `slice.ts`.
8. Engineers who implement Phase 1 should work from `docs/architecture/proposed-architecture.md`, not from a paste of ROMP source.

Phase 1 is not started by this audit.

## Appendix: every file under `public/`

Enumerated from the pinned commit on 2026-11-19. Classification for each group is in section 3. This list is the file inventory, not a licence grant.

File count: 286.

- `assets/audio.json`
- `assets/camp/Textures/colormap.png`
- `assets/camp/barrel-open.glb`
- `assets/camp/barrel.glb`
- `assets/camp/box.glb`
- `assets/camp/bucket.glb`
- `assets/camp/campfire-pit.glb`
- `assets/camp/chest.glb`
- `assets/camp/fence.glb`
- `assets/camp/grass-large.glb`
- `assets/camp/patch-grass-large.glb`
- `assets/camp/resource-planks.glb`
- `assets/camp/resource-wood.glb`
- `assets/camp/rock-a.glb`
- `assets/camp/rock-b.glb`
- `assets/camp/signpost.glb`
- `assets/camp/structure-roof.glb`
- `assets/camp/structure.glb`
- `assets/camp/tent.glb`
- `assets/camp/tool-axe-upgraded.glb`
- `assets/camp/tool-axe.glb`
- `assets/camp/tool-hammer-upgraded.glb`
- `assets/camp/tree-log-small.glb`
- `assets/camp/tree-log.glb`
- `assets/camp/tree-tall.glb`
- `assets/camp/tree-trunk.glb`
- `assets/camp/tree.glb`
- `assets/camp/workbench-anvil.glb`
- `assets/camp/workbench-grind.glb`
- `assets/camp/workbench.glb`
- `assets/city/Textures/colormap.png`
- `assets/city/building-a.glb`
- `assets/city/building-b.glb`
- `assets/city/building-c.glb`
- `assets/city/building-d.glb`
- `assets/city/building-e.glb`
- `assets/city/building-f.glb`
- `assets/city/building-g.glb`
- `assets/city/building-h.glb`
- `assets/city/building-skyscraper-a.glb`
- `assets/city/building-skyscraper-b.glb`
- `assets/city/building-skyscraper-c.glb`
- `assets/city/detail-parasol-a.glb`
- `assets/city/detail-parasol-b.glb`
- `assets/city/low-detail-building-a.glb`
- `assets/city/low-detail-building-c.glb`
- `assets/city/low-detail-building-e.glb`
- `assets/city/low-detail-building-wide-a.glb`
- `assets/food/Textures/colormap.png`
- `assets/food/apple.glb`
- `assets/food/banana.glb`
- `assets/food/coconut.glb`
- `assets/food/lemon.glb`
- `assets/food/orange.glb`
- `assets/food/pear.glb`
- `assets/food/pineapple.glb`
- `assets/food/strawberry.glb`
- `assets/food/watermelon.glb`
- `assets/jingles/jingles_HIT00.ogg`
- `assets/jingles/jingles_HIT01.ogg`
- `assets/jingles/jingles_HIT02.ogg`
- `assets/jingles/jingles_HIT03.ogg`
- `assets/jingles/jingles_HIT04.ogg`
- `assets/jingles/jingles_HIT05.ogg`
- `assets/jingles/jingles_STEEL00.ogg`
- `assets/jingles/jingles_STEEL01.ogg`
- `assets/jingles/jingles_STEEL02.ogg`
- `assets/jingles/jingles_STEEL03.ogg`
- `assets/jingles/jingles_STEEL04.ogg`
- `assets/jingles/jingles_STEEL05.ogg`
- `assets/kit/Textures/colormap.png`
- `assets/kit/barrel.glb`
- `assets/kit/bomb.glb`
- `assets/kit/coin-gold.glb`
- `assets/kit/crate-strong.glb`
- `assets/kit/crate.glb`
- `assets/kit/fence-straight.glb`
- `assets/kit/flag.glb`
- `assets/kit/flowers.glb`
- `assets/kit/heart.glb`
- `assets/kit/mushrooms.glb`
- `assets/kit/platform-overhang.glb`
- `assets/kit/rocks.glb`
- `assets/kit/saw.glb`
- `assets/kit/spike-block-wide.glb`
- `assets/kit/star.glb`
- `assets/kit/tree-pine.glb`
- `assets/kit/tree.glb`
- `assets/nature/fence_simple.glb`
- `assets/nature/flower_purpleA.glb`
- `assets/nature/flower_redA.glb`
- `assets/nature/flower_yellowA.glb`
- `assets/nature/grass_large.glb`
- `assets/nature/grass_leafsLarge.glb`
- `assets/nature/log_stack.glb`
- `assets/nature/mushroom_redGroup.glb`
- `assets/nature/plant_bush.glb`
- `assets/nature/plant_bushDetailed.glb`
- `assets/nature/plant_bushLarge.glb`
- `assets/nature/rock_largeA.glb`
- `assets/nature/rock_largeC.glb`
- `assets/nature/sign.glb`
- `assets/nature/stump_round.glb`
- `assets/nature/tent_detailedOpen.glb`
- `assets/nature/tree_detailed.glb`
- `assets/nature/tree_fat.glb`
- `assets/nature/tree_oak.glb`
- `assets/nature/tree_pineRoundC.glb`
- `assets/nature/tree_pineTallA.glb`
- `assets/robot.glb`
- `assets/sfx/click_001.ogg`
- `assets/sfx/click_002.ogg`
- `assets/sfx/click_003.ogg`
- `assets/sfx/click_004.ogg`
- `assets/sfx/click_005.ogg`
- `assets/sfx/confirmation_001.ogg`
- `assets/sfx/confirmation_002.ogg`
- `assets/sfx/confirmation_003.ogg`
- `assets/sfx/confirmation_004.ogg`
- `assets/sfx/drop_001.ogg`
- `assets/sfx/drop_002.ogg`
- `assets/sfx/drop_003.ogg`
- `assets/sfx/drop_004.ogg`
- `assets/sfx/error_001.ogg`
- `assets/sfx/error_002.ogg`
- `assets/sfx/error_003.ogg`
- `assets/sfx/error_004.ogg`
- `assets/sfx/error_005.ogg`
- `assets/sfx/error_006.ogg`
- `assets/sfx/error_007.ogg`
- `assets/sfx/error_008.ogg`
- `assets/sfx/footstep_concrete_000.ogg`
- `assets/sfx/footstep_concrete_001.ogg`
- `assets/sfx/footstep_concrete_002.ogg`
- `assets/sfx/footstep_concrete_003.ogg`
- `assets/sfx/footstep_concrete_004.ogg`
- `assets/sfx/highUp.ogg`
- `assets/sfx/impactBell_heavy_000.ogg`
- `assets/sfx/impactBell_heavy_001.ogg`
- `assets/sfx/impactBell_heavy_002.ogg`
- `assets/sfx/impactBell_heavy_003.ogg`
- `assets/sfx/impactBell_heavy_004.ogg`
- `assets/sfx/impactGlass_heavy_000.ogg`
- `assets/sfx/impactGlass_heavy_001.ogg`
- `assets/sfx/impactGlass_heavy_002.ogg`
- `assets/sfx/impactGlass_heavy_003.ogg`
- `assets/sfx/impactGlass_heavy_004.ogg`
- `assets/sfx/impactMetal_heavy_000.ogg`
- `assets/sfx/impactMetal_heavy_001.ogg`
- `assets/sfx/impactMetal_heavy_002.ogg`
- `assets/sfx/impactMetal_heavy_003.ogg`
- `assets/sfx/impactMetal_heavy_004.ogg`
- `assets/sfx/impactPlate_heavy_000.ogg`
- `assets/sfx/impactPlate_heavy_001.ogg`
- `assets/sfx/impactPlate_heavy_002.ogg`
- `assets/sfx/impactPlate_heavy_003.ogg`
- `assets/sfx/impactPlate_heavy_004.ogg`
- `assets/sfx/impactPunch_heavy_000.ogg`
- `assets/sfx/impactPunch_heavy_001.ogg`
- `assets/sfx/impactPunch_heavy_002.ogg`
- `assets/sfx/impactPunch_heavy_003.ogg`
- `assets/sfx/impactPunch_heavy_004.ogg`
- `assets/sfx/impactPunch_medium_000.ogg`
- `assets/sfx/impactPunch_medium_001.ogg`
- `assets/sfx/impactPunch_medium_002.ogg`
- `assets/sfx/impactPunch_medium_003.ogg`
- `assets/sfx/impactPunch_medium_004.ogg`
- `assets/sfx/impactSoft_heavy_000.ogg`
- `assets/sfx/impactSoft_heavy_001.ogg`
- `assets/sfx/impactSoft_heavy_002.ogg`
- `assets/sfx/impactSoft_heavy_003.ogg`
- `assets/sfx/impactSoft_heavy_004.ogg`
- `assets/sfx/impactWood_heavy_000.ogg`
- `assets/sfx/impactWood_heavy_001.ogg`
- `assets/sfx/impactWood_heavy_002.ogg`
- `assets/sfx/impactWood_heavy_003.ogg`
- `assets/sfx/impactWood_heavy_004.ogg`
- `assets/sfx/impactWood_medium_000.ogg`
- `assets/sfx/impactWood_medium_001.ogg`
- `assets/sfx/impactWood_medium_002.ogg`
- `assets/sfx/impactWood_medium_003.ogg`
- `assets/sfx/impactWood_medium_004.ogg`
- `assets/sfx/laser1.ogg`
- `assets/sfx/laser2.ogg`
- `assets/sfx/laser3.ogg`
- `assets/sfx/laser4.ogg`
- `assets/sfx/laser5.ogg`
- `assets/sfx/laser6.ogg`
- `assets/sfx/laser7.ogg`
- `assets/sfx/laser8.ogg`
- `assets/sfx/laser9.ogg`
- `assets/sfx/lowDown.ogg`
- `assets/sfx/maximize_001.ogg`
- `assets/sfx/maximize_002.ogg`
- `assets/sfx/maximize_003.ogg`
- `assets/sfx/maximize_004.ogg`
- `assets/sfx/maximize_005.ogg`
- `assets/sfx/maximize_006.ogg`
- `assets/sfx/maximize_007.ogg`
- `assets/sfx/maximize_008.ogg`
- `assets/sfx/maximize_009.ogg`
- `assets/sfx/minimize_001.ogg`
- `assets/sfx/minimize_002.ogg`
- `assets/sfx/minimize_003.ogg`
- `assets/sfx/minimize_004.ogg`
- `assets/sfx/minimize_005.ogg`
- `assets/sfx/minimize_006.ogg`
- `assets/sfx/minimize_007.ogg`
- `assets/sfx/minimize_008.ogg`
- `assets/sfx/minimize_009.ogg`
- `assets/sfx/pepSound1.ogg`
- `assets/sfx/pepSound2.ogg`
- `assets/sfx/pepSound3.ogg`
- `assets/sfx/pepSound4.ogg`
- `assets/sfx/pepSound5.ogg`
- `assets/sfx/phaseJump1.ogg`
- `assets/sfx/phaseJump2.ogg`
- `assets/sfx/phaseJump3.ogg`
- `assets/sfx/phaseJump4.ogg`
- `assets/sfx/phaseJump5.ogg`
- `assets/sfx/powerUp1.ogg`
- `assets/sfx/powerUp10.ogg`
- `assets/sfx/powerUp11.ogg`
- `assets/sfx/powerUp12.ogg`
- `assets/sfx/powerUp2.ogg`
- `assets/sfx/powerUp3.ogg`
- `assets/sfx/powerUp4.ogg`
- `assets/sfx/powerUp5.ogg`
- `assets/sfx/powerUp6.ogg`
- `assets/sfx/powerUp7.ogg`
- `assets/sfx/powerUp8.ogg`
- `assets/sfx/powerUp9.ogg`
- `assets/sfx/select_001.ogg`
- `assets/sfx/select_002.ogg`
- `assets/sfx/select_003.ogg`
- `assets/sfx/select_004.ogg`
- `assets/sfx/select_005.ogg`
- `assets/sfx/select_006.ogg`
- `assets/sfx/select_007.ogg`
- `assets/sfx/select_008.ogg`
- `assets/sfx/switch_001.ogg`
- `assets/sfx/switch_002.ogg`
- `assets/sfx/switch_003.ogg`
- `assets/sfx/switch_004.ogg`
- `assets/sfx/switch_005.ogg`
- `assets/sfx/switch_006.ogg`
- `assets/sfx/switch_007.ogg`
- `assets/sfx/threeTone1.ogg`
- `assets/sfx/tick_001.ogg`
- `assets/sfx/tick_002.ogg`
- `assets/sfx/tick_004.ogg`
- `assets/sfx/zap1.ogg`
- `assets/sfx/zap2.ogg`
- `assets/sfx/zapThreeToneDown.ogg`
- `assets/sfx/zapThreeToneUp.ogg`
- `assets/sfx/zapTwoTone.ogg`
- `assets/sfx/zapTwoTone2.ogg`
- `assets/voice/1.ogg`
- `assets/voice/2.ogg`
- `assets/voice/3.ogg`
- `assets/voice/congratulations.ogg`
- `assets/voice/final_round.ogg`
- `assets/voice/game_over.ogg`
- `assets/voice/go.ogg`
- `assets/voice/hurry_up.ogg`
- `assets/voice/its_a_tie.ogg`
- `assets/voice/level_up.ogg`
- `assets/voice/mission_completed.ogg`
- `assets/voice/new_highscore.ogg`
- `assets/voice/objective_achieved.ogg`
- `assets/voice/power_up.ogg`
- `assets/voice/ready.ogg`
- `assets/voice/set.ogg`
- `assets/voice/time_over.ogg`
- `assets/voice/you_win.ogg`
- `fonts/fredoka.woff2`
- `icon-192.png`
- `icon-512.png`
- `icon.svg`
- `manifest.json`
- `models/hand_landmarker.task`
- `models/pose_landmarker_full.task`
- `models/pose_landmarker_lite.task`
- `wasm/vision_bundle.mjs`
- `wasm/vision_wasm_internal.js`
- `wasm/vision_wasm_internal.wasm`
