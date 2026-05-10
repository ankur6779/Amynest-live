package com.amynest.app

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.lang.ref.WeakReference

private const val TAG = "PushBridge"
private const val PREFS = "amynest_push"
private const val KEY_TOKEN = "fcm_token"
private const val KEY_REGISTERED = "token_registered"
private const val KEY_PERMISSION = "notification_permission"
private const val JS_OBJECT_NAME = "AndroidPush"

/**
 * Allowed origins for the document-start wrapper marker.
 *
 * We accept the apex `amynest.in`, the `www.` redirect, and any subdomain
 * (`*.amynest.in`) so that a redirect from amynest.in → www.amynest.in
 * (or a future staging.amynest.in) does NOT silently drop the marker.
 */
private val ALLOWED_ORIGINS: Set<String> = setOf(
    "https://amynest.in",
    "https://www.amynest.in",
    "https://*.amynest.in",
)

/**
 * PushBridge — installs `window.AndroidPush` into the WebView via
 * [WebView.addJavascriptInterface] and delivers FCM tokens to the web
 * page via [WebView.evaluateJavascript] calling `window.onAndroidToken(token)`.
 *
 * ### JS surface exposed to the web page
 *
 *   window.AndroidPush.getPushToken()        → cached FCM token or null
 *   window.AndroidPush.getPermissionStatus() → "granted" | "denied" | "default"
 *   window.onAndroidToken(token)             → called when a fresh token arrives
 *
 * The web page defines `window.onAndroidToken` in index.html's inline script
 * (runs before React mounts) so it is always available when evaluateJavascript
 * fires. The callback buffers the token in `window.__pendingAndroidToken` and
 * fires the `"amynest-push-token"` CustomEvent for any already-mounted React
 * hooks.
 *
 * ### Wrapper detection
 *
 * A synchronous `window.__AMYNEST_WRAPPER = "<version>"` marker is also
 * injected at document_start via [WebViewCompat.addDocumentStartJavaScript]
 * BEFORE any page script runs. The web app uses this to detect the wrapper
 * even in the brief window before addJavascriptInterface objects are accessible.
 *
 * ### Security
 *
 * `addJavascriptInterface` is safe here because:
 *   - The WebView only ever loads `https://amynest.in` (same-origin SPA).
 *   - Mixed-content is NEVER_ALLOW so no downgrade is possible.
 *   - `allowFileAccess` is false, preventing local file injection.
 *   - The only values returned (token, permission) are low-sensitivity
 *     strings already known to the signed-in user of the app.
 *
 * ### Token rotation
 *
 * [KidScheduleFcmService.onNewToken] calls [saveToken] → [broadcastToken]
 * (companion object) → evaluateJavascript → window.onAndroidToken.
 * The companion holds a WeakReference to the active WebView so the FCM
 * service can deliver events even from a background thread/process.
 */
