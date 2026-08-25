#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@class EVEHermodrClient;

@protocol EVEHermodrClientDelegate <NSObject>

- (void)hermodrClient:(EVEHermodrClient *)client didReceiveSurface:(NSDictionary *)surface;
- (void)hermodrClient:(EVEHermodrClient *)client didChangeStatus:(NSString *)status;

@end

@interface EVEHermodrClient : NSObject

@property(nonatomic, copy, readonly) NSString *status;

- (instancetype)initWithBaseURLs:(NSArray<NSURL *> *)baseURLs
                       providerId:(NSString *)providerId
                        surfaceId:(NSString *)surfaceId
                         delegate:(id<EVEHermodrClientDelegate>)delegate;
- (void)connect;
- (void)disconnect;
- (void)sendCommand:(NSDictionary *)command;

@end

NS_ASSUME_NONNULL_END
