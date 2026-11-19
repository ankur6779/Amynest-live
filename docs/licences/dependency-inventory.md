# ROMP dependency inventory

Audit date: 2026-11-19.

Repository: https://github.com/harsha20599/romp

Pinned commit: `cb2d97ff020c3fc150d535c6c4b807884fe83907` (2026-11-11, message "Romp Demo", author Harsha).

Sources read: `package.json` and `package-lock.json` (lockfileVersion 3) at that commit. Versions and licence identifiers below are the values npm recorded in the lockfile. This inventory did not unpack every tarball's `LICENSE` file. `@mediapipe/tasks-vision@0.10.35` was unpacked: its `package.json` says `Apache-2.0`, and the tarball contains no `LICENSE` or `NOTICE` file.

This inventory is an engineering record. It is not legal advice, and it does not authorize use of the ROMP application code. A permissive dependency licence does not wash the custom licence on ROMP's own source. See `docs/licences/romp-audit.md`.

## Lockfile drift

`package.json` dependencies are `@mediapipe/tasks-vision`, `playcanvas`, `react`, and `react-dom`.

The lockfile root also depends on `@dimforge/rapier3d-compat@^0.20.0`, resolved to `0.20.0`, Apache-2.0. That package is not declared in `package.json`, and no file under `src/` imports it. `npm ci` on this tree is expected to fail the lockfile sync check. `CREDITS.md` still names three.js, React Three Fiber, drei, and Rapier. The current renderer imports `playcanvas` only.

## How to read commercial status

These statuses apply to the dependency itself when obtained from its own publisher. They do not permit copying ROMP source that imports the dependency.

- MIT, ISC, BSD-3-Clause: commercial use, modification, and redistribution are allowed if the copyright and licence notices are kept. BSD-3-Clause also forbids using the author's name to endorse a product without permission.
- Apache-2.0: commercial use is allowed. Redistribution must keep the licence, any `NOTICE`, and attribution, and must state material changes. The licence includes a patent grant that ends if the licensee files litigation alleging the work infringes a patent.
- MPL-2.0: commercial use of unmodified files is allowed. Modified MPL files that are distributed must stay under MPL-2.0. That obligation is file-level, not a whole-program copyleft. In this tree it applies to Lightning CSS, a Vite dev dependency.

No dependency in this lockfile is GPL, AGPL, or a "non-commercial" licence.

## Direct packages

| Package | Lockfile version | Licence | In package.json | Scope | Commercial use | Notices and concerns |
| --- | --- | --- | --- | --- | --- | --- |
| `@dimforge/rapier3d-compat` | 0.20.0 | Apache-2.0 | no | runtime | Allowed under that licence, with its notice duties | Lockfile only. Not imported by `src/`. Do not treat it as part of the running demo. Apache-2.0 if a future product adds it on its own. |
| `@mediapipe/tasks-vision` | 0.10.35 | Apache-2.0 | yes | runtime | Allowed under that licence, with its notice duties | Runtime pose and hand tracking. Apache-2.0. Unpacked tarball has no LICENSE or NOTICE file. Vendored `public/wasm/vision_bundle.mjs` matches this version byte for byte. Vendored `vision_wasm_internal.js` and `.wasm` do not match 0.10.14–0.10.35 or the 0.10.36 release candidates compared on 2026-11-19. Depend on the npm package directly. Do not copy `public/wasm/` from ROMP. |
| `playcanvas` | 2.22.2 | MIT | yes | runtime | Allowed under that licence, with its notice duties | Runtime renderer. MIT. Prod transitive types: `@types/webxr` (MIT) and `@webgpu/types` (BSD-3-Clause). Keep PlayCanvas copyright with any redistributed engine code. |
| `react` | 19.2.8 | MIT | yes | runtime | Allowed under that licence, with its notice duties | Runtime UI. MIT. Transitive `scheduler@0.27.0` is also MIT. |
| `react-dom` | 19.2.8 | MIT | yes | runtime | Allowed under that licence, with its notice duties | Runtime UI. MIT. Same notice duty as React. |
| `@types/node` | 26.6.2 | MIT | yes | dev | Allowed under that licence, with its notice duties | Dev types only. MIT. Not shipped in the browser bundle. |
| `@types/react` | 19.3.0 | MIT | yes | dev | Allowed under that licence, with its notice duties | Dev types only. MIT. |
| `@types/react-dom` | 19.3.0 | MIT | yes | dev | Allowed under that licence, with its notice duties | Dev types only. MIT. |
| `typescript` | 7.0.2 | Apache-2.0 | yes | dev | Allowed under that licence, with its notice duties | Dev compiler 7.0.2. Apache-2.0. Optional `@typescript/typescript-*` platform packages in the lockfile are the same version and licence. Not a runtime browser dependency. |
| `vite` | 8.3.0 | MIT | yes | dev | Allowed under that licence, with its notice duties | Dev bundler 8.3.0. MIT. Pulls Rolldown (MIT) and Lightning CSS (MPL-2.0). Build tool, not the game runtime, unless the product redistributes the toolchain. |

