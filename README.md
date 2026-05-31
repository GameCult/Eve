# Eve

CultMesh-based streaming UI composition framework and timestamped sensor
sharing network.

Eve is the display/control/sensor edge for GameCult apps. Every app should be
able to expose a structured control surface, live data tree, media panel, or
operator dashboard through CultNet. Eve clients render those surfaces, return
operator intent, and publish local sensors with timestamps so Mimir, VoidBot,
Fensalir, and the rest of the mesh can share one inspectable field of state.

The browser implementation is the ground-truth renderer and behavior reference.
Native clients on iOS, Android, and other surfaces should match the browser's
CultMesh document semantics as closely as possible, using platform-native UI
and media paths where that makes the surface faster, more direct, or more
capable.

## Objective

Build one deployable Eve runtime family:

- Browser: canonical CultMesh UI compositor, test oracle, and reference
  behavior.
- iOS: native full-screen renderer, multitouch controller, camera/mic/motion
  sensor publisher, and low-latency media display.
- Android: native renderer and sensor publisher with the same CultNet contracts.
- Shared API: apps publish control surfaces and structured data; Eve publishes
  commands, pointer/touch input, and timestamped sensor packets.

## Current Mechanism

The current checked-in client is the iOS Theos app, still named `EveCanvas` at
the bundle level until the wider Eve runtime split exists.

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

- Browser layout is the reference behavior. Native clients do not improvise new
  semantics when a CultMesh surface already defines them.
- Native clients do not embed a browser as their only answer. They render the
  same surface documents with platform-native controls when that is the better
  machine.
- CultNet carries typed surface state, commands, and timestamped sensor packets.
  Edge JSON is tolerated only as an interoperability envelope while the typed
  CultMesh document shape is being proven.
- UIKit is the current iOS streamed-frame owner; OpenGL ES is fallback/local
  render.
- The status bar stays hidden.
- Eve clients own local sensor reads and timestamps. Mimir owns synchronization
  and final interpretation after those samples arrive.
- App-specific dashboards are providers. Eve renders them; the provider owns
  accepted state, commands, and side effects.

See `docs/cultmesh-streaming-ui-framework.md` for the target architecture.

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
native retained `dashboard-state` snapshots. This is the current CultNet-shaped
surface document for provider id, title, scene nodes, selection, visibility,
transform, size, health, detail text, identity ids, and avatar URLs. EveCanvas
sends compact commands back:

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

The broker includes a native VoidBot tab/provider. Eve renders its CTB rail with
avatar images, selected Face status panel, state tree, and detail pane from the
same VoidBot `swarm-state.json` projection used by the web dashboard.

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

- Create the browser reference Eve runtime and use it as the visual/behavior
  test oracle for native clients.
- Split the shared CultNet/CultMesh surface contract from the iOS app code.
- Replace JSON/base64 sensor packets with binary framing once camera and mic
  timing are proven through Mimir.
- Replace the dashboard fixture state with live `MimirPresentationControlState`
  and `MimirSceneEditorState` snapshots.
- Add Android and browser clients that consume the same provider/sensor API.
