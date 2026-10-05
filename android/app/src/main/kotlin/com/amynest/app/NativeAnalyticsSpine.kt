package com.amynest.app

import android.content.Context
import android.os.Build
import android.util.Log
import android.webkit.WebView
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.Executors

/**
 * Native analytics spine: a stable per-install device id, document-start
 * injection into the WebView, and a pre-auth first_open POST that does not
 * wait for SPA hydration.
 *
 * Firebase AUTO first_open is a different event. This class writes the
 * internal `/api/analytics/preauth-events` first_open used by Coolify
 * `analytics_events`.
 */
object NativeAnalyticsSpine {
    private const val TAG = "NativeAnalytics"
    private const val PREFS = "amynest_analytics"
    private const val WEB_PREFS = "amynest_webview"
    private const val KEY_DEVICE_ID = "device_id"
    private const val KEY_FIRST_OPEN_SENT = "first_open_sent"
    private const val KEY_INSTALL_SOURCE_FINGERPRINT = "install_source_fingerprint"
    private const val KEY_REFERRER_JSON = "referrer_json"
    private const val INGEST_PATH = "/api/analytics/preauth-events"
    private const val CONNECT_TIMEOUT_MS = 8_000
    private const val READ_TIMEOUT_MS = 8_000

    private val executor = Executors.newSingleThreadExecutor()

    fun bootstrap(context: Context) {
        val app = context.applicationContext
        getOrCreateDeviceId(app)
        executor.execute {
            sendFirstOpenIfFreshInstall(app)
        }
    }

    fun getOrCreateDeviceId(context: Context): String {
        val prefs = prefs(context)
        val existing = prefs.getString(KEY_DEVICE_ID, null)
        if (!existing.isNullOrBlank() && existing.length >= 8) return existing
        val id = UUID.randomUUID().toString()
        prefs.edit().putString(KEY_DEVICE_ID, id).apply()
        return id
    }

