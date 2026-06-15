package com.amynest.app

import android.content.Context
import android.util.Log
import android.webkit.WebView
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * Fetches Google Play Install Referrer on cold start and injects attribution
 * data into the WebView as `window.__AMYNEST_INSTALL_REFERRER`.
 */
class InstallReferrerBridge(
    context: Context,
    webView: WebView,
) {
    private val contextRef = WeakReference(context.applicationContext)
    private val webViewRef = WeakReference(webView)

    fun fetchAndInject() {
        val ctx = contextRef.get() ?: return
        try {
            val client = InstallReferrerClient.newBuilder(ctx).build()
            client.startConnection(object : InstallReferrerStateListener {
                override fun onInstallReferrerSetupFinished(responseCode: Int) {
                    when (responseCode) {
                        InstallReferrerClient.InstallReferrerResponse.OK -> {
                            try {
                                val response = client.installReferrer
                                val payload = JSONObject()
                                    .put("referrer", response.installReferrer ?: "")
                                    .put("clickTimestamp", response.referrerClickTimestampSeconds)
                                    .put("installTimestamp", response.installBeginTimestampSeconds)
                                    .put("instantExperienceLaunched", response.googlePlayInstantParam)
                                injectReferrer(payload)
                                Log.d(TAG, "Install referrer injected")
                            } catch (e: Exception) {
                                Log.w(TAG, "Failed to read install referrer: ${e.message}")
                            } finally {
                                client.endConnection()
                            }
                        }
                        else -> {
                            Log.w(TAG, "Install referrer unavailable: code=$responseCode")
                            client.endConnection()
                        }
                    }
                }

                override fun onInstallReferrerServiceDisconnected() {
                    Log.d(TAG, "Install referrer service disconnected")
                }
            })
        } catch (e: Exception) {
            Log.w(TAG, "Install referrer client failed: ${e.message}")
        }
    }

    private fun injectReferrer(payload: JSONObject) {
        val wv = webViewRef.get() ?: return
        val json = payload.toString()
        val js =
            "(function(){" +
                "try{window.__AMYNEST_INSTALL_REFERRER=$json;" +
                "window.dispatchEvent(new CustomEvent('amynest-install-referrer'," +
                "{detail:$json}));}catch(e){}" +
            "})();"
        wv.post { wv.evaluateJavascript(js, null) }
    }

    companion object {
        private const val TAG = "InstallReferrer"

        fun fetchOn(activity: android.app.Activity, webView: WebView) {
            InstallReferrerBridge(activity, webView).fetchAndInject()
        }
    }
}
