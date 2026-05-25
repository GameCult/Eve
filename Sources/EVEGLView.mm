#import "EVEGLView.h"

#import <math.h>
#import <OpenGLES/ES3/gl.h>
#import <QuartzCore/CAEAGLLayer.h>

@interface EVEGLView ()

@property(nonatomic, strong) EAGLContext *context;
@property(nonatomic, assign) GLuint framebuffer;
@property(nonatomic, assign) GLuint colorRenderbuffer;
@property(nonatomic, assign) GLint drawableWidth;
@property(nonatomic, assign) GLint drawableHeight;

@end

@implementation EVEGLView

+ (Class)layerClass {
  return CAEAGLLayer.class;
}

- (instancetype)initWithFrame:(CGRect)frame {
  self = [super initWithFrame:frame];
  if (!self) {
    return nil;
  }

  self.contentScaleFactor = UIScreen.mainScreen.scale;
  self.opaque = YES;
  self.multipleTouchEnabled = YES;

  CAEAGLLayer *layer = (CAEAGLLayer *)self.layer;
  layer.opaque = YES;
  layer.drawableProperties = @{
    kEAGLDrawablePropertyRetainedBacking: @NO,
    kEAGLDrawablePropertyColorFormat: kEAGLColorFormatRGBA8,
  };

  self.context = [[EAGLContext alloc] initWithAPI:kEAGLRenderingAPIOpenGLES3];
  NSAssert(self.context != nil, @"EVE requires OpenGL ES 3.0.");
  [EAGLContext setCurrentContext:self.context];

  glGenFramebuffers(1, &_framebuffer);
  glGenRenderbuffers(1, &_colorRenderbuffer);
  glBindFramebuffer(GL_FRAMEBUFFER, self.framebuffer);
  glBindRenderbuffer(GL_RENDERBUFFER, self.colorRenderbuffer);
  glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, self.colorRenderbuffer);

  [self resizeDrawableIfNeeded];
  return self;
}

- (void)dealloc {
  [EAGLContext setCurrentContext:self.context];
  if (_colorRenderbuffer) {
    glDeleteRenderbuffers(1, &_colorRenderbuffer);
  }
  if (_framebuffer) {
    glDeleteFramebuffers(1, &_framebuffer);
  }
  [EAGLContext setCurrentContext:nil];
}

- (void)layoutSubviews {
  [super layoutSubviews];
  [self resizeDrawableIfNeeded];
}

- (void)resizeDrawableIfNeeded {
  [EAGLContext setCurrentContext:self.context];
  glBindRenderbuffer(GL_RENDERBUFFER, self.colorRenderbuffer);
  [self.context renderbufferStorage:GL_RENDERBUFFER fromDrawable:(CAEAGLLayer *)self.layer];
  glGetRenderbufferParameteriv(GL_RENDERBUFFER, GL_RENDERBUFFER_WIDTH, &_drawableWidth);
  glGetRenderbufferParameteriv(GL_RENDERBUFFER, GL_RENDERBUFFER_HEIGHT, &_drawableHeight);
  glViewport(0, 0, self.drawableWidth, self.drawableHeight);
}

- (void)renderAtTime:(NSTimeInterval)time {
  [EAGLContext setCurrentContext:self.context];
  glBindFramebuffer(GL_FRAMEBUFFER, self.framebuffer);
  glViewport(0, 0, self.drawableWidth, self.drawableHeight);

  float pulse = (float)((sin(time * 0.8) + 1.0) * 0.5);
  float green = 0.08f + pulse * 0.12f;
  float blue = 0.13f + pulse * 0.18f;

  glClearColor(0.02f, green, blue, 1.0f);
  glClear(GL_COLOR_BUFFER_BIT);

  glBindRenderbuffer(GL_RENDERBUFFER, self.colorRenderbuffer);
  [self.context presentRenderbuffer:GL_RENDERBUFFER];
}

@end
