#import "EVEViewController.h"

#import <CoreMotion/CoreMotion.h>
#import <QuartzCore/QuartzCore.h>

#import "EVEFrameStreamClient.h"
#import "EVEDashboardClient.h"
#import "EVEGLView.h"
#import "EVEH264StreamDecoder.h"
#import "EVESensorUplinkClient.h"

#include <math.h>
#include <float.h>

@import AVFoundation;
@import CoreText;

static int64_t EVEHostTimeNowNs(void) {
  return (int64_t)(CACurrentMediaTime() * 1000000000.0);
}

static void EVEAppendByte(NSMutableData *data, uint8_t value) {
  [data appendBytes:&value length:1];
}

static void EVEAppendUInt16(NSMutableData *data, uint16_t value) {
  uint8_t bytes[2] = { (uint8_t)((value >> 8) & 0xff), (uint8_t)(value & 0xff) };
  [data appendBytes:bytes length:2];
}

static void EVEAppendUInt32(NSMutableData *data, uint32_t value) {
  uint8_t bytes[4] = {
    (uint8_t)((value >> 24) & 0xff),
    (uint8_t)((value >> 16) & 0xff),
    (uint8_t)((value >> 8) & 0xff),
    (uint8_t)(value & 0xff),
  };
  [data appendBytes:bytes length:4];
}

static void EVEAppendInt64(NSMutableData *data, int64_t value) {
  EVEAppendByte(data, 0xd3);
  uint64_t raw = (uint64_t)value;
  uint8_t bytes[8] = {
    (uint8_t)((raw >> 56) & 0xff),
    (uint8_t)((raw >> 48) & 0xff),
    (uint8_t)((raw >> 40) & 0xff),
    (uint8_t)((raw >> 32) & 0xff),
    (uint8_t)((raw >> 24) & 0xff),
    (uint8_t)((raw >> 16) & 0xff),
    (uint8_t)((raw >> 8) & 0xff),
    (uint8_t)(raw & 0xff),
  };
  [data appendBytes:bytes length:8];
}

static void EVEAppendNullableInt64(NSMutableData *data, NSNumber *value) {
  if (!value) {
    EVEAppendByte(data, 0xc0);
    return;
  }

  EVEAppendInt64(data, value.longLongValue);
}

static void EVEAppendString(NSMutableData *data, NSString *value) {
  NSData *bytes = [(value ?: @"") dataUsingEncoding:NSUTF8StringEncoding] ?: [NSData data];
  NSUInteger length = bytes.length;
  if (length < 32) {
    EVEAppendByte(data, (uint8_t)(0xa0 | length));
  } else if (length < 256) {
    EVEAppendByte(data, 0xd9);
    EVEAppendByte(data, (uint8_t)length);
  } else {
    EVEAppendByte(data, 0xda);
    EVEAppendUInt16(data, (uint16_t)MIN(length, (NSUInteger)65535));
  }
  [data appendData:bytes];
}

static void EVEAppendBinary(NSMutableData *data, NSData *payload) {
  NSUInteger length = payload.length;
  if (length < 256) {
    EVEAppendByte(data, 0xc4);
    EVEAppendByte(data, (uint8_t)length);
  } else if (length <= 65535) {
    EVEAppendByte(data, 0xc5);
    EVEAppendUInt16(data, (uint16_t)length);
  } else {
    EVEAppendByte(data, 0xc6);
    EVEAppendUInt32(data, (uint32_t)length);
  }
  [data appendData:payload ?: [NSData data]];
}

static NSData *EVEMediaObservation(NSString *observationId,
                                   NSString *deviceId,
                                   NSString *streamId,
                                   NSString *kind,
                                   uint64_t sequence,
                                   int64_t sensorTimestampNs,
                                   int64_t elapsedRealtimeNs,
                                   NSString *format,
                                   NSNumber *width,
                                   NSNumber *height,
                                   NSNumber *sampleRate,
                                   NSNumber *channels,
                                   NSNumber *frameCount,
                                   NSData *payload) {
  NSMutableData *data = [NSMutableData data];
  EVEAppendByte(data, 0xdc);
  EVEAppendUInt16(data, 17);
  EVEAppendString(data, observationId);
  EVEAppendString(data, deviceId);
  EVEAppendString(data, streamId);
  EVEAppendString(data, kind);
  EVEAppendInt64(data, (int64_t)sequence);
  EVEAppendInt64(data, sensorTimestampNs);
  EVEAppendInt64(data, elapsedRealtimeNs);
  EVEAppendString(data, [[NSDate date] descriptionWithLocale:nil]);
  EVEAppendString(data, @"eve-host-time");
  EVEAppendString(data, format);
  EVEAppendNullableInt64(data, width);
  EVEAppendNullableInt64(data, height);
  EVEAppendNullableInt64(data, sampleRate);
  EVEAppendNullableInt64(data, channels);
  EVEAppendNullableInt64(data, frameCount);
  EVEAppendString(data, @"raw");
  EVEAppendBinary(data, payload ?: [NSData data]);
  return data;
}

@interface EVEViewController () <EVEFrameStreamClientDelegate, EVEDashboardClientDelegate, AVCaptureVideoDataOutputSampleBufferDelegate, UIGestureRecognizerDelegate>

@property(nonatomic, strong) EVEGLView *glView;
@property(nonatomic, strong) UIImageView *streamImageView;
@property(nonatomic, strong) EVEH264StreamDecoder *videoDecoder;
@property(nonatomic, strong) UILabel *overlayLabel;
@property(nonatomic, strong) UIView *dashboardView;
@property(nonatomic, strong) UIView *sceneCanvasView;
@property(nonatomic, strong) UIStackView *hierarchyStackView;
@property(nonatomic, strong) UIStackView *toolbarStackView;
@property(nonatomic, strong) UILabel *dashboardStatusLabel;
@property(nonatomic, strong) UIView *surfaceDashboardView;
@property(nonatomic, strong) UIView *voidBotDashboardView;
@property(nonatomic, strong) NSMutableDictionary<NSString *, UIView *> *nodeViews;
@property(nonatomic, strong) NSMutableDictionary<NSString *, NSDictionary *> *dashboardNodes;
@property(nonatomic, strong) NSMutableDictionary<NSString *, UIImage *> *avatarCache;
@property(nonatomic, strong) CADisplayLink *displayLink;
@property(nonatomic, strong) CMMotionManager *motionManager;
@property(nonatomic, strong) EVEFrameStreamClient *streamClient;
@property(nonatomic, strong) EVEDashboardClient *dashboardClient;
@property(nonatomic, strong) EVESensorUplinkClient *cameraUplink;
@property(nonatomic, strong) EVESensorUplinkClient *micUplink;
@property(nonatomic, strong) AVCaptureSession *captureSession;
@property(nonatomic, strong) dispatch_queue_t captureQueue;
@property(nonatomic, strong) AVAudioEngine *audioEngine;
@property(nonatomic, assign) NSTimeInterval previousTimestamp;
@property(nonatomic, assign) NSTimeInterval previousCameraSendTimestamp;
@property(nonatomic, assign) double filteredFPS;
@property(nonatomic, assign) NSUInteger touchCount;
@property(nonatomic, assign) uint64_t cameraSequence;
@property(nonatomic, assign) uint64_t micSequence;
@property(nonatomic, assign) CGSize streamViewportSize;
@property(nonatomic, assign) CGFloat streamScale;
@property(nonatomic, copy) NSString *streamStatus;
@property(nonatomic, copy) NSString *streamCodec;
@property(nonatomic, copy) NSString *dialogueLine;
@property(nonatomic, copy) NSString *dashboardStatus;
@property(nonatomic, copy) NSString *dashboardProviderId;
@property(nonatomic, copy) NSString *selectedNodeId;
@property(nonatomic, assign) CGFloat activeGestureStartScale;
@property(nonatomic, assign) CGFloat activeGestureStartRotation;
@property(nonatomic, assign) CGFloat activeSurfaceFontScale;

@end

@implementation EVEViewController

- (void)loadView {
  [self registerFensalirFontsIfNeeded];

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

  self.videoDecoder = [[EVEH264StreamDecoder alloc] init];
  self.videoDecoder.displayLayer.frame = root.bounds;
  self.videoDecoder.displayLayer.hidden = YES;
  [root.layer addSublayer:self.videoDecoder.displayLayer];

  [self installDashboardInRoot:root];

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
  self.streamCodec = @"jpeg";
  self.dialogueLine = @"awaiting Mimir";
  self.dashboardStatus = @"dashboard idle";
  self.dashboardProviderId = @"";
  self.activeSurfaceFontScale = 1.0;
  self.nodeViews = [NSMutableDictionary dictionary];
  self.dashboardNodes = [NSMutableDictionary dictionary];
  self.avatarCache = [NSMutableDictionary dictionary];
  NSArray<NSURL *> *streamURLs = @[
    [NSURL URLWithString:@"ws://127.0.0.1:8792/stream"],
    [NSURL URLWithString:@"ws://192.168.1.66:8792/stream"],
  ];
  self.streamClient = [[EVEFrameStreamClient alloc] initWithURLs:streamURLs delegate:self];
  [self.streamClient connect];

  NSArray<NSURL *> *dashboardURLs = @[
    [NSURL URLWithString:@"ws://127.0.0.1:8797/eve/deck"],
    [NSURL URLWithString:@"ws://192.168.1.66:8797/eve/deck"],
    [NSURL URLWithString:@"ws://127.0.0.1:8795/eve/deck"],
    [NSURL URLWithString:@"ws://192.168.1.66:8795/eve/deck"],
    [NSURL URLWithString:@"ws://127.0.0.1:8795/eve/dashboard"],
    [NSURL URLWithString:@"ws://192.168.1.66:8795/eve/dashboard"],
  ];
  self.dashboardClient = [[EVEDashboardClient alloc] initWithURLs:dashboardURLs delegate:self];
  [self.dashboardClient connect];

  NSArray<NSURL *> *cameraURLs = @[
    [NSURL URLWithString:@"ws://127.0.0.1:8793/eve/camera"],
    [NSURL URLWithString:@"ws://192.168.1.66:8793/eve/camera"],
  ];
  NSArray<NSURL *> *micURLs = @[
    [NSURL URLWithString:@"ws://127.0.0.1:8794/eve/mic"],
    [NSURL URLWithString:@"ws://192.168.1.66:8794/eve/mic"],
  ];
  self.cameraUplink = [[EVESensorUplinkClient alloc] initWithURLs:cameraURLs label:@"camera"];
  self.micUplink = [[EVESensorUplinkClient alloc] initWithURLs:micURLs label:@"mic"];
  [self.cameraUplink connect];
  [self.micUplink connect];
  [self startSensorCapture];

  self.displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(frameTick:)];
  [self.displayLink addToRunLoop:NSRunLoop.mainRunLoop forMode:NSRunLoopCommonModes];
}

- (void)dealloc {
  [self.displayLink invalidate];
  [self.streamClient disconnect];
  [self.dashboardClient disconnect];
  [self.cameraUplink disconnect];
  [self.micUplink disconnect];
  [self.captureSession stopRunning];
  [self.audioEngine stop];
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
  self.videoDecoder.displayLayer.frame = self.view.bounds;
  for (NSString *nodeId in self.dashboardNodes) {
    [self updateDashboardNodeView:self.dashboardNodes[nodeId]];
  }
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
  [self serviceScreenshotRequestIfNeeded];
}

