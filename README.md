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

EVE has SSH, jailbreak package management, a Procursus native build toolchain,
Theos at `/var/theos`, and the packaged iPhoneOS SDK linked under
`/var/theos/sdks`.

Expected EVE target:

```text
ssh alias: eve
device: iPad11,6 / J171aAP
iPadOS: 14.4
install path: /Applications/EveCanvas.app
```

## Deployment

Stage from the workstation:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stage-to-eve.ps1
```

Build and install on EVE:

```sh
cd /var/mobile/Projects/Eve
export THEOS=/var/theos
make package
make install
uicache -p /Applications/EveCanvas.app
```

Launch `EveCanvas` from SpringBoard, or over SSH:

```sh
uiopen --bundleid org.gamecult.evecanvas
```

If OpenGL ES context creation fails on-device, the app stays alive with the
UIKit overlay instead of aborting launch. The render surface can then be fixed
without losing the basic app deployment path.

## Next Cut

- Confirm actual fullscreen drawable size on EVE.
- Add a simple triangle/quad shader so the renderer proves more than clear.
- Add touch/Pencil visual markers.
- Add a local telemetry bridge once the shell is stable.
