#import "EVEDashboardClient.h"

@interface EVEDashboardClient ()

@property(nonatomic, copy) NSArray<NSURL *> *urls;
@property(nonatomic, assign) NSUInteger urlIndex;
@property(nonatomic, weak) id<EVEDashboardClientDelegate> delegate;
@property(nonatomic, strong) NSURLSession *session;
@property(nonatomic, strong) NSURLSessionWebSocketTask *task;
@property(nonatomic, assign) BOOL shouldReconnect;
@property(nonatomic, copy, readwrite) NSString *status;

@end

@implementation EVEDashboardClient

- (instancetype)initWithURLs:(NSArray<NSURL *> *)urls delegate:(id<EVEDashboardClientDelegate>)delegate {
  self = [super init];
  if (!self) {
    return nil;
  }

  self.urls = urls.count > 0 ? urls : @[];
  self.delegate = delegate;
  self.session = [NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.defaultSessionConfiguration];
  self.status = @"dashboard idle";
  return self;
}

- (void)connect {
  self.shouldReconnect = YES;
  [self.task cancelWithCloseCode:NSURLSessionWebSocketCloseCodeNormalClosure reason:nil];
  NSURL *url = self.urls.count > 0 ? self.urls[self.urlIndex % self.urls.count] : nil;
  if (!url) {
    [self publishStatus:@"dashboard URL missing"];
    return;
  }

  self.task = [self.session webSocketTaskWithURL:url];
  [self.task resume];
  [self publishStatus:[NSString stringWithFormat:@"dashboard connecting %@", url.host ?: @""]];
  [self receiveNextMessage];
}

- (void)disconnect {
  self.shouldReconnect = NO;
  [self.task cancelWithCloseCode:NSURLSessionWebSocketCloseCodeNormalClosure reason:nil];
  self.task = nil;
}

- (void)sendCommand:(NSDictionary *)command {
  if (!self.task) {
    return;
  }

  NSData *json = [NSJSONSerialization dataWithJSONObject:command options:0 error:nil];
  if (!json) {
    return;
  }

  NSString *text = [[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding];
  NSURLSessionWebSocketMessage *message = [[NSURLSessionWebSocketMessage alloc] initWithString:text];
  [self.task sendMessage:message completionHandler:^(NSError *error) {
    if (error) {
      [self publishStatus:@"dashboard command failed"];
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
      [self publishStatus:@"dashboard disconnected"];
      [self reconnectSoon];
      return;
    }

    if (message.type == NSURLSessionWebSocketMessageTypeString) {
      NSData *data = [message.string dataUsingEncoding:NSUTF8StringEncoding];
      NSDictionary *state = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
      if ([state isKindOfClass:NSDictionary.class]) {
        dispatch_async(dispatch_get_main_queue(), ^{
          [self.delegate dashboardClient:self didReceiveState:state];
        });
      }
    }

    [self receiveNextMessage];
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
    if (self.shouldReconnect) {
      [self connect];
    }
  });
}

- (void)publishStatus:(NSString *)status {
  self.status = status ?: @"dashboard";
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.delegate dashboardClient:self didChangeStatus:self.status];
  });
}

- (void)dealloc {
  [self disconnect];
  [self.session invalidateAndCancel];
}

@end