- (void)serviceScreenshotRequestIfNeeded {
  NSString *directory = @"/var/mobile/Library/EveCanvas";
  NSString *requestPath = [directory stringByAppendingPathComponent:@"capture-request"];
  NSFileManager *fileManager = NSFileManager.defaultManager;
  if (![fileManager fileExistsAtPath:requestPath]) {
    return;
  }

  [fileManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:nil];
  [fileManager removeItemAtPath:requestPath error:nil];

  CGSize size = self.view.bounds.size;
  if (size.width <= 0.0 || size.height <= 0.0) {
    [@"invalid-view-size" writeToFile:[directory stringByAppendingPathComponent:@"capture-status.txt"]
                           atomically:YES
                             encoding:NSUTF8StringEncoding
                                error:nil];
    return;
  }

  UIGraphicsBeginImageContextWithOptions(size, YES, UIScreen.mainScreen.scale);
  BOOL rendered = [self.view drawViewHierarchyInRect:self.view.bounds afterScreenUpdates:YES];
  if (!rendered) {
    CGContextRef context = UIGraphicsGetCurrentContext();
    if (context) {
      [self.view.layer renderInContext:context];
      rendered = YES;
    }
  }
  UIImage *image = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();
  if (!rendered || !image) {
    [@"render-failed" writeToFile:[directory stringByAppendingPathComponent:@"capture-status.txt"]
                       atomically:YES
                         encoding:NSUTF8StringEncoding
                            error:nil];
    return;
  }

  NSData *png = UIImagePNGRepresentation(image);
  if (!png) {
    [@"png-encoding-failed" writeToFile:[directory stringByAppendingPathComponent:@"capture-status.txt"]
                             atomically:YES
                               encoding:NSUTF8StringEncoding
                                  error:nil];
    return;
  }

  NSString *latestPath = [directory stringByAppendingPathComponent:@"latest-screenshot.png"];
  if ([png writeToFile:latestPath atomically:YES]) {
    [@"ok" writeToFile:[directory stringByAppendingPathComponent:@"capture-status.txt"]
            atomically:YES
              encoding:NSUTF8StringEncoding
                 error:nil];
  } else {
    [@"write-failed" writeToFile:[directory stringByAppendingPathComponent:@"capture-status.txt"]
                      atomically:YES
                        encoding:NSUTF8StringEncoding
                           error:nil];
  }
}

- (void)updateOverlay {
  if (self.dashboardView) {
    self.overlayLabel.hidden = YES;
    return;
  }

  self.overlayLabel.hidden = NO;
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
     "codec %@\n"
     "Mimir: %@\n"
     "dashboard %@\n"
     "points %.0fx%.0f  pixels %.0fx%.0f @ %.1fx\n"
     "stream %.0fx%.0f @ %.1fx\n"
     "fps %.1f  touches %lu\n"
     "uplink %@ / %@\n"
     "accel %+0.2f %+0.2f %+0.2f\n"
     "gyro  %+0.2f %+0.2f %+0.2f",
     self.streamStatus ?: @"stream",
     self.streamCodec ?: @"unknown",
     self.dialogueLine ?: @"",
     self.dashboardStatus ?: @"dashboard",
     points.width, points.height, pixels.width, pixels.height, scale,
     self.streamViewportSize.width, self.streamViewportSize.height, self.streamScale,
     self.filteredFPS, (unsigned long)self.touchCount,
     self.cameraUplink.status ?: @"camera",
     self.micUplink.status ?: @"mic",
     acceleration.x, acceleration.y, acceleration.z,
     rotation.x, rotation.y, rotation.z];
  [self.overlayLabel sizeToFit];
}

- (void)installDashboardInRoot:(UIView *)root {
  self.dashboardView = [[UIView alloc] initWithFrame:root.bounds];
  self.dashboardView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  self.dashboardView.backgroundColor = [[UIColor colorWithRed:0.02 green:0.025 blue:0.03 alpha:1.0] colorWithAlphaComponent:0.92];
  [root addSubview:self.dashboardView];

  self.sceneCanvasView = [[UIView alloc] initWithFrame:CGRectZero];
  self.sceneCanvasView.translatesAutoresizingMaskIntoConstraints = NO;
  self.sceneCanvasView.backgroundColor = [UIColor colorWithRed:0.05 green:0.055 blue:0.06 alpha:1.0];
  self.sceneCanvasView.layer.borderColor = [UIColor colorWithWhite:1.0 alpha:0.12].CGColor;
  self.sceneCanvasView.layer.borderWidth = 1.0;
  self.sceneCanvasView.multipleTouchEnabled = YES;
  [self.dashboardView addSubview:self.sceneCanvasView];

  self.hierarchyStackView = [[UIStackView alloc] initWithFrame:CGRectZero];
  self.hierarchyStackView.translatesAutoresizingMaskIntoConstraints = NO;
  self.hierarchyStackView.axis = UILayoutConstraintAxisVertical;
  self.hierarchyStackView.spacing = 6.0;
  self.hierarchyStackView.alignment = UIStackViewAlignmentFill;
  [self.dashboardView addSubview:self.hierarchyStackView];

  self.toolbarStackView = [[UIStackView alloc] initWithFrame:CGRectZero];
  self.toolbarStackView.translatesAutoresizingMaskIntoConstraints = NO;
  self.toolbarStackView.axis = UILayoutConstraintAxisHorizontal;
  self.toolbarStackView.spacing = 8.0;
  self.toolbarStackView.alignment = UIStackViewAlignmentCenter;
  [self.dashboardView addSubview:self.toolbarStackView];

  self.dashboardStatusLabel = [[UILabel alloc] initWithFrame:CGRectZero];
  self.dashboardStatusLabel.translatesAutoresizingMaskIntoConstraints = NO;
  self.dashboardStatusLabel.textColor = [UIColor colorWithWhite:0.90 alpha:1.0];
  self.dashboardStatusLabel.font = [UIFont monospacedSystemFontOfSize:12.0 weight:UIFontWeightRegular];
  self.dashboardStatusLabel.text = @"dashboard idle";
  [self.dashboardView addSubview:self.dashboardStatusLabel];

  self.surfaceDashboardView = [[UIView alloc] initWithFrame:CGRectZero];
  self.surfaceDashboardView.translatesAutoresizingMaskIntoConstraints = NO;
  self.surfaceDashboardView.hidden = YES;
  self.surfaceDashboardView.backgroundColor = [UIColor colorWithRed:0.006 green:0.018 blue:0.020 alpha:0.98];
  self.surfaceDashboardView.layer.borderColor = [UIColor colorWithRed:0.22 green:0.88 blue:0.86 alpha:0.20].CGColor;
  self.surfaceDashboardView.layer.borderWidth = 1.0;
  [self.dashboardView addSubview:self.surfaceDashboardView];

  self.voidBotDashboardView = [[UIView alloc] initWithFrame:CGRectZero];
  self.voidBotDashboardView.translatesAutoresizingMaskIntoConstraints = NO;
  self.voidBotDashboardView.hidden = YES;
  self.voidBotDashboardView.backgroundColor = [UIColor colorWithRed:0.005 green:0.025 blue:0.026 alpha:0.98];
  self.voidBotDashboardView.layer.borderColor = [UIColor colorWithRed:0.22 green:0.88 blue:0.86 alpha:0.20].CGColor;
  self.voidBotDashboardView.layer.borderWidth = 1.0;
  [self.dashboardView addSubview:self.voidBotDashboardView];

  UILayoutGuide *safe = self.dashboardView.safeAreaLayoutGuide;
  [NSLayoutConstraint activateConstraints:@[
    [self.hierarchyStackView.leadingAnchor constraintEqualToAnchor:safe.leadingAnchor constant:14.0],
    [self.hierarchyStackView.topAnchor constraintEqualToAnchor:safe.topAnchor constant:74.0],
    [self.hierarchyStackView.widthAnchor constraintEqualToConstant:230.0],
    [self.hierarchyStackView.bottomAnchor constraintLessThanOrEqualToAnchor:safe.bottomAnchor constant:-18.0],

    [self.sceneCanvasView.leadingAnchor constraintEqualToAnchor:self.hierarchyStackView.trailingAnchor constant:14.0],
    [self.sceneCanvasView.topAnchor constraintEqualToAnchor:safe.topAnchor constant:74.0],
    [self.sceneCanvasView.trailingAnchor constraintEqualToAnchor:safe.trailingAnchor constant:-14.0],
    [self.sceneCanvasView.bottomAnchor constraintEqualToAnchor:safe.bottomAnchor constant:-64.0],

    [self.toolbarStackView.leadingAnchor constraintEqualToAnchor:self.sceneCanvasView.leadingAnchor],
    [self.toolbarStackView.topAnchor constraintEqualToAnchor:safe.topAnchor constant:18.0],
    [self.toolbarStackView.trailingAnchor constraintLessThanOrEqualToAnchor:safe.trailingAnchor constant:-14.0],
    [self.toolbarStackView.heightAnchor constraintEqualToConstant:42.0],

    [self.dashboardStatusLabel.leadingAnchor constraintEqualToAnchor:self.sceneCanvasView.leadingAnchor],
    [self.dashboardStatusLabel.topAnchor constraintEqualToAnchor:self.sceneCanvasView.bottomAnchor constant:10.0],
    [self.dashboardStatusLabel.trailingAnchor constraintEqualToAnchor:self.sceneCanvasView.trailingAnchor],

    [self.surfaceDashboardView.leadingAnchor constraintEqualToAnchor:safe.leadingAnchor constant:6.0],
    [self.surfaceDashboardView.topAnchor constraintEqualToAnchor:safe.topAnchor constant:6.0],
    [self.surfaceDashboardView.trailingAnchor constraintEqualToAnchor:safe.trailingAnchor constant:-6.0],
    [self.surfaceDashboardView.bottomAnchor constraintEqualToAnchor:safe.bottomAnchor constant:-6.0],

    [self.voidBotDashboardView.leadingAnchor constraintEqualToAnchor:safe.leadingAnchor constant:6.0],
    [self.voidBotDashboardView.topAnchor constraintEqualToAnchor:safe.topAnchor constant:6.0],
    [self.voidBotDashboardView.trailingAnchor constraintEqualToAnchor:safe.trailingAnchor constant:-6.0],
    [self.voidBotDashboardView.bottomAnchor constraintEqualToAnchor:safe.bottomAnchor constant:-6.0],
  ]];

  NSArray<NSDictionary *> *buttons = @[
    @{@"title": @"Reset", @"action": @"reset-transform"},
    @{@"title": @"Hide/Show", @"action": @"toggle-visibility"},
  ];
  for (NSDictionary *entry in buttons) {
    UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
    [button setTitle:entry[@"title"] forState:UIControlStateNormal];
    button.accessibilityIdentifier = entry[@"action"];
    button.titleLabel.font = [UIFont systemFontOfSize:15.0 weight:UIFontWeightSemibold];
    button.tintColor = UIColor.whiteColor;
    button.backgroundColor = [UIColor colorWithRed:0.16 green:0.18 blue:0.20 alpha:1.0];
    button.layer.cornerRadius = 6.0;
    button.contentEdgeInsets = UIEdgeInsetsMake(8, 12, 8, 12);
    [button addTarget:self action:@selector(toolbarButtonPressed:) forControlEvents:UIControlEventTouchUpInside];
    [self.toolbarStackView addArrangedSubview:button];
  }
}

- (void)startSensorCapture {
  self.captureQueue = dispatch_queue_create("org.gamecult.evecanvas.camera", DISPATCH_QUEUE_SERIAL);

  [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:^(BOOL granted) {
    NSLog(@"EveCanvas camera permission %@", granted ? @"granted" : @"denied");
    if (granted) {
      [self startCameraCapture];
    }
  }];

  [AVCaptureDevice requestAccessForMediaType:AVMediaTypeAudio completionHandler:^(BOOL granted) {
    NSLog(@"EveCanvas microphone permission %@", granted ? @"granted" : @"denied");
    if (granted) {
      [self startMicrophoneCapture];
    }
  }];
}

