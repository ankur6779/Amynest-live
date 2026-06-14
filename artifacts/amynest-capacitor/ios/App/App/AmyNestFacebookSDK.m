#import "AmyNestFacebookSDK.h"
#import <FBSDKCoreKit/FBSDKCoreKit-Swift.h>

@implementation AmyNestFacebookSDK

+ (void)configureWithApplication:(UIApplication *)application
                   launchOptions:(NSDictionary<UIApplicationLaunchOptionsKey, id> *)launchOptions {
    [[FBSDKApplicationDelegate sharedInstance] application:application
                               didFinishLaunchingWithOptions:launchOptions];
}

+ (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
  sourceApplication:(NSString *)sourceApplication
         annotation:(id)annotation {
    return [[FBSDKApplicationDelegate sharedInstance] application:application
                                                          openURL:url
                                                sourceApplication:sourceApplication
                                                       annotation:annotation];
}

@end
