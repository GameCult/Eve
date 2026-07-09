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
for its `sai.vn`, `norn.graph`, and `tex.math` plugin projection adapter proofs
while leaving Sai, Norn, and TeX semantic authority in their independent
sidecar plugin owners.

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

The conformance export also carries a `gamecult.eve.capability_matrix.v1`
projection. It summarizes pack health, plugin ABI/capability claims, provider
surfaces/commands/receipts, runtime feature/capture/command coverage, split
readiness, and handoff counts. This is derived evidence for consumers, not a
new source of truth.
The export schema and consumer smoke now require minimum record shapes for
plugins, providers, runtimes, and split targets. Owner repos should be able to
depend on ids, owners, statuses, split targets, manifest or advertisement paths,
feature/plugin arrays, and blocker/proof arrays without reading Eve's parity
manifest.

Capability gaps are exported as `capabilityGaps[]`. They are derived from
missing plugin/provider/runtime evidence, declared unsupported plugin
projection, capture gaps, and split blockers. Consumer smokes can assert named
gap substrings with `--expect-capability-gap`.
When a provider advertises a world-surface lowering target that no runtime
claims, the gap is assigned to the matching pending runtime owner when one
exists, such as `unity-scene` -> EveUnity or `tui` -> EveTui. Eve only owns the
gap when no runtime target has been declared at all.
The same facts are also exported as `worldSurfaceLoweringGaps[]` so runtime
owners can consume provider id, surface id, target id, owner repo, runtime id,
split target, and runtime status as typed fields instead of parsing the generic
gap text.
The full advertised-target ledger is exported as
`worldSurfaceLoweringCoverage[]`. Each record joins a provider-owned world
surface to one advertised lowering target and reports whether that target is
`claimed`, `missing-claim`, or `missing-runtime`, along with the runtime owner
and runtime id. Consumer smokes can assert complete coverage facts with
`--expect-world-lowering-coverage <providerId:surfaceId:targetId:status:ownerRepo:runtimeId>`.
Provider-owned world/editor surfaces are exported as
`interactiveWorldSurfaces[]`. These records index the provider id, owner repo,
surface id, surface kind, projection kind, state schemas, command boundary,
receipt schema, lowering targets, and ownership rule so runtime lowerers can
discover provider-authored world surfaces without importing provider source
layout. Consumer smokes can assert advertised targets with
`--expect-interactive-world-surface <providerId:surfaceId:targetId:ownerRepo>`.
The command path for those targets is exported as
`commandBoundaryCoverage[]`. Each record joins a provider-owned surface,
advertised lowering target, runtime owner, provider command boundary, receipt
schema, and runtime command envelope schema. Status is `covered` only when the
runtime has claimed the target and advertises `gamecult.eve.command.v1`;
otherwise it reports `missing-runtime`, `missing-runtime-claim`,
`missing-provider-boundary`, or `missing-command-transport`. Consumer smokes can
assert it with
`--expect-command-boundary-coverage <providerId:surfaceId:targetId:status:ownerRepo:runtimeId>`.
The browser reference lowerer also copies the active surface's advertised
`worldInteraction.commandBoundary` and `worldInteraction.receiptSchema` into
`gamecult.eve.command.v1` intents, falling back to component action metadata
only when the advertisement lacks those fields. That keeps command routing on
the provider/plugin advertisement contract instead of letting the browser
reference probe provider source layout.
Declared runtime/plugin projection gaps are exported as
`runtimePluginProjectionGaps[]`. These records carry runtime id, runtime owner,
split target, plugin id, reason, severity, and fixture lists so EveUnity,
EveElectron, Sai, Norn, and TeX owners can distinguish "this projection runtime
cannot project the plugin yet" from "plugin semantics belong in Eve core."
Device-edge dashboard proofs that do not claim plugin projection are not listed
as failed plugin clients. Consumer smokes can assert real projection gaps with
`--expect-runtime-plugin-gap <runtimeId:pluginId:ownerRepo>`.
The same claims are exported as `runtimePluginProjectionCoverage[]`, including
positive `supported` projection adapters and declared `unsupported` gaps. This
lets runtime and plugin owners consume one ledger for "Unity UI Toolkit has
projection adapters for independent Sai and Norn sidecar-advertised output,"
"Unity scene can project Norn's sidecar-advertised embedded graph shell," and
"Electron does not have generic plugin projection yet" instead of walking
nested runtime records. Consumer smokes can assert entries with
`--expect-runtime-plugin-projection <runtimeId:pluginId:status:ownerRepo>`.
Provider surface plugin requirements are also joined with runtime projection
support as `providerRuntimePluginProjectionCoverage[]`. These records answer
the real lowering question: whether a provider surface's required or
optional-nested plugin can be projected by a concrete runtime. Required plugin
failures are blockers; optional nested failures are degraded lowerings. Consumer
smokes can assert them with
`--expect-provider-runtime-plugin-projection <providerId:surfaceId:runtimeId:pluginId:status:runtimeOwnerRepo>`.

