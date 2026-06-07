# Amy 3D assets

This folder holds assets for the 3D Amy avatar (`src/components/amy-3d/`).

## Current state (Phase 1 — prototype)

The live 3D hero renders a **procedural head** built from three.js primitives
(`ProceduralAmy` in `amy-3d-stage.tsx`). No external 3D file is required, so the
feature works out of the box and ships nothing extra in the bundle until the
hero mounts.

## Dropping in a real rigged model (Phase 3)

1. Export a `.glb` (e.g. `amy.glb`) and place it in this folder:
   `public/amy-3d/amy.glb` → served at `/amy-3d/amy.glb`.
2. For lip-sync the mesh should expose a mouth morph target named one of:
   `jawOpen`, `mouthOpen`, `viseme_aa`, or `mouth_open`. `AmyGltf` auto-detects
   these and oscillates the influence while Amy is speaking. If no morph exists,
   the head still renders (static mouth).
3. Pass the URL through to the stage:
   `<AmyAvatar tier="hero" modelUrl="/amy-3d/amy.glb" state={...} />`.

Keep the model low-poly (target < 40k tris, single texture) so it stays smooth
on low-end Android WebView and iOS.

## Baked image for small tier

`amy-idle.png` (+`amy-idle@2x.png`) — a static render of Amy used by the
`tier="icon"` path / `AmyIcon` for headers, lists and chat bubbles. Generate via
`scripts/render-amy-baked.mjs`. Until it exists, small spots use the 2D SVG.
