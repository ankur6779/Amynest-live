import Foundation
import Capacitor
import GoogleSignIn

/**
 * Patched for GoogleSignIn 7.1+ (Apple ITMS-91061 privacy manifests).
 * Upstream @codetrix-studio/capacitor-google-auth targets GoogleSignIn 6.x APIs.
 */
@objc(GoogleAuth)
public class GoogleAuth: CAPPlugin {
    var signInCall: CAPPluginCall!
    var googleSignIn: GIDSignIn!
    var googleSignInConfiguration: GIDConfiguration!
    var forceAuthCode: Bool = false
    var additionalScopes: [String]!

    func loadSignInClient(
        customClientId: String,
        customScopes: [String]
    ) {
        googleSignIn = GIDSignIn.sharedInstance

        let serverClientId = getServerClientIdValue()

        googleSignInConfiguration = GIDConfiguration(
            clientID: customClientId,
            serverClientID: serverClientId
        )

        let defaultGrantedScopes = ["email", "profile", "openid"]
        additionalScopes = customScopes.filter {
            return !defaultGrantedScopes.contains($0)
        }

        forceAuthCode = getConfig().getBoolean("forceCodeForRefreshToken", false)

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOpenUrl(_:)),
            name: Notification.Name(Notification.Name.capacitorOpenURL.rawValue),
            object: nil
        )
    }

    public override func load() {
    }

    @objc
    func initialize(_ call: CAPPluginCall) {
        guard let clientId = call.getString("clientId") ?? getClientIdValue() as? String else {
            NSLog("no client id found in config")
            call.resolve()
            return
        }

        let customScopes = call.getArray("scopes", String.self) ?? (
            getConfigValue("scopes") as? [String] ?? []
        )

        forceAuthCode = call.getBool("grantOfflineAccess") ?? (
            getConfigValue("forceCodeForRefreshToken") as? Bool ?? false
        )

        self.loadSignInClient(
            customClientId: clientId,
            customScopes: customScopes
        )
        call.resolve()
    }

    @objc
    func signIn(_ call: CAPPluginCall) {
        signInCall = call
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let presentingVc = self.bridge?.viewController else {
                call.reject("No presenting view controller")
                return
            }

            let finish: (GIDGoogleUser?, String?, Error?) -> Void = { user, serverAuthCode, error in
                if let error = error {
                    self.signInCall?.reject(error.localizedDescription, "\(error._code)")
                    return
                }
                guard let user = user else {
                    self.signInCall?.reject("Google sign-in did not return a user")
                    return
                }
                self.resolveSignInCallWith(user: user, serverAuthCode: serverAuthCode)
            }

            if self.googleSignIn.hasPreviousSignIn() && !self.forceAuthCode {
                self.googleSignIn.restorePreviousSignIn { user, error in
                    finish(user, nil, error)
                }
                return
            }

            let completion: (GIDSignInResult?, Error?) -> Void = { result, error in
                finish(result?.user, result?.serverAuthCode, error)
            }

            if self.additionalScopes.isEmpty {
                self.googleSignIn.signIn(
                    withPresenting: presentingVc,
                    completion: completion
                )
            } else {
                self.googleSignIn.signIn(
                    withPresenting: presentingVc,
                    hint: nil,
                    additionalScopes: self.additionalScopes,
                    completion: completion
                )
            }
        }
    }

    @objc
    func refresh(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let user = self.googleSignIn.currentUser else {
                call.reject("User not logged in.")
                return
            }
            user.refreshTokensIfNeeded { refreshedUser, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                guard let refreshedUser = refreshedUser else {
                    call.reject("Something went wrong.")
                    return
                }
                let authenticationData: [String: Any] = [
                    "accessToken": refreshedUser.accessToken.tokenString,
                    "idToken": refreshedUser.idToken?.tokenString ?? NSNull(),
                    "refreshToken": refreshedUser.refreshToken.tokenString,
                ]
                call.resolve(authenticationData)
            }
        }
    }

    @objc
    func signOut(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.googleSignIn.signOut()
        }
        call.resolve()
    }

    @objc
    func handleOpenUrl(_ notification: Notification) {
        guard let object = notification.object as? [String: Any] else {
            print("There is no object on handleOpenUrl")
            return
        }
        guard let url = object["url"] as? URL else {
            print("There is no url on handleOpenUrl")
            return
        }
        googleSignIn.handle(url)
    }

    func getClientIdValue() -> String? {
        if let clientId = getConfig().getString("iosClientId") {
            return clientId
        } else if let clientId = getConfig().getString("clientId") {
            return clientId
        } else if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
                  let dict = NSDictionary(contentsOfFile: path) as? [String: AnyObject],
                  let clientId = dict["CLIENT_ID"] as? String {
            return clientId
        }
        return nil
    }

    func getServerClientIdValue() -> String? {
        if let serverClientId = getConfig().getString("serverClientId") {
            return serverClientId
        }
        return nil
    }

    func resolveSignInCallWith(user: GIDGoogleUser, serverAuthCode: String?) {
        var userData: [String: Any] = [
            "authentication": [
                "accessToken": user.accessToken.tokenString,
                "idToken": user.idToken?.tokenString ?? NSNull(),
                "refreshToken": user.refreshToken.tokenString,
            ],
            "serverAuthCode": serverAuthCode ?? NSNull(),
            "email": user.profile?.email ?? NSNull(),
            "familyName": user.profile?.familyName ?? NSNull(),
            "givenName": user.profile?.givenName ?? NSNull(),
            "id": user.userID ?? NSNull(),
            "name": user.profile?.name ?? NSNull(),
        ]
        if let imageUrl = user.profile?.imageURL(withDimension: 100)?.absoluteString {
            userData["imageUrl"] = imageUrl
        }
        signInCall?.resolve(userData)
    }
}
