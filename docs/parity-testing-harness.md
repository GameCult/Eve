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

Runtime capability manifests are the runtime-owned side of that claim. When a
runtime entry has `capabilityManifest`, the harness validates the JSON document
against `gamecult.eve.runtime_capability.v1` and cross-checks runtime id,
supported features, supported and unsupported plugin declarations, command
transport schema, and incubation metadata. The central parity manifest may
coordinate split-readiness, but the runtime body must publish the capability
claim it expects other repos to consume.

The web reference and Unity UI Toolkit both publish runtime capability
manifests. Web uses `web/eve-runtime-capability.json` to make the browser oracle
explicit: it consumes provider advertisements, lowers provider-owned surfaces,
emits `gamecult.eve.command.v1` intents, and records Chrome headless capture
evidence without becoming provider truth. Unity UI Toolkit uses the same path
for its `sai.vn` and `norn.graph` plugin projection adapter proofs while
leaving `tex.math` as explicit unsupported plugin semantics.

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

The conformance export includes `conformanceHandoffPath`, pointing at the
machine-readable EveConformance split map. That handoff is incubation evidence:
it names which runner, schema, consumer-smoke, and fixture-corpus paths move
when the conformance body leaves Eve.

Handoff documents are also copied into the export under `handoffs/*.json`.
Consumer smokes assert those exported copies, not just Eve-local source paths,
so owner repos can inspect plugin, provider, runtime, and conformance handoff
maps from the exported pack itself.

The conformance export includes runtime `capabilityManifestPath` and
`capabilityManifestErrors` fields so external consumers can distinguish a
generic projection runtime from a runtime that can project plugin-declared
capabilities.

Plugin handoff paths are exported as `plugins[].handoffPath` for owner repos
such as Sai and Norn. These paths are incubation evidence for where plugin
manifest, advertisement, ABI fixture, and conformance ownership must move; they
are not plugin runtime state.

The runtime conformance pack is evidence-shaped, not fixture-shaped. Its
`packs/runtime.json` document includes `runtimeTargets` so runtime repos can
consume status, supported features, plugin support, command schema, lifecycle,
capture status, and missing evidence without reading Eve's local parity
manifest.

After generating the parity report, `run-parity-harness.ps1` copies
`artifacts/conformance/latest` into
`artifacts/conformance-consumer-smoke/export` and runs
`tools/conformance/consume-export.mjs` against that copied layout. That smoke
proves the conformance export can be consumed through its own index and pack
files without reading `tools/parity/parity-manifest.json`.

EveConformance handoff smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-eveconformance-handoff-smoke.ps1
```

That script validates `tools/conformance/eveconformance-handoff.json` against
the parity manifest and, when present, the generated conformance export. It
checks the runner, schema, consumer-smoke, fixture-corpus move sets and the
required core/plugin/provider/runtime pack families.

Provider-owned consumer smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-aetheria-conformance-consumer-smoke.ps1
```

That script runs the same export consumer from `E:\Projects\Aetheria` and
asserts the provider pack, `aetheria-world` fixture, `aetheria` provider entry,
`aetheria-world-command-replay` scenario, and provider handoff path. Generated
copies remain under Eve's `artifacts/aetheria-conformance-consumer-smoke` so
the provider worktree does not become dirty merely by proving the boundary.

Plugin owner handoff smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-plugin-handoff-smoke.ps1
```

That script validates the Sai and Norn handoff manifests against their plugin
manifests, advertisements, ABI fixtures, move-set paths, contract inputs, and
external proofs. The plugin-owner conformance smoke also asserts those handoff
paths from the conformance export.

Aetheria provider handoff smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-aetheria-provider-handoff-smoke.ps1
```

That script validates `web/fixtures/aetheria-provider-handoff.json` against the
provider advertisement and scenario. The handoff names the advertisement,
interactive world surface fixture, provider scenario, Eve contracts, forbidden
imports, and external proofs that must become Aetheria-owned before the
provider pack leaves Eve incubation.

EveFlutter consumer smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-eveflutter-conformance-consumer-smoke.ps1
```

That script runs the export consumer from `flutter/eve_parity` and asserts the
runtime pack, Sai provider fixture, Flutter runtime targets, and `EveFlutter`
split target without reading `tools/parity/parity-manifest.json`.

Split-target consumer smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-split-target-conformance-consumer-smoke.ps1
```

That script asserts that EveFlutter and EveUnity are exported as incubating
split targets, that their current split-readiness proofs are passed, and that
their graduation blockers remain visible to consumers. A target being present
is not enough; future owner repos must be able to consume why it is or is not
ready to leave Eve incubation.

The Flutter widget smoke also exercises `EveProviderCatalog` and
`EveProviderPicker` against a conformance-export-shaped provider list. That is
the runtime-side provider picker proof; it consumes provider entries and plugin
requirements without reading web fixture paths.

Aetheria Unity package consumer smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-aetheria-unity-package-smoke.ps1
```

That script checks that Aetheria's Unity package manifest consumes Eve's surface
and UI Toolkit packages by file reference, verifies the generated
`GameCult.Eve.UnityUIToolkit.csproj` includes all current Unity runtime source
files, then builds the package through Aetheria's Unity-generated project. It is
consumer-build evidence, not a replacement for runtime-owned Unity capture or
release CI.

Aetheria Unity EditMode test smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-aetheria-unity-editmode-tests.ps1
```

That script temporarily adds `org.gamecult.eve.unity-uitoolkit` to Aetheria's
Unity `testables`, runs `GameCult.Eve.UnityUIToolkit.Tests` in Unity batchmode,
writes XML and log artifacts under `artifacts/aetheria-unity-editmode`, and
restores `Packages/manifest.json` before returning. The test asmdef uses
Unity-style precompiled references for the Brokkr/CultMesh DLLs that Unity
needs to resolve `GameCult.Mesh`; this complements the normal CultLib
.NET/NuGet dependency story rather than replacing it. The runner proves the
incubating package test lifecycle, not final EveUnity-owned release or capture.

Unity runtime lifecycle evidence:

`packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json`
declares release, test, and capture lifecycle stages for the UI Toolkit runtime.
The parity harness validates those lifecycle claims against
`tools/parity/parity-manifest.json` and checks that declared evidence paths
exist. The current lifecycle proof is deliberately split:

- release: incubating UPM package identity and import surface exist in Eve;
- test: package-owned EditMode tests run through Aetheria in Unity batchmode,
  and Aetheria can build the package through Unity's generated project;
- capture: Unity editor or batchmode capture remains a split blocker.

EveUnity split handoff evidence:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-eveunity-split-handoff-smoke.ps1
```

That script validates
`packages/org.gamecult.eve.unity-uitoolkit/eveunity-split-handoff.json` against
the runtime capability manifest. The handoff names the package paths, lifecycle
stages, Eve contracts, forbidden imports, and external proofs that must become
EveUnity-owned before the runtime leaves incubation.

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
- Fensalir Direct2D: specialized native target with a runtime-pack
  `gamecult.eve.surface.v1` adapter fixture; runtime-owned command smoke and
  Direct2D capture are still missing.

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
