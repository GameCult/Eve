#import "EVEHermodrClient.h"

static NSTimeInterval const EVESurfaceRefreshInterval = 1.0;

@interface EVEHermodrClient ()

@property(nonatomic, copy) NSArray<NSURL *> *baseURLs;
@property(nonatomic, assign) NSUInteger urlIndex;
@property(nonatomic, copy) NSString *providerId;
@property(nonatomic, copy) NSString *surfaceId;
@property(nonatomic, weak) id<EVEHermodrClientDelegate> delegate;
@property(nonatomic, strong) NSURLSession *session;
@property(nonatomic, strong) NSURLSessionDataTask *surfaceTask;
@property(nonatomic, assign) BOOL shouldRefresh;
@property(nonatomic, assign) NSUInteger generation;
@property(nonatomic, copy) NSData *lastSurfaceData;
@property(nonatomic, copy, readwrite) NSString *status;

@end

@implementation EVEHermodrClient

- (instancetype)initWithBaseURLs:(NSArray<NSURL *> *)baseURLs
                       providerId:(NSString *)providerId
                        surfaceId:(NSString *)surfaceId
                         delegate:(id<EVEHermodrClientDelegate>)delegate {
  self = [super init];
  if (!self) {
    return nil;
  }

  NSURLSessionConfiguration *configuration = NSURLSessionConfiguration.ephemeralSessionConfiguration;
  configuration.requestCachePolicy = NSURLRequestReloadIgnoringLocalCacheData;
  configuration.timeoutIntervalForRequest = 8.0;
  configuration.timeoutIntervalForResource = 12.0;
  self.session = [NSURLSession sessionWithConfiguration:configuration];
  self.baseURLs = baseURLs.count > 0 ? baseURLs : @[];
  self.providerId = providerId.length > 0 ? providerId : @"gjallar.overview";
  self.surfaceId = surfaceId.length > 0 ? surfaceId : self.providerId;
  self.delegate = delegate;
  self.status = @"Hermodr idle";
  return self;
}

- (void)connect {
  self.shouldRefresh = YES;
  self.generation += 1;
  [self.surfaceTask cancel];
  self.surfaceTask = nil;
  self.lastSurfaceData = nil;
  if (self.baseURLs.count == 0) {
    [self publishStatus:@"Hermodr URL missing"];
    return;
  }
  [self requestSurfaceForGeneration:self.generation];
}

- (void)disconnect {
  self.shouldRefresh = NO;
  self.generation += 1;
  [self.surfaceTask cancel];
  self.surfaceTask = nil;
}

