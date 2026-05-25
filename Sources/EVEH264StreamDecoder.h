#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface EVEH264StreamDecoder : NSObject

@property(nonatomic, readonly) AVSampleBufferDisplayLayer *displayLayer;

- (void)reset;
- (void)consumeAnnexBAccessUnit:(NSData *)data;

@end

NS_ASSUME_NONNULL_END
