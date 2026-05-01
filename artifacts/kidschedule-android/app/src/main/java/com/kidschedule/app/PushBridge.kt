package com.kidschedule.app

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import android.webkit.WebView
import androidx.core.content.ContextCompat
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONException
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * Native FCM bridge for the KidSchedule WebView.
 *
 * SECURITY: Installed via [WebViewCompat.addWebMessageListener] with a
 * strict allowedOriginRules pinned to BuildConfig.WRAPPER_URL — third-party
 * iframes loaded inside the WebView CANNOT call this bridge. Each
 * invocation also re-validates `sourceOrigin` (defense-in-depth), matching
 * the [BillingBridge] pattern.
 *
 * On the JS side this surfaces as `window.AmyNestPushNative` with
 * `postMessage(json)` and an `onmessage` listener. The web app uses a
 * promise / callbackId registry (see `src/lib/native-push-bridge.ts`).
 *
 * Message protocol (JSON in both directions):
 *   request:  { action: "getStatus" | "requestPermission" | "refreshToken", cbId?: string }
 *   response: { ok: true,  cbId, data: { fcmEnabled, permission, token } }
 *           | { ok: false, cbId, error: string }
 *   push:     { type: "permission", permission: "granted"|"denied"|"default" }
 *           | { type: "token", token: string }
 */
