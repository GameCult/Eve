# Eve Renderer Parity

Parity is currently uneven by design. The shared surface contract is forming,
but the browser reference is the first renderer that can be used as a practical
comparison oracle.

See [runtime-app-parity-roadmap.md](./runtime-app-parity-roadmap.md) for the
generic Eve app plan across web, Flutter, Fensalir Direct2D, iOS/UIKit, and
the Android Flutter device body. Repixelizer is the first style-parity target.

Pixel parity is not byte-identical screenshot parity. Text rasterization,
antialiasing, GPU backends, and device scale will differ. The target is
recognizable CultUI fidelity: the same partitions, fonts, colors, panel
treatments, spacing, image sampling intent, and control anatomy lower cleanly
enough that Repixelizer remains itself across runtimes.

The shared fixture/report path lives in
[parity-testing-harness.md](./parity-testing-harness.md). That harness is the
current evidence surface for semantic parity and runtime capture gaps.
The nested CultUI surface feature is tracked as fixture `embedded-surface`,
loaded from `web/fixtures/cultui-embedded-surface.json`, and must be understood
by every renderer that claims `gamecult.eve.surface.v1` GUI parity.
Runtime discovery for the feature is in `tools/parity/parity-manifest.json`:
 active GUI runtimes advertise `supportedFeatures: ["embeddedDocuments"]` and
require the `embedded-surface` fixture. Native Android/Kotlin makes a narrower
active claim: it preserves and displays embedded slot identity in its dashboard
renderer while Android Flutter remains the responsive screenshot target. Rust
proves the same contract at the CultMesh typed document sync layer.

## Current State

| Renderer | Status | Proof | Gap |
| --- | --- | --- | --- |
| Web reference | Active reference/debug renderer | `web/` renders local provider advertisements and fixture surfaces through the provider picker; compiles indentation CultUI; lowers partitions, field rows, slider anatomy, and `surface.slot`; Chrome headless capture emits phone/tablet/desktop PNGs | Needs live Odin/CultMesh provider feed and command round-trip tests |
| Windows / Flutter | Active shared graphical smoke target | `flutter/eve_parity` loads exported `gamecult.eve.surface.v1` fixture JSON, including `embedded-surface`, and emits phone/tablet/desktop golden PNGs through `capture-flutter-parity.ps1` | Needs native window capture and tighter text/style normalization |
| Linux / Flutter | Active shared graphical smoke target | Nightwing runs the Flutter parity goldens, including embedded surface slots, over SSH and returns phone/tablet/desktop PNGs | Needs native window capture and runner health checks |
| Android / Flutter | Active shared graphical smoke target | The same Flutter parity app is built as an APK, installed on Periwinkle, and captured at phone/tablet/desktop plus native physical-panel orientations | Needs live provider picker and command transport beyond fixture assets |
| iOS / UIKit | Active native screenshot target | SSH capture stages selected fixture JSON, EveCanvas renders it, and emits a PNG from `/var/mobile/Library/EveCanvas/latest-screenshot.png`; `embedded-surface` is part of the required fixture matrix | Needs real scene composition for `vn.stage`, Repixelizer token fidelity, and responsive/simulator capture |
| Android / Kotlin device edge | Active lightweight renderer | Native APK consumes CultMesh dashboard/sensor documents and preserves `surface.slot` / `embeddedDocuments` identity in the dashboard renderer | Needs automated native dashboard capture |
| Rust / CultMesh | Document-sync contract runtime | CultLib replicates the `gamecult.eve.surface.v1` embedded slot contract through typed document sync | Not a pixel renderer |
| Fensalir Direct2D | Specialized native/game-runtime landing zone | Existing `AquariumUiDocument` and `DirectWriteOverlay` path | Needs adapter from Eve surface document to `AquariumUiDocument`, DirectWrite/Direct2D token lowering, and a clear reason to stay separate from Flutter for desktop UI |

## Spawned Surfaces

The browser reference runner now exposes local advertisements through the
provider picker:

- `Repixelizer`: loads `web/fixtures/repixelizer.provider-advertisement.json`
  and `web/fixtures/repixelizer.eve-surface.json`.
- `Fensalir Direct2D`: loads `web/fixtures/fensalir-client-surface.json`, a
  recorded surface describing the Direct2D client lowering path.
- `Sai VN Surface`: loads `web/fixtures/sai-vn-surface.json`.
- `Huginn .cc`: compiles `web/fixtures/huginn-cc-surface.eve`.
- `Reactive DSL`: compiles `web/fixtures/reactive-composition.eve`.
- `CultUI Inspector`: compiles `web/fixtures/cultui-slider-inspector.eve`
  and proves partition/field-row/slider-anatomy lowering in the web reference.

The remaining temporary part is the local fixture provider list itself. The
runtime app target is the same picker fed by live
`gamecult.eve.provider_advertisement.v1` documents through CultMesh/Odin; the
browser reference no longer opens live providers by dialing Mimir's deck broker
directly.

Start it with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-browser-reference.ps1
```

Then open:

```text
http://127.0.0.1:8891/
```
