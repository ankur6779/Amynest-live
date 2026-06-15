package com.amynest.app

import android.app.Activity
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.android.play.core.review.ReviewManagerFactory
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * Google Play In-App Review API bridge for the AmyNest WebView wrapper.
 *
 * Exposes `window.AmyNestReviewNative` to the web layer:
 *   - isAvailable() → boolean
 *   - requestReview() → triggers Play review flow; fires CustomEvent on completion
 */
class ReviewBridge(
    activity: Activity,
    webView: WebView,
) {
    private val activityRef = WeakReference(activity)
    private val webViewRef = WeakReference(webView)

    fun install() {
        val wv = webViewRef.get() ?: return
        wv.addJavascriptInterface(ReviewJsInterface(), JS_OBJECT_NAME)
        wv.evaluateJavascript(
            "window.__AMYNEST_REVIEW_BRIDGE='${BRIDGE_VERSION}';" +
                "window.dispatchEvent(new Event('amynest-review-bridge-ready'));",
            null,
        )
        Log.d(TAG, "ReviewBridge installed (v$BRIDGE_VERSION)")
    }

    private fun dispatchReviewResult(status: String, error: String? = null) {
        val wv = webViewRef.get() ?: return
        val detail = JSONObject()
            .put("status", status)
            .put("error", error ?: JSONObject.NULL)
        val js =
            "(function(){" +
                "window.dispatchEvent(new CustomEvent('amynest-review-result'," +
                "{detail:$detail}));" +
            "})();"
        wv.post { wv.evaluateJavascript(js, null) }
    }

    private fun requestReviewFlow() {
        val activity = activityRef.get()
        if (activity == null) {
            dispatchReviewResult("error", "activity_unavailable")
            return
        }
        val manager = ReviewManagerFactory.create(activity)
        manager.requestReviewFlow()
            .addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    Log.w(TAG, "requestReviewFlow failed: ${task.exception?.message}")
                    dispatchReviewResult("error", "flow_unavailable")
                    return@addOnCompleteListener
                }
                val reviewInfo = task.result
                manager.launchReviewFlow(activity, reviewInfo)
                    .addOnCompleteListener { launchTask ->
                        if (launchTask.isSuccessful) {
                            Log.d(TAG, "Review flow launched")
                            dispatchReviewResult("launched")
                        } else {
                            Log.w(TAG, "launchReviewFlow failed: ${launchTask.exception?.message}")
                            dispatchReviewResult("error", "launch_failed")
                        }
                    }
            }
    }

    inner class ReviewJsInterface {
        @JavascriptInterface
        fun isAvailable(): Boolean = activityRef.get() != null

        @JavascriptInterface
        fun requestReview() {
            Log.d(TAG, "JS requestReview")
            activityRef.get()?.runOnUiThread { requestReviewFlow() }
                ?: dispatchReviewResult("error", "activity_unavailable")
        }
    }

    companion object {
        private const val TAG = "ReviewBridge"
        const val JS_OBJECT_NAME = "AmyNestReviewNative"
        const val BRIDGE_VERSION = "1.0.0"

        fun installOn(activity: Activity, webView: WebView): ReviewBridge {
            return ReviewBridge(activity, webView).also { it.install() }
        }
    }
}
