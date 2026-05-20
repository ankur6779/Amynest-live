import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        AmyNestAppearance.forceDarkMode()
        AmyNestFcmBridge.shared.configureIfNeeded()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            AmyNestAppearance.forceDarkMode()
            AmyNestBounceDisable.applyToAllWindows()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            AmyNestFcmBridge.shared.refreshTokenToWebView()
        }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        AmyNestFcmBridge.shared.setApnsDeviceToken(deviceToken)
        AmyNestFcmBridge.shared.refreshTokenToWebView()
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NSLog("[AmyNestFcm] APNs registration failed: \(error.localizedDescription)")
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        AmyNestAppearance.forceDarkMode()
        AmyNestFcmBridge.shared.refreshTokenToWebView()
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