class PushBridge(
    private val context: Context,
    /** Called when the OS returns the Android 13+ notification permission result. */
    private val permissionRequester: () -> Unit = {},
) {

    // ── JavascriptInterface class exposed as window.AndroidPush ───────────

    @SuppressLint("JavascriptInterface")
    inner class AndroidPushInterface {
        /** Synchronous read of the cached FCM token from SharedPreferences. */
        @JavascriptInterface
        fun getPushToken(): String? = getToken()

        /** Synchronous read of the current notification permission state. */
        @JavascriptInterface
        fun getPermissionStatus(): String = getPermission()
    }

    // ── Companion: active WebView reference shared across instances ───────

    companion object {
        /**
         * Wrapper version marker — bump whenever the push-bridge protocol,
         * MainActivity permission flow, or KidScheduleFcmService channel
         * handling changes so `adb logcat -s MainActivity` shows the version.
         */
        const val WRAPPER_VERSION = "2.0.0"

        /**
         * WeakReference to the active WebView. Updated by [install]; cleared
         * when the activity is destroyed. The FCM service uses this to call
         * [broadcastToken] without holding a strong reference to MainActivity.
         */
        @Volatile
        private var activeWebViewRef: WeakReference<WebView>? = null

        fun setActiveWebView(wv: WebView?) {
            activeWebViewRef = if (wv != null) WeakReference(wv) else null
        }

        /**
         * Deliver a fresh FCM token to the open web page by calling
         * `window.onAndroidToken(token)` via evaluateJavascript.
         *
         * Posts to the WebView's main-thread looper so it is safe to call
         * from the FCM service worker thread. Silent no-op when no WebView
         * is connected.
         */
        fun broadcastToken(token: String) {
            val wv = activeWebViewRef?.get() ?: return
            val js = "if(typeof window.onAndroidToken==='function')" +
                "window.onAndroidToken(${JSONObject.quote(token)});"
            wv.post {
                try {
                    wv.evaluateJavascript(js, null)
                } catch (e: Exception) {
                    Log.w(TAG, "broadcastToken failed: ${e.message}")
                }
            }
        }
    }

    // ── Public install helper ─────────────────────────────────────────────

    /**
     * Wire the bridge into [webView]. Must be called **before** the first
     * [WebView.loadUrl] so `window.AndroidPush` is available from page load.
     *
     * Installs in two layers:
     *   1. Document-start marker (`window.__AMYNEST_WRAPPER`) via
     *      [WebViewCompat.addDocumentStartJavaScript] — synchronous, runs
     *      before any page script. Bulletproof wrapper-detection signal.
     *   2. JavascriptInterface (`window.AndroidPush`) — synchronous object
     *      accessible from JS to pull the token / permission state.
     *
     * After installation, any cached token is broadcast immediately via
     * [broadcastToken] so the page gets the token even if FCM fired before
     * the WebView loaded.
     */
    fun install(webView: WebView) {
        // Layer 1: synchronous wrapper marker.
        installWrapperMarker(webView)

        // Layer 2: JavascriptInterface as window.AndroidPush.
        webView.addJavascriptInterface(AndroidPushInterface(), JS_OBJECT_NAME)
        setActiveWebView(webView)
        Log.d(TAG, "AndroidPush interface installed (version=$WRAPPER_VERSION)")

        // Push any already-cached token to the page once it finishes loading.
        // evaluateJavascript is called after loadUrl, so we post it with a
        // small delay to let the page define window.onAndroidToken first.
        val cached = getToken()
        if (cached != null) broadcastToken(cached)
    }

    /**
     * Inject `window.__AMYNEST_WRAPPER = "<version>"` synchronously at
     * document_start — the bulletproof wrapper-detection signal.
     */
    private fun installWrapperMarker(webView: WebView) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            Log.w(TAG, "DOCUMENT_START_SCRIPT not supported — wrapper marker NOT installed")
            return
        }
        try {
            val script = "window.__AMYNEST_WRAPPER = '$WRAPPER_VERSION';"
            WebViewCompat.addDocumentStartJavaScript(webView, script, ALLOWED_ORIGINS)
            Log.d(TAG, "Wrapper marker installed (version=$WRAPPER_VERSION)")
        } catch (t: Throwable) {
            Log.e(TAG, "addDocumentStartJavaScript failed — marker NOT installed", t)
        }
    }

    // ── SharedPreferences helpers ─────────────────────────────────────────

    private fun prefs() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun saveToken(token: String) {
        prefs().edit()
            .putString(KEY_TOKEN, token)
            .putBoolean(KEY_REGISTERED, false)
            .apply()
        Log.d(TAG, "FCM token saved")
        broadcastToken(token)
    }

    fun getToken(): String? = prefs().getString(KEY_TOKEN, null)

    fun markRegistered() {
        prefs().edit().putBoolean(KEY_REGISTERED, true).apply()
    }

    /**
     * Persist the OS permission state. When permission is newly granted,
     * push the cached token to the web page immediately so registration
     * does not wait for the next launch.
     */
    fun setPermission(granted: Boolean) {
        val value = if (granted) "granted" else "denied"
        prefs().edit().putString(KEY_PERMISSION, value).apply()
        if (granted) {
            val tok = getToken()
            if (tok != null) broadcastToken(tok)
        }
    }

    private fun getPermission(): String =
        prefs().getString(KEY_PERMISSION, "default") ?: "default"
}