- (void)requestSurfaceForGeneration:(NSUInteger)generation {
  if (!self.shouldRefresh || generation != self.generation) {
    return;
  }

  NSURL *baseURL = self.baseURLs[self.urlIndex % self.baseURLs.count];
  NSURL *surfaceURL = [self surfaceURLForBaseURL:baseURL];
  if (!surfaceURL) {
    [self publishStatus:@"Hermodr URL invalid"];
    [self scheduleRefreshForGeneration:generation];
    return;
  }

  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:surfaceURL];
  request.HTTPMethod = @"GET";
  [request setValue:@"application/json" forHTTPHeaderField:@"Accept"];
  [self publishStatus:[NSString stringWithFormat:@"opening %@", self.providerId]];

  __weak typeof(self) weakSelf = self;
  self.surfaceTask = [self.session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
    __strong typeof(weakSelf) self = weakSelf;
    if (!self || generation != self.generation || !self.shouldRefresh) {
      return;
    }

    NSHTTPURLResponse *http = [response isKindOfClass:NSHTTPURLResponse.class] ? (NSHTTPURLResponse *)response : nil;
    NSError *parseError = nil;
    NSDictionary *state = data.length > 0 ? [NSJSONSerialization JSONObjectWithData:data options:0 error:&parseError] : nil;
    NSDictionary *surface = [state isKindOfClass:NSDictionary.class] && [state[@"surface"] isKindOfClass:NSDictionary.class] ? state[@"surface"] : nil;
    NSDictionary *root = [surface[@"root"] isKindOfClass:NSDictionary.class] ? surface[@"root"] : nil;
    BOOL accepted = !error && http.statusCode >= 200 && http.statusCode < 300 && root != nil;

    if (accepted) {
      BOOL changed = ![self.lastSurfaceData isEqualToData:data];
      self.lastSurfaceData = data;
      dispatch_async(dispatch_get_main_queue(), ^{
        [self publishStatus:[NSString stringWithFormat:@"%@ connected", self.providerId]];
        if (changed) {
          [self.delegate hermodrClient:self didReceiveSurface:state];
        }
      });
    } else {
      if (self.baseURLs.count > 1) {
        self.urlIndex = (self.urlIndex + 1) % self.baseURLs.count;
      }
      NSString *detail = error.localizedDescription;
      if (detail.length == 0 && [state[@"error"] isKindOfClass:NSString.class]) {
        detail = state[@"error"];
      }
      if (detail.length == 0 && http) {
        detail = [NSString stringWithFormat:@"HTTP %ld", (long)http.statusCode];
      }
      if (detail.length == 0 && parseError) {
        detail = parseError.localizedDescription;
      }
      [self publishStatus:[NSString stringWithFormat:@"Hermodr unavailable: %@", detail ?: @"invalid surface"]];
    }
    [self scheduleRefreshForGeneration:generation];
  }];
  [self.surfaceTask resume];
}

- (void)scheduleRefreshForGeneration:(NSUInteger)generation {
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(EVESurfaceRefreshInterval * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    [self requestSurfaceForGeneration:generation];
  });
}

- (NSURL *)surfaceURLForBaseURL:(NSURL *)baseURL {
  NSURLComponents *components = [NSURLComponents componentsWithURL:baseURL resolvingAgainstBaseURL:NO];
  if (!components.scheme.length || !components.host.length) {
    return nil;
  }
  NSString *basePath = [components.path stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"/"]];
  NSString *provider = [self.providerId stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLPathAllowedCharacterSet];
  components.path = [NSString stringWithFormat:@"/%@%@hermodr/surface/%@",
                     basePath,
                     basePath.length > 0 ? @"/" : @"",
                     provider ?: @""];
  components.queryItems = @[[NSURLQueryItem queryItemWithName:@"surfaceId" value:self.surfaceId]];
  return components.URL;
}

- (NSURL *)commandURLForBaseURL:(NSURL *)baseURL {
  NSURLComponents *components = [NSURLComponents componentsWithURL:baseURL resolvingAgainstBaseURL:NO];
  if (!components.scheme.length || !components.host.length) {
    return nil;
  }
  NSString *basePath = [components.path stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"/"]];
  components.path = [NSString stringWithFormat:@"/%@%@hermodr/commands/eve",
                     basePath,
                     basePath.length > 0 ? @"/" : @""];
  components.query = nil;
  return components.URL;
}

- (void)sendCommand:(NSDictionary *)command {
  if (self.baseURLs.count == 0 || ![NSJSONSerialization isValidJSONObject:command]) {
    return;
  }
  NSURL *url = [self commandURLForBaseURL:self.baseURLs[self.urlIndex % self.baseURLs.count]];
  if (!url) {
    return;
  }
  NSMutableDictionary *body = [command mutableCopy];
  if (![body[@"providerId"] isKindOfClass:NSString.class]) {
    body[@"providerId"] = self.providerId;
  }
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  request.HTTPMethod = @"POST";
  request.HTTPBody = [NSJSONSerialization dataWithJSONObject:body options:0 error:nil];
  [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  [[self.session dataTaskWithRequest:request] resume];
}

- (void)publishStatus:(NSString *)status {
  self.status = status ?: @"Hermodr";
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.delegate hermodrClient:self didChangeStatus:self.status];
  });
}

- (void)dealloc {
  [self disconnect];
  [self.session invalidateAndCancel];
}

@end