- (void)startCameraCapture {
  NSLog(@"EveCanvas starting camera capture");
  AVCaptureSession *session = [[AVCaptureSession alloc] init];
  session.sessionPreset = AVCaptureSessionPreset640x480;
  AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
  if (!device) {
    NSLog(@"EveCanvas camera device missing");
    return;
  }

  NSError *error = nil;
  AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:device error:&error];
  if (!input || error || ![session canAddInput:input]) {
    NSLog(@"EveCanvas camera input failed %@", error);
    return;
  }
  [session addInput:input];

  AVCaptureVideoDataOutput *output = [[AVCaptureVideoDataOutput alloc] init];
  output.alwaysDiscardsLateVideoFrames = YES;
  output.videoSettings = @{
    (id)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32BGRA),
  };
  [output setSampleBufferDelegate:self queue:self.captureQueue];
  if (![session canAddOutput:output]) {
    NSLog(@"EveCanvas camera output rejected");
    return;
  }
  [session addOutput:output];

  self.captureSession = session;
  [session startRunning];
  NSLog(@"EveCanvas camera capture running");
}

- (void)startMicrophoneCapture {
  NSLog(@"EveCanvas starting microphone capture");
  AVAudioEngine *engine = [[AVAudioEngine alloc] init];
  AVAudioInputNode *input = engine.inputNode;
  AVAudioFormat *format = [input outputFormatForBus:0];
  if (!format) {
    NSLog(@"EveCanvas microphone format missing");
    return;
  }

  __weak typeof(self) weakSelf = self;
  [input installTapOnBus:0 bufferSize:1024 format:format block:^(AVAudioPCMBuffer *buffer, AVAudioTime *when) {
    (void)when;
    __strong typeof(weakSelf) self = weakSelf;
    if (!self || buffer.frameLength == 0 || !buffer.floatChannelData) {
      return;
    }

    NSUInteger frameCount = buffer.frameLength;
    NSUInteger channels = MAX((NSUInteger)1, MIN((NSUInteger)format.channelCount, (NSUInteger)2));
    NSMutableData *samples = [NSMutableData dataWithLength:frameCount * channels * sizeof(float)];
    float *dst = (float *)samples.mutableBytes;
    for (NSUInteger frame = 0; frame < frameCount; frame++) {
      for (NSUInteger channel = 0; channel < channels; channel++) {
        dst[frame * channels + channel] = buffer.floatChannelData[channel][frame];
      }
    }

    uint64_t sequence = self.micSequence++;
    int64_t timestampNs = EVEHostTimeNowNs();
    NSData *payload = EVEMediaObservation(
      [NSString stringWithFormat:@"eve:microphone-float32-block:%llu", sequence],
      @"eve",
      @"eve-mic",
      @"microphone-float32-block",
      sequence,
      timestampNs,
      timestampNs,
      @"float32le",
      nil,
      nil,
      @((int)format.sampleRate),
      @(channels),
      @(frameCount),
      samples);
    [self.micUplink sendData:payload];
  }];

  NSError *error = nil;
  if ([engine startAndReturnError:&error]) {
    self.audioEngine = engine;
    NSLog(@"EveCanvas microphone capture running");
  } else {
    NSLog(@"EveCanvas microphone start failed %@", error);
  }
}

- (void)captureOutput:(AVCaptureOutput *)output didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer fromConnection:(AVCaptureConnection *)connection {
  (void)output;
  (void)connection;

  NSTimeInterval now = CACurrentMediaTime();
  if (self.previousCameraSendTimestamp > 0 && now - self.previousCameraSendTimestamp < 0.10) {
    return;
  }
  self.previousCameraSendTimestamp = now;

  CVImageBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  if (!pixelBuffer) {
    return;
  }

  CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
  size_t width = CVPixelBufferGetWidth(pixelBuffer);
  size_t height = CVPixelBufferGetHeight(pixelBuffer);
  size_t bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer);
  void *baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer);
  CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
  CGContextRef bitmapContext = CGBitmapContextCreate(baseAddress,
                                                     width,
                                                     height,
                                                     8,
                                                     bytesPerRow,
                                                     colorSpace,
                                                     kCGBitmapByteOrder32Little | kCGImageAlphaPremultipliedFirst);
  CGImageRef cgImage = bitmapContext ? CGBitmapContextCreateImage(bitmapContext) : NULL;
  if (bitmapContext) {
    CGContextRelease(bitmapContext);
  }
  CGColorSpaceRelease(colorSpace);
  if (!cgImage) {
    CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    return;
  }

  UIImage *uiImage = [UIImage imageWithCGImage:cgImage];
  NSData *jpeg = UIImageJPEGRepresentation(uiImage, 0.55);
  CGImageRelease(cgImage);
  CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
  if (!jpeg) {
    return;
  }

  uint64_t sequence = self.cameraSequence++;
  int64_t timestampNs = EVEHostTimeNowNs();
  NSData *payload = EVEMediaObservation(
    [NSString stringWithFormat:@"eve:camera-mjpeg-frame:%llu", sequence],
    @"eve",
    @"eve-camera",
    @"camera-mjpeg-frame",
    sequence,
    timestampNs,
    timestampNs,
    @"mjpeg",
    @(width),
    @(height),
    nil,
    nil,
    @1,
    jpeg);
  [self.cameraUplink sendData:payload];
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

- (void)dashboardClient:(EVEDashboardClient *)client didReceiveState:(NSDictionary *)state {
  (void)client;
  NSString *title = [state[@"title"] isKindOfClass:NSString.class] ? state[@"title"] : @"dashboard";
  self.dashboardStatus = [NSString stringWithFormat:@"%@ v%@", title, state[@"version"] ?: @"?"];
  self.dashboardStatusLabel.text = self.dashboardStatus;
  NSString *providerId = [state[@"providerId"] isKindOfClass:NSString.class] ? state[@"providerId"] : @"";
  self.dashboardProviderId = providerId;
  NSString *selected = state[@"selectedNodeId"];
  if ([selected isKindOfClass:NSString.class]) {
    self.selectedNodeId = selected;
  }

  NSArray *nodes = state[@"nodes"];
  if (![nodes isKindOfClass:NSArray.class]) {
    return;
  }

  [self.dashboardNodes removeAllObjects];
  NSMutableSet<NSString *> *liveNodeIds = [NSMutableSet set];
  for (NSDictionary *node in nodes) {
    if (![node isKindOfClass:NSDictionary.class]) {
      continue;
    }

    NSString *nodeId = node[@"id"];
    if (![nodeId isKindOfClass:NSString.class]) {
      continue;
    }

    self.dashboardNodes[nodeId] = node;
    [liveNodeIds addObject:nodeId];
  }

  BOOL isVoidBot = [providerId isEqualToString:@"voidbot.swarm"];
  BOOL isFullscreenSurface = !isVoidBot && [self shouldRenderFullscreenSurfaceForState:state];
  self.voidBotDashboardView.hidden = !isVoidBot;
  self.surfaceDashboardView.hidden = !isFullscreenSurface;
  self.sceneCanvasView.hidden = isVoidBot || isFullscreenSurface;
  self.hierarchyStackView.hidden = isVoidBot || isFullscreenSurface;
  self.toolbarStackView.hidden = isVoidBot || isFullscreenSurface;
  self.dashboardStatusLabel.hidden = isVoidBot || isFullscreenSurface;

  if (isVoidBot) {
    for (UIView *view in self.nodeViews.allValues) {
      [view removeFromSuperview];
    }
    [self.nodeViews removeAllObjects];
    [self renderVoidBotDashboardWithNodes:nodes title:title version:state[@"version"]];
    return;
  }

  if (isFullscreenSurface) {
    for (UIView *view in self.nodeViews.allValues) {
      [view removeFromSuperview];
    }
    [self.nodeViews removeAllObjects];
    [self renderFullscreenSurfaceState:state title:title version:state[@"version"]];
    return;
  }

  for (NSString *existingNodeId in self.nodeViews.allKeys.copy) {
    if (![liveNodeIds containsObject:existingNodeId]) {
      [self.nodeViews[existingNodeId] removeFromSuperview];
      [self.nodeViews removeObjectForKey:existingNodeId];
    }
  }

  for (NSDictionary *node in nodes) {
    if (![node isKindOfClass:NSDictionary.class]) {
      continue;
    }
    NSString *nodeId = node[@"id"];
    if (![nodeId isKindOfClass:NSString.class]) {
      continue;
    }
    [self ensureDashboardNodeView:node];
    [self updateDashboardNodeView:node];
  }

  [self rebuildHierarchyWithNodes:nodes];
}

- (BOOL)shouldRenderFullscreenSurfaceForState:(NSDictionary *)state {
  NSDictionary *surface = [state[@"surface"] isKindOfClass:NSDictionary.class] ? state[@"surface"] : nil;
  NSDictionary *root = [surface[@"root"] isKindOfClass:NSDictionary.class] ? surface[@"root"] : nil;
  if (!root) {
    return NO;
  }

  NSString *providerId = [state[@"providerId"] isKindOfClass:NSString.class] ? state[@"providerId"] : @"";
  if ([providerId isEqualToString:@"odin.allseer"]) {
    return YES;
  }

  NSDictionary *props = [root[@"props"] isKindOfClass:NSDictionary.class] ? root[@"props"] : nil;
  NSDictionary *layout = [props[@"layout"] isKindOfClass:NSDictionary.class] ? props[@"layout"] : nil;
  NSString *viewportMode = [layout[@"viewportMode"] isKindOfClass:NSString.class] ? layout[@"viewportMode"] : @"";
  return [viewportMode isEqualToString:@"fullscreen"];
}

- (void)renderFullscreenSurfaceState:(NSDictionary *)state title:(NSString *)title version:(id)version {
  for (UIView *view in self.surfaceDashboardView.subviews) {
    [view removeFromSuperview];
  }

  NSString *providerId = [state[@"providerId"] isKindOfClass:NSString.class] ? state[@"providerId"] : @"";
  if ([providerId isEqualToString:@"odin.allseer"] && [self renderOdinInterfaceWallForState:state]) {
    return;
  }

  UIScrollView *scroll = [[UIScrollView alloc] initWithFrame:self.surfaceDashboardView.bounds];
  scroll.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  scroll.alwaysBounceVertical = YES;
  [self.surfaceDashboardView addSubview:scroll];

  UIStackView *stack = [[UIStackView alloc] initWithFrame:CGRectZero];
  stack.translatesAutoresizingMaskIntoConstraints = NO;
  stack.axis = UILayoutConstraintAxisVertical;
  stack.spacing = 8.0;
  stack.alignment = UIStackViewAlignmentFill;
  [scroll addSubview:stack];

  UILabel *heading = [self surfaceHeaderLabelWithText:[NSString stringWithFormat:@"%@  v%@", title ?: @"Surface", version ?: @"?"]
                                                 size:18.0];
  [stack addArrangedSubview:heading];

  NSDictionary *surface = [state[@"surface"] isKindOfClass:NSDictionary.class] ? state[@"surface"] : nil;
  NSDictionary *root = [surface[@"root"] isKindOfClass:NSDictionary.class] ? surface[@"root"] : nil;
  if (root) {
    [stack addArrangedSubview:[self renderSurfaceElement:root depth:0]];
  }

  [NSLayoutConstraint activateConstraints:@[
    [stack.leadingAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.leadingAnchor constant:8.0],
    [stack.trailingAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.trailingAnchor constant:-8.0],
    [stack.topAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.topAnchor constant:8.0],
    [stack.bottomAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.bottomAnchor constant:-8.0],
    [stack.widthAnchor constraintEqualToAnchor:scroll.frameLayoutGuide.widthAnchor constant:-16.0],
  ]];
}

