import Foundation
import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

/// Forwards the Firebase Cloud Messaging registration token into the Capacitor WebView.
/// The web app listens for `amynest-push-token` (see native-push-bridge.ts).
final class AmyNestFcmBridge: NSObject, MessagingDelegate {

    static let shared = AmyNestFcmBridge()

    private var configured = false

    func configureIfNeeded() {
        guard !configured else { return }
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
            NSLog("[AmyNestFcm] GoogleService-Info.plist missing — add iOS app in Firebase Console (bundle com.amynest.app)")
            return
        }
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        Messaging.messaging().delegate = self
        configured = true
    }

    func setApnsDeviceToken(_ deviceToken: Data) {
        configureIfNeeded()
        Messaging.messaging().apnsToken = deviceToken
    }

    func refreshTokenToWebView() {
        configureIfNeeded()
        Messaging.messaging().token { token, error in
            if let error = error {
                NSLog("[AmyNestFcm] token fetch failed: \(error.localizedDescription)")
                return
            }
            guard let token = token, !token.isEmpty else { return }
            Self.dispatchTokenToWebView(token)
        }
    }

    // MARK: - MessagingDelegate

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken, !token.isEmpty else { return }
        Self.dispatchTokenToWebView(token)
    }

    private static func dispatchTokenToWebView(_ token: String) {
        let escaped = token
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        let js = """
        (function(){
          try {
            window.dispatchEvent(new CustomEvent('amynest-push-token', { detail: { token: '\(escaped)' } }));
          } catch(e) {}
        })();
        """
        DispatchQueue.main.async {
            guard let vc = bridgeViewController() else { return }
            vc.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private static func bridgeViewController() -> CAPBridgeViewController? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        for scene in scenes {
            for window in scene.windows {
                if let bridge = window.rootViewController as? CAPBridgeViewController {
                    return bridge
                }
                if let nav = window.rootViewController as? UINavigationController,
                   let bridge = nav.viewControllers.first as? CAPBridgeViewController {
                    return bridge
                }
            }
        }
        return nil
    }
}
