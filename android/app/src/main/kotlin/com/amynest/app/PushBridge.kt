package com.amynest.app

import android.content.Context
import android.util.Log
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import android.webkit.WebView
import org.json.JSONObject

private const val TAG = "PushBridge"
private const val PREFS = "amynest_push"
private const val KEY_TOKEN = "fcm_token"
private const val KEY_REGISTERED = "token_registered"
private const val KEY_PERMISSION = "notification_permission"
private const val BRIDGE_NAME = "AmyNestPushNative"

/**
 * Allowed origins for both the message-bus and the document-start marker.
 *
 * We accept the apex `amynest.in`, the `www.` redirect, and any subdomain
 * (`*.amynest.in`) so that a redirect from amynest.in → www.amynest.in
 * (or a future staging.amynest.in) does NOT silently drop the bridge.
 *
 * The trailing-slash form (`https://amynest.in/`) is NOT a valid rule per
 * the [WebViewCompat.addWebMessageListener] contract — origins are scheme +
 * host (+ port) only. Wildcards are supported in the subdomain position via
 * `*.host`.
 */
private val ALLOWED_ORIGINS: Set<String> = setOf(
    "https://amynest.in",
    "https://www.amynest.in",
    "https://*.amynest.in",
)

/**
 * Hosts that map to "this is the AmyNest web app". Used by the message-handler
 * origin check (which receives a parsed [android.net.Uri]).
 */
private val ALLOWED_HOSTS: Set<String> = setOf(
    "amynest.in",
    "www.amynest.in",
)

/**
 * PushBridge — installs `window.AmyNestPushNative` into the WebView and
 * implements the bidirectional message-bus protocol expected by
 * `artifacts/kidschedule/src/lib/native-push-bridge.ts`.
 *
 * Also injects a synchronous `window.__AMYNEST_WRAPPER` marker via
 * [WebViewCompat.addDocumentStartJavaScript] BEFORE any page script runs,
 * so the web app can ALWAYS detect that it is inside the wrapper — even
 * if the message-listener install fails for any reason. This is the
 * primary fix for "Not supported in this browser" being shown inside
 * the wrapper.
 *
 * ### Protocol (web → native, JSON-encoded strings)
 * ```
 * { action: "getStatus",         cbId: "..." }
 * { action: "requestPermission", cbId: "..." }
 * { action: "refreshToken",      cbId: "..." }
 * ```
 *
 * ### Callback responses (native → web)
 * ```
 * { ok: true,  cbId: "...", data: { fcmEnabled, permission, token } }
 * { ok: false, cbId: "...", error: "reason" }
 * ```
 *
 * ### Out-of-band push events (native → web, no cbId)
 * ```
 * { type: "token",      token: "..."                        }
 * { type: "permission", permission: "granted"|"denied"|"default" }
 * ```
 *
 * ### Singleton replyProxy
 * [KidScheduleFcmService] and [MainActivity] are separate processes/instances.
 * The companion object holds the *active* [JavaScriptReplyProxy] so that token-
 * rotation events generated in the FCM service reach the open WebView without
 * both components needing a direct reference to each other.
 */