The conformance export includes runtime `capabilityManifestPath` and
`capabilityManifestErrors` fields so external consumers can distinguish a
generic projection runtime from a runtime that can project plugin-declared
capabilities.

Plugin handoff paths are exported as `plugins[].handoffPath` for owner repos
such as Sai and Norn. These paths are incubation evidence for where plugin
manifest, advertisement, ABI fixture, and conformance ownership must move; they
are not plugin runtime state.
Plugin ABI fixture operations are exported as `plugins[].abiOperationContracts`
with `operation`, `input`, and `expect` blocks. Plugin owners can consume the
operation-level contract for `describe`, `validate`, `project`, `lower`,
`measure`, and `apply` without opening Eve-local fixture files.
The same operation set is indexed as root `pluginAbiOperationCoverage[]` records
with plugin id, owner repo, operation, status, fixture path, input keys, and
expect keys. Plugin-owner smokes can assert contracted operations with
`--expect-plugin-abi-operation-coverage <pluginId:operation:status:ownerRepo>`
without walking nested plugin records.
Provider-advertised plugin requirements are indexed as root
`providerPluginRequirementCoverage[]` records. These join provider id, surface
id, plugin id, plugin owner, plugin status, availability, required
capabilities, optional capabilities, and missing capabilities so provider and
plugin owners can consume requirement coverage without reconstructing the
provider/plugin join. `availability: optional-nested` means the parent surface
can compose that independent plugin when available; it is not a parent-plugin
dependency and it does not move nested semantics into the parent plugin.
Consumer smokes can assert them with
`--expect-provider-plugin-requirement <providerId:surfaceId:pluginId:status:pluginOwnerRepo[:availability]>`.
Plugin-owner smokes should use the optional availability field when proving that
Sai's required VN plugin is distinct from optional nested Norn or TeX surfaces.

The runtime conformance pack is evidence-shaped, not fixture-shaped. Its
`packs/runtime.json` document includes `runtimeTargets` so runtime repos can
consume status, supported features, plugin support, command schema, lifecycle,
capture status, world-surface lowering claims, and missing evidence without reading Eve's local parity
manifest. The runtime-owner consumer smoke asserts EveUnity lifecycle stage
status and pending release/test/capture proofs from the exported runtime record,
plus release contract fields such as package name, artifact kind, tag pattern,
and package root, plus Unity EditMode test runner contract fields such as
runner script, package name, test assembly, and platform. It also asserts that
web and Unity UI Toolkit claim their provider-advertised world-surface lowering
targets. Split blockers are exported both as human-readable `blockers[]` and as
typed `blockerRecords[]` / root `splitTargetBlockers[]` entries. Split-target
consumers can assert blocker kind and subject with
`--expect-split-target-blocker-record <targetId:kind:subject>` instead of
scraping prose from handoff notes.
Runtime split handoff move/source coverage is exported as
`splitHandoffMoveCoverage[]`. Each record joins a split target, runtime id,
handoff move set, destination owner, replacement proof, and source path status.
`current` paths are Eve-incubated code that still needs to leave,
`observed-provider` paths are provider-owned pressure sources such as
Aetheria's current Electron client, and `replacement-required` records mark
move sets where no generic runtime source exists yet. Consumer smokes can
assert them with
`--expect-split-handoff-move <splitTarget:runtimeId:moveSetId:pathKind:status:path-substring>`.
Runtime split handoff documents themselves use
`gamecult.eve.runtime_split_handoff.v1`; the parity runner validates the
handoff document shape and exports any `splitHandoffErrors` on the runtime
record.
Plugin, provider, and EveConformance handoff documents are also schema-backed:
`gamecult.eve.plugin_handoff.v1`, `gamecult.eve.provider_handoff.v1`, and
`gamecult.eve.conformance_handoff.v1` are exported through the schema catalog.
Owner consumer smokes assert those schemas before trusting handoff paths.
Runtime lifecycle records use `gamecult.eve.runtime_lifecycle.v1`. Standalone
lifecycle documents such as `flutter/eve_parity/eveflutter-lifecycle.json` and
embedded runtime capability lifecycle blocks validate against the same stage
shape, and exported runtime records carry `lifecycleErrors`.
Runtime shell output contracts are schema-backed too:
`gamecult.eve.electron_shell_projection.v1` covers the Electron shell tree, and
`gamecult.eve.tui_grid.v1` covers the compact terminal grid. The Electron and
TUI runtime tests validate real lowered objects against those schemas.

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
`aetheria-world-command-replay` scenario, daemon game/editor surface-kind
claims, and provider handoff path. Generated copies remain under Eve's
`artifacts/aetheria-conformance-consumer-smoke` so the provider worktree does
not become dirty merely by proving the boundary.

