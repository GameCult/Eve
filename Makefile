ARCHS = arm64
TARGET = iphone:clang:latest:14.0

include $(THEOS)/makefiles/common.mk

APPLICATION_NAME = EveCanvas

EveCanvas_FILES = \
	Sources/main.m \
	Sources/EVEAppDelegate.m \
	Sources/EVEViewController.mm \
	Sources/EVEGLView.mm \
	Sources/EVEFrameStreamClient.m \
	Sources/EVESensorUplinkClient.m \
	Sources/EVEH264StreamDecoder.m

EveCanvas_FRAMEWORKS = UIKit QuartzCore OpenGLES CoreMotion AVFoundation CoreMedia CoreVideo VideoToolbox
EveCanvas_CFLAGS = -fobjc-arc -Wall -Wextra -DGLES_SILENCE_DEPRECATION
EveCanvas_CODESIGN_FLAGS = -Sentitlements.plist
EveCanvas_INSTALL_PATH = /Applications

include $(THEOS_MAKE_PATH)/application.mk

after-install::
	install.exec "uicache -p /Applications/EveCanvas.app || uicache"
