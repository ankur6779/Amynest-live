# Amy 3D / avatar assets

Assets for the Amy companion avatar (`src/components/amy-3d/`).

## Files

- `amy-avatar.png` — full premium render of Amy (source art, 1536x1024).
- `amy-avatar-square.png` — centered square crop used by the animated hero
  portrait (`AmyPortrait`).
- `amy-idle.png` / `amy-idle@2x.png` — small baked avatar (256 / 512) used by
  `AmyIcon` everywhere (headers, lists, chat bubbles).
- `amy.glb` — rigged Tripo 3D model (41 bones, 19 clips). Run
  `python3 scripts/prepare-amy-gltf.py` after updating `AMY+3d+character.glb`
  at repo root. Semantic clips: `idle`, `wave`, `warmup`, `talk`, `celebrate`,
  `cheer`, `listening`, `thinking`. To re-verify the clip mapping, use
  `scripts/inspect-amy-gltf-clips.py` (per-bone motion analysis) and
  `scripts/amy-clip-viewer.html` (visual filmstrip per clip).

## How rendering works (tiered)

- **Hero** (Talk with Amy, pronunciation companion, AI tutor intro):
  `AmyAvatar tier="hero"` →
  - if `amy.glb` is present **and** WebGL works → live 3D (`Amy3DStage`),
  - else → `AmyPortrait` (premium animated image: float, idle breathing, head
    tilt, neon halo pulse, speaking pulse).
- **Everywhere else**: `AmyIcon` shows the baked image (`amy-idle.png`).

No live WebGL canvas is ever mounted on small spots, so it stays smooth on
low-end Android WebView / iOS.

## How facial life works (presentation only)

`amy.glb` (Tripo) currently has **no morph targets** and **no eye/jaw bones** —
only a body skeleton (`Head`, `NeckTwist*`, limbs) plus clips (`idle`, `talk`,
`listening`, `thinking`, …).

Runtime face life therefore uses a **FaceDriver**:

1. **MorphTargetManager** — auto-detects ARKit/RPM/VRoid blink, smile, visemes.
   No-ops when absent (today's GLB).
2. **ProceduralFaceDriver** — lightweight planes parented to the **Head bone**
   (blink lids, pupil drift, smile, mouth open). Never floats in world space.
3. **HybridFaceDriver** — prefers morphs; fills missing channels procedurally.

Dropping a rigged GLB with blend shapes requires **no API changes** — morphs
light up automatically and procedural overlays only cover gaps.

## Adding the rigged model (real viseme lip-sync + eye-tracking)

The runtime is already wired — you only need to produce `amy.glb`.

### 1. Generate / sculpt the mesh
Use `amy-avatar.png` as the visual reference. Options:
- **Image-to-3D** (fastest): Meshy.ai, Tripo3D, or Hunyuan3D — upload
  `amy-avatar.png`, export `.glb`. (Note: these usually produce an UNRIGGED mesh;
  you still need step 2 for lip-sync/blink.)
- **Sculpt + rig manually**: Blender — model the head, cap, and headphones to
  match the reference.

### 2. Add blend-shapes (morph targets) — required for animation
Export the `.glb` with at least these morph target names (any one of each is
auto-detected by `AmyModel`):
- Mouth (lip-sync): `jawOpen` | `mouthOpen` | `viseme_aa` | `mouth_open`
- Blink: `eyesClosed` | `blink` | `eyeBlink` | `eyeBlinkLeft`
- (Optional) Bones named like `Head`/`Neck` and `LeftEye`/`RightEye` enable
  pointer-based eye-tracking. ARKit / Ready Player Me / VRoid rigs work as-is.

Tools that add ARKit visemes/blinks: Blender (Shape Keys), Reallusion CC,
Ready Player Me, or the `facial` add-ons.

### 3. Drop it in
Place the file here as `public/amy-3d/amy.glb` (served at `/amy-3d/amy.glb`).
On next load the app probes for it (HEAD request) and auto-switches the hero to
the live 3D model. No code change needed. To force a specific URL you can also
pass `<AmyAvatar tier="hero" modelUrl="/amy-3d/amy.glb" />`.

Keep the model low-poly (< 40k tris, single texture) for smooth mobile playback.

### 4. (Future) true audio-driven visemes
Current lip-sync is a time-based jaw oscillation while Amy speaks (freeze-safe —
no audio engine access). For exact phoneme visemes the `amy-voice` engine must
expose an amplitude/viseme stream; that is a separate, justified engine PR per
`.cursor/rules/speech-coach-engine-freeze.mdc`.
