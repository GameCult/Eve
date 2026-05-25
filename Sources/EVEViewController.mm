#import "EVEViewController.h"

#import <CoreMotion/CoreMotion.h>
#import <QuartzCore/QuartzCore.h>

#import "EVEFrameStreamClient.h"
#import "EVEGLView.h"

@interface EVEViewController () <EVEFrameStreamClientDelegate>

@property(nonatomic, strong) EVEGLView *glView;
@property(nonatomic, strong) UIImageView *streamImageView;
@property(nonatomic, strong) UILabel *overlayLabel;
@property(nonatomic, strong) CADisplayLink *displayLink;
@property(nonatomic, strong) CMMotionManager *motionManager;
@property(nonatomic, strong) EVEFrameStreamClient *streamClient;
@property(nonatomic, assign) NSTimeInterval previousTimestamp;
@property(nonatomic, assign) double filteredFPS;
@property(nonatomic, assign) NSUInteger touchCount;
@property(nonatomic, assign) CGSize streamViewportSize;
@property(nonatomic, assign) CGFloat streamScale;
@property(nonatomic, copy) NSString *streamStatus;

@end

@implementation EVEViewController

- (void)loadView {
  UIView *root = [[UIView alloc] initWithFrame:UIScreen.mainScreen.bounds];
  root.backgroundColor = UIColor.blackColor;
  root.multipleTouchEnabled = YES;

  self.glView = [[EVEGLView alloc] initWithFrame:root.bounds];
  self.glView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  [root addSubview:self.glView];

  self.streamImageView = [[UIImageView alloc] initWithFrame:root.bounds];
  self.streamImageView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  self.streamImageView.contentMode = UIViewContentModeScaleAspectFit;
  self.streamImageView.backgroundColor = UIColor.blackColor;
  self.streamImageView.userInteractionEnabled = NO;
  [root addSubview:self.streamImageView];

  self.overlayLabel = [[UILabel alloc] initWithFrame:CGRectZero];
  self.overlayLabel.translatesAutoresizingMaskIntoConstraints = NO;
  self.overlayLabel.numberOfLines = 0;
  self.overlayLabel.textColor = UIColor.whiteColor;
  self.overlayLabel.backgroundColor = [[UIColor blackColor] colorWithAlphaComponent:0.45];
  self.overlayLabel.font = [UIFont monospacedSystemFontOfSize:13.0 weight:UIFontWeightRegular];
  self.overlayLabel.layer.cornerRadius = 6.0;
  self.overlayLabel.layer.masksToBounds = YES;
  [root addSubview:self.overlayLabel];

  UILayoutGuide *safe = root.safeAreaLayoutGuide;
  [NSLayoutConstraint activateConstraints:@[
    [self.overlayLabel.leadingAnchor constraintEqualToAnchor:safe.leadingAnchor constant:12.0],
    [self.overlayLabel.topAnchor constraintEqualToAnchor:safe.topAnchor constant:12.0],
    [self.overlayLabel.widthAnchor constraintLessThanOrEqualToAnchor:safe.widthAnchor multiplier:0.92],
  ]];

  self.view = root;
}

- (void)viewDidLoad {
  [super viewDidLoad];

  self.motionManager = [[CMMotionManager alloc] init];
  self.motionManager.accelerometerUpdateInterval = 1.0 / 30.0;
  self.motionManager.gyroUpdateInterval = 1.0 / 30.0;
  if (self.motionManager.accelerometerAvailable) {
    [self.motionManager startAccelerometerUpdates];
  }
  if (self.motionManager.gyroAvailable) {
    [self.motionManager startGyroUpdates];
  }

  self.streamViewportSize = CGSizeMake(1620.0, 2160.0);
  self.streamScale = 2.0;
  self.streamStatus = @"stream idle";
  NSURL *streamURL = [NSURL URLWithString:@"ws://192.168.1.66:8792/stream"];
  self.streamClient = [[EVEFrameStreamClient alloc] initWithURL:streamURL delegate:self];
  [self.streamClient connect];

  self.displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(frameTick:)];
  [self.displayLink addToRunLoop:NSRunLoop.mainRunLoop forMode:NSRunLoopCommonModes];
}

- (void)dealloc {
  [self.displayLink invalidate];
  [self.streamClient disconnect];
  [self.motionManager stopAccelerometerUpdates];
  [self.motionManager stopGyroUpdates];
}

- (BOOL)prefersStatusBarHidden {
  return YES;
}

- (UIRectEdge)preferredScreenEdgesDeferringSystemGestures {
  return UIRectEdgeAll;
}

- (BOOL)prefersHomeIndicatorAutoHidden {
  return YES;
}

- (void)viewDidLayoutSubviews {
  [super viewDidLayoutSubviews];
  [self.glView resizeDrawableIfNeeded];
}

