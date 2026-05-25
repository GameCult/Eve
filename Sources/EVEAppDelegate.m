#import "EVEAppDelegate.h"

#import "EVEViewController.h"

@implementation EVEAppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  (void)application;
  (void)launchOptions;

  self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
  self.window.rootViewController = [[EVEViewController alloc] init];
  self.window.backgroundColor = UIColor.blackColor;
  [self.window makeKeyAndVisible];
  return YES;
}

@end
