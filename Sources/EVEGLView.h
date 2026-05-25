#import <UIKit/UIKit.h>

@interface EVEGLView : UIView

- (void)resizeDrawableIfNeeded;
- (void)renderAtTime:(NSTimeInterval)time;

@end