- (BOOL)renderOdinInterfaceWallForState:(NSDictionary *)state {
  [self.surfaceDashboardView layoutIfNeeded];
  CGRect bounds = self.surfaceDashboardView.bounds;
  if (bounds.size.width < 20.0 || bounds.size.height < 20.0) {
    bounds = UIEdgeInsetsInsetRect(self.dashboardView.bounds, UIEdgeInsetsMake(6, 6, 6, 6));
  }

  NSDictionary *surface = [state[@"surface"] isKindOfClass:NSDictionary.class] ? state[@"surface"] : nil;
  NSDictionary *root = [surface[@"root"] isKindOfClass:NSDictionary.class] ? surface[@"root"] : nil;
  NSArray *children = [root[@"children"] isKindOfClass:NSArray.class] ? root[@"children"] : @[];
  NSMutableArray<NSDictionary *> *interfaces = [NSMutableArray array];
  for (NSDictionary *child in children) {
    if (![child isKindOfClass:NSDictionary.class]) {
      continue;
    }
    NSString *kind = [child[@"kind"] isKindOfClass:NSString.class] ? child[@"kind"] : @"";
    NSDictionary *props = [child[@"props"] isKindOfClass:NSDictionary.class] ? child[@"props"] : @{};
    NSDictionary *layout = [props[@"layout"] isKindOfClass:NSDictionary.class] ? props[@"layout"] : @{};
    NSNumber *visible = [layout[@"visible"] isKindOfClass:NSNumber.class] ? layout[@"visible"] : @YES;
    if ([kind isEqualToString:@"interface"] && visible.boolValue) {
      [interfaces addObject:child];
    }
  }

  if (interfaces.count == 0) {
    return NO;
  }

  UIView *wall = [[UIView alloc] initWithFrame:bounds];
  wall.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  wall.backgroundColor = [self fensalirBackdropColor];
  [self.surfaceDashboardView addSubview:wall];

  CGFloat gap = 8.0;
  CGRect packBounds = CGRectInset(bounds, gap, gap);
  NSArray<NSDictionary *> *placements = [self odinPackedPlacementsForInterfaces:interfaces bounds:packBounds gap:gap];
  for (NSDictionary *placement in placements) {
    NSDictionary *interface = [placement[@"interface"] isKindOfClass:NSDictionary.class] ? placement[@"interface"] : nil;
    NSValue *frameValue = [placement[@"frame"] isKindOfClass:NSValue.class] ? placement[@"frame"] : nil;
    NSNumber *weight = [placement[@"weight"] isKindOfClass:NSNumber.class] ? placement[@"weight"] : @1.0;
    if (!interface || !frameValue) {
      continue;
    }
    [wall addSubview:[self odinInterfaceTile:interface frame:frameValue.CGRectValue weight:weight.doubleValue]];
  }

  return YES;
}

- (NSArray<NSDictionary *> *)odinPackedPlacementsForInterfaces:(NSArray<NSDictionary *> *)interfaces bounds:(CGRect)bounds gap:(CGFloat)gap {
  NSMutableArray<NSDictionary *> *items = [NSMutableArray arrayWithCapacity:interfaces.count];
  for (NSDictionary *interface in interfaces) {
    double weight = [self surfaceWeightForElement:interface];
    [items addObject:@{@"interface": interface, @"weight": @(MAX(0.65, weight))}];
  }
  [items sortUsingComparator:^NSComparisonResult(NSDictionary *left, NSDictionary *right) {
    double lw = [left[@"weight"] doubleValue];
    double rw = [right[@"weight"] doubleValue];
    if (lw > rw) {
      return NSOrderedAscending;
    }
    if (lw < rw) {
      return NSOrderedDescending;
    }
    return NSOrderedSame;
  }];

  NSMutableArray<NSDictionary *> *placements = [NSMutableArray array];
  [self packOdinItems:items bounds:bounds gap:gap into:placements];
  return placements;
}

- (void)packOdinItems:(NSArray<NSDictionary *> *)items bounds:(CGRect)bounds gap:(CGFloat)gap into:(NSMutableArray<NSDictionary *> *)placements {
  if (items.count == 0 || bounds.size.width <= 1.0 || bounds.size.height <= 1.0) {
    return;
  }
  if (items.count == 1) {
    NSMutableDictionary *placement = [items[0] mutableCopy];
    placement[@"frame"] = [NSValue valueWithCGRect:CGRectIntegral(bounds)];
    [placements addObject:placement];
    return;
  }

  double total = [self totalWeightForItems:items];
  double half = total * 0.5;
  double running = 0.0;
  NSUInteger split = 1;
  double bestDistance = DBL_MAX;
  for (NSUInteger index = 0; index < items.count - 1; index++) {
    running += [items[index][@"weight"] doubleValue];
    double distance = fabs(running - half);
    if (distance < bestDistance) {
      bestDistance = distance;
      split = index + 1;
    }
  }

  NSArray *first = [items subarrayWithRange:NSMakeRange(0, split)];
  NSArray *second = [items subarrayWithRange:NSMakeRange(split, items.count - split)];
  double firstWeight = [self totalWeightForItems:first];
  double ratio = total > 0.0 ? firstWeight / total : 0.5;

  BOOL splitVertical = bounds.size.width >= bounds.size.height;
  if (splitVertical) {
    CGFloat firstWidth = floor((bounds.size.width - gap) * (CGFloat)ratio);
    firstWidth = MAX(96.0, MIN(bounds.size.width - gap - 96.0, firstWidth));
    CGRect left = CGRectMake(bounds.origin.x, bounds.origin.y, firstWidth, bounds.size.height);
    CGRect right = CGRectMake(CGRectGetMaxX(left) + gap, bounds.origin.y, bounds.size.width - firstWidth - gap, bounds.size.height);
    [self packOdinItems:first bounds:left gap:gap into:placements];
    [self packOdinItems:second bounds:right gap:gap into:placements];
  } else {
    CGFloat firstHeight = floor((bounds.size.height - gap) * (CGFloat)ratio);
    firstHeight = MAX(72.0, MIN(bounds.size.height - gap - 72.0, firstHeight));
    CGRect top = CGRectMake(bounds.origin.x, bounds.origin.y, bounds.size.width, firstHeight);
    CGRect bottom = CGRectMake(bounds.origin.x, CGRectGetMaxY(top) + gap, bounds.size.width, bounds.size.height - firstHeight - gap);
    [self packOdinItems:first bounds:top gap:gap into:placements];
    [self packOdinItems:second bounds:bottom gap:gap into:placements];
  }
}

- (double)totalWeightForItems:(NSArray<NSDictionary *> *)items {
  double total = 0.0;
  for (NSDictionary *item in items) {
    total += [item[@"weight"] doubleValue];
  }
  return MAX(0.001, total);
}

- (double)surfaceWeightForElement:(NSDictionary *)element {
  NSString *kind = [element[@"kind"] isKindOfClass:NSString.class] ? element[@"kind"] : @"";
  NSDictionary *props = [element[@"props"] isKindOfClass:NSDictionary.class] ? element[@"props"] : @{};
  NSArray *children = [element[@"children"] isKindOfClass:NSArray.class] ? element[@"children"] : @[];
  NSString *text = [self surfaceTextForElement:element props:props fallback:@""];
  double weight = [kind isEqualToString:@"interface"] ? 0.9 : 0.35;
  if ([kind isEqualToString:@"text"] || [kind isEqualToString:@"metric"]) {
    weight += MAX(0.22, (double)text.length / 95.0);
  } else if ([kind isEqualToString:@"rail"]) {
    weight += 0.55 + MIN(3.0, (double)children.count * 0.18);
  } else if ([kind isEqualToString:@"card"] || [kind isEqualToString:@"pane"]) {
    weight += 0.85;
  } else if ([kind isEqualToString:@"dashboard"] || [kind isEqualToString:@"cockpit"]) {
    weight += 0.65;
  }

  for (NSDictionary *child in children) {
    if ([child isKindOfClass:NSDictionary.class]) {
      weight += [self surfaceWeightForElement:child];
    }
  }
  return MAX(0.25, weight);
}

- (UIView *)odinInterfaceTile:(NSDictionary *)interface frame:(CGRect)frame weight:(double)weight {
  NSDictionary *props = [interface[@"props"] isKindOfClass:NSDictionary.class] ? interface[@"props"] : @{};
  UIView *tile = [[UIView alloc] initWithFrame:frame];
  tile.backgroundColor = [self fensalirPanelColor];
  tile.layer.borderWidth = 1.0;
  tile.layer.borderColor = [self fensalirOutlineColor].CGColor;
  tile.layer.cornerRadius = 7.0;
  tile.layer.shadowColor = UIColor.blackColor.CGColor;
  tile.layer.shadowOpacity = 0.35;
  tile.layer.shadowRadius = 10.0;
  tile.layer.shadowOffset = CGSizeMake(0.0, 4.0);
  tile.clipsToBounds = YES;

  UIView *accent = [[UIView alloc] initWithFrame:CGRectMake(0.0, 0.0, frame.size.width, 3.0)];
  accent.autoresizingMask = UIViewAutoresizingFlexibleWidth;
  accent.backgroundColor = [self fensalirAccentColor];
  [tile addSubview:accent];

  UIView *header = [[UIView alloc] initWithFrame:CGRectMake(0.0, 3.0, frame.size.width, 31.0)];
  header.autoresizingMask = UIViewAutoresizingFlexibleWidth;
  header.backgroundColor = [self fensalirRowColor];
  [tile addSubview:header];

  NSString *title = [props[@"title"] isKindOfClass:NSString.class] ? props[@"title"] : ([interface[@"id"] isKindOfClass:NSString.class] ? interface[@"id"] : @"interface");
  NSString *providerId = [props[@"providerId"] isKindOfClass:NSString.class] ? props[@"providerId"] : @"provider";
  UILabel *heading = [self surfaceHeaderLabelWithText:title size:15.0];
  heading.frame = CGRectMake(11.0, 6.0, floor(frame.size.width * 0.46), 24.0);
  heading.numberOfLines = 1;
  [header addSubview:heading];

  UILabel *provider = [self surfaceHeaderLabelWithText:providerId size:10.0];
  provider.frame = CGRectMake(frame.size.width * 0.48, 8.0, frame.size.width * 0.50 - 10.0, 20.0);
  provider.autoresizingMask = UIViewAutoresizingFlexibleLeftMargin | UIViewAutoresizingFlexibleWidth;
  provider.textAlignment = NSTextAlignmentRight;
  provider.numberOfLines = 1;
  [header addSubview:provider];

  UIScrollView *scroll = [[UIScrollView alloc] initWithFrame:CGRectMake(8.0, 42.0, frame.size.width - 16.0, frame.size.height - 50.0)];
  scroll.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  scroll.alwaysBounceVertical = YES;
  scroll.showsVerticalScrollIndicator = YES;
  [tile addSubview:scroll];

  UIStackView *stack = [[UIStackView alloc] initWithFrame:CGRectZero];
  stack.translatesAutoresizingMaskIntoConstraints = NO;
  stack.axis = UILayoutConstraintAxisVertical;
  stack.spacing = 6.0;
  stack.alignment = UIStackViewAlignmentFill;
  [scroll addSubview:stack];

  NSArray *children = [interface[@"children"] isKindOfClass:NSArray.class] ? interface[@"children"] : @[];
  CGFloat previousScale = self.activeSurfaceFontScale;
  CGFloat density = frame.size.width * frame.size.height / MAX(1.0, (CGFloat)weight);
  self.activeSurfaceFontScale = MAX(0.50, MIN(0.86, sqrt(density / 18500.0)));
  for (NSDictionary *child in children) {
    if ([child isKindOfClass:NSDictionary.class]) {
      [stack addArrangedSubview:[self renderSurfaceElement:child depth:0]];
    }
  }
  self.activeSurfaceFontScale = previousScale;

  [NSLayoutConstraint activateConstraints:@[
    [stack.leadingAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.leadingAnchor],
    [stack.trailingAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.trailingAnchor],
    [stack.topAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.topAnchor],
    [stack.bottomAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.bottomAnchor],
    [stack.widthAnchor constraintEqualToAnchor:scroll.frameLayoutGuide.widthAnchor],
  ]];
  return tile;
}

