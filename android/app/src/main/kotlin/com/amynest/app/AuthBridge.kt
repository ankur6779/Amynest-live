package com.amynest.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import org.json.JSONException
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * Google Sign-In bridge for the AmyNest Android WebView wrapper.
 *
 * Exposes `window.AmyNestAuthNative` so the web app can obtain a Google ID token
 * without leaving the WebView (no Chrome Custom Tab / external browser redirect).
 * The web layer exchanges the token with Firebase via `signInWithCredential`.
 */
class AuthBridge(
    activity: Activity,
    webView: WebView,
) {
    private val activityRef = WeakReference(activity)
    private val webViewRef = WeakReference(webView)
    private var signInLauncher: ((Intent) -> Unit)? = null
    private var pendingSignInReply: Pair<JavaScriptReplyProxy, String>? = null
    private var googleSignInClient: GoogleSignInClient? = null

    fun attachSignInLauncher(launcher: (Intent) -> Unit) {
        signInLauncher = launcher
    }

    /** Called from MainActivity's ActivityResultLauncher after the account picker closes. */
    fun onGoogleSignInResult(resultCode: Int, data: Intent?) {
        val pending = pendingSignInReply
        pendingSignInReply = null
        val cbId = pending?.second?.takeIf { it.isNotBlank() }
            ?: readPendingSignInCbId(activityRef.get())
        clearPendingSignInCbId(activityRef.get())

        Log.d(TAG, "onGoogleSignInResult resultCode=$resultCode cbId=${cbId ?: "none"} data=${data != null}")

        if (data == null) {
            val error =
                if (resultCode == Activity.RESULT_CANCELED) "user_cancelled"
                else "google_sign_in_no_data"
            deliverBridgeError(cbId, error)
            return
        }

        // Always parse the Intent — some devices return RESULT_CANCELED even after account pick.
        try {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            val account = task.getResult(ApiException::class.java)
            deliverGoogleSignInSuccess(cbId, account)
            return
        } catch (e: ApiException) {
            Log.w(TAG, "Google sign-in ApiException status=${e.statusCode} message=${e.message}", e)
            if (e.statusCode == 10) {
                val activity = activityRef.get()
                if (activity != null) {
                    val sha1 = GoogleSignInDiagnostics.getSigningSha1(activity)
                    Log.e(
                        TAG,
                        "DEVELOPER_ERROR — add signing SHA-1 to Firebase for package=${activity.packageName} " +
                            "signingSha1=${sha1 ?: "unknown"}. " +
                            "Play Store builds need Play Console App Signing certificate SHA-1.",
                    )
                }
            }
            val error = when (e.statusCode) {
                12501 -> "user_cancelled"
                10 -> "developer_error"
                else -> e.message ?: "google_sign_in_failed"
            }
            deliverBridgeError(cbId, error)
            return
        } catch (t: Throwable) {
            Log.e(TAG, "Google sign-in failed", t)
            deliverBridgeError(cbId, t.message ?: "google_sign_in_failed")
            return
        }
    }

    fun handleMessage(rawMessage: String, sourceOrigin: Uri, replyProxy: JavaScriptReplyProxy) {
        if (!WebViewOrigins.isTrustedAmyNestHost(sourceOrigin.host)) {
            Log.w(TAG, "rejected message from untrusted origin: $sourceOrigin")
            return
        }

        val msg: JSONObject = try {
            JSONObject(rawMessage)
        } catch (_: JSONException) {
            Log.w(TAG, "malformed bridge message")
            return
        }

        val action = msg.optString("action")
        val cbId = msg.optString("cbId", "")
        Log.d(TAG, "bridge message action=$action cbId=${cbId.take(24)} origin=$sourceOrigin")
        when (action) {
            "isAvailable" -> resolve(replyProxy, cbId, JSONObject().put("available", isReady()))
            "getDiagnostics" -> {
                val activity = activityRef.get()
                if (activity == null) {
                    resolveError(replyProxy, cbId, "activity_unavailable")
                } else {
                    val webClientId = resolveWebClientId(activity)
                    resolve(replyProxy, cbId, GoogleSignInDiagnostics.buildDiagnosticsJson(activity, webClientId))
                }
            }
            "signInWithGoogle" -> signInWithGoogle(replyProxy, cbId)
            "signOutGoogle" -> signOutGoogle(replyProxy, cbId)
            "clearPendingGoogleAuth" -> {
                val ctx = activityRef.get() ?: webViewRef.get()?.context
                clearPendingGoogleAuth(ctx)
                resolve(replyProxy, cbId, JSONObject().put("cleared", true))
            }
            else -> resolveError(replyProxy, cbId, "unknown_action:$action")
        }
    }

    private fun isReady(): Boolean {
        val activity = activityRef.get() ?: return false
        return try {
            ensureGoogleClient(activity)
            true
        } catch (t: Throwable) {
            Log.w(TAG, "Google Sign-In not ready", t)
            false
        }
    }

    private fun resolveWebClientId(activity: Activity): String =
        GoogleSignInDiagnostics.resolveWebClientId(activity)

    private fun ensureGoogleClient(activity: Activity): GoogleSignInClient {
        googleSignInClient?.let { return it }
        val webClientId = resolveWebClientId(activity)
        GoogleSignInDiagnostics.logStartupDiagnostics(activity, webClientId)
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(webClientId)
            .requestEmail()
            .requestProfile()
            .build()
        val client = GoogleSignIn.getClient(activity, gso)
        googleSignInClient = client
        return client
    }

    private fun signInWithGoogle(replyProxy: JavaScriptReplyProxy, cbId: String) {
        val activity = activityRef.get()
        if (activity == null) {
            resolveError(replyProxy, cbId, "activity_unavailable")
            return
        }
        val launcher = signInLauncher
        if (launcher == null) {
            resolveError(replyProxy, cbId, "sign_in_launcher_unavailable")
            return
        }
        if (pendingSignInReply != null) {
            resolveError(replyProxy, cbId, "sign_in_already_in_progress")
            return
        }

        try {
            val client = ensureGoogleClient(activity)
            pendingSignInReply = replyProxy to cbId
            persistPendingSignInCbId(activity, cbId)
            Log.i(TAG, "Launching native Google account picker package=${activity.packageName} cbId=$cbId")
            launcher.invoke(client.signInIntent)
        } catch (t: Throwable) {
            pendingSignInReply = null
            Log.e(TAG, "Failed to launch Google sign-in", t)
            resolveError(replyProxy, cbId, t.message ?: "google_sign_in_launch_failed")
        }
    }

    private fun signOutGoogle(replyProxy: JavaScriptReplyProxy, cbId: String) {
        val activity = activityRef.get()
        if (activity == null) {
            resolveError(replyProxy, cbId, "activity_unavailable")
            return
        }
        try {
            val client = ensureGoogleClient(activity)
            client.signOut().addOnCompleteListener {
                resolve(replyProxy, cbId, JSONObject().put("signedOut", true))
            }
        } catch (t: Throwable) {
            resolveError(replyProxy, cbId, t.message ?: "google_sign_out_failed")
        }
    }

    /**
     * After the Google account picker closes, always push the ID token into the WebView.
     * [JavaScriptReplyProxy] from WebMessageListener is often invalid after the sign-in
     * Activity finishes — inject + pending token recovery must still run.
     */
    private fun deliverGoogleSignInSuccess(
        cbId: String?,
        account: GoogleSignInAccount?,
    ) {
        if (account == null) {
            deliverBridgeError(cbId, "google_account_missing")
            return
        }
        val idToken = account.idToken
        if (idToken.isNullOrBlank()) {
            Log.e(TAG, "Google account selected but idToken is empty email=${account.email}")
            deliverBridgeError(cbId, "no_id_token")
            return
        }

        Log.i(
            TAG,
            "Google sign-in success email=${account.email} idTokenLen=${idToken.length} cbId=${cbId ?: "none"}",
        )
        activityRef.get()?.let { persistPendingGoogleIdToken(it, idToken) }
        // Inject token + bridge reply (retries — evaluateJavascript can fail right after picker).
        deliverPendingGoogleAuthIfAny()
        schedulePendingGoogleAuthRetries()

        val data = JSONObject()
            .put("idToken", idToken)
            .put("email", account.email ?: JSONObject.NULL)
            .put("displayName", account.displayName ?: JSONObject.NULL)
            .put("photoUrl", account.photoUrl?.toString() ?: JSONObject.NULL)

        val effectiveCbId = cbId?.takeIf { it.isNotBlank() }
        if (effectiveCbId != null) {
            deliverBridgeSuccess(effectiveCbId, data)
        } else {
            Log.w(TAG, "Google sign-in ok but cbId missing — pending token only")
        }
    }

    private fun resolve(@Suppress("UNUSED_PARAMETER") replyProxy: JavaScriptReplyProxy, cbId: String, data: JSONObject) {
        deliverBridgeSuccess(cbId, data)
    }

    private fun resolveError(@Suppress("UNUSED_PARAMETER") replyProxy: JavaScriptReplyProxy, cbId: String, message: String) {
        deliverBridgeError(cbId, message)
    }

    /** Inject bridge JSON into the WebView (always — never rely on WebMessage replyProxy). */
    private fun deliverBridgeSuccess(cbId: String, data: JSONObject) {
        val payload = JSONObject()
            .put("ok", true)
            .put("cbId", cbId)
            .put("data", data)
            .toString()
        injectBridgePayload(payload)
    }

    private fun deliverBridgeError(cbId: String?, message: String) {
        val effectiveCbId = cbId?.takeIf { it.isNotBlank() } ?: run {
            Log.w(TAG, "Google sign-in error without cbId: $message")
            return
        }
        val payload = JSONObject()
            .put("ok", false)
            .put("cbId", effectiveCbId)
            .put("error", message)
            .toString()
        injectBridgePayload(payload)
    }

    private fun injectBridgePayload(message: String) {
        val webView = webViewRef.get()
        if (webView == null) {
            Log.w(TAG, "injectBridgePayload skipped — WebView unavailable")
            return
        }
        webView.post { postAuthReply(webView, message) }
    }

    /** Inject a pending Google ID token after WebView reload / resume. */
    fun deliverPendingGoogleAuthIfAny() {
        val webView = webViewRef.get() ?: return
        val activity = activityRef.get() ?: return
        val token = readPendingGoogleIdToken(activity) ?: return
        injectPendingGoogleIdTokenJs(webView, token)
    }

    /** Re-post token injection — picker Activity often breaks the first evaluateJavascript. */
    private fun schedulePendingGoogleAuthRetries() {
        val webView = webViewRef.get() ?: return
        val delaysMs = longArrayOf(150L, 400L, 900L)
        for (delay in delaysMs) {
            webView.postDelayed({
                val activity = activityRef.get() ?: return@postDelayed
                val token = readPendingGoogleIdToken(activity) ?: return@postDelayed
                injectPendingGoogleIdTokenJs(webView, token)
            }, delay)
        }
    }

    private fun injectPendingGoogleIdTokenJs(webView: WebView, token: String) {
        val js =
            "(function(){try{" +
                "window.__AMYNEST_PENDING_GOOGLE_ID_TOKEN=${JSONObject.quote(token)};" +
                "window.dispatchEvent(new Event('amynest-google-auth-pending'));" +
                "}catch(e){console.error('[AuthBridge] pending token inject failed',e);}})();"
        webView.evaluateJavascript(js) { result ->
            Log.d(TAG, "Pending Google ID token inject result=$result")
        }
    }

    @SuppressLint("JavascriptInterface")
    inner class AuthInjectInterface {
        @JavascriptInterface
        fun postMessage(rawMessage: String) {
            val wv = webViewRef.get() ?: return
            wv.post {
                deliverJsReply(wv, rawMessage, Uri.parse(WebViewOrigins.CANONICAL_WRAPPER_URL))
            }
        }

        @JavascriptInterface
        fun getPendingGoogleIdToken(): String {
            val ctx = activityRef.get() ?: webViewRef.get()?.context ?: return ""
            return readPendingGoogleIdToken(ctx) ?: ""
        }
    }

    private fun deliverJsReply(webView: WebView, rawMessage: String, sourceOrigin: Uri) {
        handleMessage(rawMessage, sourceOrigin, object : JavaScriptReplyProxy() {
            override fun postMessage(message: String) {
                postAuthReply(webView, message)
            }

            override fun postMessage(message: ByteArray) {
                postMessage(String(message, Charsets.UTF_8))
            }
        })
    }

    private fun postAuthReply(webView: WebView, message: String) {
        val js =
            "(function(){try{" +
                "var p=JSON.parse(${JSONObject.quote(message)});" +
                "if(window.AmyNestAuthNative&&window.AmyNestAuthNative.onmessage){" +
                "window.AmyNestAuthNative.onmessage({data:JSON.stringify(p)});" +
                "}" +
                "window.dispatchEvent(new CustomEvent('amynest-google-auth-bridge-reply',{detail:p}));" +
                "}catch(e){console.error('[AuthBridge] bridge reply failed',e);}})();"
        webView.post {
            try {
                webView.evaluateJavascript(js) { result ->
                    Log.d(TAG, "postAuthReply evaluateJavascript result=$result")
                }
            } catch (t: Throwable) {
                Log.w(TAG, "postAuthReply failed", t)
            }
        }
        webView.postDelayed({
            try {
                webView.evaluateJavascript(js, null)
            } catch (_: Throwable) { /* retry */ }
        }, 250L)
    }

    companion object {
        private const val TAG = "AuthBridge"
        private const val PREFS = "amynest_auth_bridge"
        private const val KEY_PENDING_GOOGLE_ID_TOKEN = "pending_google_id_token"
        private const val KEY_PENDING_SIGN_IN_CB_ID = "pending_google_sign_in_cb_id"
        const val JS_OBJECT_NAME = "AmyNestAuthNative"
        const val JS_INJECT_NAME = "AmyNestAuthInject"
        const val BRIDGE_VERSION = "1.0.0"

        private val ALLOWED_ORIGINS: Set<String> = WebViewOrigins.productionOriginRules()

        fun persistPendingGoogleIdToken(context: Context, idToken: String) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_PENDING_GOOGLE_ID_TOKEN, idToken)
                .commit()
        }

        fun readPendingGoogleIdToken(context: Context): String? =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_PENDING_GOOGLE_ID_TOKEN, null)
                ?.takeIf { it.isNotBlank() }

        fun clearPendingGoogleAuth(context: Context?) {
            if (context == null) return
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_PENDING_GOOGLE_ID_TOKEN)
                .remove(KEY_PENDING_SIGN_IN_CB_ID)
                .apply()
        }

        private fun persistPendingSignInCbId(context: Context?, cbId: String) {
            if (context == null || cbId.isBlank()) return
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_PENDING_SIGN_IN_CB_ID, cbId)
                .apply()
        }

        private fun readPendingSignInCbId(context: Context?): String? =
            context?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                ?.getString(KEY_PENDING_SIGN_IN_CB_ID, null)
                ?.takeIf { it.isNotBlank() }

        private fun clearPendingSignInCbId(context: Context?) {
            if (context == null) return
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_PENDING_SIGN_IN_CB_ID)
                .apply()
        }

        fun installOn(activity: Activity, webView: WebView): AuthBridge {
            val bridge = AuthBridge(activity, webView)
            installInjectBridge(webView, bridge)
            installDocumentStartPolyfill(webView)
            // Inject-only: WebMessageListener replyProxy breaks after Google account picker Activity.
            Log.d(TAG, "Auth bridge installed (inject-only version=$BRIDGE_VERSION)")
            return bridge
        }

        private fun installInjectBridge(webView: WebView, bridge: AuthBridge) {
            webView.addJavascriptInterface(bridge.AuthInjectInterface(), JS_INJECT_NAME)
            Log.d(TAG, "Auth inject interface installed")
        }

        private fun installDocumentStartPolyfill(webView: WebView) {
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                Log.w(TAG, "DOCUMENT_START_SCRIPT unsupported — auth polyfill skipped")
                return
            }
            val script =
                "(function(){" +
                    "if(typeof window.AmyNestAuthNative!=='undefined')return;" +
                    "window.AmyNestAuthNative={" +
                    "postMessage:function(d){if(window.$JS_INJECT_NAME)window.$JS_INJECT_NAME.postMessage(d);}," +
                    "onmessage:null" +
                    "};" +
                    "window.__AMYNEST_AUTH='$BRIDGE_VERSION';" +
                    "})();"
            try {
                WebViewCompat.addDocumentStartJavaScript(webView, script, ALLOWED_ORIGINS)
                Log.d(TAG, "Auth polyfill installed at document_start")
            } catch (t: Throwable) {
                Log.e(TAG, "Auth polyfill install failed", t)
            }
        }
    }
}