- (void)frameTick:(CADisplayLink *)link {
  if (self.previousTimestamp > 0) {
    NSTimeInterval delta = link.timestamp - self.previousTimestamp;
    if (delta > 0) {
      double instantFPS = 1.0 / delta;
      self.filteredFPS = self.filteredFPS == 0 ? instantFPS : (self.filteredFPS * 0.9 + instantFPS * 0.1);
    }
  }
  self.previousTimestamp = link.timestamp;

  [self.glView renderAtTime:link.timestamp];
  [self updateOverlay];
}

- (void)updateOverlay {
  UIScreen *screen = UIScreen.mainScreen;
  CGSize points = screen.bounds.size;
  CGFloat scale = screen.scale;
  CGSize pixels = CGSizeMake(points.width * scale, points.height * scale);

  CMAcceleration acceleration = self.motionManager.accelerometerData.acceleration;
  CMRotationRate rotation = self.motionManager.gyroData.rotationRate;

  self.overlayLabel.text = [NSString stringWithFormat:
    @"EVE Canvas\n"
     "CEF stream + native touch\n"
     "%@\n"
     "points %.0fx%.0f  pixels %.0fx%.0f @ %.1fx\n"
     "stream %.0fx%.0f @ %.1fx\n"
     "fps %.1f  touches %lu\n"
     "accel %+0.2f %+0.2f %+0.2f\n"
     "gyro  %+0.2f %+0.2f %+0.2f",
     self.streamStatus ?: @"stream",
     points.width, points.height, pixels.width, pixels.height, scale,
     self.streamViewportSize.width, self.streamViewportSize.height, self.streamScale,
     self.filteredFPS, (unsigned long)self.touchCount,
     acceleration.x, acceleration.y, acceleration.z,
     rotation.x, rotation.y, rotation.z];
  [self.overlayLabel sizeToFit];
}

- (CGPoint)streamPointForTouch:(UITouch *)touch {
  CGPoint viewPoint = [touch locationInView:self.streamImageView];
  CGSize bounds = self.streamImageView.bounds.size;
  CGSize viewport = self.streamViewportSize;
  if (viewport.width <= 0 || viewport.height <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return CGPointZero;
  }

  CGFloat imageAspect = viewport.width / viewport.height;
  CGFloat boundsAspect = bounds.width / bounds.height;
  CGFloat drawWidth = bounds.width;
  CGFloat drawHeight = bounds.height;
  CGFloat offsetX = 0.0;
  CGFloat offsetY = 0.0;
  if (boundsAspect > imageAspect) {
    drawWidth = bounds.height * imageAspect;
    offsetX = (bounds.width - drawWidth) * 0.5;
  } else {
    drawHeight = bounds.width / imageAspect;
    offsetY = (bounds.height - drawHeight) * 0.5;
  }

  CGFloat x = (viewPoint.x - offsetX) * viewport.width / drawWidth;
  CGFloat y = (viewPoint.y - offsetY) * viewport.height / drawHeight;
  x = MIN(MAX(x, 0.0), viewport.width - 1.0);
  y = MIN(MAX(y, 0.0), viewport.height - 1.0);
  return CGPointMake(x, y);
}

- (void)sendTouches:(NSSet<UITouch *> *)touches event:(UIEvent *)event phase:(NSString *)phase {
  (void)event;
  UITouch *touch = touches.anyObject;
  if (!touch) {
    return;
  }
  CGPoint point = [self streamPointForTouch:touch];
  [self.streamClient sendPointerPhase:phase x:point.x y:point.y];
}

- (void)touchesBegan:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event {
  self.touchCount = event.allTouches.count;
  [self sendTouches:touches event:event phase:@"down"];
}

- (void)touchesMoved:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event {
  self.touchCount = event.allTouches.count;
  [self sendTouches:touches event:event phase:@"move"];
}

- (void)touchesEnded:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event {
  self.touchCount = event.allTouches.count;
  [self sendTouches:touches event:event phase:@"up"];
}

- (void)touchesCancelled:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event {
  self.touchCount = event.allTouches.count;
  [self sendTouches:touches event:event phase:@"up"];
}

- (void)frameStreamClient:(EVEFrameStreamClient *)client didReceiveImage:(UIImage *)image {
  (void)client;
  self.streamImageView.image = image;
}

- (void)frameStreamClient:(EVEFrameStreamClient *)client didReceiveViewportWidth:(CGFloat)width height:(CGFloat)height scale:(CGFloat)scale {
  (void)client;
  if (width > 0 && height > 0) {
    self.streamViewportSize = CGSizeMake(width, height);
  }
  if (scale > 0) {
    self.streamScale = scale;
  }
}

- (void)frameStreamClient:(EVEFrameStreamClient *)client didChangeStatus:(NSString *)status {
  (void)client;
  self.streamStatus = status;
}

@end
