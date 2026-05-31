#import <Foundation/Foundation.h>

@protocol EVEDashboardClientDelegate;

@interface EVEDashboardClient : NSObject

- (instancetype)initWithURLs:(NSArray<NSURL *> *)urls delegate:(id<EVEDashboardClientDelegate>)delegate;
- (void)connect;
- (void)disconnect;
- (void)sendCommand:(NSDictionary *)command;

@property(nonatomic, copy, readonly) NSString *status;

@end

@protocol EVEDashboardClientDelegate <NSObject>

- (void)dashboardClient:(EVEDashboardClient *)client didReceiveState:(NSDictionary *)state;
- (void)dashboardClient:(EVEDashboardClient *)client didChangeStatus:(NSString *)status;

@end