class PushBridge(
    private val context: Context,
    /** Called when the web page sends { action: "requestPermission" }. */
    private val permissionRequester: () -> Unit = {},
) {

    // ── Companion: active reply proxy shared across all instances ─────────────

    companion object {
        /**
         * Wrapper version marker — bumped on every push-related native change
         * so MainActivity can log it on launch and the user can verify (via
         * `adb logcat -s MainActivity`) that they are running the latest APK
         * build, not a cached older install.
         *
         * Bump this value when changing PushBridge protocol, MainActivity
         * permission flow, or KidScheduleFcmService channel handling.
         */
        const val WRAPPER_VERSION = "1.3.0"

        /**
         * The last [JavaScriptReplyProxy] seen on [BRIDGE_NAME]. Updated
         * every time the web page posts a message through the bridge, which
         * typically happens within milliseconds of the page becoming
         * interactive. Safe to write from the main thread only (WebView
         * callbacks run on the main thread).
         */
        @Volatile
        private var activeProxy: JavaScriptReplyProxy? = null

        /**
         * Send a JSON string to the currently open web page.
         * Call from any context (service, worker thread) — postMessage
         * itself is safe to call off the main thread in modern WebView builds.
         * Best-effort: silent no-op when no page is connected.
         */
        fun broadcastEvent(json: String) {
            try {
                activeProxy?.postMessage(json)
            } catch (e: Exception) {
                Log.w(TAG, "broadcastEvent failed: ${e.message}")
            }
        }
    }

    // ── Public install helper ─────────────────────────────────────────────────

    /**
     * Wire the bridge into [webView]. Must be called **before** the first
     * [WebView.loadUrl] so the JS object is available on page load.
     *
     * Installs in two layers:
     *   1. Document-start marker (`window.__AMYNEST_WRAPPER`) — runs synchronously
     *      before any page script. Used by the web app for bulletproof wrapper
     *      detection when the full message-bus is delayed / unavailable.
     *   2. Message-bus listener (`window.AmyNestPushNative`) — async bridge
     *      for FCM token + permission state.
     *
     * Either layer can no-op if its WebViewFeature is not supported on this
     * device. The web app handles the partial-bridge case gracefully via
     * `awaitNativePushBridge()` + recovery UI.
     */
    fun install(webView: WebView) {
        // Layer 1: synchronous wrapper marker — independent of message-bus.
        installWrapperMarker(webView)

        // Layer 2: full message bus.
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            Log.w(TAG, "WEB_MESSAGE_LISTENER not supported — push message bus DISABLED " +
                "(wrapper marker still installed)")
            return
        }
        try {
            WebViewCompat.addWebMessageListener(
                webView,
                BRIDGE_NAME,
                ALLOWED_ORIGINS,
            ) { _, message, sourceOrigin, isMainFrame, proxy ->
                if (!isMainFrame) {
                    Log.w(TAG, "Ignoring message from sub-frame origin=$sourceOrigin")
                    return@addWebMessageListener
                }
                val host = sourceOrigin.host
                if (host == null || host !in ALLOWED_HOSTS) {
                    Log.w(TAG, "Ignoring message from disallowed origin=$sourceOrigin")
                    return@addWebMessageListener
                }
                activeProxy = proxy   // keep the live proxy for out-of-band events
                val data = message.data ?: return@addWebMessageListener
                handleMessage(data, proxy)
            }
            Log.d(TAG, "Push message bus installed (origins=$ALLOWED_ORIGINS)")
        } catch (t: Throwable) {
            Log.e(TAG, "addWebMessageListener failed — push bus DISABLED", t)
        }
    }

    /**
     * Inject `window.__AMYNEST_WRAPPER = "<version>"` synchronously at
     * document_start. This is the bulletproof "are we inside the wrapper"
     * signal the web app uses to suppress the misleading "Not supported in
     * this browser" message and instead wait for / drive the native bridge.
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

    // ── SharedPreferences helpers ─────────────────────────────────────────────

    private fun prefs() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun saveToken(token: String) {
        prefs().edit()
            .putString(KEY_TOKEN, token)
            .putBoolean(KEY_REGISTERED, false)
            .apply()
        Log.d(TAG, "FCM token saved")
        broadcastEvent(JSONObject().put("type", "token").put("token", token).toString())
    }

    fun getToken(): String? = prefs().getString(KEY_TOKEN, null)

    fun markRegistered() {
        prefs().edit().putBoolean(KEY_REGISTERED, true).apply()
    }

    fun setPermission(granted: Boolean) {
        val value = if (granted) "granted" else "denied"
        prefs().edit().putString(KEY_PERMISSION, value).apply()
        broadcastEvent(
            JSONObject().put("type", "permission").put("permission", value).toString(),
        )
    }

    private fun getPermission(): String =
        prefs().getString(KEY_PERMISSION, "default") ?: "default"

    // ── Message bus ───────────────────────────────────────────────────────────

    private fun handleMessage(raw: String, proxy: JavaScriptReplyProxy) {
        try {
            val msg = JSONObject(raw)
            val action = msg.optString("action")
            val cbId = msg.optString("cbId")

            when (action) {
                "getStatus", "refreshToken" -> {
                    val data = JSONObject()
                        .put("fcmEnabled", getToken() != null)
                        .put("permission", getPermission())
                        .put("token", getToken())
                    proxy.postMessage(
                        JSONObject().put("ok", true).put("cbId", cbId).put("data", data).toString(),
                    )
                    // Optimistically mark registered once web side has acknowledged the token.
                    if (getToken() != null) markRegistered()
                }

                "requestPermission" -> {
                    if (getPermission() == "granted") {
                        broadcastEvent(
                            JSONObject().put("type", "permission").put("permission", "granted").toString(),
                        )
                    } else {
                        permissionRequester()
                    }
                    proxy.postMessage(
                        JSONObject().put("ok", true).put("cbId", cbId).toString(),
                    )
                }

                else -> proxy.postMessage(
                    JSONObject()
                        .put("ok", false).put("cbId", cbId)
                        .put("error", "unknown_action:$action")
                        .toString(),
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "handleMessage error", e)
        }
    }
}