class PushBridge private constructor(
    activity: Activity,
    webView: WebView,
    private val trustedOrigin: String,
) {
    private val activityRef = WeakReference(activity)
    private val webViewRef = WeakReference(webView)
    private var replyProxyRef: WeakReference<JavaScriptReplyProxy>? = null

    /**
     * Token-rotation listener that the FcmService notifies when a fresh
     * token arrives. Wired up via [PushBridge.tokenListener] companion
     * field for the lifetime of the activity.
     */
    private val onNewTokenListener: (String) -> Unit = { token ->
        cacheToken(token)
        pushEvent(JSONObject().put("type", "token").put("token", token))
    }

    fun handleMessage(rawMessage: String, sourceOrigin: Uri, replyProxy: JavaScriptReplyProxy) {
        if (!originMatches(sourceOrigin)) {
            Log.w(TAG, "rejected message from untrusted origin: $sourceOrigin")
            return
        }
        // Cache the most-recent reply proxy so out-of-band events
        // (token rotation, permission result) can post to the page.
        replyProxyRef = WeakReference(replyProxy)

        val msg: JSONObject = try {
            JSONObject(rawMessage)
        } catch (_: JSONException) {
            Log.w(TAG, "malformed bridge message")
            return
        }
        val cbId = msg.optString("cbId", "")
        when (msg.optString("action")) {
            "getStatus" -> resolve(replyProxy, cbId, currentStatus())
            "refreshToken" -> refreshToken(replyProxy, cbId)
            "requestPermission" -> requestPermission(replyProxy, cbId)
            else -> resolveError(replyProxy, cbId, "unknown_action")
        }
    }

    fun onPermissionResult(granted: Boolean) {
        val perm = if (granted) "granted" else "denied"
        if (!granted) markPermanentlyDenied()
        else clearPermanentlyDenied()
        pushEvent(JSONObject().put("type", "permission").put("permission", perm))
        // If the user just granted, surface the token immediately too.
        if (granted) {
            val cached = cachedToken()
            if (cached != null) {
                pushEvent(JSONObject().put("type", "token").put("token", cached))
            } else {
                refreshToken(null, "")
            }
        }
    }

    // ── Internals ─────────────────────────────────────────────────────────

    private fun currentStatus(): JSONObject {
        return JSONObject()
            .put("fcmEnabled", BuildConfig.FCM_ENABLED)
            .put("permission", currentPermission())
            .put("token", cachedToken())
    }

    private fun currentPermission(): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            // Pre-Android 13: no runtime permission for notifications. Treat
            // as granted unless the user has disabled the app's notifications
            // via system settings (which we cannot reliably read).
            return "granted"
        }
        val activity = activityRef.get() ?: return "default"
        val granted = ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
        if (granted) return "granted"
        // Distinguish "user denied at least once" (return "denied") from
        // "first launch, never asked" (return "default") via a SharedPrefs
        // flag we set in onPermissionResult.
        return if (prefs().getBoolean(KEY_DENIED_ONCE, false)) "denied" else "default"
    }

    private fun refreshToken(replyProxy: JavaScriptReplyProxy?, cbId: String) {
        if (!BuildConfig.FCM_ENABLED) {
            replyProxy?.let { resolve(it, cbId, currentStatus()) }
            return
        }
        try {
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { token ->
                    if (!token.isNullOrBlank()) {
                        cacheToken(token)
                        pushEvent(JSONObject().put("type", "token").put("token", token))
                    }
                    replyProxy?.let { resolve(it, cbId, currentStatus()) }
                }
                .addOnFailureListener { err ->
                    Log.w(TAG, "FCM getToken failed", err)
                    replyProxy?.let { resolve(it, cbId, currentStatus()) }
                }
        } catch (t: Throwable) {
            Log.w(TAG, "FCM unavailable", t)
            replyProxy?.let { resolve(it, cbId, currentStatus()) }
        }
    }

    private fun requestPermission(replyProxy: JavaScriptReplyProxy, cbId: String) {
        val activity = activityRef.get()
        if (activity == null) {
            resolveError(replyProxy, cbId, "activity_unavailable")
            return
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            // No runtime permission needed.
            resolve(replyProxy, cbId, currentStatus())
            // Still emit a "permission" event so the JS adapter's pending
            // requestPermission() promise resolves consistently.
            pushEvent(JSONObject().put("type", "permission").put("permission", "granted"))
            return
        }
        if (ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            resolve(replyProxy, cbId, currentStatus())
            pushEvent(JSONObject().put("type", "permission").put("permission", "granted"))
            return
        }
        // Acknowledge the request so the JS side can stop spinning; the
        // actual grant/deny event is dispatched later from
        // MainActivity.onRequestPermissionsResult → onPermissionResult.
        resolve(replyProxy, cbId, currentStatus())
        activity.requestPermissions(
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            PERMISSION_REQUEST_CODE,
        )
    }

    private fun originMatches(sourceOrigin: Uri): Boolean {
        val src = sourceOrigin.toString().trimEnd('/')
        return src.equals(trustedOrigin.trimEnd('/'), ignoreCase = true)
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
        } catch (_: Throwable) {
            /* ignore */
        }
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

    private fun resolve(replyProxy: JavaScriptReplyProxy, cbId: String, data: JSONObject) {
        sendRaw(replyProxy, JSONObject().put("ok", true).put("cbId", cbId).put("data", data))
    }

    private fun resolveError(replyProxy: JavaScriptReplyProxy, cbId: String, message: String) {
        sendRaw(replyProxy, JSONObject().put("ok", false).put("cbId", cbId).put("error", message))
    }

    private fun pushEvent(payload: JSONObject) {
        val proxy = replyProxyRef?.get() ?: return
        sendRaw(proxy, payload)
    }

    private fun sendRaw(replyProxy: JavaScriptReplyProxy, payload: JSONObject) {
        val webView = webViewRef.get() ?: return
        webView.post {
            try {
                replyProxy.postMessage(payload.toString())
            } catch (t: Throwable) {
                Log.w(TAG, "postMessage failed", t)
            }
        }
    }

    companion object {
        private const val TAG = "PushBridge"
        const val JS_OBJECT_NAME = "AmyNestPushNative"
        const val PERMISSION_REQUEST_CODE = 9421
        private const val PREFS = "kidschedule_push"
        private const val KEY_TOKEN = "fcm_token"
        private const val KEY_DENIED_ONCE = "permission_denied_once"

        /**
         * Process-level callback FcmService invokes when a token rotation
         * arrives. The active PushBridge installs itself here; if no
         * activity is foreground, the token is still cached on disk and
         * picked up on the next [refreshToken] call.
         */
        @Volatile
        var tokenListener: ((String) -> Unit)? = null

        /** Persist the rotated token from FcmService and notify any active bridge. */
        fun onTokenRotated(context: Context, token: String) {
            try {
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(KEY_TOKEN, token).apply()
            } catch (_: Throwable) { /* ignore */ }
            tokenListener?.invoke(token)
        }

        /**
         * Install the bridge with a strict allowed-origin rule. Returns the
         * installed bridge, or null when the WebView runtime does not
         * support [WebViewFeature.WEB_MESSAGE_LISTENER] (very old Android
         * System WebView builds) — in that case the JS side simply does
         * not see `window.AmyNestPushNative` and falls back to its
         * non-wrapper code path.
         */
        fun installOn(
            activity: Activity,
            webView: WebView,
            trustedOriginUrl: String,
        ): PushBridge? {
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                Log.w(TAG, "WebMessageListener unsupported — bridge disabled")
                return null
            }
            val originRule = toOriginRule(trustedOriginUrl) ?: run {
                Log.w(TAG, "could not derive origin from $trustedOriginUrl — bridge disabled")
                return null
            }
            val bridge = PushBridge(activity, webView, originRule)
            return try {
                WebViewCompat.addWebMessageListener(
                    webView,
                    JS_OBJECT_NAME,
                    setOf(originRule),
                ) { _: WebView, message: WebMessageCompat,
                    sourceOrigin: Uri, _: Boolean,
                    replyProxy: JavaScriptReplyProxy ->
                    val data = message.data ?: return@addWebMessageListener
                    bridge.handleMessage(data, sourceOrigin, replyProxy)
                }
                tokenListener = bridge.onNewTokenListener
                bridge
            } catch (t: Throwable) {
                Log.e(TAG, "addWebMessageListener failed", t)
                null
            }
        }

        /** Strip path/query/fragment so the rule is `scheme://host[:port]`. */
        private fun toOriginRule(url: String): String? {
            val uri = try {
                Uri.parse(url)
            } catch (_: Throwable) {
                return null
            }
            val scheme = uri.scheme?.lowercase() ?: return null
            val host = uri.host ?: return null
            val portPart = if (uri.port == -1) "" else ":${uri.port}"
            return "$scheme://$host$portPart"
        }
    }
}
