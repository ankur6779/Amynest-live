package com.amynest.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
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
        val pending = pendingSignInReply ?: return
        pendingSignInReply = null
        val (replyProxy, cbId) = pending

        if (resultCode != Activity.RESULT_OK || data == null) {
            resolveError(replyProxy, cbId, "user_cancelled")
            return
        }

        try {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            val account = task.getResult(ApiException::class.java)
            resolveGoogleAccount(replyProxy, cbId, account)
        } catch (e: ApiException) {
            Log.w(TAG, "Google sign-in ApiException status=${e.statusCode}", e)
            when (e.statusCode) {
                12501 -> resolveError(replyProxy, cbId, "user_cancelled")
                10 -> resolveError(replyProxy, cbId, "developer_error")
                else -> resolveError(replyProxy, cbId, e.message ?: "google_sign_in_failed")
            }
        } catch (t: Throwable) {
            Log.e(TAG, "Google sign-in failed", t)
            resolveError(replyProxy, cbId, t.message ?: "google_sign_in_failed")
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
        when (action) {
            "isAvailable" -> resolve(replyProxy, cbId, JSONObject().put("available", isReady()))
            "signInWithGoogle" -> signInWithGoogle(replyProxy, cbId)
            "signOutGoogle" -> signOutGoogle(replyProxy, cbId)
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

    private fun ensureGoogleClient(activity: Activity): GoogleSignInClient {
        googleSignInClient?.let { return it }
        val webClientId = activity.getString(R.string.amynest_google_web_client_id)
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

    private fun resolveGoogleAccount(
        replyProxy: JavaScriptReplyProxy,
        cbId: String,
        account: GoogleSignInAccount?,
    ) {
        if (account == null) {
            resolveError(replyProxy, cbId, "google_account_missing")
            return
        }
        val idToken = account.idToken
        if (idToken.isNullOrBlank()) {
            resolveError(replyProxy, cbId, "no_id_token")
            return
        }
        resolve(
            replyProxy,
            cbId,
            JSONObject()
                .put("idToken", idToken)
                .put("email", account.email ?: JSONObject.NULL)
                .put("displayName", account.displayName ?: JSONObject.NULL)
                .put("photoUrl", account.photoUrl?.toString() ?: JSONObject.NULL),
        )
    }

    private fun resolve(replyProxy: JavaScriptReplyProxy, cbId: String, data: JSONObject) {
        sendRaw(replyProxy, cbId, JSONObject().put("ok", true).put("data", data))
    }

    private fun resolveError(replyProxy: JavaScriptReplyProxy, cbId: String, message: String) {
        sendRaw(replyProxy, cbId, JSONObject().put("ok", false).put("error", message))
    }

    private fun sendRaw(replyProxy: JavaScriptReplyProxy, cbId: String, payload: JSONObject) {
        if (!payload.has("cbId")) payload.put("cbId", cbId)
        val webView = webViewRef.get() ?: return
        webView.post {
            try {
                replyProxy.postMessage(payload.toString())
            } catch (t: Throwable) {
                Log.w(TAG, "postMessage failed", t)
            }
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
        webView.post {
            try {
                val js =
                    "(function(){try{" +
                        "var p=JSON.parse(${JSONObject.quote(message)});" +
                        "if(window.AmyNestAuthNative&&window.AmyNestAuthNative.onmessage){" +
                        "window.AmyNestAuthNative.onmessage({data:JSON.stringify(p)});" +
                        "}}catch(e){}})();"
                webView.evaluateJavascript(js, null)
            } catch (t: Throwable) {
                Log.w(TAG, "postAuthReply failed", t)
            }
        }
    }

    companion object {
        private const val TAG = "AuthBridge"
        const val JS_OBJECT_NAME = "AmyNestAuthNative"
        const val JS_INJECT_NAME = "AmyNestAuthInject"
        const val BRIDGE_VERSION = "1.0.0"

        private val ALLOWED_ORIGINS: Set<String> = WebViewOrigins.productionOriginRules()

        fun installOn(activity: Activity, webView: WebView): AuthBridge {
            val bridge = AuthBridge(activity, webView)
            installInjectBridge(webView, bridge)
            installDocumentStartPolyfill(webView)

            if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                Log.w(TAG, "WebMessageListener unsupported — using inject bridge only")
                return bridge
            }

            try {
                WebViewCompat.addWebMessageListener(
                    webView,
                    JS_OBJECT_NAME,
                    ALLOWED_ORIGINS,
                ) { _: WebView, message: WebMessageCompat,
                    sourceOrigin: Uri, _: Boolean,
                    replyProxy: JavaScriptReplyProxy ->
                    val data = message.data ?: return@addWebMessageListener
                    bridge.handleMessage(data, sourceOrigin, replyProxy)
                }
                Log.d(TAG, "Auth bridge installed (origins=$ALLOWED_ORIGINS version=$BRIDGE_VERSION)")
            } catch (t: Throwable) {
                Log.e(TAG, "addWebMessageListener failed — inject bridge remains active", t)
            }
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
