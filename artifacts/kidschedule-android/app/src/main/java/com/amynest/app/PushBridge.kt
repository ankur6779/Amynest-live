package com.amynest.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * Native FCM bridge for the KidSchedule WebView.
 *
 * ### JS surface exposed to the web page
 *
 *   window.AndroidPush.getPushToken()        → cached FCM token or null
 *   window.AndroidPush.getPermissionStatus() → "granted" | "denied" | "default"
 *   window.onAndroidToken(token)             → called by native when a token arrives
 *
 * The native side installs `window.AndroidPush` via [WebView.addJavascriptInterface]
 * and delivers tokens to the page by calling `window.onAndroidToken(token)` via
 * [WebView.evaluateJavascript]. The web page defines `window.onAndroidToken` in
 * index.html's inline script (before React mounts) so it is always ready.
 *
 * ### Wrapper detection
 *
 * A synchronous `window.__AMYNEST_WRAPPER` marker is still injected at
 * document_start via [WebViewCompat.addDocumentStartJavaScript] for
 * bulletproof wrapper detection (available before addJavascriptInterface
 * objects are first accessed from JS).
 *
 * ### Token rotation
 *
 * [KidScheduleFcmService] calls [onTokenRotated] → [tokenListener] →
 * [broadcastToken] → evaluateJavascript → window.onAndroidToken on the
 * open WebView. The companion-object [WeakReference] prevents memory leaks
 * when the activity is destroyed.
 */
