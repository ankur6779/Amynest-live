const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Strips unwanted Android permissions that are auto-injected by third-party
 * SDKs (Firebase, expo-image-picker, Google Play Services, etc.) at build time.
 *
 * Why each permission is blocked:
 *
 *  READ_MEDIA_IMAGES — expo-image-picker injects this for API 33+.
 *    AmyNest uses the Android Photo Picker (system UI), which requires no
 *    file-read permission. Play Store flags it as an unnecessary sensitive perm.
 *
 *  AD_ID (com.google.android.gms.permission.AD_ID) — Firebase / Google Play
 *    Services inject this automatically. AmyNest has zero ad SDKs and does not
 *    use the Advertising ID for any purpose. Play Store requires explicit
 *    justification; removing it avoids the declaration entirely.
 */
const BLOCKED = [
  "android.permission.READ_MEDIA_IMAGES",
  "com.google.android.gms.permission.AD_ID",
];

function filterPermissions(list) {
  if (!Array.isArray(list)) return list;
  return list.filter((entry) => !BLOCKED.includes(entry.$?.["android:name"]));
}

module.exports = function withBlockedPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest["uses-permission"] = filterPermissions(manifest["uses-permission"]);
    manifest["uses-permission-sdk-23"] = filterPermissions(manifest["uses-permission-sdk-23"]);
    return config;
  });
};