- (UIColor *)fensalirBackdropColor {
  return [UIColor colorWithRed:0.010 green:0.012 blue:0.018 alpha:1.0];
}

- (UIColor *)fensalirPanelColor {
  return [UIColor colorWithRed:0.018 green:0.022 blue:0.032 alpha:0.96];
}

- (UIColor *)fensalirRowColor {
  return [UIColor colorWithRed:0.085 green:0.084 blue:0.120 alpha:0.96];
}

- (UIColor *)fensalirActiveRowColor {
  return [UIColor colorWithRed:0.190 green:0.180 blue:0.240 alpha:0.99];
}

- (UIColor *)fensalirOutlineColor {
  return [UIColor colorWithRed:0.280 green:0.340 blue:0.360 alpha:0.72];
}

- (UIColor *)fensalirAccentColor {
  return [UIColor colorWithRed:1.000 green:0.380 blue:0.055 alpha:0.96];
}

- (UIColor *)fensalirAccentSoftColor {
  return [UIColor colorWithRed:1.000 green:0.580 blue:0.300 alpha:0.98];
}

- (UIColor *)fensalirPrimaryTextColor {
  return [UIColor colorWithWhite:0.96 alpha:0.94];
}

- (UIColor *)fensalirQuietTextColor {
  return [UIColor colorWithRed:0.540 green:0.680 blue:0.720 alpha:0.78];
}

- (UIView *)renderSurfaceElement:(NSDictionary *)element depth:(NSUInteger)depth {
  NSString *kind = [element[@"kind"] isKindOfClass:NSString.class] ? element[@"kind"] : @"element";
  NSDictionary *props = [element[@"props"] isKindOfClass:NSDictionary.class] ? element[@"props"] : @{};
  NSArray *children = [element[@"children"] isKindOfClass:NSArray.class] ? element[@"children"] : @[];

  if ([kind isEqualToString:@"text"] || [kind isEqualToString:@"metric"]) {
    NSString *text = [self surfaceTextForElement:element props:props fallback:kind];
    return [self surfaceLabelWithText:text
                                 size:depth < 2 ? 12.0 : 10.5
                               weight:UIFontWeightMedium
                                color:[self fensalirPrimaryTextColor]];
  }

  if ([kind isEqualToString:@"rail"]) {
    return [self renderSurfaceRail:element props:props children:children depth:depth];
  }

  if ([kind isEqualToString:@"avatar"]) {
    return [self renderSurfaceAvatar:element props:props];
  }

  UIView *panel = [[UIView alloc] initWithFrame:CGRectZero];
  BOOL isRootContainer = depth == 0 && ([kind isEqualToString:@"dashboard"] || [kind isEqualToString:@"cockpit"]);
  panel.backgroundColor = isRootContainer ? UIColor.clearColor : [self fensalirRowColor];
  panel.layer.borderWidth = 1.0;
  panel.layer.borderColor = (isRootContainer ? [UIColor colorWithRed:0.280 green:0.340 blue:0.360 alpha:0.18] : [self fensalirOutlineColor]).CGColor;
  panel.layer.cornerRadius = 6.0;

  UIStackView *stack = [[UIStackView alloc] initWithFrame:CGRectZero];
  stack.translatesAutoresizingMaskIntoConstraints = NO;
  NSDictionary *layout = [element[@"layout"] isKindOfClass:NSDictionary.class] ? element[@"layout"] : ([props[@"layout"] isKindOfClass:NSDictionary.class] ? props[@"layout"] : @{});
  NSString *direction = [layout[@"direction"] isKindOfClass:NSString.class] ? layout[@"direction"] : @"";
  BOOL wantsHorizontal = ![kind isEqualToString:@"row"] && [direction isEqualToString:@"horizontal"];
  stack.axis = wantsHorizontal ? UILayoutConstraintAxisHorizontal : UILayoutConstraintAxisVertical;
  stack.spacing = 6.0;
  stack.alignment = UIStackViewAlignmentFill;
  if (stack.axis == UILayoutConstraintAxisHorizontal) {
    stack.distribution = UIStackViewDistributionFillEqually;
  }
  [panel addSubview:stack];

  NSString *title = [self surfaceTitleForElement:element props:props fallback:kind];
  if (title.length > 0 && ![title isEqualToString:kind]) {
    [stack addArrangedSubview:[self surfaceHeaderLabelWithText:title size:depth == 0 ? 15.0 : 12.0]];
  }

  NSUInteger childCount = 0;
  for (NSDictionary *child in children) {
    if (![child isKindOfClass:NSDictionary.class]) {
      continue;
    }
    [stack addArrangedSubview:[self renderSurfaceElement:child depth:depth + 1]];
    childCount += 1;
    if (depth >= 2 && childCount >= 8) {
      [stack addArrangedSubview:[self surfaceLabelWithText:@"more..." size:10.0 weight:UIFontWeightRegular color:[UIColor colorWithWhite:0.62 alpha:1.0]]];
      break;
    }
  }

  [NSLayoutConstraint activateConstraints:@[
    [stack.leadingAnchor constraintEqualToAnchor:panel.leadingAnchor constant:10.0],
    [stack.trailingAnchor constraintEqualToAnchor:panel.trailingAnchor constant:-10.0],
    [stack.topAnchor constraintEqualToAnchor:panel.topAnchor constant:10.0],
    [stack.bottomAnchor constraintEqualToAnchor:panel.bottomAnchor constant:-10.0],
  ]];
  return panel;
}

- (UIView *)renderSurfaceRail:(NSDictionary *)element props:(NSDictionary *)props children:(NSArray *)children depth:(NSUInteger)depth {
  UIView *panel = [[UIView alloc] initWithFrame:CGRectZero];
  panel.backgroundColor = [UIColor colorWithRed:0.014 green:0.050 blue:0.052 alpha:0.92];
  panel.layer.borderWidth = 1.0;
  panel.layer.borderColor = [UIColor colorWithRed:0.22 green:0.88 blue:0.82 alpha:0.22].CGColor;
  panel.layer.cornerRadius = 5.0;

  UIStackView *stack = [[UIStackView alloc] initWithFrame:CGRectZero];
  stack.translatesAutoresizingMaskIntoConstraints = NO;
  stack.axis = UILayoutConstraintAxisVertical;
  stack.spacing = 6.0;
  [panel addSubview:stack];

  NSString *title = [self surfaceTitleForElement:element props:props fallback:@"rail"];
  [stack addArrangedSubview:[self surfaceHeaderLabelWithText:title size:depth == 0 ? 14.0 : 11.0]];

  UIScrollView *scroll = [[UIScrollView alloc] initWithFrame:CGRectZero];
  scroll.translatesAutoresizingMaskIntoConstraints = NO;
  scroll.showsHorizontalScrollIndicator = YES;
  [stack addArrangedSubview:scroll];

  UIStackView *rail = [[UIStackView alloc] initWithFrame:CGRectZero];
  rail.translatesAutoresizingMaskIntoConstraints = NO;
  rail.axis = UILayoutConstraintAxisHorizontal;
  rail.spacing = 6.0;
  rail.alignment = UIStackViewAlignmentFill;
  [scroll addSubview:rail];

  NSUInteger childCount = 0;
  for (NSDictionary *child in children) {
    if (![child isKindOfClass:NSDictionary.class]) {
      continue;
    }
    UIView *card = [self renderSurfaceElement:child depth:depth + 1];
    card.translatesAutoresizingMaskIntoConstraints = NO;
    [rail addArrangedSubview:card];
    [card.widthAnchor constraintEqualToConstant:78.0].active = YES;
    [card.heightAnchor constraintEqualToConstant:56.0].active = YES;
    childCount += 1;
    if (childCount >= 16) {
      break;
    }
  }

  [NSLayoutConstraint activateConstraints:@[
    [stack.leadingAnchor constraintEqualToAnchor:panel.leadingAnchor constant:8.0],
    [stack.trailingAnchor constraintEqualToAnchor:panel.trailingAnchor constant:-8.0],
    [stack.topAnchor constraintEqualToAnchor:panel.topAnchor constant:8.0],
    [stack.bottomAnchor constraintEqualToAnchor:panel.bottomAnchor constant:-8.0],
    [scroll.heightAnchor constraintEqualToConstant:64.0],
    [rail.leadingAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.leadingAnchor],
    [rail.trailingAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.trailingAnchor],
    [rail.topAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.topAnchor],
    [rail.bottomAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.bottomAnchor],
    [rail.heightAnchor constraintEqualToAnchor:scroll.frameLayoutGuide.heightAnchor],
  ]];
  return panel;
}

- (UIView *)renderSurfaceAvatar:(NSDictionary *)element props:(NSDictionary *)props {
  UIView *card = [[UIView alloc] initWithFrame:CGRectZero];
  card.backgroundColor = [UIColor colorWithRed:0.025 green:0.075 blue:0.080 alpha:0.95];
  card.layer.borderWidth = 1.0;
  card.layer.borderColor = [UIColor colorWithRed:0.24 green:0.90 blue:0.84 alpha:0.30].CGColor;
  card.layer.cornerRadius = 5.0;

  NSString *name = [self surfaceTextForElement:element props:props fallback:@"agent"];
  NSString *detail = [props[@"detail"] isKindOfClass:NSString.class] ? props[@"detail"] : @"";
  NSString *status = [props[@"status"] isKindOfClass:NSString.class] ? props[@"status"] : @"";
  UILabel *label = [self surfaceLabelWithText:[NSString stringWithFormat:@"%@\n%@ %@", name, status, detail]
                                         size:9.0
                                       weight:UIFontWeightSemibold
                                        color:[UIColor colorWithWhite:0.90 alpha:1.0]];
  label.frame = CGRectMake(6.0, 5.0, 66.0, 48.0);
  label.numberOfLines = 3;
  [card addSubview:label];
  return card;
}

- (NSString *)surfaceTextForElement:(NSDictionary *)element props:(NSDictionary *)props fallback:(NSString *)fallback {
  NSString *text = [props[@"text"] isKindOfClass:NSString.class] ? props[@"text"] : nil;
  if (!text) {
    text = [element[@"text"] isKindOfClass:NSString.class] ? element[@"text"] : nil;
  }
  if (!text) {
    text = [props[@"label"] isKindOfClass:NSString.class] ? props[@"label"] : nil;
  }
  if (!text && [element[@"metric"] isKindOfClass:NSDictionary.class]) {
    NSDictionary *metric = element[@"metric"];
    NSString *label = [metric[@"label"] isKindOfClass:NSString.class] ? metric[@"label"] : @"metric";
    NSNumber *value = [metric[@"value"] isKindOfClass:NSNumber.class] ? metric[@"value"] : nil;
    text = value ? [NSString stringWithFormat:@"%@: %.3f", label, value.doubleValue] : label;
  }
  return text ?: fallback ?: @"";
}

- (NSString *)surfaceTitleForElement:(NSDictionary *)element props:(NSDictionary *)props fallback:(NSString *)fallback {
  NSString *title = [props[@"title"] isKindOfClass:NSString.class] ? props[@"title"] : nil;
  if (!title) {
    title = [element[@"text"] isKindOfClass:NSString.class] ? element[@"text"] : nil;
  }
  if (!title) {
    title = [props[@"label"] isKindOfClass:NSString.class] ? props[@"label"] : nil;
  }
  NSString *kind = [element[@"kind"] isKindOfClass:NSString.class] ? element[@"kind"] : @"";
  BOOL structural = [kind isEqualToString:@"row"] || [kind isEqualToString:@"dashboard"] || [kind isEqualToString:@"cockpit"];
  if (!title && !structural) {
    title = [element[@"id"] isKindOfClass:NSString.class] ? element[@"id"] : nil;
  }
  return title ?: fallback ?: @"surface";
}