class PushBridge private constructor(
    activity: Activity,
    webView: WebView,
) {
    private val activityRef = WeakReference(activity)
    private val webViewRef = WeakReference(webView)

    /**
     * Token-rotation listener that FcmService notifies when a fresh token
     * arrives. Installed on the companion via [tokenListener].
     */
    val onNewTokenListener: (String) -> Unit = { token ->
        cacheToken(token)
        broadcastToken(token)
    }

    // ── JavascriptInterface exposed as window.AndroidPush ─────────────────

    @SuppressLint("JavascriptInterface")
    inner class AndroidPushInterface {
        @JavascriptInterface
        fun getPushToken(): String? = cachedToken()

        @JavascriptInterface
        fun getPermissionStatus(): String = currentPermission()
    }

    // ── Permission result forwarded from MainActivity ──────────────────────

    fun onPermissionResult(granted: Boolean) {
        if (!granted) markPermanentlyDenied()
        else clearPermanentlyDenied()
        // When just granted, surface the token immediately.
        if (granted) {
            val cached = cachedToken()
            if (cached != null) {
                broadcastToken(cached)
            } else {
                refreshAndBroadcastToken()
            }
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────

    private fun currentPermission(): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return "granted"
        }
        val activity = activityRef.get() ?: return "default"
        val granted = ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
        if (granted) return "granted"
        return if (prefs().getBoolean(KEY_DENIED_ONCE, false)) "denied" else "default"
    }

    private fun refreshAndBroadcastToken() {
        if (!BuildConfig.FCM_ENABLED) return
        try {
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { token ->
                    if (!token.isNullOrBlank()) {
                        cacheToken(token)
                        broadcastToken(token)
                    }
                }
                .addOnFailureListener { err ->
                    Log.w(TAG, "FCM getToken failed", err)
                }
        } catch (t: Throwable) {
            Log.w(TAG, "FCM unavailable", t)
        }
    }

    /**
     * Deliver `token` to the web page by calling `window.onAndroidToken(token)`
     * via evaluateJavascript. Posts to the WebView's main-thread looper so
     * it is safe to call from the FCM service worker thread.
     */
    fun broadcastToken(token: String) {
        val wv = webViewRef.get() ?: return
        val js = "if(typeof window.onAndroidToken==='function')" +
            "window.onAndroidToken(${JSONObject.quote(token)});"
        wv.post {
            try {
                wv.evaluateJavascript(js, null)
            } catch (t: Throwable) {
                Log.w(TAG, "broadcastToken failed", t)
            }
        }
    }

    private fun prefs(): SharedPreferences {
        val ctx = activityRef.get()?.applicationContext
            ?: throw IllegalStateException("activity gone")
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    private fun cachedToken(): String? = try {
        prefs().getString(KEY_TOKEN, null)
    } catch (_: Throwable) {
        null
    }

    private fun cacheToken(token: String) {
        try {
            prefs().edit().putString(KEY_TOKEN, token).apply()
        } catch (_: Throwable) { /* ignore */ }
    }

    private fun markPermanentlyDenied() {
        try {
            prefs().edit().putBoolean(KEY_DENIED_ONCE, true).apply()
        } catch (_: Throwable) { /* ignore */ }
    }

    private fun clearPermanentlyDenied() {
        try {
            prefs().edit().remove(KEY_DENIED_ONCE).apply()
        } catch (_: Throwable) { /* ignore */ }
    }

    companion object {
        private const val TAG = "PushBridge"
        const val JS_OBJECT_NAME = "AndroidPush"
        const val PERMISSION_REQUEST_CODE = 9421
        private const val PREFS = "kidschedule_push"
        private const val KEY_TOKEN = "fcm_token"
        private const val KEY_DENIED_ONCE = "permission_denied_once"

        /**
         * Bumped with every push-related native change. Logged by MainActivity
         * on launch so the running APK version is confirmed via adb logcat.
         */
        const val WRAPPER_VERSION = "2.0.0"

        /**
         * Process-level callback invoked by FcmService on token rotation.
         * The active PushBridge installs itself here; if no activity is
         * foreground the token is cached on disk and broadcast on the next
         * [install] call.
         */
        @Volatile
        var tokenListener: ((String) -> Unit)? = null

        /** Persist the rotated token and notify any active bridge. */
        fun onTokenRotated(context: Context, token: String) {
            try {
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(KEY_TOKEN, token).apply()
            } catch (_: Throwable) { /* ignore */ }
            tokenListener?.invoke(token)
        }

        /**
         * Install the bridge on [webView].
         *
         * Installs in two layers:
         *   1. Document-start `window.__AMYNEST_WRAPPER` marker (sync, before page scripts).
         *   2. `window.AndroidPush` JavascriptInterface for token / permission reads.
         *
         * After installation any cached token is broadcast to the page
         * immediately via window.onAndroidToken so registration does not
         * wait for the next FCM rotation event.
         *
         * Returns the installed [PushBridge] instance.
         */
        fun installOn(
            activity: Activity,
            webView: WebView,
            trustedOriginUrl: String,
        ): PushBridge {
            val bridge = PushBridge(activity, webView)

            // ── Layer 1: synchronous wrapper marker ──────────────────────────
            val originRule = toOriginRule(trustedOriginUrl)
            if (originRule != null &&
                WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
            ) {
                try {
                    val script = "window.__AMYNEST_WRAPPER = '${WRAPPER_VERSION}';"
                    WebViewCompat.addDocumentStartJavaScript(
                        webView, script, setOf(originRule),
                    )
                    Log.d(TAG, "Wrapper marker installed (version=$WRAPPER_VERSION)")
                } catch (t: Throwable) {
                    Log.e(TAG, "addDocumentStartJavaScript failed — marker NOT installed", t)
                }
            } else {
                Log.w(TAG, "DOCUMENT_START_SCRIPT not supported or origin invalid — marker skipped")
            }

            // ── Layer 2: JavascriptInterface as window.AndroidPush ───────────
            webView.addJavascriptInterface(bridge.AndroidPushInterface(), JS_OBJECT_NAME)
            tokenListener = bridge.onNewTokenListener
            Log.d(TAG, "AndroidPush interface installed (origin=$trustedOriginUrl)")

            // Push any already-cached token to the page.
            val cached = try {
                activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(KEY_TOKEN, null)
            } catch (_: Throwable) { null }
            if (cached != null) bridge.broadcastToken(cached)

            return bridge
        }

        private fun toOriginRule(url: String): String? {
            val uri = try { Uri.parse(url) } catch (_: Throwable) { return null }
            val scheme = uri.scheme?.lowercase() ?: return null
            val host = uri.host ?: return null
            val portPart = if (uri.port == -1) "" else ":${uri.port}"
            return "$scheme://$host$portPart"
        }
    }
}
