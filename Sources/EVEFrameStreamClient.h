#import <UIKit/UIKit.h>

@protocol EVEFrameStreamClientDelegate;

@interface EVEFrameStreamClient : NSObject

- (instancetype)initWithURL:(NSURL *)url delegate:(id<EVEFrameStreamClientDelegate>)delegate;
- (instancetype)initWithURLs:(NSArray<NSURL *> *)urls delegate:(id<EVEFrameStreamClientDelegate>)delegate;
- (void)connect;
- (void)disconnect;
- (void)sendPointerPhase:(NSString *)phase x:(CGFloat)x y:(CGFloat)y;

@end

@protocol EVEFrameStreamClientDelegate <NSObject>

- (void)frameStreamClient:(EVEFrameStreamClient *)client didReceiveImage:(UIImage *)image;
- (void)frameStreamClient:(EVEFrameStreamClient *)client didReceiveVideoAccessUnit:(NSData *)data;
- (void)frameStreamClient:(EVEFrameStreamClient *)client didReceiveViewportWidth:(CGFloat)width height:(CGFloat)height scale:(CGFloat)scale;
- (void)frameStreamClient:(EVEFrameStreamClient *)client didReceiveCodec:(NSString *)codec;
- (void)frameStreamClient:(EVEFrameStreamClient *)client didChangeStatus:(NSString *)status;

@end