## Runtime transitive packages

| Package | Version | Licence | Commercial use | Notices |
| --- | --- | --- | --- | --- |
| `@types/webxr` | 0.5.24 | MIT | Allowed with notice duties | Keep copyright and licence notice. |
| `@webgpu/types` | 0.1.74 | BSD-3-Clause | Allowed with notice duties | Keep copyright and licence. No endorsement from the name without permission. |
| `scheduler` | 0.27.0 | MIT | Allowed with notice duties | Keep copyright and licence notice. |

## Dev transitive packages, excluding per-platform binaries

| Package | Version | Licence | Commercial use | Notices |
| --- | --- | --- | --- | --- |
| `@oxc-project/types` | 0.150.0 | MIT | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `@rolldown/pluginutils` | 1.0.1 | MIT | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `csstype` | 3.2.3 | MIT | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `detect-libc` | 2.1.2 | Apache-2.0 | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `fdir` | 6.5.0 | MIT | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `lightningcss` | 1.33.0 | MPL-2.0 | Allowed with notice duties | MPL-2.0 file-level copyleft. Commercial use of the unmodified tool is allowed. Distribute modifications to Lightning CSS source under MPL-2.0. CSS emitted for the app is not, by itself, an MPL file. |
| `nanoid` | 3.3.19 | MIT | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `picocolors` | 1.1.1 | ISC | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `picomatch` | 4.0.7 | MIT | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `postcss` | 8.5.28 | MIT | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `rolldown` | 1.2.9 | MIT | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `source-map-js` | 1.2.1 | BSD-3-Clause | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `tinyglobby` | 0.2.17 | MIT | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |
| `undici-types` | 8.9.0 | MIT | Allowed with notice duties | Build or type package. Include its licence if the toolchain is redistributed. |

## Optional per-platform binaries

These are lockfile entries for native builds. Only the host platform's package is installed. All are dev dependencies.

| Family | Count | Version | Licence | Scope | Concern |
| --- | --- | --- | --- | --- | --- |
| `@rolldown/binding-` | 15 | 1.2.9 | MIT | dev, optional | Same notice duty as the parent tool. Do not ship unused platform binaries. |
| `@typescript/typescript-` | 20 | 7.0.2 | Apache-2.0 | dev, optional | Same notice duty as the parent tool. Do not ship unused platform binaries. |
| `fsevents` | 1 | 2.3.3 | MIT | dev, optional | Same notice duty as the parent tool. Do not ship unused platform binaries. |
| `lightningcss-` | 11 | 1.33.0 | MPL-2.0 | dev, optional | Same notice duty as the parent tool. Do not ship unused platform binaries. |

### Every optional package name

