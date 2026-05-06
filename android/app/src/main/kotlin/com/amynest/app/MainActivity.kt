package com.amynest.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.CookieManager
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging

private const val TAG = "MainActivity"
private const val BASE_URL = "https://amynest.in"

/**
 * MainActivity — full-screen WebView wrapper for https://amynest.in.
 *
 * Key responsibilities:
 *  1. Renders the PWA in a full-screen [WebView] (no address bar, no Chrome UI)
 *     so the installed experience matches a native app exactly.
 *
 *  2. Installs [PushBridge] into the WebView as `window.AmyNestPushNative` so
 *     the web app (`native-push-bridge.ts`) can request the native FCM token,
 *     ask for Android 13+ notification permission, and register the token via
 *     `/api/push/register?platform=android` using its own auth session.
 *
 *  3. Handles FCM deep link taps: when the user taps a system-tray notification,
 *     [KidScheduleFcmService] starts this activity with a `deepLink` extra.
 *     We append it as a hash-fragment so the SPA router can navigate to the
 *     correct page (e.g. `https://amynest.in/#/routine/3`).
 *
 *  4. Requests POST_NOTIFICATIONS permission on Android 13+ via [PushBridge]'s
 *     `requestPermission` action.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var pushBridge: PushBridge

    // ── Notification permission launcher (Android 13+) ───────────────────────

    private val notifPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            Log.d(TAG, "Notification permission result: $granted")
            pushBridge.setPermission(granted)
        }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        hideSystemChrome()

        // Build the WebView before wiring the bridge so the JS object is
        // available on the very first page load.
        webView = WebView(this).also { wv ->
            wv.id = View.generateViewId()
            configureWebView(wv)
        }
        setContentView(webView)

        // Wire the Google Play Billing bridge. The web page probes
        // `window.AmyNestBillingNative` and uses it for in-app subscriptions
        // (required by Play Store policy when app is distributed via Play).
        BillingBridge.installOn(this, webView)

        // Wire the native push bridge. The permissionRequester lambda is called
        // when the web page sends { action: "requestPermission" }.
        pushBridge = PushBridge(
            context = this,
            permissionRequester = { askNotificationPermission() },
        )
        pushBridge.install(webView)

        // Ensure the FCM token is available in SharedPreferences — FirebaseMessaging
        // SDK returns the cached token synchronously if it already exists.
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            if (token != null && pushBridge.getToken() == null) {
                pushBridge.saveToken(token)
                Log.d(TAG, "FCM token bootstrapped from FirebaseMessaging API")
            }
        }

        val launchUrl = buildLaunchUrl(intent)
        webView.loadUrl(launchUrl)
        Log.d(TAG, "Loading: $launchUrl")
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        val deepLink = intent?.getStringExtra("deepLink")
        if (!deepLink.isNullOrBlank()) {
            val url = deepLinkToUrl(deepLink)
            Log.d(TAG, "Deep link navigation → $url")
            webView.loadUrl(url)
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    // ── WebView configuration ────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView(wv: WebView) {
        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(false)
            allowContentAccess = true
            loadsImagesAutomatically = true
            // Allow the service worker (Firebase Messaging SW) to run.
            allowFileAccess = false
            cacheMode = WebSettings.LOAD_DEFAULT
            // UserAgent: keep Chrome UA so amynest.in gets the same
            // experience as Chrome — only append a tag so the web app
            // can detect the wrapper via `navigator.userAgent.includes("AmyNestAndroid")`.
            userAgentString = (userAgentString ?: "") + " AmyNestAndroid/1.0"
        }

        // Share cookies with Chrome so the user stays logged in whether they
        // use the app or the browser. Cookie sync is enabled by default for
        // non-private WebViews; this call makes it explicit.
        CookieManager.getInstance().setAcceptThirdPartyCookies(wv, true)

        wv.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val url = request.url ?: return false
                val host = url.host ?: return false
                // Let amynest.in URLs load inside the WebView.
                if (host == "amynest.in" || host.endsWith(".amynest.in")) return false
                // Open external URLs in the system browser.
                startActivity(Intent(Intent.ACTION_VIEW, url))
                return true
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(false) // flip to true for debug builds
        }
    }

    // ── URL construction ─────────────────────────────────────────────────────

    private fun buildLaunchUrl(intent: Intent?): String {
        // If this launch came from a notification tap, open the deep link path.
        val deepLink = intent?.getStringExtra("deepLink")
        if (!deepLink.isNullOrBlank()) return deepLinkToUrl(deepLink)
        return BASE_URL
    }

    /**
     * Convert a server-side deepLink path (e.g. "/routine/3", "/meals") to
     * a full URL. The SPA uses hash-based routing so the WebView doesn't
     * issue an HTTP request for the path — it just feeds the fragment to the
     * client-side router.
     */
    private fun deepLinkToUrl(path: String): String {
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        val fragment = if (path.startsWith("/")) path else "/$path"
        return "$BASE_URL/#$fragment"
    }

    // ── System chrome ────────────────────────────────────────────────────────

    private fun hideSystemChrome() {
        supportActionBar?.hide()
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
    }

    // ── Notification permission ──────────────────────────────────────────────

    private fun askNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            // Pre-Android 13: permission is implicit — just mark as granted.
            pushBridge.setPermission(true)
            return
        }
        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            pushBridge.setPermission(true)
            return
        }
        notifPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
}
