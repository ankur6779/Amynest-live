#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/// Objective-C wrapper so AppDelegate.swift never imports FBSDKCoreKit.
@interface AmyNestFacebookSDK : NSObject

+ (void)configureWithApplication:(UIApplication *)application
                   launchOptions:(NSDictionary<UIApplicationLaunchOptionsKey, id> * _Nullable)launchOptions;

+ (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
  sourceApplication:(NSString * _Nullable)sourceApplication
         annotation:(id _Nullable)annotation;

@end

NS_ASSUME_NONNULL_END
