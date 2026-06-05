# Eve Renderer Parity

Parity is currently uneven by design. The shared surface contract is forming,
but the browser reference is the first renderer that can be used as a practical
comparison oracle.

See [runtime-app-parity-roadmap.md](./runtime-app-parity-roadmap.md) for the
generic Eve app plan across web, Flutter, Fensalir Direct2D, iOS/UIKit, and
Android/Kotlin. Repixelizer is the first style-parity target.

Pixel parity is not byte-identical screenshot parity. Text rasterization,
antialiasing, GPU backends, and device scale will differ. The target is
recognizable CultUI fidelity: the same partitions, fonts, colors, panel
treatments, spacing, image sampling intent, and control anatomy lower cleanly
enough that Repixelizer remains itself across runtimes.

The shared fixture/report path lives in
[parity-testing-harness.md](./parity-testing-harness.md). That harness is the
current evidence surface for semantic parity and runtime capture gaps.

## Current State

| Renderer | Status | Proof | Gap |
| --- | --- | --- | --- |
| Web reference | Active reference/debug renderer | `web/` renders live VoidBot and fixture surfaces through the provider picker; compiles indentation CultUI; lowers partitions, field rows, and slider anatomy; Chrome headless capture emits phone/tablet/desktop PNGs | Needs command round-trip tests |
| Windows / Flutter | Active shared graphical smoke target | `flutter/eve_parity` renders the CultUI Inspector surface and emits phone/tablet/desktop golden PNGs through `capture-flutter-parity.ps1` | Needs lowerer fed by compiled `gamecult.eve.surface.v1` instead of hardcoded inspector widget |
| Linux / Flutter | Runner-blocked shared graphical target | Flutter Linux platform scaffold exists | Needs a Linux host/runner to emit a real Linux PNG |
| iOS / UIKit | Native proof | Renders Odin's fullscreen interface wall from `surface.root`, generic provider trees, and a custom VoidBot cockpit with avatar images; SSH capture emits PNGs | Needs provider picker, Repixelizer style token lowering, and a decision on what UIKit still owns if Flutter covers the shared graphical path |
| Android / Kotlin | Device-edge proof | APK builds, Periwinkle attaches through adb, and smoke capture emits phone/tablet/desktop PNGs via `adb shell wm size` | Needs provider picker, full surface tree rendering, style token lowering, asset image lowering, command controls, and a decision on what Kotlin still owns if Flutter covers the shared graphical path |
| Fensalir Direct2D | Specialized native/game-runtime landing zone | Existing `AquariumUiDocument` and `DirectWriteOverlay` path | Needs adapter from Eve surface document to `AquariumUiDocument`, DirectWrite/Direct2D token lowering, and a clear reason to stay separate from Flutter for desktop UI |

## Spawned Surfaces

The browser reference runner now exposes local advertisements through the
provider picker:

- `VoidBot Live`: connects to Mimir's `/eve/deck` broker and opens
  `voidbot.swarm`.
- `Repixelizer`: loads `web/fixtures/repixelizer.provider-advertisement.json`
  and `web/fixtures/repixelizer.eve-surface.json`.
- `Fensalir Direct2D`: loads `web/fixtures/fensalir-client-surface.json`, a
  recorded surface describing the Direct2D client lowering path.
- `Sai VN Surface`: loads `web/fixtures/sai-vn-surface.json`.
- `Huginn .cc`: compiles `web/fixtures/huginn-cc-surface.eve`.
- `Reactive DSL`: compiles `web/fixtures/reactive-composition.eve`.
- `CultUI Inspector`: compiles `web/fixtures/cultui-slider-inspector.eve`
  and proves partition/field-row/slider-anatomy lowering in the web reference.

The remaining temporary part is the local provider list itself. The runtime app
target is the same picker fed by live `gamecult.eve.provider_advertisement.v1`
documents through CultMesh/Odin.

Start it with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-browser-reference.ps1
```

Then open:

```text
http://127.0.0.1:8891/
```
