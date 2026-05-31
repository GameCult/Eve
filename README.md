# EveCanvas

Fullscreen native render shell for EVE, the jailbroken iPad 8th generation test
device.

This is deliberately not a web app. UIKit owns the app/window lifecycle, the
streamed frame surface, touch capture, and the text overlay. OpenGL ES remains a
local render fallback, but the VoidBot dashboard path is a native frame stream
from Starfire.

## Objective

Put a real fullscreen native rendering surface on EVE without requiring macOS as
the development machine.

## Current Mechanism

- `EVEAppDelegate` creates one fullscreen `UIWindow`.
- `EVEViewController` installs:
  - `EVEGLView`, a `CAEAGLLayer` backed OpenGL ES render target.
  - a full-screen `UIImageView` that displays CEF relay frames.
  - `EVEFrameStreamClient`, a native WebSocket client for frame/input transport.
  - a native UIKit `UILabel` overlay for crisp Retina status text.
  - `CADisplayLink` for frame ticking.
  - `CMMotionManager` for accelerometer and gyro telemetry.
- `EVEFrameStreamClient` receives binary JPEG frames from the Starfire CEF relay
  and sends touch events back as JSON viewport coordinates.
- `EVESensorUplinkClient` opens separate WebSocket uplinks for camera and
  microphone frame-events so sensor traffic does not block display/control
  traffic.
- `EVEDashboardClient` opens the native Mimir dashboard socket and receives
  scene/control state snapshots.
- `EVEViewController` captures camera frames with AVFoundation and microphone
  blocks with AVAudioEngine, then sends `eve-camera` and `eve-mic` samples to
  Mimir. It also renders the dashboard natively with UIKit: a scene graph,
  draggable source panels, visibility/reset controls, and multitouch
  pan/pinch/rotate transform commands.

## Invariants

- Browser/PWA layout is not part of the iPad path.
- Starfire CEF owns browser pixels; EveCanvas owns display and touch capture.
- UIKit is the current streamed-frame owner; OpenGL ES is fallback/local render.
- The status bar stays hidden.
- EveCanvas owns Eve-local sensor reads. Mimir owns synchronization and final
  interpretation after those samples arrive.
- CultMesh networking is not smuggled into the render shell yet.

## VoidBot CEF Stream

Start the Starfire relay from `E:\Projects\VoidBot`:

```powershell
npm run swarm:eve-cef-relay -- --width 1620 --height 2160 --scale 2 --port 8792
```

EveCanvas connects to `ws://192.168.1.66:8792/stream`, displays binary JPEG
frames, and returns touch events to the relay.

## Mimir Sensor Uplink

Start Mimir with `config/mimir-runtime.raven-eve.example.json` or run the
receiver processes directly:

```powershell
dotnet run --project E:\Projects\Mimir\src\Mimir.EveSensorReceiver\Mimir.EveSensorReceiver.csproj -- --port 8793 --path /eve/camera --source-id eve-camera --type video-frame
dotnet run --project E:\Projects\Mimir\src\Mimir.EveSensorReceiver\Mimir.EveSensorReceiver.csproj -- --port 8794 --path /eve/mic --source-id eve-mic --type audio-block
```

EveCanvas sends camera frame-events to `ws://192.168.1.66:8793/eve/camera` and
microphone frame-events to `ws://192.168.1.66:8794/eve/mic`. The first transport
uses JSON plus base64 payloads because it is inspectable and already matches
Mimir's frame-event source. Replace it with binary framing only after the
sample contract is proven on device.

## Native Mimir Dashboard

Start the dashboard authority on Starfire:

```powershell
dotnet run --project E:\Projects\Mimir\src\Mimir.EveDashboard\Mimir.EveDashboard.csproj -- --port 8795
```

EveCanvas connects first to `ws://192.168.1.66:8795/eve/deck`, with
`/eve/dashboard` kept as a compatibility fallback. The Starfire broker sends
native retained `dashboard-state` snapshots containing provider id, title,
scene nodes, selection, visibility, transform, size, and health. EveCanvas sends
compact commands back:

- `select`
- `move`
- `scale`
- `rotate`
- `toggle-visibility`
- `reset-transform`
- `open-provider`

Eve renders and edits dashboard trees natively; each provider owns accepted
state and command handling. Eve is the operator's hand on the scene graph, not a
second compositor and not a remote WebKit runtime.

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
- Replace JSON/base64 sensor packets with binary framing once camera and mic
  timing are proven through Mimir.
- Replace the dashboard fixture state with live `MimirPresentationControlState`
  and `MimirSceneEditorState` snapshots.