- `@rolldown/binding-android-arm-eabi@1.2.9` — MIT
- `@rolldown/binding-android-arm64@1.2.9` — MIT
- `@rolldown/binding-darwin-arm64@1.2.9` — MIT
- `@rolldown/binding-darwin-x64@1.2.9` — MIT
- `@rolldown/binding-freebsd-x64@1.2.9` — MIT
- `@rolldown/binding-linux-arm-gnueabihf@1.2.9` — MIT
- `@rolldown/binding-linux-arm64-gnu@1.2.9` — MIT
- `@rolldown/binding-linux-arm64-musl@1.2.9` — MIT
- `@rolldown/binding-linux-ppc64-gnu@1.2.9` — MIT
- `@rolldown/binding-linux-s390x-gnu@1.2.9` — MIT
- `@rolldown/binding-linux-x64-gnu@1.2.9` — MIT
- `@rolldown/binding-linux-x64-musl@1.2.9` — MIT
- `@rolldown/binding-openharmony-arm64@1.2.9` — MIT
- `@rolldown/binding-win32-arm64-msvc@1.2.9` — MIT
- `@rolldown/binding-win32-x64-msvc@1.2.9` — MIT
- `@typescript/typescript-aix-ppc64@7.0.2` — Apache-2.0
- `@typescript/typescript-darwin-arm64@7.0.2` — Apache-2.0
- `@typescript/typescript-darwin-x64@7.0.2` — Apache-2.0
- `@typescript/typescript-freebsd-arm64@7.0.2` — Apache-2.0
- `@typescript/typescript-freebsd-x64@7.0.2` — Apache-2.0
- `@typescript/typescript-linux-arm@7.0.2` — Apache-2.0
- `@typescript/typescript-linux-arm64@7.0.2` — Apache-2.0
- `@typescript/typescript-linux-loong64@7.0.2` — Apache-2.0
- `@typescript/typescript-linux-mips64el@7.0.2` — Apache-2.0
- `@typescript/typescript-linux-ppc64@7.0.2` — Apache-2.0
- `@typescript/typescript-linux-riscv64@7.0.2` — Apache-2.0
- `@typescript/typescript-linux-s390x@7.0.2` — Apache-2.0
- `@typescript/typescript-linux-x64@7.0.2` — Apache-2.0
- `@typescript/typescript-netbsd-arm64@7.0.2` — Apache-2.0
- `@typescript/typescript-netbsd-x64@7.0.2` — Apache-2.0
- `@typescript/typescript-openbsd-arm64@7.0.2` — Apache-2.0
- `@typescript/typescript-openbsd-x64@7.0.2` — Apache-2.0
- `@typescript/typescript-sunos-x64@7.0.2` — Apache-2.0
- `@typescript/typescript-win32-arm64@7.0.2` — Apache-2.0
- `@typescript/typescript-win32-x64@7.0.2` — Apache-2.0
- `fsevents@2.3.3` — MIT
- `lightningcss-android-arm64@1.33.0` — MPL-2.0
- `lightningcss-darwin-arm64@1.33.0` — MPL-2.0
- `lightningcss-darwin-x64@1.33.0` — MPL-2.0
- `lightningcss-freebsd-x64@1.33.0` — MPL-2.0
- `lightningcss-linux-arm-gnueabihf@1.33.0` — MPL-2.0
- `lightningcss-linux-arm64-gnu@1.33.0` — MPL-2.0
- `lightningcss-linux-arm64-musl@1.33.0` — MPL-2.0
- `lightningcss-linux-x64-gnu@1.33.0` — MPL-2.0
- `lightningcss-linux-x64-musl@1.33.0` — MPL-2.0
- `lightningcss-win32-arm64-msvc@1.33.0` — MPL-2.0
- `lightningcss-win32-x64-msvc@1.33.0` — MPL-2.0

Lockfile package entries counted: 74.

## Known concerns

1. ROMP's own `Jiggle Personal Use License` forbids commercial use of the project without written approval. That restriction sits on top of these dependencies wherever ROMP code is copied.
2. `@dimforge/rapier3d-compat` is locked but not declared and not imported.
3. MediaPipe's npm tarball at 0.10.35 does not contain a `LICENSE` or `NOTICE` file. A product that redistributes it should add the Apache-2.0 text and a NOTICE from the upstream MediaPipe repository.
4. Lightning CSS is MPL-2.0. It is a dev dependency of Vite. Do not modify and ship Lightning CSS source without MPL compliance.
5. No dependency here grants a right to the names Romp, Wiggle, Jiggle, or yem.cube.

## Unresolved questions

- Counsel should confirm that linking MIT and Apache-2.0 libraries from an independently written commercial app does not require ROMP's approval. This audit's reading is that approval is required for ROMP's code and game design, not for the upstream libraries themselves.
- Counsel should confirm the notice bundle required when Apache-2.0 MediaPipe wasm is copied into a static site, given the npm tarball omits `LICENSE` and `NOTICE`.
