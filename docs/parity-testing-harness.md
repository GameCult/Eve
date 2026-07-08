# Eve Parity Testing Harness

The parity harness is the shared evidence path for Eve runtimes. It does not
try to prove byte-identical pixels. It proves that every runtime is aiming at
the same provider-owned CultUI surface: same fixture, same retained tree, same
style-token expectations, same control anatomy, and explicit capture gaps.

## Authority

- `tools/parity/parity-manifest.json` owns the fixture matrix, runtime list, and
  expectations.
- `tools/parity/run-parity.mjs` owns semantic fixture checks and report
  generation.
- Runtime capture adapters own screenshots or frame capture for their platform.
- `artifacts/parity/latest.md` and `artifacts/parity/latest.json` are reports,
  not source truth.

The manifest is the cut line. If a fixture or runtime is not in the manifest,
it is not part of the parity claim.

## Run

Semantic checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-parity-harness.ps1
```

Hard screenshot smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-parity-smoke.ps1
```

Nightwing owns the Linux Flutter capture body. If its user-local Flutter SDK is
missing, install it first:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-nightwing-flutter-sdk.ps1
```

The smoke expands every resizable renderer across the manifest's responsive
viewport matrix:

- `phone`: 390 x 844
- `tablet`: 768 x 1024
- `desktop`: 1280 x 720

Device runtimes also capture native physical panel cases when the platform
adapter can control orientation without overriding size. Android Flutter
currently emits:

- `native-portrait`: Periwinkle at physical portrait resolution
- `native-landscape`: Periwinkle at physical landscape resolution

The semantic runner writes:

- `artifacts/parity/latest.md`
- `artifacts/parity/latest.json`
- `artifacts/parity/<timestamp>/parity-report.md`
- `artifacts/parity/<timestamp>/parity-report.json`
- `artifacts/conformance/latest/index.md`
- `artifacts/conformance/latest/index.json`
- `artifacts/conformance/latest/packs/*.json`
- `artifacts/conformance/<timestamp>/...`

After generating the parity report, `run-parity-harness.ps1` copies
`artifacts/conformance/latest` into
`artifacts/conformance-consumer-smoke/export` and runs
`tools/conformance/consume-export.mjs` against that copied layout. That smoke
proves the conformance export can be consumed through its own index and pack
files without reading `tools/parity/parity-manifest.json`.

Provider-owned consumer smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-aetheria-conformance-consumer-smoke.ps1
```

That script runs the same export consumer from `E:\Projects\Aetheria` and
asserts the provider pack, `aetheria-world` fixture, `aetheria` provider entry,
and `aetheria-world-command-replay` scenario. Generated copies remain under
Eve's `artifacts/aetheria-conformance-consumer-smoke` so the provider worktree
does not become dirty merely by proving the boundary.

The smoke runner writes:

- `artifacts/parity-smoke/<timestamp>/parity-smoke.md`
- `artifacts/parity-smoke/<timestamp>/parity-smoke.json`
- one PNG per target that has a real capture body.

## Current Checks

The first pass is semantic and fixture-driven:

- compile local CultUI `.eve` fixtures;
- load local JSON surface fixtures;
- check provider id;
- check required component kinds;
- check minimum component counts where useful;
- check required style tokens;
- check required bindings;
- check retained slider skins and control parts.
- record the responsive viewport matrix used by screenshot smoke.

This already catches the most embarrassing class of parity lie: a runtime or
fixture claiming to render CultUI while the retained tree no longer contains
the partitions, bindings, tokens, or slider anatomy the renderer is supposed to
lower.

The fixture matrix also includes `embedded-surface`, which proves that nested
CultMesh document slots survive the shared surface contract. The web reference,
Flutter parity body, Unity UI Toolkit lowerer, iOS UIKit renderer, and native
Android Kotlin dashboard renderer all need to understand
`surface.slot`/`embeddedDocuments`. Rust participates at the CultMesh document
sync layer: it must preserve the same `gamecult.eve.surface.v1` slot contract
through typed document replication even when it is not painting pixels.

Nested surface support is a required feature for every active GUI runtime in
`tools/parity/parity-manifest.json`. Active runtimes list
`requiredFixtures: ["embedded-surface"]` and
`supportedFeatures: ["embeddedDocuments"]`; the semantic report prints both so a
runtime cannot quietly fall out of the contract. Runtime entries also use
`expectedSourceSymbols` for the renderer files that must contain the slot
lowering path, so a runtime cannot keep a green body merely because its source
file exists. The shared fixture is `web/fixtures/cultui-embedded-surface.json`,
and renderer-specific tests should load that fixture rather than hand-authoring
a local substitute.

## Runtime Status

The harness tracks every target runtime:

- Web reference: active semantic and screenshot target through Chrome headless
  using the provider query parameter. Required nested-surface evidence:
  `node --test web\eve-dsl.test.mjs` plus the `embedded-surface` fixture in
  `tools/parity/run-parity.mjs`.
- Web responsive layout: Chrome headless emits phone, tablet, and desktop PNGs.
- iOS / UIKit: screenshot target through SSH and EveCanvas'
  `/var/mobile/Library/EveCanvas/capture-request` service. Current iOS capture
  is fixed-device until a simulator or device-resize adapter exists. Required
  nested-surface evidence: run `scripts/run-parity-smoke.ps1 -ProviderId
  gamecult.eve.embedded-demo` against the device target.
- Windows / Flutter: screenshot target through the Flutter parity golden smoke,
  with phone, tablet, and desktop goldens. Required nested-surface evidence:
  `flutter test --plain-name embedded_surface_fixture_contract` plus
  `scripts/capture-flutter-parity.ps1 -FixtureId
  gamecult.eve.embedded-demo`.
- Linux / Flutter: screenshot target through Nightwing over SSH. The smoke
  stages `flutter/eve_parity`, runs Flutter goldens on Nightwing, and pulls back
  phone, tablet, and desktop PNGs. Required nested-surface evidence:
  `scripts/capture-linux-flutter-parity.ps1 -FixtureId
  gamecult.eve.embedded-demo`.
- Android / Flutter: screenshot target through the same Flutter renderer,
  packaged as a debug APK, installed on Periwinkle through `adb`, and captured
  with optional `adb shell wm size`, orientation control, and `adb exec-out
  screencap`; the script restores device size and rotation after each viewport.
  Required nested-surface evidence: `scripts/capture-android-flutter-parity.ps1
  -FixtureId gamecult.eve.embedded-demo`.
- Android / Kotlin device edge: lightweight native CultMesh dashboard and
  sensor host. Required nested-surface evidence:
  `android/app/src/main/java/org/gamecult/eve/MainActivity.kt` renders
  `surface.slot` with a content description containing the embedded slot
  identity, and `node tools/parity/run-parity.mjs` reports
  `embeddedDocuments` support for `android-kotlin`.
- Rust / CultMesh: typed document runtime rather than a CultUI renderer.
  Required nested-surface evidence: `cargo test -p cultnet-rs
  rust_preserves_cultui_embedded_surface_slots_through_typed_document_sync`
  in CultLib.
- Fensalir Direct2D: specialized native target, adapter/capture still missing.

Pending runtimes are allowed. Silent fake parity is not.

## Next Cuts

1. Add screenshot comparison metrics that score structure, color tokens,
   bounding boxes, and text presence without pretending byte-identical pixels
   are the goal.
2. Normalize text scale and font loading across web, Flutter Android, Flutter
   desktop, and iOS.
3. Give iOS a real `vn.stage` scene compositor instead of compact stacked
   fixture lowering.
4. Replace Flutter golden screenshots with native window captures once the
   Flutter app body can emit a desktop frame without test harness help.
5. Add Direct2D frame capture once the Eve-to-`AquariumUiDocument` adapter
   exists.
