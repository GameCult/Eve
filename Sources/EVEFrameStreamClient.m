#import "EVEFrameStreamClient.h"

@interface EVEFrameStreamClient ()

@property(nonatomic, copy) NSArray<NSURL *> *urls;
@property(nonatomic, assign) NSUInteger urlIndex;
@property(nonatomic, weak) id<EVEFrameStreamClientDelegate> delegate;
@property(nonatomic, strong) NSURLSession *session;
@property(nonatomic, strong) NSURLSessionWebSocketTask *task;
@property(nonatomic, assign) BOOL shouldReconnect;

@end

@implementation EVEFrameStreamClient

- (instancetype)initWithURL:(NSURL *)url delegate:(id<EVEFrameStreamClientDelegate>)delegate {
  return [self initWithURLs:url ? @[url] : @[] delegate:delegate];
}

- (instancetype)initWithURLs:(NSArray<NSURL *> *)urls delegate:(id<EVEFrameStreamClientDelegate>)delegate {
  self = [super init];
  if (!self) {
    return nil;
  }

  self.urls = urls.count > 0 ? urls : @[];
  self.delegate = delegate;
  self.session = [NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.defaultSessionConfiguration];
  self.shouldReconnect = YES;
  return self;
}

- (void)connect {
  self.shouldReconnect = YES;
  [self.task cancelWithCloseCode:NSURLSessionWebSocketCloseCodeNormalClosure reason:nil];
  NSURL *url = self.urls.count > 0 ? self.urls[self.urlIndex % self.urls.count] : nil;
  if (!url) {
    [self publishStatus:@"stream URL missing"];
    return;
  }

  self.task = [self.session webSocketTaskWithURL:url];
  [self.task resume];
  [self publishStatus:[NSString stringWithFormat:@"connecting %@", url.host ?: @""]];
  [self receiveNextMessage];
}

- (void)disconnect {
  self.shouldReconnect = NO;
  [self.task cancelWithCloseCode:NSURLSessionWebSocketCloseCodeNormalClosure reason:nil];
  self.task = nil;
}

- (void)sendPointerPhase:(NSString *)phase x:(CGFloat)x y:(CGFloat)y {
  NSDictionary *payload = @{
    @"type": @"pointer",
    @"phase": phase,
    @"x": @(x),
    @"y": @(y),
  };
  [self sendJSONObject:payload failureStatus:@"input send failed"];
}

- (void)sendJSONObject:(NSDictionary *)payload failureStatus:(NSString *)failureStatus {
  if (!self.task) {
    return;
  }

  NSData *json = [NSJSONSerialization dataWithJSONObject:payload options:0 error:nil];
  if (!json) {
    return;
  }

  NSString *text = [[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding];
  NSURLSessionWebSocketMessage *message = [[NSURLSessionWebSocketMessage alloc] initWithString:text];
  [self.task sendMessage:message completionHandler:^(NSError *error) {
    if (error) {
      [self publishStatus:failureStatus ?: @"send failed"];
    }
  }];
}

- (void)receiveNextMessage {
  __weak typeof(self) weakSelf = self;
  [self.task receiveMessageWithCompletionHandler:^(NSURLSessionWebSocketMessage *message, NSError *error) {
    __strong typeof(weakSelf) self = weakSelf;
    if (!self) {
      return;
    }

    if (error) {
      [self publishStatus:@"stream disconnected"];
      [self reconnectSoon];
      return;
    }

    if (message.type == NSURLSessionWebSocketMessageTypeData) {
      const uint8_t *bytes = message.data.bytes;
      BOOL isJpeg = message.data.length > 2 && bytes[0] == 0xff && bytes[1] == 0xd8;
      if (isJpeg) {
        UIImage *image = [UIImage imageWithData:message.data];
        if (image) {
          dispatch_async(dispatch_get_main_queue(), ^{
            [self.delegate frameStreamClient:self didReceiveImage:image];
          });
        }
      } else {
        dispatch_async(dispatch_get_main_queue(), ^{
          [self.delegate frameStreamClient:self didReceiveVideoAccessUnit:message.data];
        });
      }
    } else if (message.type == NSURLSessionWebSocketMessageTypeString) {
      [self handleTextMessage:message.string];
    }

    [self receiveNextMessage];
  }];
}

- (void)handleTextMessage:(NSString *)text {
  NSData *data = [text dataUsingEncoding:NSUTF8StringEncoding];
  if (!data) {
    return;
  }

  NSDictionary *message = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
  if (![message isKindOfClass:NSDictionary.class]) {
    return;
  }

  if ([message[@"type"] isEqualToString:@"config"]) {
    CGFloat width = [message[@"width"] doubleValue];
    CGFloat height = [message[@"height"] doubleValue];
    CGFloat scale = [message[@"DeviceScaleFactor"] doubleValue];
    if (scale <= 0) {
      scale = [message[@"deviceScaleFactor"] doubleValue];
    }
    dispatch_async(dispatch_get_main_queue(), ^{
      [self.delegate frameStreamClient:self didReceiveViewportWidth:width height:height scale:scale];
      NSString *codec = message[@"codec"];
      if ([codec isKindOfClass:NSString.class]) {
        [self.delegate frameStreamClient:self didReceiveCodec:codec];
      }
      [self.delegate frameStreamClient:self didChangeStatus:@"stream live"];
    });
  } else if ([message[@"type"] isEqualToString:@"dialogue"]) {
    NSString *text = message[@"text"];
    if (![text isKindOfClass:NSString.class]) {
      return;
    }

    dispatch_async(dispatch_get_main_queue(), ^{
      [self.delegate frameStreamClient:self didReceiveDialogueText:text];
    });
    NSDictionary *ack = @{
      @"type": @"dialogue-ack",
      @"device": @"eve",
      @"text": text,
      @"status": @"seen",
    };
    [self sendJSONObject:ack failureStatus:@"dialogue ack failed"];
  }
}

- (void)reconnectSoon {
  if (!self.shouldReconnect) {
    return;
  }

  if (self.urls.count > 1) {
    self.urlIndex = (self.urlIndex + 1) % self.urls.count;
  }

  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    if (self.shouldReconnect) {
      [self connect];
    }
  });
}

- (void)publishStatus:(NSString *)status {
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.delegate frameStreamClient:self didChangeStatus:status];
  });
}

- (void)dealloc {
  [self disconnect];
  [self.session invalidateAndCancel];
}

@end