- (UILabel *)surfaceLabelWithText:(NSString *)text size:(CGFloat)size weight:(UIFontWeight)weight color:(UIColor *)color {
  UILabel *label = [[UILabel alloc] initWithFrame:CGRectZero];
  label.text = text ?: @"";
  label.numberOfLines = 0;
  label.textColor = color;
  CGFloat scaledSize = MAX(5.5, floor(size * MAX(0.48, self.activeSurfaceFontScale) * 2.0) / 2.0);
  label.font = [self fensalirBodyFontWithSize:scaledSize weight:weight];
  label.lineBreakMode = NSLineBreakByWordWrapping;
  return label;
}

- (UILabel *)surfaceHeaderLabelWithText:(NSString *)text size:(CGFloat)size {
  UILabel *label = [[UILabel alloc] initWithFrame:CGRectZero];
  label.text = text ?: @"";
  label.numberOfLines = 0;
  label.textColor = [self fensalirAccentColor];
  CGFloat scaledSize = MAX(6.0, floor(size * MAX(0.64, self.activeSurfaceFontScale) * 2.0) / 2.0);
  label.font = [self fensalirHeaderFontWithSize:scaledSize];
  label.lineBreakMode = NSLineBreakByTruncatingTail;
  return label;
}

- (UIFont *)fensalirHeaderFontWithSize:(CGFloat)size {
  UIFont *font = [UIFont fontWithName:@"Montserrat-Thin" size:size];
  if (font) {
    return font;
  }
  UIFontDescriptor *descriptor = [UIFontDescriptor fontDescriptorWithName:@"Montserrat" size:size];
  descriptor = [descriptor fontDescriptorByAddingAttributes:@{
    UIFontDescriptorTraitsAttribute: @{ UIFontWeightTrait: @(UIFontWeightThin) }
  }];
  font = [UIFont fontWithDescriptor:descriptor size:size];
  return font ?: [UIFont systemFontOfSize:size weight:UIFontWeightThin];
}

- (UIFont *)fensalirBodyFontWithSize:(CGFloat)size weight:(UIFontWeight)weight {
  if (size <= 8.5) {
    UIFont *tiny = [UIFont fontWithName:@"UbuntuSansMono-Regular" size:size] ?: [UIFont fontWithName:@"Ubuntu Sans Mono" size:size];
    if (tiny) {
      return tiny;
    }
    return [UIFont monospacedSystemFontOfSize:size weight:UIFontWeightRegular];
  }
  UIFont *font = [UIFont fontWithName:@"UbuntuSans-Light" size:size] ?: [UIFont fontWithName:@"Ubuntu Sans Light" size:size];
  if (!font) {
    UIFontDescriptor *descriptor = [UIFontDescriptor fontDescriptorWithName:@"Ubuntu Sans" size:size];
    descriptor = [descriptor fontDescriptorByAddingAttributes:@{
      UIFontDescriptorTraitsAttribute: @{ UIFontWeightTrait: @(weight) }
    }];
    font = [UIFont fontWithDescriptor:descriptor size:size];
  }
  return font ?: [UIFont systemFontOfSize:size weight:UIFontWeightLight];
}

- (void)registerFensalirFontsIfNeeded {
  NSArray<NSString *> *fontNames = @[
    @"Montserrat[wght]",
    @"UbuntuSans[wdth,wght]",
    @"UbuntuSansMono",
  ];
  for (NSString *name in fontNames) {
    NSURL *url = [NSBundle.mainBundle URLForResource:name withExtension:@"ttf" subdirectory:@"Fonts"];
    if (!url) {
      continue;
    }
    CFErrorRef error = NULL;
    CTFontManagerRegisterFontsForURL((__bridge CFURLRef)url, kCTFontManagerScopeProcess, &error);
    if (error) {
      CFRelease(error);
    }
  }
}

- (void)renderVoidBotDashboardWithNodes:(NSArray *)nodes title:(NSString *)title version:(id)version {
  for (UIView *view in self.voidBotDashboardView.subviews) {
    [view removeFromSuperview];
  }

  [self.voidBotDashboardView layoutIfNeeded];
  CGRect bounds = self.voidBotDashboardView.bounds;
  if (bounds.size.width < 20.0 || bounds.size.height < 20.0) {
    bounds = UIEdgeInsetsInsetRect(self.dashboardView.bounds, UIEdgeInsetsMake(6, 6, 6, 6));
  }

  UIView *grid = [[UIView alloc] initWithFrame:bounds];
  grid.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  grid.backgroundColor = [UIColor colorWithRed:0.004 green:0.018 blue:0.020 alpha:1.0];
  [self.voidBotDashboardView addSubview:grid];

  UILabel *hud = [self voidBotLabelWithFrame:CGRectMake(bounds.size.width - 138.0, 8.0, 128.0, 46.0)
                                        text:[NSString stringWithFormat:@"VOID\n%@  RUNN\n%@", title ?: @"swarm", version ?: @"?"]
                                        size:9.0
                                      weight:UIFontWeightBold
                                      color:[UIColor colorWithRed:1.0 green:0.72 blue:0.32 alpha:1.0]];
  hud.textAlignment = NSTextAlignmentLeft;
  hud.layer.borderColor = [UIColor colorWithRed:0.34 green:0.92 blue:0.88 alpha:0.42].CGColor;
  hud.layer.borderWidth = 1.0;
  hud.layer.cornerRadius = 4.0;
  hud.layer.masksToBounds = YES;
  hud.backgroundColor = [UIColor colorWithRed:0.03 green:0.06 blue:0.06 alpha:0.80];
  [grid addSubview:hud];

  CGFloat topHeight = 88.0;
  UIScrollView *ctbScroll = [[UIScrollView alloc] initWithFrame:CGRectMake(0.0, 0.0, bounds.size.width - 150.0, topHeight)];
  ctbScroll.showsHorizontalScrollIndicator = NO;
  ctbScroll.backgroundColor = [UIColor colorWithRed:0.01 green:0.035 blue:0.037 alpha:1.0];
  [grid addSubview:ctbScroll];

  NSArray *ctbNodes = [self dashboardNodesOfKind:@"ctb-turn"];
  CGFloat ctbX = 6.0;
  for (NSDictionary *node in ctbNodes) {
    UIView *card = [self voidBotAgentCardForNode:node frame:CGRectMake(ctbX, 7.0, 92.0, 74.0) compact:YES];
    [ctbScroll addSubview:card];
    ctbX += 98.0;
  }
  ctbScroll.contentSize = CGSizeMake(MAX(ctbX + 6.0, ctbScroll.bounds.size.width + 1.0), topHeight);

  CGFloat paneTop = topHeight + 10.0;
  CGFloat paneHeight = bounds.size.height - paneTop - 8.0;
  CGFloat gutter = 8.0;
  CGFloat leftWidth = floor(bounds.size.width * 0.235);
  CGFloat middleWidth = floor(bounds.size.width * 0.34);
  CGFloat rightWidth = bounds.size.width - leftWidth - middleWidth - (gutter * 2.0);

  UIView *leftPane = [self voidBotPaneWithFrame:CGRectMake(6.0, paneTop, leftWidth - 6.0, paneHeight)];
  UIView *statePane = [self voidBotPaneWithFrame:CGRectMake(leftPane.frame.origin.x + leftPane.frame.size.width + gutter, paneTop, middleWidth, paneHeight)];
  UIView *detailPane = [self voidBotPaneWithFrame:CGRectMake(statePane.frame.origin.x + statePane.frame.size.width + gutter, paneTop, rightWidth - 6.0, paneHeight)];
  [grid addSubview:leftPane];
  [grid addSubview:statePane];
  [grid addSubview:detailPane];

  [self fillVoidBotLeftPane:leftPane nodes:nodes];
  [self fillVoidBotStatePane:statePane nodes:nodes];
  [self fillVoidBotDetailPane:detailPane nodes:nodes];
}

- (void)fillVoidBotLeftPane:(UIView *)pane nodes:(NSArray *)nodes {
  NSDictionary *summary = [self dashboardNodeWithId:@"voidbot-summary"];
  NSDictionary *selected = [self dashboardNodeWithId:@"agent-detail"];
  [pane addSubview:[self voidBotLabelWithFrame:CGRectMake(10.0, 10.0, pane.bounds.size.width - 20.0, 18.0)
                                          text:@"CONTROLS"
                                          size:10.0
                                        weight:UIFontWeightRegular
                                        color:[UIColor colorWithRed:0.38 green:0.78 blue:0.70 alpha:0.78]]];

  UIButton *pause = [self voidBotButtonWithFrame:CGRectMake(pane.bounds.size.width - 70.0, 34.0, 58.0, 28.0) title:@"Pause"];
  pause.accessibilityIdentifier = @"voidbot-summary";
  [pause addTarget:self action:@selector(hierarchyNodePressed:) forControlEvents:UIControlEventTouchUpInside];
  [pane addSubview:pause];

  NSString *summaryText = [NSString stringWithFormat:@"%@\n%@",
                           summary[@"label"] ?: @"VoidBot Swarm",
                           summary[@"detail"] ?: @""];
  [pane addSubview:[self voidBotLabelWithFrame:CGRectMake(10.0, 34.0, pane.bounds.size.width - 92.0, 82.0)
                                          text:summaryText
                                          size:10.5
                                        weight:UIFontWeightSemibold
                                        color:[UIColor colorWithWhite:0.84 alpha:1.0]]];

  CGFloat y = 126.0;
  if (selected) {
    UIImageView *avatar = [[UIImageView alloc] initWithFrame:CGRectMake(10.0, y, 48.0, 48.0)];
    avatar.layer.cornerRadius = 24.0;
    avatar.layer.masksToBounds = YES;
    avatar.backgroundColor = [UIColor colorWithRed:0.06 green:0.16 blue:0.17 alpha:1.0];
    [pane addSubview:avatar];
    [self loadAvatarURLString:selected[@"avatarUrl"] intoImageView:avatar];

    UILabel *name = [self voidBotLabelWithFrame:CGRectMake(68.0, y - 2.0, pane.bounds.size.width - 78.0, 54.0)
                                           text:[NSString stringWithFormat:@"SELECTED FACE\n%@", selected[@"label"] ?: @"agent"]
                                           size:20.0
                                         weight:UIFontWeightLight
                                         color:[UIColor colorWithWhite:0.88 alpha:1.0]];
    name.numberOfLines = 3;
    [pane addSubview:name];
    y += 70.0;

    [self addVoidBotMetric:@"TURN" value:0.96 color:[UIColor colorWithRed:0.50 green:0.88 blue:1.0 alpha:1.0] toPane:pane y:&y];
    [self addVoidBotMetric:@"MEMORY" value:0.70 color:[UIColor colorWithRed:0.72 green:0.62 blue:1.0 alpha:1.0] toPane:pane y:&y];
    [self addVoidBotMetric:@"PRESSURE" value:0.42 color:[UIColor colorWithRed:0.55 green:0.92 blue:0.78 alpha:1.0] toPane:pane y:&y];
    [self addVoidBotMetric:@"HEAT" value:0.34 color:[UIColor colorWithRed:0.44 green:0.86 blue:0.92 alpha:1.0] toPane:pane y:&y];
    [self addVoidBotMetric:@"LOAD" value:0.99 color:[UIColor colorWithRed:1.0 green:0.50 blue:0.40 alpha:1.0] toPane:pane y:&y];
    [self addVoidBotMetric:@"SPEED" value:0.88 color:[UIColor colorWithRed:0.48 green:0.92 blue:0.75 alpha:1.0] toPane:pane y:&y];

    UILabel *description = [self voidBotLabelWithFrame:CGRectMake(10.0, y + 8.0, pane.bounds.size.width - 20.0, pane.bounds.size.height - y - 18.0)
                                                  text:selected[@"detail"] ?: @"No Face state detail."
                                                  size:9.5
                                                weight:UIFontWeightMedium
                                                color:[UIColor colorWithWhite:0.78 alpha:1.0]];
    description.numberOfLines = 0;
    [pane addSubview:description];
  }
}

