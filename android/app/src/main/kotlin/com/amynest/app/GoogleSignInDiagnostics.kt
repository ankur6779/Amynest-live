package com.amynest.app

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import org.json.JSONObject
import java.security.MessageDigest

/**
 * Runtime + build-time helpers for native Google Sign-In configuration.
 *
 * DEVELOPER_ERROR (ApiException status 10) almost always means the app's
 * signing SHA-1 is missing from Firebase / Google Cloud for [packageName].
 * Play Store builds must register the **Play App Signing** certificate SHA-1,
 * not only the upload keystore.
 */
object GoogleSignInDiagnostics {
    private const val TAG = "GoogleSignInConfig"

    /** Prefer google-services generated id; fall back to strings.xml. */
    fun resolveWebClientId(context: Context): String {
        val generatedId = readGeneratedWebClientId(context)
        if (!generatedId.isNullOrBlank()) {
            Log.d(TAG, "webClientId source=google-services default_web_client_id")
            return generatedId
        }
        val fallback = context.getString(R.string.amynest_google_web_client_id)
        Log.d(TAG, "webClientId source=strings.xml amynest_google_web_client_id")
        return fallback
    }

    private fun readGeneratedWebClientId(context: Context): String? {
        return try {
            val resId =
                context.resources.getIdentifier(
                    "default_web_client_id",
                    "string",
                    context.packageName,
                )
            if (resId == 0) null else context.getString(resId).trim().takeIf { it.isNotEmpty() }
        } catch (_: Throwable) {
            null
        }
    }

    fun getSigningSha1(context: Context): String? = getCertFingerprint(context, "SHA-1")

    fun getSigningSha256(context: Context): String? = getCertFingerprint(context, "SHA-256")

    @Suppress("DEPRECATION")
    private fun getCertFingerprint(context: Context, algorithm: String): String? {
        return try {
            val pm = context.packageManager
            val flags =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    PackageManager.GET_SIGNING_CERTIFICATES
                } else {
                    PackageManager.GET_SIGNATURES
                }
            val packageInfo = pm.getPackageInfo(context.packageName, flags)
            val signatures =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    packageInfo.signingInfo?.apkContentsSigners
                } else {
                    packageInfo.signatures
                }
            val sig = signatures?.firstOrNull() ?: return null
            val digestAlg = algorithm.replace("-", "")
            val md = MessageDigest.getInstance(digestAlg)
            val digest = md.digest(sig.toByteArray())
            digest.joinToString("") { b -> "%02x".format(b) }
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to read $algorithm fingerprint", t)
            null
        }
    }

    fun logStartupDiagnostics(context: Context, webClientId: String) {
        val sha1 = getSigningSha1(context)
        val sha256 = getSigningSha256(context)
        Log.i(
            TAG,
            "Google Sign-In startup package=${context.packageName} " +
                "webClientId=${maskClientId(webClientId)} " +
                "signingSha1=${sha1 ?: "unknown"} " +
                "signingSha256=${sha256 ?: "unknown"} " +
                "bridgeVersion=${AuthBridge.BRIDGE_VERSION}",
        )
        if (sha1.isNullOrBlank()) {
            Log.w(
                TAG,
                "Could not read signing SHA-1. If sign-in fails with developer_error, " +
                    "add Play Console App Signing + upload keystore SHA-1 to Firebase " +
                    "→ Project Settings → Android app ${context.packageName}.",
            )
        }
    }

    fun buildDiagnosticsJson(context: Context, webClientId: String): JSONObject {
        val generated = readGeneratedWebClientId(context)
        return JSONObject()
            .put("packageName", context.packageName)
            .put("webClientIdSource", if (generated != null) "google-services" else "strings.xml")
            .put("webClientIdSuffix", webClientId.takeLast(20))
            .put("signingSha1", getSigningSha1(context) ?: JSONObject.NULL)
            .put("signingSha256", getSigningSha256(context) ?: JSONObject.NULL)
            .put("bridgeVersion", AuthBridge.BRIDGE_VERSION)
    }

    private fun maskClientId(clientId: String): String {
        if (clientId.length <= 24) return clientId
        return clientId.take(12) + "…" + clientId.takeLast(8)
    }
}
