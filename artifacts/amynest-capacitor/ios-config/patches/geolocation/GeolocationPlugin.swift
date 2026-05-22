import Foundation
import CoreLocation
import UIKit
import Capacitor

@objc(GeolocationPlugin)
public class GeolocationPlugin: CAPPlugin, CLLocationManagerDelegate, CAPBridgedPlugin {
    public let identifier = "GeolocationPlugin"
    public let jsName = "Geolocation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCurrentPosition", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "watchPosition", returnType: CAPPluginReturnCallback),
        CAPPluginMethod(name: "clearWatch", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise)
    ]

    enum CallType {
        case permissions
        case singleUpdate
        case watch
    }

    var locationManager = CLLocationManager()
    private var isUpdatingLocation: Bool = false
    private var callQueue: [String: CallType] = [:]

    @objc func getCurrentPosition(_ call: CAPPluginCall) {
        bridge?.saveCall(call)
        callQueue[call.callbackId] = .singleUpdate

        DispatchQueue.main.async {
            self.locationManager.delegate = self

            if call.getBool("enableHighAccuracy", false) == true {
                self.locationManager.desiredAccuracy = kCLLocationAccuracyBest
            } else {
                self.locationManager.desiredAccuracy = kCLLocationAccuracyThreeKilometers
            }

            if self.locationManager.authorizationStatus == .notDetermined {
                self.locationManager.requestWhenInUseAuthorization()
            } else {
                self.locationManager.requestLocation()
            }
        }
    }

    @objc func watchPosition(_ call: CAPPluginCall) {
        call.keepAlive = true
        callQueue[call.callbackId] = .watch

        DispatchQueue.main.async {
            self.locationManager.delegate = self

            if call.getBool("enableHighAccuracy", false) == true {
                self.locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
            } else {
                self.locationManager.desiredAccuracy = kCLLocationAccuracyThreeKilometers
            }

            if self.locationManager.authorizationStatus == .notDetermined {
                self.locationManager.requestWhenInUseAuthorization()
            } else {
                self.locationManager.startUpdatingLocation()
                self.isUpdatingLocation = true
            }
        }
    }

    @objc func clearWatch(_ call: CAPPluginCall) {
        guard let callbackId = call.getString("id") else {
            call.reject("Watch call id must be provided")
            return
        }

        if let savedCall = bridge?.savedCall(withID: callbackId) {
            bridge?.releaseCall(savedCall)

            self.stopUpdating()
        }

        callQueue.removeValue(forKey: callbackId)

        call.resolve()
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let removalQueue = callQueue.filter { $0.value == .permissions || $0.value == .singleUpdate }
        callQueue = callQueue.filter { $0.value == .watch }

        for (id, _) in removalQueue {
            if let call = bridge?.savedCall(withID: id) {
                call.reject(error.localizedDescription)
                bridge?.releaseCall(call)
            }
        }

        for (id, _) in callQueue {
            if let call = bridge?.savedCall(withID: id) {
                call.reject(error.localizedDescription)
            }
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let removalQueue = callQueue.filter { $0.value == .singleUpdate }
        callQueue = callQueue.filter { $0.value != .singleUpdate }

        for (id, _) in removalQueue {
            if let call = bridge?.savedCall(withID: id) {
                reportLocation(call, locations)
                bridge?.releaseCall(call)
            }
        }

        for (id, callType) in callQueue {
            if let call = bridge?.savedCall(withID: id), callType == .watch {
                reportLocation(call, locations)
            }
        }
    }

    public func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        let removalQueue = callQueue.filter { $0.value == .permissions }
        callQueue = callQueue.filter { $0.value != .permissions }

        for (id, _) in removalQueue {
            if let call = bridge?.savedCall(withID: id) {
                checkPermissions(call)
                bridge?.releaseCall(call)
            }
        }

        if !(callQueue.filter({ $0.value == .singleUpdate }).isEmpty) {
            self.locationManager.requestLocation()
        }

        if !(callQueue.filter({ $0.value == .watch }).isEmpty) && !self.isUpdatingLocation {
            self.locationManager.startUpdatingLocation()
            self.isUpdatingLocation = true
        }
    }

    public func stopUpdating() {
        self.locationManager.stopUpdatingLocation()
        self.isUpdatingLocation = false
    }

    private func reportLocation(_ call: CAPPluginCall, _ locations: [CLLocation]) {
        if let location = locations.first {
            let result = makePosition(location)
            call.resolve(result)
        } else {
            call.resolve()
        }
    }

    private func permissionStatusString() -> String {
        switch locationManager.authorizationStatus {
        case .notDetermined:
            return "prompt"
        case .restricted, .denied:
            return "denied"
        case .authorizedAlways, .authorizedWhenInUse:
            return "granted"
        @unknown default:
            return "prompt"
        }
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        // locationServicesEnabled() can block the main thread — check off-main (Apple analyzer).
        DispatchQueue.global(qos: .userInitiated).async {
            let servicesEnabled = CLLocationManager.locationServicesEnabled()
            let status = self.permissionStatusString()

            DispatchQueue.main.async {
                if !servicesEnabled {
                    call.reject("Location services are not enabled")
                    return
                }

                call.resolve([
                    "location": status,
                    "coarseLocation": status
                ])
            }
        }
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .userInitiated).async {
            let servicesEnabled = CLLocationManager.locationServicesEnabled()

            DispatchQueue.main.async {
                if !servicesEnabled {
                    call.reject("Location services are not enabled")
                    return
                }

                if self.locationManager.authorizationStatus == .notDetermined {
                    self.bridge?.saveCall(call)
                    self.callQueue[call.callbackId] = .permissions
                    self.locationManager.delegate = self
                    self.locationManager.requestWhenInUseAuthorization()
                } else {
                    self.checkPermissions(call)
                }
            }
        }
    }

    func makePosition(_ location: CLLocation) -> JSObject {
        var ret = JSObject()
        var coords = JSObject()
        coords["latitude"] = location.coordinate.latitude
        coords["longitude"] = location.coordinate.longitude
        coords["accuracy"] = location.horizontalAccuracy
        coords["altitude"] = location.altitude
        coords["altitudeAccuracy"] = location.verticalAccuracy
        coords["speed"] = location.speed
        coords["heading"] = location.course
        ret["timestamp"] = Int((location.timestamp.timeIntervalSince1970 * 1000))
        ret["coords"] = coords
        return ret
    }

}
