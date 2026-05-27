package com.amynest.app

import android.webkit.JavascriptInterface
import java.lang.ref.WeakReference

/**
 * Exposes `window.Android.showSystemUI()` / `window.Android.hideSystemUI()` so
 * the web app can toggle immersive mode per route (dashboard vs other screens).
 */
class SystemUiBridge(activity: MainActivity) {

    private val activityRef = WeakReference(activity)

    @JavascriptInterface
    fun showSystemUI() {
        val activity = activityRef.get() ?: return
        activity.runOnUiThread { activity.setSystemBarsVisible(true) }
    }

    @JavascriptInterface
    fun hideSystemUI() {
        val activity = activityRef.get() ?: return
        activity.runOnUiThread { activity.setSystemBarsVisible(false) }
    }
}
