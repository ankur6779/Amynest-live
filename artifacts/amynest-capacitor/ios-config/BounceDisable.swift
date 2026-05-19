import UIKit

/// Disables rubber-band bounce on WKWebView's internal UIScrollView (and any
/// other scroll views in the window). Paste into `AppDelegate.swift` and call
/// from `application(_:didFinishLaunchingWithOptions:)` and, if you use scenes,
/// from `scene(_:willConnectTo:options:)`.
enum AmyNestBounceDisable {
    static func apply(to window: UIWindow?) {
        guard let window else { return }
        disableBounce(in: window)
    }

    static func applyToAllWindows() {
        if #available(iOS 15.0, *) {
            for scene in UIApplication.shared.connectedScenes {
                guard let windowScene = scene as? UIWindowScene else { continue }
                for window in windowScene.windows {
                    disableBounce(in: window)
                }
            }
            return
        }
        for window in UIApplication.shared.windows {
            disableBounce(in: window)
        }
    }

    private static func disableBounce(in root: UIView) {
        func walk(_ view: UIView) {
            if let scrollView = view as? UIScrollView {
                scrollView.bounces = false
                scrollView.alwaysBounceVertical = false
                scrollView.alwaysBounceHorizontal = false
            }
            for subview in view.subviews {
                walk(subview)
            }
        }
        walk(root)
    }
}

// Example (AppDelegate.swift):
//
// func application(
//   _ application: UIApplication,
//   didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
// ) -> Bool {
//   DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
//     AmyNestBounceDisable.applyToAllWindows()
//   }
//   return true
// }
