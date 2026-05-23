// CommonJS shim for expo-device. Loaded via the Module._resolveFilename
// hook in __tests__/_onboarding-require-shim.ts so the screen's
// runtime require("expo-device") resolves here instead of the real
// (TS-source-only) package.
//
// We always report `isDevice: true` so the notifications-permission
// gate exercises the full getPermissionsAsync() branch instead of the
// "no native module" early-out.
"use strict";

module.exports = {
  __esModule: true,
  isDevice: true,
  default: { isDevice: true },
};
