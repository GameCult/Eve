#import "EVEH264StreamDecoder.h"

#import <CoreMedia/CoreMedia.h>
#import <UIKit/UIKit.h>
#import <VideoToolbox/VideoToolbox.h>

@interface EVEH264StreamDecoder ()

@property(nonatomic, strong) AVSampleBufferDisplayLayer *displayLayer;
@property(nonatomic) CMVideoFormatDescriptionRef formatDescription;
@property(nonatomic, strong) NSData *sps;
@property(nonatomic, strong) NSData *pps;
@property(nonatomic, assign) int64_t frameIndex;

@end

@implementation EVEH264StreamDecoder

- (instancetype)init {
  self = [super init];
  if (!self) {
    return nil;
  }

  _displayLayer = [[AVSampleBufferDisplayLayer alloc] init];
  _displayLayer.videoGravity = AVLayerVideoGravityResizeAspect;
  _displayLayer.backgroundColor = UIColor.blackColor.CGColor;
  return self;
}

- (void)dealloc {
  [self reset];
}

- (void)reset {
  if (_formatDescription) {
    CFRelease(_formatDescription);
    _formatDescription = NULL;
  }
  self.sps = nil;
  self.pps = nil;
  self.frameIndex = 0;
  [self.displayLayer flushAndRemoveImage];
}

- (void)consumeAnnexBAccessUnit:(NSData *)data {
  NSArray<NSData *> *nals = [self parseAnnexB:data];
  if (nals.count == 0) {
    return;
  }

  NSMutableData *avcc = [NSMutableData data];
  BOOL hasSlice = NO;
  for (NSData *nal in nals) {
    if (nal.length == 0) {
      continue;
    }

    const uint8_t *bytes = nal.bytes;
    uint8_t nalType = bytes[0] & 0x1f;
    if (nalType == 7) {
      self.sps = nal;
      [self rebuildFormatDescriptionIfReady];
      continue;
    }
    if (nalType == 8) {
      self.pps = nal;
      [self rebuildFormatDescriptionIfReady];
      continue;
    }
    if (nalType == 1 || nalType == 5) {
      hasSlice = YES;
    }

    uint32_t length = CFSwapInt32HostToBig((uint32_t)nal.length);
    [avcc appendBytes:&length length:sizeof(length)];
    [avcc appendData:nal];
  }

  if (!hasSlice || !_formatDescription || avcc.length == 0) {
    return;
  }

  CMBlockBufferRef blockBuffer = NULL;
  OSStatus status = CMBlockBufferCreateWithMemoryBlock(
      kCFAllocatorDefault,
      NULL,
      avcc.length,
      kCFAllocatorDefault,
      NULL,
      0,
      avcc.length,
      0,
      &blockBuffer);
  if (status != noErr || !blockBuffer) {
    return;
  }

  status = CMBlockBufferReplaceDataBytes(avcc.bytes, blockBuffer, 0, avcc.length);
  if (status != noErr) {
    CFRelease(blockBuffer);
    return;
  }

  CMSampleTimingInfo timing = {
      .duration = CMTimeMake(1, 60),
      .presentationTimeStamp = CMTimeMake(self.frameIndex++, 60),
      .decodeTimeStamp = kCMTimeInvalid,
  };
  size_t sampleSize = avcc.length;
  CMSampleBufferRef sampleBuffer = NULL;
  status = CMSampleBufferCreateReady(
      kCFAllocatorDefault,
      blockBuffer,
      _formatDescription,
      1,
      1,
      &timing,
      1,
      &sampleSize,
      &sampleBuffer);
  CFRelease(blockBuffer);
  if (status != noErr || !sampleBuffer) {
    return;
  }

  CFArrayRef attachments = CMSampleBufferGetSampleAttachmentsArray(sampleBuffer, YES);
  if (attachments && CFArrayGetCount(attachments) > 0) {
    CFMutableDictionaryRef attachment = (CFMutableDictionaryRef)CFArrayGetValueAtIndex(attachments, 0);
    CFDictionarySetValue(attachment, kCMSampleAttachmentKey_DisplayImmediately, kCFBooleanTrue);
  }

  if (self.displayLayer.status == AVQueuedSampleBufferRenderingStatusFailed) {
    [self.displayLayer flush];
  }
  [self.displayLayer enqueueSampleBuffer:sampleBuffer];
  CFRelease(sampleBuffer);
}

- (void)rebuildFormatDescriptionIfReady {
  if (!self.sps || !self.pps) {
    return;
  }

  if (_formatDescription) {
    CFRelease(_formatDescription);
    _formatDescription = NULL;
  }

  const uint8_t *parameterSets[] = { self.sps.bytes, self.pps.bytes };
  size_t parameterSetSizes[] = { self.sps.length, self.pps.length };
  CMVideoFormatDescriptionCreateFromH264ParameterSets(
      kCFAllocatorDefault,
      2,
      parameterSets,
      parameterSetSizes,
      4,
      &_formatDescription);
}

- (NSArray<NSData *> *)parseAnnexB:(NSData *)data {
  NSMutableArray<NSData *> *nals = [NSMutableArray array];
  const uint8_t *bytes = data.bytes;
  NSUInteger length = data.length;
  NSUInteger cursor = 0;
  while (cursor + 3 < length) {
    NSUInteger start = [self findStartCode:bytes length:length offset:cursor startCodeLength:NULL];
    if (start == NSNotFound) {
      break;
    }

    NSUInteger startCodeLength = 0;
    [self findStartCode:bytes length:length offset:start startCodeLength:&startCodeLength];
    NSUInteger payloadStart = start + startCodeLength;
    NSUInteger next = [self findStartCode:bytes length:length offset:payloadStart startCodeLength:NULL];
    NSUInteger payloadEnd = next == NSNotFound ? length : next;
    if (payloadEnd > payloadStart) {
      [nals addObject:[data subdataWithRange:NSMakeRange(payloadStart, payloadEnd - payloadStart)]];
    }
    cursor = payloadEnd;
  }

  return nals;
}

- (NSUInteger)findStartCode:(const uint8_t *)bytes length:(NSUInteger)length offset:(NSUInteger)offset startCodeLength:(NSUInteger *)startCodeLength {
  for (NSUInteger index = offset; index + 3 < length; index++) {
    if (bytes[index] == 0 && bytes[index + 1] == 0 && bytes[index + 2] == 1) {
      if (startCodeLength) {
        *startCodeLength = 3;
      }
      return index;
    }
    if (index + 4 < length && bytes[index] == 0 && bytes[index + 1] == 0 && bytes[index + 2] == 0 && bytes[index + 3] == 1) {
      if (startCodeLength) {
        *startCodeLength = 4;
      }
      return index;
    }
  }

  return NSNotFound;
}

@end
