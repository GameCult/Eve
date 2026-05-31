#import <Foundation/Foundation.h>

@interface EVESensorUplinkClient : NSObject

- (instancetype)initWithURLs:(NSArray<NSURL *> *)urls label:(NSString *)label;
- (void)connect;
- (void)disconnect;
- (void)sendJSONObject:(NSDictionary *)payload;
- (void)sendData:(NSData *)payload;

@property(nonatomic, copy, readonly) NSString *status;

@end
