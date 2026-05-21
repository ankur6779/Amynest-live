package com.amynest.app

import android.os.Build
import android.webkit.WebSettings

/**
 * Modern Chrome Mobile UA for Firebase Phone Auth / reCAPTCHA in WebView.
 * Appends AmyNestAndroid so the web layer can detect the native wrapper.
 */
object WebViewUserAgent {
    fun apply(settings: WebSettings, appVersion: String) {
        val model = Build.MODEL.replace(";", " ").trim()
        val release = Build.VERSION.RELEASE
        settings.userAgentString =
            "Mozilla/5.0 (Linux; Android $release; $model) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/131.0.0.0 Mobile Safari/537.36 " +
            "AmyNestAndroid/$appVersion"
    }
}