- (void)fillVoidBotStatePane:(UIView *)pane nodes:(NSArray *)nodes {
  [pane addSubview:[self voidBotLabelWithFrame:CGRectMake(10.0, 10.0, pane.bounds.size.width - 20.0, 38.0)
                                          text:@"STATE GRAPH\nNIBU MEMORY TREE"
                                          size:11.0
                                        weight:UIFontWeightRegular
                                        color:[UIColor colorWithRed:0.54 green:0.76 blue:0.74 alpha:0.82]]];
  NSArray *leaves = [self dashboardNodesOfKind:@"state-leaf"];
  CGFloat y = 56.0;
  for (NSDictionary *node in leaves) {
    UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
    button.frame = CGRectMake(10.0, y, pane.bounds.size.width - 20.0, 50.0);
    button.accessibilityIdentifier = node[@"id"];
    button.contentHorizontalAlignment = UIControlContentHorizontalAlignmentLeft;
    button.titleLabel.font = [UIFont systemFontOfSize:12.0 weight:UIFontWeightRegular];
    button.titleLabel.numberOfLines = 2;
    button.tintColor = [node[@"id"] isEqualToString:self.selectedNodeId] ? [UIColor colorWithRed:1.0 green:0.72 blue:0.32 alpha:1.0] : [UIColor colorWithWhite:0.82 alpha:1.0];
    button.backgroundColor = [UIColor colorWithRed:0.04 green:0.11 blue:0.105 alpha:0.95];
    button.layer.borderWidth = 1.0;
    button.layer.borderColor = [UIColor colorWithRed:0.21 green:0.75 blue:0.70 alpha:0.25].CGColor;
    button.layer.cornerRadius = 5.0;
    [button setTitle:[NSString stringWithFormat:@"  %@", node[@"label"] ?: node[@"id"]] forState:UIControlStateNormal];
    [button addTarget:self action:@selector(hierarchyNodePressed:) forControlEvents:UIControlEventTouchUpInside];
    [pane addSubview:button];
    y += 58.0;
    if (y > pane.bounds.size.height - 58.0) {
      break;
    }
  }
}

- (void)fillVoidBotDetailPane:(UIView *)pane nodes:(NSArray *)nodes {
  NSDictionary *detail = [self dashboardNodeWithId:@"state-detail"] ?: [self dashboardNodeWithId:@"agent-detail"] ?: [self dashboardNodeWithId:@"voidbot-summary"];
  NSString *heading = [NSString stringWithFormat:@"STATE DETAIL\n%@", detail[@"label"] ?: @"VoidBot"];
  [pane addSubview:[self voidBotLabelWithFrame:CGRectMake(10.0, 10.0, pane.bounds.size.width - 20.0, 44.0)
                                          text:heading
                                          size:12.0
                                        weight:UIFontWeightRegular
                                        color:[UIColor colorWithRed:0.70 green:0.84 blue:0.82 alpha:0.88]]];
  UILabel *body = [self voidBotLabelWithFrame:CGRectMake(14.0, 66.0, pane.bounds.size.width - 28.0, pane.bounds.size.height - 80.0)
                                         text:detail[@"detail"] ?: @"No state detail."
                                         size:10.5
                                       weight:UIFontWeightBold
                                       color:[UIColor colorWithWhite:0.88 alpha:1.0]];
  body.numberOfLines = 0;
  body.backgroundColor = [UIColor colorWithRed:0.01 green:0.04 blue:0.045 alpha:1.0];
  body.layer.borderWidth = 1.0;
  body.layer.borderColor = [UIColor colorWithRed:0.21 green:0.75 blue:0.70 alpha:0.25].CGColor;
  body.layer.cornerRadius = 5.0;
  body.layer.masksToBounds = YES;
  [pane addSubview:body];
}

- (NSArray *)dashboardNodesOfKind:(NSString *)kind {
  NSMutableArray *matches = [NSMutableArray array];
  for (NSDictionary *node in self.dashboardNodes.allValues) {
    if ([node[@"kind"] isKindOfClass:NSString.class] && [node[@"kind"] isEqualToString:kind]) {
      [matches addObject:node];
    }
  }
  [matches sortUsingComparator:^NSComparisonResult(NSDictionary *a, NSDictionary *b) {
    NSString *left = [a[@"id"] isKindOfClass:NSString.class] ? a[@"id"] : @"";
    NSString *right = [b[@"id"] isKindOfClass:NSString.class] ? b[@"id"] : @"";
    return [left compare:right options:NSNumericSearch];
  }];
  return matches;
}

- (NSDictionary *)dashboardNodeWithId:(NSString *)nodeId {
  NSDictionary *node = self.dashboardNodes[nodeId];
  return [node isKindOfClass:NSDictionary.class] ? node : nil;
}

- (UIView *)voidBotPaneWithFrame:(CGRect)frame {
  UIView *pane = [[UIView alloc] initWithFrame:frame];
  pane.backgroundColor = [UIColor colorWithRed:0.018 green:0.060 blue:0.058 alpha:0.92];
  pane.layer.borderWidth = 1.0;
  pane.layer.borderColor = [UIColor colorWithRed:0.22 green:0.88 blue:0.82 alpha:0.22].CGColor;
  pane.layer.cornerRadius = 5.0;
  return pane;
}

- (UIView *)voidBotAgentCardForNode:(NSDictionary *)node frame:(CGRect)frame compact:(BOOL)compact {
  UIView *card = [[UIView alloc] initWithFrame:frame];
  card.accessibilityIdentifier = node[@"id"];
  card.backgroundColor = [UIColor colorWithRed:0.035 green:0.075 blue:0.088 alpha:1.0];
  card.layer.borderWidth = 1.0;
  card.layer.borderColor = [UIColor colorWithRed:0.38 green:0.92 blue:0.95 alpha:0.62].CGColor;
  card.layer.cornerRadius = 6.0;

  UIImageView *avatar = [[UIImageView alloc] initWithFrame:CGRectMake(8.0, 7.0, compact ? 34.0 : 44.0, compact ? 34.0 : 44.0)];
  avatar.layer.cornerRadius = avatar.bounds.size.width * 0.5;
  avatar.layer.masksToBounds = YES;
  avatar.backgroundColor = [UIColor colorWithRed:0.05 green:0.15 blue:0.17 alpha:1.0];
  [card addSubview:avatar];
  [self loadAvatarURLString:node[@"avatarUrl"] intoImageView:avatar];

  CGFloat textX = compact ? 6.0 : 60.0;
  CGFloat textY = compact ? 42.0 : 8.0;
  CGFloat size = compact ? 8.0 : 11.0;
  NSString *label = node[@"label"] ?: node[@"id"] ?: @"agent";
  NSString *health = node[@"health"] ?: @"ready";
  UILabel *text = [self voidBotLabelWithFrame:CGRectMake(textX, textY, frame.size.width - textX - 6.0, frame.size.height - textY - 5.0)
                                         text:[NSString stringWithFormat:@"%@\n%@", label, health]
                                         size:size
                                       weight:UIFontWeightBold
                                       color:[UIColor colorWithWhite:0.92 alpha:1.0]];
  text.numberOfLines = compact ? 3 : 4;
  [card addSubview:text];

  UITapGestureRecognizer *tap = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(voidBotNodeTapped:)];
  [card addGestureRecognizer:tap];
  return card;
}

- (UILabel *)voidBotLabelWithFrame:(CGRect)frame text:(NSString *)text size:(CGFloat)size weight:(UIFontWeight)weight color:(UIColor *)color {
  UILabel *label = [[UILabel alloc] initWithFrame:frame];
  label.text = text ?: @"";
  label.numberOfLines = 0;
  label.textColor = color;
  label.font = [UIFont monospacedSystemFontOfSize:size weight:weight];
  label.lineBreakMode = NSLineBreakByTruncatingTail;
  return label;
}

- (UIButton *)voidBotButtonWithFrame:(CGRect)frame title:(NSString *)title {
  UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
  button.frame = frame;
  [button setTitle:title forState:UIControlStateNormal];
  button.titleLabel.font = [UIFont systemFontOfSize:12.0 weight:UIFontWeightBold];
  button.tintColor = UIColor.whiteColor;
  button.backgroundColor = [UIColor colorWithRed:0.09 green:0.16 blue:0.16 alpha:1.0];
  button.layer.cornerRadius = 5.0;
  button.layer.borderWidth = 1.0;
  button.layer.borderColor = [UIColor colorWithRed:0.30 green:0.80 blue:0.75 alpha:0.28].CGColor;
  return button;
}

- (void)addVoidBotMetric:(NSString *)label value:(CGFloat)value color:(UIColor *)color toPane:(UIView *)pane y:(CGFloat *)y {
  UILabel *caption = [self voidBotLabelWithFrame:CGRectMake(10.0, *y, pane.bounds.size.width - 20.0, 12.0)
                                           text:label
                                           size:8.5
                                         weight:UIFontWeightRegular
                                         color:[UIColor colorWithWhite:0.66 alpha:1.0]];
  [pane addSubview:caption];
  UIView *track = [[UIView alloc] initWithFrame:CGRectMake(10.0, *y + 15.0, pane.bounds.size.width - 20.0, 6.0)];
  track.backgroundColor = [UIColor colorWithRed:0.0 green:0.02 blue:0.025 alpha:1.0];
  track.layer.borderWidth = 1.0;
  track.layer.borderColor = [UIColor colorWithWhite:1.0 alpha:0.12].CGColor;
  track.layer.cornerRadius = 3.0;
  [pane addSubview:track];
  UIView *fill = [[UIView alloc] initWithFrame:CGRectMake(0.0, 0.0, track.bounds.size.width * MIN(1.0, MAX(0.0, value)), track.bounds.size.height)];
  fill.backgroundColor = color;
  fill.layer.cornerRadius = 3.0;
  [track addSubview:fill];
  *y += 34.0;
}

- (void)loadAvatarURLString:(id)urlValue intoImageView:(UIImageView *)imageView {
  if (![urlValue isKindOfClass:NSString.class] || ((NSString *)urlValue).length == 0) {
    return;
  }
  NSString *urlString = (NSString *)urlValue;
  UIImage *cached = self.avatarCache[urlString];
  if (cached) {
    imageView.image = cached;
    return;
  }
  NSURL *url = [NSURL URLWithString:urlString];
  if (!url) {
    return;
  }
  __weak typeof(self) weakSelf = self;
  __weak UIImageView *weakImageView = imageView;
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
    NSData *data = [NSData dataWithContentsOfURL:url];
    UIImage *image = data ? [UIImage imageWithData:data] : nil;
    if (!image) {
      return;
    }
    dispatch_async(dispatch_get_main_queue(), ^{
      __strong typeof(weakSelf) self = weakSelf;
      UIImageView *imageView = weakImageView;
      if (!self || !imageView) {
        return;
      }
      self.avatarCache[urlString] = image;
      imageView.image = image;
    });
  });
}

- (void)voidBotNodeTapped:(UITapGestureRecognizer *)recognizer {
  NSString *nodeId = recognizer.view.accessibilityIdentifier;
  if (nodeId) {
    [self selectOrOpenDashboardNode:nodeId];
  }
}