Plugin owner handoff smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-plugin-handoff-smoke.ps1
```

That script validates the Sai and Norn handoff manifests against their plugin
manifests, advertisements, ABI fixtures, move-set paths, contract inputs, and
external proofs. It also checks that the manifest and advertisement agree on
the runtime-independent executable sidecar boundary: `gamecult.eve.plugin_abi.v1`,
CultMesh/stdio transport, renderer independence, no provider-state mutation,
provider-owned command acceptance, and `runtime.sidecar` process/protocol/schema
fields. The plugin-owner conformance smoke also asserts those handoff paths,
runtime boundary claims, and exported sidecar fields from the conformance
export.

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

That script asserts that EveFlutter, EveUnity, EveElectron, and EveTui are
exported as incubating split targets, that their current split-readiness proofs
are passed, and that their graduation blockers remain visible to consumers. A
target being present is not enough; future owner repos must be able to consume
why it is or is not ready to leave Eve incubation. EveElectron is intentionally
pending: its handoff names the generic Electron shell boundary, while the
Starbridge RTS client remains Aetheria-owned product code until a
provider-agnostic shell exists. The same smoke asserts that the Aetheria
Electron source paths named by the handoff currently exist as
`observed-provider` sources, so the extraction pressure is visible without
turning those paths into EveElectron authority. The Electron runtime now claims
a narrow provider-advertised surface-tree command surface and exposes a typed
capture request contract plus a schema-backed JSON shell projection artifact.
It preserves embedded document slot identity in the generic shell projection,
while packaged rendering and actual window PNG capture remain blockers.
EveUnity's UI Toolkit handoff does the same for Aetheria's Unity consumer
boundary: Aetheria's Unity `Packages/manifest.json`, generated
`GameCult.Eve.UnityUIToolkit.csproj`, assets root, daemon catalog client, and
Unity smoke are exported as `observed-provider` paths. That proves a real game
consumes the generic EveUnity package/contract while keeping product state,
assets, generated projects, scenes, and receipts in Aetheria.
EveTui is now an active incubating runtime: it claims a lossy
provider-advertised terminal-grid command surface, preserves embedded document
slot identity in the grid artifact, projects Sai/Norn/TeX fallback shells, and
attaches a typed JSON grid capture. Repo/package graduation and owner-repo
capture production remain blockers.
EveUnity includes both the active `unity-uitoolkit` package proof
and the pending `unity-scene` runtime boundary; UI Toolkit support is not
treated as full Unity scene/world lowering. The `unity-scene` runtime now claims
a narrow scene graph command surface, preserves embedded document slot identity,
and exposes a typed capture request contract plus a schema-backed JSON scene
projection artifact, while actual scene/frame PNG capture and release remain
explicit blockers.

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
The exported runtime lifecycle records that runner contract so EveUnity can
inherit the Unity-specific test proof without making Eve responsible for
CultLib package distribution.

Unity runtime lifecycle evidence:

`packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json`
declares release, test, and capture lifecycle stages for the UI Toolkit runtime.
The parity harness validates those lifecycle claims against
`tools/parity/parity-manifest.json` and checks that declared evidence paths
exist. The current lifecycle proof is deliberately split:

- release: `tools/eveunity/eveunity-release-contract.mjs` builds a typed
  `gamecult.eve.runtime_release_request.v1` request from the runtime capability
  manifest and UPM package manifest; the tagged EveUnity release remains a
  split blocker;
- test: package-owned EditMode tests run through Aetheria in Unity batchmode,
  and Aetheria can build the package through Unity's generated project;
- capture: `tools/eveunity/eveunity-capture-contract.mjs` builds a typed
  `gamecult.eve.runtime_capture_request.v1` request from the runtime capability
  manifest and Aetheria provider advertisement; Unity editor or batchmode PNG
  capture remains a split blocker. `tools/eveunity/eveunity-uitoolkit-capture-artifact.mjs`
  also writes a schema-backed
  `gamecult.eve.unity_uitoolkit_projection.v1` JSON projection artifact at
  `artifacts/eveunity-uitoolkit-capture/latest/unity-uitoolkit-projection.json`.
  That artifact proves provider-advertised UI Toolkit projection, embedded
  slots, and sidecar plugin projection metadata without pretending to be a
  rendered Unity frame.

TUI capture evidence is already typed even though EveTui remains incubating.
`tools/evetui/evetui-capture-artifact.mjs` lowers the Aetheria world surface
through `EveTuiShell` into `gamecult.eve.tui_grid.v1` and writes
`artifacts/evetui-capture/latest/tui-grid.json`. The parity export includes
that record as `runtime.captureArtifacts[]`; runtime-owner consumers can assert
it without depending on Eve's source layout. The remaining blocker is
owner-repo production of the same capture path, not absence of a cell-grid
artifact.

Electron semantic capture evidence follows the same evidence rule without
pretending it is a packaged window PNG. `tools/eveelectron/eveelectron-capture-artifact.mjs`
lowers the Aetheria world surface through `EveElectronShell` into
`gamecult.eve.electron_shell_projection.v1` and writes
`artifacts/eveelectron-capture/latest/electron-shell-projection.json`. The
remaining blocker is packaged Electron window capture.

Unity scene semantic capture evidence follows the same rule without pretending
it is a rendered Unity frame. `tools/eveunity/eveunity-scene-capture-artifact.mjs`
lowers the Aetheria world surface into `gamecult.eve.unity_scene_projection.v1`
and writes `artifacts/eveunity-scene-capture/latest/unity-scene-projection.json`.
It records scene graph projection, embedded slots, and sidecar plugin projection
metadata. The remaining blocker is Unity screenshot or frame-capture PNG
production from EveUnity.

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
- export `screenshotComparisonMetrics[]` records for structure, color tokens,
  bounding boxes, and text presence.

This already catches the most embarrassing class of parity lie: a runtime or
fixture claiming to render CultUI while the retained tree no longer contains
the partitions, bindings, tokens, or slider anatomy the renderer is supposed to
lower.

Screenshot comparison metrics are intentionally not byte-identical image
checks. Structure and color-token scores come from the authored surface
contract; text-presence scores come from authored text-bearing nodes; bounding
box records name whether authored layout boxes exist or whether a runtime still
owes a capture/layout probe. A missing Unity, Electron, TUI, or Direct2D capture
body therefore appears as `pending-capture`, not as fake visual parity.

The web reference has the first measured bounding-box probes. The harness runs
`scripts/run-web-reference-layout-probe-smoke.ps1`, which builds the browser
lowerer and uses Chrome headless to write
`artifacts/web-reference-layout-probe/latest/embedded-surface.json` and
`artifacts/web-reference-layout-probe/latest/sai-vn.json` as
`gamecult.eve.web_layout_probe.v1`. Parity consumes those artifacts and marks
`web:embedded-surface:bounding-boxes` and `web:sai-vn:bounding-boxes` as `pass`
with `evidenceLayer: runtime-layout-probe`.

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
  `embeddedDocuments` support for `android-kotlin`. It does not consume plugin
  fixtures until EveAndroid grows a plugin projection adapter; Android Flutter
  is the Android-side plugin projection acceptance target.
- Rust / CultMesh: typed document runtime rather than a CultUI renderer.
  Required nested-surface evidence: `cargo test -p cultnet-rs
  rust_preserves_cultui_embedded_surface_slots_through_typed_document_sync`
  in CultLib.
- Fensalir Direct2D: specialized native target with a runtime-pack
  `gamecult.eve.surface.v1` adapter fixture; runtime-owned command smoke and
  Direct2D capture are still missing.

Pending runtimes are allowed. Silent fake parity is not.

## Next Cuts

1. Extend runtime-owned image/layout probes to the Unity/Electron capture
   blockers and move EveTui's JSON grid capture path into the EveTui owner repo.
2. Normalize text scale and font loading across web, Flutter Android, Flutter
   desktop, and iOS.
3. Give iOS a real `vn.stage` scene compositor instead of compact stacked
   fixture lowering.
4. Replace Flutter golden screenshots with native window captures once the
   Flutter app body can emit a desktop frame without test harness help.
5. Add Direct2D frame capture once the Eve-to-`AquariumUiDocument` adapter
   exists.
