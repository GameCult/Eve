#import "EVESensorUplinkClient.h"

@interface EVESensorUplinkClient ()

@property(nonatomic, copy) NSArray<NSURL *> *urls;
@property(nonatomic, copy) NSString *label;
@property(nonatomic, assign) NSUInteger urlIndex;
@property(nonatomic, strong) NSURLSession *session;
@property(nonatomic, strong) NSURLSessionWebSocketTask *task;
@property(nonatomic, assign) BOOL shouldReconnect;
@property(nonatomic, assign) BOOL connecting;
@property(nonatomic, copy, readwrite) NSString *status;

@end

@implementation EVESensorUplinkClient

- (instancetype)initWithURLs:(NSArray<NSURL *> *)urls label:(NSString *)label {
  self = [super init];
  if (!self) {
    return nil;
  }

  self.urls = urls.count > 0 ? urls : @[];
  self.label = label ?: @"sensor";
  self.session = [NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.defaultSessionConfiguration];
  self.status = @"idle";
  return self;
}

- (void)connect {
  self.shouldReconnect = YES;
  if (self.connecting || self.task) {
    return;
  }

  NSURL *url = self.urls.count > 0 ? self.urls[self.urlIndex % self.urls.count] : nil;
  if (!url) {
    self.status = @"url missing";
    return;
  }

  self.connecting = YES;
  self.task = [self.session webSocketTaskWithURL:url];
  [self.task resume];
  self.connecting = NO;
  self.status = [NSString stringWithFormat:@"%@ connecting %@", self.label, url.host ?: @""];
  NSLog(@"EveCanvas %@ uplink connecting %@", self.label, url.absoluteString);
}

- (void)disconnect {
  self.shouldReconnect = NO;
  [self.task cancelWithCloseCode:NSURLSessionWebSocketCloseCodeNormalClosure reason:nil];
  self.task = nil;
}

- (void)sendJSONObject:(NSDictionary *)payload {
  NSURLSessionWebSocketTask *task = self.task;
  if (!task) {
    [self connect];
    return;
  }

  NSError *jsonError = nil;
  NSData *data = [NSJSONSerialization dataWithJSONObject:payload options:0 error:&jsonError];
  if (!data || jsonError) {
    self.status = [NSString stringWithFormat:@"%@ json failed", self.label];
    return;
  }

  NSString *text = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  NSURLSessionWebSocketMessage *message = [[NSURLSessionWebSocketMessage alloc] initWithString:text];
  __weak typeof(self) weakSelf = self;
  [task sendMessage:message completionHandler:^(NSError *error) {
    __strong typeof(weakSelf) self = weakSelf;
    if (!self) {
      return;
    }

    if (error) {
      self.status = [NSString stringWithFormat:@"%@ send failed", self.label];
      NSLog(@"EveCanvas %@ uplink send failed: %@", self.label, error);
      self.task = nil;
      [self reconnectSoon];
    } else {
      self.status = [NSString stringWithFormat:@"%@ live", self.label];
    }
  }];
}

- (void)sendData:(NSData *)payload {
  NSURLSessionWebSocketTask *task = self.task;
  if (!task) {
    [self connect];
    return;
  }

  if (!payload) {
    self.status = [NSString stringWithFormat:@"%@ binary missing", self.label];
    return;
  }

  NSURLSessionWebSocketMessage *message = [[NSURLSessionWebSocketMessage alloc] initWithData:payload];
  __weak typeof(self) weakSelf = self;
  [task sendMessage:message completionHandler:^(NSError *error) {
    __strong typeof(weakSelf) self = weakSelf;
    if (!self) {
      return;
    }

    if (error) {
      self.status = [NSString stringWithFormat:@"%@ send failed", self.label];
      NSLog(@"EveCanvas %@ uplink binary send failed: %@", self.label, error);
      self.task = nil;
      [self reconnectSoon];
    } else {
      self.status = [NSString stringWithFormat:@"%@ live", self.label];
    }
  }];
}

- (void)reconnectSoon {
  if (!self.shouldReconnect) {
    return;
  }

  if (self.urls.count > 1) {
    self.urlIndex = (self.urlIndex + 1) % self.urls.count;
  }

  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    [self connect];
  });
}

- (void)dealloc {
  [self disconnect];
  [self.session invalidateAndCancel];
}

@end