- (void)dashboardClient:(EVEDashboardClient *)client didChangeStatus:(NSString *)status {
  (void)client;
  self.dashboardStatus = status;
  self.dashboardStatusLabel.text = status;
}

- (void)ensureDashboardNodeView:(NSDictionary *)node {
  NSString *nodeId = node[@"id"];
  if (self.nodeViews[nodeId]) {
    return;
  }

  UIView *view = [[UIView alloc] initWithFrame:CGRectMake(0, 0, 120, 80)];
  view.backgroundColor = [UIColor colorWithRed:0.10 green:0.13 blue:0.16 alpha:1.0];
  view.layer.borderWidth = 1.0;
  view.layer.cornerRadius = 6.0;
  view.multipleTouchEnabled = YES;
  view.accessibilityIdentifier = nodeId;

  UILabel *label = [[UILabel alloc] initWithFrame:CGRectInset(view.bounds, 8.0, 6.0)];
  label.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  label.numberOfLines = 3;
  label.textColor = UIColor.whiteColor;
  label.font = [UIFont monospacedSystemFontOfSize:12.0 weight:UIFontWeightMedium];
  label.tag = 1001;
  [view addSubview:label];

  UITapGestureRecognizer *tap = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(nodeTapped:)];
  [view addGestureRecognizer:tap];
  UIPanGestureRecognizer *pan = [[UIPanGestureRecognizer alloc] initWithTarget:self action:@selector(nodePanned:)];
  [view addGestureRecognizer:pan];
  UIPinchGestureRecognizer *pinch = [[UIPinchGestureRecognizer alloc] initWithTarget:self action:@selector(nodePinched:)];
  pinch.delegate = self;
  [view addGestureRecognizer:pinch];
  UIRotationGestureRecognizer *rotation = [[UIRotationGestureRecognizer alloc] initWithTarget:self action:@selector(nodeRotated:)];
  rotation.delegate = self;
  [view addGestureRecognizer:rotation];

  [self.sceneCanvasView addSubview:view];
  self.nodeViews[nodeId] = view;
}

- (void)updateDashboardNodeView:(NSDictionary *)node {
  NSString *nodeId = node[@"id"];
  UIView *view = self.nodeViews[nodeId];
  if (!view) {
    return;
  }

  CGFloat canvasWidth = MAX(1.0, self.sceneCanvasView.bounds.size.width);
  CGFloat canvasHeight = MAX(1.0, self.sceneCanvasView.bounds.size.height);
  CGFloat width = MAX(72.0, [node[@"width"] doubleValue] * canvasWidth);
  CGFloat height = MAX(54.0, [node[@"height"] doubleValue] * canvasHeight);
  CGFloat x = ([node[@"x"] doubleValue] + 1.0) * 0.5 * canvasWidth;
  CGFloat y = ([node[@"y"] doubleValue] + 1.0) * 0.5 * canvasHeight;
  view.bounds = CGRectMake(0, 0, width, height);
  view.center = CGPointMake(x, y);

  CGFloat scale = MAX(0.25, [node[@"scale"] doubleValue]);
  CGFloat rotation = [node[@"rotation"] doubleValue];
  view.transform = CGAffineTransformRotate(CGAffineTransformMakeScale(scale, scale), rotation);
  BOOL visible = [node[@"visible"] boolValue];
  view.alpha = visible ? 1.0 : 0.28;
  BOOL selected = [nodeId isEqualToString:self.selectedNodeId];
  view.layer.borderColor = selected
    ? [UIColor colorWithRed:0.45 green:0.80 blue:1.0 alpha:1.0].CGColor
    : [UIColor colorWithWhite:1.0 alpha:0.16].CGColor;
  view.layer.borderWidth = selected ? 2.0 : 1.0;

  UILabel *label = (UILabel *)[view viewWithTag:1001];
  if ([label isKindOfClass:UILabel.class]) {
    NSString *detail = [node[@"detail"] isKindOfClass:NSString.class] ? node[@"detail"] : @"";
    if (detail.length > 0) {
      label.text = [NSString stringWithFormat:@"%@\n%@  %@\n%@",
                    node[@"label"] ?: nodeId,
                    node[@"kind"] ?: @"source",
                    node[@"health"] ?: @"",
                    detail];
      label.font = [UIFont monospacedSystemFontOfSize:10.0 weight:UIFontWeightMedium];
      label.numberOfLines = 6;
    } else {
      label.text = [NSString stringWithFormat:@"%@\n%@  %@",
                    node[@"label"] ?: nodeId,
                    node[@"kind"] ?: @"source",
                    node[@"health"] ?: @""];
      label.font = [UIFont monospacedSystemFontOfSize:12.0 weight:UIFontWeightMedium];
      label.numberOfLines = 3;
    }
  }
}

- (void)rebuildHierarchyWithNodes:(NSArray *)nodes {
  for (UIView *view in self.hierarchyStackView.arrangedSubviews) {
    [self.hierarchyStackView removeArrangedSubview:view];
    [view removeFromSuperview];
  }

  UILabel *title = [[UILabel alloc] initWithFrame:CGRectZero];
  title.text = @"Dashboards";
  title.textColor = UIColor.whiteColor;
  title.font = [UIFont systemFontOfSize:16.0 weight:UIFontWeightBold];
  [self.hierarchyStackView addArrangedSubview:title];

  for (NSDictionary *node in nodes) {
    NSString *nodeId = node[@"id"];
    if (![nodeId isKindOfClass:NSString.class]) {
      continue;
    }

    UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
    NSString *visible = [node[@"visible"] boolValue] ? @"●" : @"○";
    [button setTitle:[NSString stringWithFormat:@"%@  %@", visible, node[@"label"] ?: nodeId] forState:UIControlStateNormal];
    button.contentHorizontalAlignment = UIControlContentHorizontalAlignmentLeft;
    button.accessibilityIdentifier = nodeId;
    button.titleLabel.font = [UIFont monospacedSystemFontOfSize:13.0 weight:[nodeId isEqualToString:self.selectedNodeId] ? UIFontWeightBold : UIFontWeightRegular];
    button.tintColor = [nodeId isEqualToString:self.selectedNodeId] ? [UIColor colorWithRed:0.55 green:0.85 blue:1.0 alpha:1.0] : [UIColor colorWithWhite:0.85 alpha:1.0];
    [button addTarget:self action:@selector(hierarchyNodePressed:) forControlEvents:UIControlEventTouchUpInside];
    [self.hierarchyStackView addArrangedSubview:button];
  }
}

- (void)nodeTapped:(UITapGestureRecognizer *)recognizer {
  NSString *nodeId = recognizer.view.accessibilityIdentifier;
  if (!nodeId) {
    return;
  }

  [self selectOrOpenDashboardNode:nodeId];
}

- (void)nodePanned:(UIPanGestureRecognizer *)recognizer {
  UIView *view = recognizer.view;
  NSString *nodeId = view.accessibilityIdentifier;
  if (!nodeId) {
    return;
  }

  CGPoint translation = [recognizer translationInView:self.sceneCanvasView];
  view.center = CGPointMake(view.center.x + translation.x, view.center.y + translation.y);
  [recognizer setTranslation:CGPointZero inView:self.sceneCanvasView];
  if (recognizer.state == UIGestureRecognizerStateChanged || recognizer.state == UIGestureRecognizerStateEnded) {
    [self sendMoveForNodeId:nodeId center:view.center];
  }
}

- (void)nodePinched:(UIPinchGestureRecognizer *)recognizer {
  NSString *nodeId = recognizer.view.accessibilityIdentifier;
  NSDictionary *node = nodeId ? self.dashboardNodes[nodeId] : nil;
  if (!nodeId || !node) {
    return;
  }

  if (recognizer.state == UIGestureRecognizerStateBegan) {
    self.activeGestureStartScale = MAX(0.25, [node[@"scale"] doubleValue]);
  }

  CGFloat scale = MAX(0.25, MIN(3.0, self.activeGestureStartScale * recognizer.scale));
  [self.dashboardClient sendCommand:@{@"type": @"scale", @"nodeId": nodeId, @"scale": @(scale)}];
}

- (void)nodeRotated:(UIRotationGestureRecognizer *)recognizer {
  NSString *nodeId = recognizer.view.accessibilityIdentifier;
  NSDictionary *node = nodeId ? self.dashboardNodes[nodeId] : nil;
  if (!nodeId || !node) {
    return;
  }

  if (recognizer.state == UIGestureRecognizerStateBegan) {
    self.activeGestureStartRotation = [node[@"rotation"] doubleValue];
  }

  CGFloat rotation = self.activeGestureStartRotation + recognizer.rotation;
  [self.dashboardClient sendCommand:@{@"type": @"rotate", @"nodeId": nodeId, @"rotation": @(rotation)}];
}

- (void)sendMoveForNodeId:(NSString *)nodeId center:(CGPoint)center {
  CGFloat canvasWidth = MAX(1.0, self.sceneCanvasView.bounds.size.width);
  CGFloat canvasHeight = MAX(1.0, self.sceneCanvasView.bounds.size.height);
  CGFloat x = MIN(1.0, MAX(-1.0, (center.x / canvasWidth) * 2.0 - 1.0));
  CGFloat y = MIN(1.0, MAX(-1.0, (center.y / canvasHeight) * 2.0 - 1.0));
  [self.dashboardClient sendCommand:@{@"type": @"move", @"nodeId": nodeId, @"x": @(x), @"y": @(y)}];
}

- (void)hierarchyNodePressed:(UIButton *)button {
  NSString *nodeId = button.accessibilityIdentifier;
  if (!nodeId) {
    return;
  }

  [self selectOrOpenDashboardNode:nodeId];
}

- (void)selectOrOpenDashboardNode:(NSString *)nodeId {
  self.selectedNodeId = nodeId;
  NSDictionary *node = self.dashboardNodes[nodeId];
  NSString *command = [node[@"command"] isKindOfClass:NSString.class] ? node[@"command"] : nil;
  NSString *providerId = [node[@"providerId"] isKindOfClass:NSString.class] ? node[@"providerId"] : nil;
  if ([command isEqualToString:@"open-provider"] && providerId) {
    [self.dashboardClient sendCommand:@{@"type": @"open-provider", @"nodeId": nodeId, @"providerId": providerId}];
    return;
  }

  [self.dashboardClient sendCommand:@{@"type": @"select", @"nodeId": nodeId}];
}

- (void)toolbarButtonPressed:(UIButton *)button {
  NSString *nodeId = self.selectedNodeId;
  NSString *action = button.accessibilityIdentifier;
  if (!nodeId || !action) {
    return;
  }

  [self.dashboardClient sendCommand:@{@"type": action, @"nodeId": nodeId}];
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer {
  (void)gestureRecognizer;
  (void)otherGestureRecognizer;
  return YES;
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
  self.videoDecoder.displayLayer.hidden = YES;
  self.streamImageView.hidden = NO;
  self.streamImageView.image = image;
}

- (void)frameStreamClient:(EVEFrameStreamClient *)client didReceiveVideoAccessUnit:(NSData *)data {
  (void)client;
  self.streamImageView.hidden = YES;
  self.videoDecoder.displayLayer.hidden = NO;
  [self.videoDecoder consumeAnnexBAccessUnit:data];
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

- (void)frameStreamClient:(EVEFrameStreamClient *)client didReceiveCodec:(NSString *)codec {
  (void)client;
  if (![codec isEqualToString:self.streamCodec]) {
    [self.videoDecoder reset];
  }
  self.streamCodec = codec;
}

- (void)frameStreamClient:(EVEFrameStreamClient *)client didReceiveDialogueText:(NSString *)text {
  (void)client;
  self.dialogueLine = text;
}

- (void)frameStreamClient:(EVEFrameStreamClient *)client didChangeStatus:(NSString *)status {
  (void)client;
  self.streamStatus = status;
}

@end
