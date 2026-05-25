# EveCanvas

Fullscreen native render shell for EVE, the jailbroken iPad 8th generation test
device.

This is deliberately not a web app. UIKit owns the app/window lifecycle and the
text overlay. OpenGL ES 3.0 owns the render surface.

## Objective

Put a real fullscreen native rendering surface on EVE without requiring macOS as
the development machine.

## Current Mechanism

- `EVEAppDelegate` creates one fullscreen `UIWindow`.
- `EVEViewController` installs:
  - `EVEGLView`, a `CAEAGLLayer` backed OpenGL ES 3.0 render target.
  - a native UIKit `UILabel` overlay for crisp Retina text.
  - `CADisplayLink` for frame ticking.
  - `CMMotionManager` for accelerometer and gyro telemetry.
- `EVEGLView` clears the full drawable with a slow color pulse and presents the
  renderbuffer every frame.

## Invariants

- Browser/PWA layout is not part of this path.
- UIKit is the text owner; OpenGL ES is the pixel owner.
- The status bar stays hidden.
- Sensor reads are display-only telemetry until a later input model owns them.
- CultMesh networking is not smuggled into the render shell yet.

## Build Shape

The project is a Theos-style iOS application:

```sh
make package
make install
```

EVE currently has SSH and jailbreak package management, but the native build
toolchain still needs to be installed. In particular, a Theos install and an
iPhoneOS SDK are required before `make package` can work.

Expected EVE target:

```text
ssh alias: eve
device: iPad11,6 / J171aAP
iPadOS: 14.4
install path: /Applications/EveCanvas.app
```

## First Deployment Plan

1. Install or stage Theos on EVE.
2. Stage a compatible iPhoneOS SDK under `$THEOS/sdks`.
3. Copy this project to EVE, for example `/var/mobile/Projects/Eve`.
4. Build on EVE:

```sh
cd /var/mobile/Projects/Eve
export THEOS=/var/theos
make package
make install
uicache -p /Applications/EveCanvas.app
```

5. Launch `EveCanvas` from SpringBoard.

## Next Cut

- Confirm actual fullscreen drawable size on EVE.
- Add a simple triangle/quad shader so the renderer proves more than clear.
- Add touch/Pencil visual markers.
- Add a local telemetry bridge once the shell is stable.
