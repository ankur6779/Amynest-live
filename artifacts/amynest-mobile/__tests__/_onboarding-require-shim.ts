// Re-routes runtime `require("expo-notifications")` and
// `require("expo-device")` to local CJS shims. Scoped to the
// onboarding e2e test (see onboarding-e2e.test.tsx) — vi.mock and
// resolve.alias only apply to ESM imports, so the screen's lazy
// `require()` calls bypass them and hit the real (TS-only) packages
// in node_modules.
import { afterAll } from "vitest";
import { createRequire } from "node:module";
import * as nodePath from "node:path";

interface ModuleType {
  _resolveFilename: (
    request: string,
    parent: unknown,
    isMain?: boolean,
    options?: unknown,
  ) => string;
}

const Module = createRequire(import.meta.url)("module") as ModuleType;
const here = nodePath.dirname(new URL(import.meta.url).pathname);
const overrides: Record<string, string> = {
  "expo-notifications": nodePath.resolve(here, "../__mocks__/expo-notifications.cjs"),
  "expo-device": nodePath.resolve(here, "../__mocks__/expo-device.cjs"),
};

const origResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patched(
  request,
  parent,
  isMain,
  options,
) {
  if (overrides[request]) return overrides[request];
  return origResolveFilename.call(this, request, parent, isMain, options);
};

// Restore the original resolver after the suite finishes so the patch
// cannot leak into other test files that might run later in the same
// worker process.
afterAll(() => {
  Module._resolveFilename = origResolveFilename;
});
