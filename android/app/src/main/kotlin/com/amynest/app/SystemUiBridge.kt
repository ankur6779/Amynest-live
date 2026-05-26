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
        activityRef.get()?.runOnUiThread { it.setSystemBarsVisible(true) }
    }

    @JavascriptInterface
    fun hideSystemUI() {
        activityRef.get()?.runOnUiThread { it.setSystemBarsVisible(false) }
    }
}