    fun installDocumentStart(webView: WebView, context: Context) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            Log.w(TAG, "DOCUMENT_START_SCRIPT not supported — native analytics marker NOT installed")
            return
        }
        try {
            WebViewCompat.addDocumentStartJavaScript(
                webView,
                documentStartScript(context),
                WebViewOrigins.productionOriginRules(),
            )
            Log.d(TAG, "Native analytics document-start script installed")
        } catch (t: Throwable) {
            Log.e(TAG, "Failed to install native analytics document-start script", t)
        }
    }

    fun cachedReferrerJson(context: Context): JSONObject? {
        val raw = prefs(context).getString(KEY_REFERRER_JSON, null) ?: return null
        return try {
            JSONObject(raw)
        } catch (_: Exception) {
            null
        }
    }

    fun onReferrer(context: Context, payload: JSONObject) {
        val app = context.applicationContext
        prefs(app).edit().putString(KEY_REFERRER_JSON, payload.toString()).apply()
        executor.execute {
            sendInstallSource(app, payload)
        }
    }

    fun markNativeFirstOpenSentInPage(webView: WebView, context: Context) {
        if (!prefs(context).getBoolean(KEY_FIRST_OPEN_SENT, false)) return
        val js =
            "(function(){try{" +
                "window.__AMYNEST_NATIVE_FIRST_OPEN_SENT=true;" +
                "localStorage.setItem('amynest_analytics_first_open','1');" +
                "}catch(e){}})();"
        webView.post {
            try {
                webView.evaluateJavascript(js, null)
            } catch (e: Exception) {
                Log.w(TAG, "markNativeFirstOpenSentInPage failed: ${e.message}")
            }
        }
    }

    private fun documentStartScript(context: Context): String {
        val deviceId = JSONObject.quote(getOrCreateDeviceId(context))
        val version = JSONObject.quote(BuildConfig.VERSION_NAME)
        val nativeSent = prefs(context).getBoolean(KEY_FIRST_OPEN_SENT, false)
        val referrerRaw = prefs(context).getString(KEY_REFERRER_JSON, null)
        val referrerJs = if (referrerRaw.isNullOrBlank()) "null" else referrerRaw
        return """
            (function(){
              try {
                var id = $deviceId;
                window.__AMYNEST_NATIVE_DEVICE_ID = id;
                window.__AMYNEST_APP_VERSION = $version;
                window.__AMYNEST_NATIVE_ANALYTICS = true;
                window.__AMYNEST_NATIVE_FIRST_OPEN_SENT = $nativeSent;
                var k = 'amynest:device:id:v1';
                var existing = null;
                try { existing = localStorage.getItem(k); } catch (e) {}
                if (!existing) {
                  try { localStorage.setItem(k, id); existing = id; } catch (e) {}
                }
                window.__AMYNEST_RESOLVED_DEVICE_ID = existing || id;
                var ref = $referrerJs;
                if (ref) {
                  window.__AMYNEST_INSTALL_REFERRER = ref;
                }
              } catch (e) {}
            })();
        """.trimIndent()
    }

    private fun sendFirstOpenIfFreshInstall(context: Context) {
        if (prefs(context).getBoolean(KEY_FIRST_OPEN_SENT, false)) return
        val webPrefs = context.getSharedPreferences(WEB_PREFS, Context.MODE_PRIVATE)
        if (webPrefs.contains("wrapper_version")) {
            prefs(context).edit().putBoolean(KEY_FIRST_OPEN_SENT, true).apply()
            Log.d(TAG, "Skipping native first_open on wrapper upgrade")
            return
        }
        val deviceId = getOrCreateDeviceId(context)
        val props = JSONObject()
            .put("cold", true)
            .put("event_key", "$deviceId:first_open")
            .put("anonymous_id", "device:$deviceId")
            .put("device_id", deviceId)
            .put("auth_state", "guest")
        cachedReferrerJson(context)?.optString("referrer")?.let { referrer ->
            if (referrer.isNotBlank()) {
                val parsed = parseReferrer(referrer)
                parsed.keys().forEach { key ->
                    if (!props.has(key)) props.put(key, parsed.get(key))
                }
            }
        }
        val event = JSONObject()
            .put("name", "first_open")
            .put("props", props)
            .put("clientTs", nowIso())
        val ok = postPreauth(context, JSONArray().put(event))
        if (ok) {
            prefs(context).edit().putBoolean(KEY_FIRST_OPEN_SENT, true).apply()
            Log.d(TAG, "Native first_open ingested")
        } else {
            Log.w(TAG, "Native first_open ingest failed — will retry on next launch")
        }
    }

    private fun sendInstallSource(context: Context, payload: JSONObject) {
        val referrer = payload.optString("referrer", "")
        val parsed = parseReferrer(referrer)
        val fingerprint = parsed.toString()
        if (prefs(context).getString(KEY_INSTALL_SOURCE_FINGERPRINT, null) == fingerprint) return
        val deviceId = getOrCreateDeviceId(context)
        parsed.put("event_key", "$deviceId:install_source")
        parsed.put("anonymous_id", "device:$deviceId")
        parsed.put("device_id", deviceId)
        val event = JSONObject()
            .put("name", "install_source")
            .put("props", parsed)
            .put("clientTs", nowIso())
        val ok = postPreauth(context, JSONArray().put(event))
        if (ok) {
            prefs(context).edit().putString(KEY_INSTALL_SOURCE_FINGERPRINT, fingerprint).apply()
            Log.d(TAG, "Native install_source ingested")
        }
    }

    private fun parseReferrer(referrer: String): JSONObject {
        val out = JSONObject()
        if (referrer.isBlank()) {
            out.put("source", "unknown")
            return out
        }
        out.put("play_referrer", referrer.take(512))
        val params = referrer.split("&")
        val map = linkedMapOf<String, String>()
        for (part in params) {
            val idx = part.indexOf("=")
            if (idx <= 0) continue
            val key = java.net.URLDecoder.decode(part.substring(0, idx), Charsets.UTF_8.name())
            val value = java.net.URLDecoder.decode(part.substring(idx + 1), Charsets.UTF_8.name())
            map[key] = value
        }
        val utmSource = map["utm_source"] ?: map["source"]
        val utmMedium = map["utm_medium"] ?: map["medium"]
        val utmCampaign = map["utm_campaign"] ?: map["campaign"]
        val gclid = map["gclid"]
        val gbraid = map["gbraid"]
        val wbraid = map["wbraid"]
        val fbclid = map["fbclid"]
        val campaignId = map["campaign_id"] ?: map["campaignid"]
            ?: utmCampaign?.takeIf { it.matches(Regex("^\\d{6,}$")) }
        if (!utmSource.isNullOrBlank()) out.put("utm_source", utmSource.take(128))
        if (!utmMedium.isNullOrBlank()) out.put("utm_medium", utmMedium.take(128))
        if (!utmCampaign.isNullOrBlank()) out.put("utm_campaign", utmCampaign.take(128))
        if (!gclid.isNullOrBlank()) out.put("gclid", gclid.take(128))
        if (!gbraid.isNullOrBlank()) out.put("gbraid", gbraid.take(128))
        if (!wbraid.isNullOrBlank()) out.put("wbraid", wbraid.take(128))
        if (!fbclid.isNullOrBlank()) out.put("fbclid", fbclid.take(128))
        if (!campaignId.isNullOrBlank()) out.put("campaign_id", campaignId.take(64))
        val source = when {
            !gclid.isNullOrBlank() -> "google_ads"
            !fbclid.isNullOrBlank() -> "meta_ads"
            utmSource?.contains("google", ignoreCase = true) == true -> "google_ads"
            else -> if (utmSource.isNullOrBlank()) "play_referrer" else utmSource.take(64)
        }
        out.put("source", source)
        return out
    }

    private fun postPreauth(context: Context, events: JSONArray): Boolean {
        val deviceId = getOrCreateDeviceId(context)
        val body = JSONObject()
            .put("platform", "android")
            .put("appVersion", BuildConfig.VERSION_NAME)
            .put("buildNumber", BuildConfig.VERSION_CODE.toString())
            .put("environment", "production")
            .put("events", events)
            .toString()
        val endpoint = WebViewOrigins.CANONICAL_WRAPPER_URL + INGEST_PATH
        var connection: HttpURLConnection? = null
        return try {
            connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("x-amynest-device-id", deviceId)
                setRequestProperty("x-amynest-platform", "android")
                setRequestProperty("x-amynest-os", "Android")
                setRequestProperty("x-amynest-app-version", BuildConfig.VERSION_NAME)
                setRequestProperty("x-amynest-browser", "Chrome")
                setRequestProperty(
                    "User-Agent",
                    "AmyNestAndroid/${BuildConfig.VERSION_NAME} (Linux; Android ${Build.VERSION.RELEASE})",
                )
            }
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(body) }
            val code = connection.responseCode
            val ok = code in 200..299
            if (!ok) {
                Log.w(TAG, "preauth ingest HTTP $code")
            }
            ok
        } catch (t: Throwable) {
            Log.w(TAG, "preauth ingest failed: ${t.message}")
            false
        } finally {
            connection?.disconnect()
        }
    }

    private fun nowIso(): String {
        val fmt = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
        fmt.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return fmt.format(java.util.Date())
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
