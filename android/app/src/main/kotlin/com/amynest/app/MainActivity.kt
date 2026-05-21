package com.amynest.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.ServiceWorkerController
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject

private const val TAG = "MainActivity"
private const val BASE_URL = "https://www.amynest.in"

/**
 * MainActivity — full-screen WebView wrapper for https://amynest.in.
 *
 * Key responsibilities:
 *  1. Renders the PWA in a full-screen [WebView] (no address bar, no Chrome UI).
 *
 *  2. Installs [PushBridge] so the web page can request/receive FCM tokens.
 *
 *  3. Handles FCM deep-link taps (cold start + warm start via [onNewIntent]):
 *       - Navigates the WebView to the correct SPA route.
 *       - Calls `window.onNotificationTap(deepLink, category)` after the page
 *         loads so the web layer can show a "Opened from notification" toast
 *         and fire analytics.
 *
 *  4. Requests POST_NOTIFICATIONS permission on Android 13+ on cold start.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var pushBridge: PushBridge

    /** Notification tap payload waiting for onPageFinished to deliver to the web page. */
    private var pendingNotifDeepLink: String? = null
    private var pendingNotifCategory: String? = null

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
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        hideSystemChrome()

        // Capture notification tap extras BEFORE building the WebView so the
        // document-start JS injection and URL construction can use them.
        pendingNotifDeepLink = intent?.getStringExtra("deepLink")
        pendingNotifCategory = intent?.getStringExtra("notifCategory")

        webView = WebView(this).also { wv ->
            wv.id = View.generateViewId()
            wv.overScrollMode = View.OVER_SCROLL_NEVER
            wv.isVerticalScrollBarEnabled = false
            wv.isHorizontalScrollBarEnabled = false

            configureWebView(wv)
            wv.clearCache(true)
            wv.clearHistory()
        }
        setContentView(webView)

        val cookieManager = CookieManager.getInstance()
        cookieManager.removeAllCookies(null)
        cookieManager.flush()

        BillingBridge.installOn(this, webView)

        pushBridge = PushBridge(
            context = this,
            permissionRequester = { askNotificationPermission() },
        )
        pushBridge.install(webView)

        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            if (token != null && pushBridge.getToken() == null) {
                pushBridge.saveToken(token)
                Log.d(TAG, "FCM token bootstrapped from FirebaseMessaging API")
            }
        }

        askNotificationPermission()

        val launchUrl = buildLaunchUrl(intent)
        webView.loadUrl(launchUrl)
        Log.d(TAG, "Loading: $launchUrl (wrapper version=${PushBridge.WRAPPER_VERSION})")
    }

    override fun onResume() {
        super.onResume()
        if (!::pushBridge.isInitialized) return
        val granted = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            true
        } else {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        }
        pushBridge.setPermission(granted)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val deepLink = intent.getStringExtra("deepLink") ?: return
        if (deepLink.isBlank()) return

        val category = intent.getStringExtra("notifCategory") ?: "routine"
        val url = deepLinkToUrl(deepLink)
        Log.d(TAG, "Deep link navigation (onNewIntent) → $url category=$category")

        // App is already running — call onNotificationTap directly
        val js = buildNotifTapJs(deepLink, category)
        webView.post {
            // Navigate first, then signal the web page
            webView.loadUrl(url)
            webView.postDelayed({ webView.evaluateJavascript(js, null) }, 400)
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
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
            javaScriptCanOpenWindowsAutomatically = false
            allowContentAccess = true
            loadsImagesAutomatically = true
            allowFileAccess = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            val model = Build.MODEL.replace(";", " ").trim()
            val release = Build.VERSION.RELEASE
            userAgentString =
                "Mozilla/5.0 (Linux; Android $release; $model) " +
                "AppleWebKit/537.36 (KHTML, like Gecko) " +
                "Chrome/131.0.0.0 Mobile Safari/537.36 AmyNestAndroid/1.0"

            // Optimal PWA scroll settings
            useWideViewPort = true
            loadWithOverviewMode = true
            displayZoomControls = false
            builtInZoomControls = false
            setSupportZoom(false)
            textZoom = 100
            
            // Performance
            @Suppress("DEPRECATION")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
                mediaPlaybackRequiresUserGesture = false
            }
        }

        CookieManager.getInstance().setAcceptThirdPartyCookies(wv, true)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ServiceWorkerController.getInstance()
                .serviceWorkerWebSettings
                .cacheMode = WebSettings.LOAD_NO_CACHE
        }
        
        wv.overScrollMode = View.OVER_SCROLL_NEVER
        wv.isVerticalScrollBarEnabled = false
        wv.isHorizontalScrollBarEnabled = false

        wv.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val url = request.url ?: return false
                val scheme = url.scheme?.lowercase() ?: return false
                // Pure WebView — keep all http(s) navigation inside the app.
                if (scheme == "http" || scheme == "https") {
                    view.loadUrl(url.toString())
                    return true
                }
                if (scheme == "mailto" || scheme == "tel" || scheme == "sms") {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, url))
                    } catch (_: ActivityNotFoundException) { /* ignore */ }
                    return true
                }
                return false
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
            }

            /**
             * Once the page finishes loading, deliver the pending notification tap
             * signal to the web app. This covers the cold-start case where the web
             * page was not mounted when the notification was tapped.
             */
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)

                val dl = pendingNotifDeepLink ?: return
                val cat = pendingNotifCategory ?: "routine"
                // Clear so subsequent page loads don't re-fire.
                pendingNotifDeepLink = null
                pendingNotifCategory = null
                val js = buildNotifTapJs(dl, cat)
                view.evaluateJavascript(js, null)
                Log.d(TAG, "Delivered onNotificationTap → deepLink=$dl category=$cat")
            }
        }

        WebView.setWebContentsDebuggingEnabled(true)
    }

    // ── URL construction ─────────────────────────────────────────────────────

    private fun buildLaunchUrl(intent: Intent?): String {
        val deepLink = intent?.getStringExtra("deepLink")
        if (!deepLink.isNullOrBlank()) return deepLinkToUrl(deepLink)
        return "$BASE_URL?v=${System.currentTimeMillis()}"
    }

    /**
     * Convert a server-side deepLink path (e.g. "/routine/3", "/meals") to a
     * full URL. Uses hash-fragment routing so the WebView doesn't make an HTTP
     * request for the path — the SPA router handles it client-side.
     */
    private fun deepLinkToUrl(path: String): String {
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        val fragment = if (path.startsWith("/")) path else "/$path"
        return "$BASE_URL/#$fragment"
    }

    /**
     * Build a JS snippet that calls `window.onNotificationTap(deepLink, category)`
     * if the function is defined (i.e. the web app has mounted).
     */
    private fun buildNotifTapJs(deepLink: String, category: String): String =
        "if(typeof window.onNotificationTap==='function'){" +
            "window.onNotificationTap(${JSONObject.quote(deepLink)},${JSONObject.quote(category)});" +
        "}"

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
