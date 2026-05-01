package com.kidschedule.app

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.content.ContextCompat

/**
 * Exposes native FCM + Android notification permission status to the web
 * app inside the WebView under `window.AmyNestPushNative`. Android WebView
 * has no Notification API of its own, so the web app uses this bridge to
 * register the device's native FCM token with the existing
 * `/api/push/register` endpoint.
 *
 * Surfaced JS API (all sync — token / status are cached on init):
 *   window.AmyNestPushNative.fcmEnabled        : boolean
 *   window.AmyNestPushNative.getToken()        : string | null
 *   window.AmyNestPushNative.getPermissionStatus() : "granted"|"denied"|"default"
 *   window.AmyNestPushNative.requestPermission()   : void
 *
 * Permission-request results are dispatched back to the web app as a
 * CustomEvent on window:
 *   window.dispatchEvent(new CustomEvent("amynest-push-permission", {
 *     detail: { status: "granted"|"denied" }
 *   }))
 *
 * Token-ready (on first fetch after install) is similarly dispatched as:
 *   window.dispatchEvent(new CustomEvent("amynest-push-token", {
 *     detail: { token: "<fcm-token>" }
 *   }))
 *
 * Security: addJavascriptInterface here is safe because the WebView's
 * shouldOverrideUrlLoading whitelists same-origin navigation only, so
 * cross-origin iframes / redirects cannot reach `window.AmyNestPushNative`.
 */
class PushBridge(
    private val activity: Activity,
    private val webView: WebView,
) {
    companion object {
        private const val TAG = "PushBridge"
        private const val JS_NAME = "AmyNestPushNative"
        const val PERMISSION_REQUEST_CODE = 9421
        private const val PREFS = "kidschedule_push"
        private const val KEY_TOKEN = "fcm_token"
    }

    @Volatile
    private var cachedToken: String? = null

    fun install() {
        webView.addJavascriptInterface(this, JS_NAME)
        // Surface previously-persisted token immediately so getToken() is
        // sync-correct on the very first JS call after process start.
        cachedToken = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_TOKEN, null)
        // Kick off async refresh; emit event when ready.
        if (BuildConfig.FCM_ENABLED) {
            refreshToken()
        }
    }

    private fun refreshToken() {
        try {
            // Reflection-free direct call via FirebaseMessaging — but we
            // import lazily so a build without google-services.json (FCM
            // disabled) does not blow up at class-load time.
            val fmClass = Class.forName("com.google.firebase.messaging.FirebaseMessaging")
            val getInstance = fmClass.getMethod("getInstance")
            val instance = getInstance.invoke(null)
            val getToken = fmClass.getMethod("getToken")
            val task = getToken.invoke(instance)

            // task.addOnCompleteListener { listener -> ... }
            val taskClass = Class.forName("com.google.android.gms.tasks.Task")
            val addOnComplete = taskClass.getMethod(
                "addOnCompleteListener",
                Class.forName("com.google.android.gms.tasks.OnCompleteListener"),
            )
            val listenerClass = Class.forName("com.google.android.gms.tasks.OnCompleteListener")
            val proxy = java.lang.reflect.Proxy.newProxyInstance(
                listenerClass.classLoader,
                arrayOf(listenerClass),
            ) { _, method, args ->
                if (method.name == "onComplete" && args != null && args.isNotEmpty()) {
                    val completedTask = args[0]
                    try {
                        val isSuccessful = taskClass.getMethod("isSuccessful").invoke(completedTask) as Boolean
                        if (isSuccessful) {
                            val result = taskClass.getMethod("getResult").invoke(completedTask) as? String
                            if (!result.isNullOrBlank()) {
                                cachedToken = result
                                activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                                    .edit().putString(KEY_TOKEN, result).apply()
                                emitTokenReady(result)
                            }
                        } else {
                            Log.w(TAG, "FCM getToken failed")
                        }
                    } catch (t: Throwable) {
                        Log.w(TAG, "FCM token callback error", t)
                    }
                }
                null
            }
            addOnComplete.invoke(task, proxy)
        } catch (t: Throwable) {
            Log.w(TAG, "FCM unavailable — push disabled", t)
        }
    }

    private fun emitTokenReady(token: String) {
        val safe = token.replace("\\", "\\\\").replace("'", "\\'")
        activity.runOnUiThread {
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('amynest-push-token', { detail: { token: '$safe' } }));",
                null,
            )
        }
    }

    fun emitPermissionResult(granted: Boolean) {
        val status = if (granted) "granted" else "denied"
        activity.runOnUiThread {
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('amynest-push-permission', { detail: { status: '$status' } }));",
                null,
            )
            // If granted and we already have a cached token, re-emit so the
            // web app can register it without waiting for a token rotation.
            if (granted) {
                cachedToken?.let { emitTokenReady(it) }
            }
        }
    }

    // ── JS-callable surface (synchronous) ────────────────────────────────────

    @JavascriptInterface
    fun getFcmEnabled(): Boolean = BuildConfig.FCM_ENABLED

    @JavascriptInterface
    fun getToken(): String? = cachedToken

    @JavascriptInterface
    fun getPermissionStatus(): String {
        // Pre-Android 13 there is no runtime permission for notifications;
        // they're allowed by default unless the user disabled the app's
        // notifications via system settings (which we cannot read without
        // additional plumbing). Treat as granted.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return "granted"
        }
        val granted = ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
        return if (granted) "granted" else "default"
    }

    @JavascriptInterface
    fun requestPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            // Already granted on older devices.
            emitPermissionResult(true)
            return
        }
        if (ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            emitPermissionResult(true)
            return
        }
        activity.requestPermissions(
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            PERMISSION_REQUEST_CODE,
        )
    }
}
