const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Removes android.permission.READ_MEDIA_IMAGES from the compiled AndroidManifest.xml.
 *
 * Why: expo-image-picker automatically injects READ_MEDIA_IMAGES when targeting
 * API 33+. However, AmyNest uses the Android Photo Picker (system UI) for profile
 * pictures — it does not require this permission. Google Play flags it as an
 * unnecessary sensitive permission, so we strip it at build time.
 */
module.exports = function withRemoveReadMediaImages(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const PERMISSION = "android.permission.READ_MEDIA_IMAGES";

    if (Array.isArray(manifest["uses-permission"])) {
      manifest["uses-permission"] = manifest["uses-permission"].filter(
        (entry) => entry.$?.["android:name"] !== PERMISSION,
      );
    }

    if (Array.isArray(manifest["uses-permission-sdk-23"])) {
      manifest["uses-permission-sdk-23"] = manifest["uses-permission-sdk-23"].filter(
        (entry) => entry.$?.["android:name"] !== PERMISSION,
      );
    }

    return config;
  });
};
