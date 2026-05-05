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
private const val ALLOWED_ORIGIN = "https://amynest.in"
private const val BRIDGE_NAME = "AmyNestPushNative"

/**
 * PushBridge — installs `window.AmyNestPushNative` into the WebView and
 * implements the bidirectional message-bus protocol expected by
 * `artifacts/kidschedule/src/lib/native-push-bridge.ts`.
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
     * No-ops gracefully if the device WebView is too old for
     * [WebViewFeature.WEB_MESSAGE_LISTENER] (extremely rare on API 24+).
     */
    fun install(webView: WebView) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            Log.w(TAG, "WEB_MESSAGE_LISTENER not supported — push bridge not installed")
            return
        }
        WebViewCompat.addWebMessageListener(
            webView,
            BRIDGE_NAME,
            setOf(ALLOWED_ORIGIN),
        ) { _, message, sourceOrigin, isMainFrame, proxy ->
            if (sourceOrigin.toString() != ALLOWED_ORIGIN || !isMainFrame) return@addWebMessageListener
            activeProxy = proxy   // keep the live proxy for out-of-band events
            val data = message.data ?: return@addWebMessageListener
            handleMessage(data, proxy)
        }
        Log.d(TAG, "Push bridge installed")
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
