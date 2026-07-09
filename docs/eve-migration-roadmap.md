# Eve Migration Roadmap

Date: 2026-07-08

The great Eve migration is the move from a useful pile of renderer proofs,
fixtures, provider demos, and platform experiments into a kernel-shaped system:
Eve core owns contracts, plugins own semantics, runtime repos own native
projection, and provider repos own live truth.

This is not a repo cleanup campaign. It is an authority migration. The split is
complete only when the old in-repo convenience paths can no longer decide
provider truth, plugin semantics, or runtime behavior by accident.

## Objective

Make Eve the stable interactive language for CultMesh surfaces without turning
`E:\Projects\Eve` into a permanent warehouse.

The target shape:

- Eve core: surface contracts, CultUI DSL, command/binding descriptors,
  provider/plugin advertisement specs, browser reference, and conformance
  harness incubation.
- EvePlugins: first-party reusable semantic plugins while young.
- Owner repos: Sai owns VN/Ink, Norn owns graph semantics, providers such as
  Aetheria own live state and authored product surfaces.
- Runtime repos: EveUnity, EveFlutter, EveAndroid, EveIOS, EveGodot, EveElectron,
  Fensalir/Direct2D, and future bodies own projection, build glue, plugin
  projection adapters, capture, and runtime tests.
- EveConformance: fixture corpus, parity runner, capability matrix,
  screenshot/report artifacts, plugin packs, and CI once the harness is stable
  enough to leave Eve core.

## Current Authority Map

Owner:

- Eve owns `gamecult.eve.surface.v1`, `gamecult.eve.command.v1`, CultUI,
  provider/plugin advertisement contracts, plugin ABI shape, browser reference
  behavior, and parity/conformance policy.

Inputs:

- Local fixtures under `web/fixtures`.
- Incubating plugin manifests under `plugins/incubating`.
- Runtime claims in `tools/parity/parity-manifest.json`.
- Provider advertisements such as Repixelizer's local fixture.
- Hermodr/Odin/CultMesh live provider surfaces when available.

Outputs:

- Browser reference lowering.
- Runtime capability reports.
- Plugin capability gaps.
- Parity reports under `artifacts/parity`.
- Split targets and graduation triggers in the parity manifest.

Derived state:

- Local provider lists are fixture advertisements, not discovery truth.
- Runtime capability status is diagnostic, not provider authority.
- Screenshot/golden artifacts are evidence, not portable state.
- In-repo runtime/plugin bodies are incubation, not permanent ownership.

Forbidden writers:

- Runtime lowerers must not import provider internals to recover missing
  semantics.
- Plugins must not mutate provider truth or accept provider commands.
- Product demos must not become Eve core fixtures once they carry product state,
  assets, receipts, or deployment assumptions.
- Compatibility HTTP routes and browser tabs must not replace provider
  advertisements.
- Passing parity tests must not preserve a body that cannot name its owner,
  inputs, outputs, and split trigger.

Shared paths:

- Every runtime claim flows through `tools/parity/parity-manifest.json`.
- Every fixture belongs to a conformance pack: `core`, `plugin`, `provider`, or
  `runtime`.
- Every plugin claim names owner repo, split target, capabilities, required
  fixtures, and graduation trigger.
- Every runtime claim names owner repo, repo role, split target, supported
  features, plugin support, and graduation trigger.

Deletion line:

- Cut hardcoded provider tabs before adding new live providers.
- Cut renderer-specific product knowledge before claiming generic Eve support.
- Cut in-repo runtime/plugin bodies once their contract and release lifecycle
  stop changing.

## Phase 0: Ledger And Contract Grounding

Status: underway.

Purpose: make ownership visible before moving code.

Work:

- Keep `docs/repo-strategy.md` as the repo boundary doctrine.
- Keep this roadmap as the migration sequence.
- Keep `tools/parity/parity-manifest.json` as the machine-readable ownership
  ledger.
- Keep `docs/surface-contract-v1.md`,
  `docs/provider-advertisement-contract.md`, and
  `docs/plugin-architecture.md` as the contract source of truth.
- Keep browser reference and parity harness green after every migration cut.

Exit criteria:

- All fixtures declare a conformance pack.
- All incubating plugins declare owner, split target, capabilities, and required
  fixtures.
- All runtimes declare owner, repo role, supported features, plugin claims, and
  graduation trigger.
- Harness reports missing ownership metadata and plugin gaps explicitly.

Current proof:

- `node --test web\eve-dsl.test.mjs`
- `powershell -ExecutionPolicy Bypass -File .\scripts\run-parity-harness.ps1`

## Phase 1: Stabilize Core Surface Contract

Purpose: make the surface contract boring enough that runtimes and providers can
leave the repo without dragging hidden behavior with them.

Work:

- Normalize `surface.root`, `surface.styles.tokens`, `stateBindings`,
  `embeddedDocuments`, command templates, and operation invocation descriptors.
- Keep compatibility fields such as `nodes`, `selectedNodeId`, raw `command`,
  and string payloads as projections only.
- Add explicit authority/staleness witness UI in the browser reference for
  stale, missing, predicted, denied, accepted, and reconciled values.
- Add provider advertisement fixture checks for local and live discovery paths.
  First cut is in place for Repixelizer and Aetheria provider advertisements.
- Add plugin advertisement fixture checks before adding more plugin semantics.

Exit criteria:

- Browser reference can open all local fixtures through advertisement-shaped
  provider entries.
- New renderer APIs construct commands from CultMesh operation descriptors, not
  raw strings.
- New binding APIs carry CultMesh state binding descriptors, not renderer-local
  stores.
- Parity harness fails if embedded slots, required bindings, command descriptors,
  or provider advertisement fields disappear.

## Phase 2: Split Conformance Shape From Runtime Bodies

Purpose: make the evidence path portable before runtime repos leave.

Work:

- Promote `tools/parity` from a local script into a conformance pack layout:
  fixture metadata, expected capability matrix, runtime adapters, plugin packs,
  and report schema.
- Separate core fixtures from plugin/provider/runtime fixtures.
- Add screenshot comparison metrics for structure, token colors, bounding boxes,
  text presence, and capability-gap overlays without pretending byte-identical
  pixels are the goal.
- Keep generated reports under `artifacts/parity` as evidence only.

Exit criteria:

- A runtime repo can run conformance against Eve fixtures without importing Eve
  source internals.
- Plugin conformance packs can be added without editing core harness logic.
- `EveConformance` has a clean split plan, or stays incubating only because the
  report schema is still changing.

## Phase 3: Graduate Plugins

Purpose: move semantic ownership out of Eve core.

Work:

- Keep `plugins/incubating/sai-vn.plugin.json`,
  `plugins/incubating/norn-graph.plugin.json`, and
  `plugins/incubating/tex-math.plugin.json` as temporary manifests.
- Define `gamecult.eve.plugin.v1` and
  `gamecult.eve.plugin_advertisement.v1` as explicit schemas. First-cut JSON
  schemas live under `schemas/` and the parity harness validates incubating
  plugin manifests and advertisements against them.
- Add plugin ABI fixtures for `describe`, `validate`, `project`, `apply`,
  `lower`, and `measure` where relevant.
- Move `sai.vn` to Sai when VN/Ink story state, visual manifest, story commands,
  and projection fixtures are stable.
- Move `norn.graph` to Norn when graph layout, interaction, fallback, and
  conformance fixtures are stable.
- Move `tex.math` to EvePlugins when TeX source, macro, baseline, cached render,
  and fallback fixtures are stable.
- Treat nested plugin placement as composition, not custody. A Sai surface may
  deploy with nested Norn or TeX surfaces when those plugin sidecars are
  available, but Norn and TeX remain independent plugin owners with their own
  ABI manifests, capability claims, and conformance packs.

Exit criteria:

- Eve core knows plugin manifests and capability gaps, not plugin internals.
- Providers invoke plugins through the ABI object model.
- Runtimes declare plugin support through capability manifests.
- Unsupported required plugin capabilities appear as visible gaps.
- Optional nested plugin gaps degrade the nested surface; they do not transfer
  graph, math, or renderer semantics into the parent plugin.

## Phase 4: Graduate Runtime Bodies

Purpose: let runtime repos own native projection without losing conformance.

Work:

- EveFlutter: provider picker, command transport, plugin projection adapters,
  Android/iOS/desktop build flow, native capture, and parity reports.
- EveUnity: UPM package release, plugin projection adapter behavior,
  resolver-backed embedded documents, Unity test/capture lifecycle, and Aetheria
  consumption.
- EveAndroid: Kotlin device edge, generic surface traversal, sensor publishing,
  Android-specific CI, and explicit discovery input.
- EveIOS: UIKit renderer, sensor edge release flow, fixed-device and simulator
  capture, and generic surface lowering.
- Fensalir/Direct2D: Eve-to-`AquariumUiDocument` adapter, DirectWrite/Direct2D
  token lowering, embedded slot preservation, and frame capture.
- EveWeb: stays in Eve while it is the behavior oracle; splits only if it becomes
  an independently deployed runtime product.

Exit criteria:

- Runtime can build, test, capture, and report conformance without sharing Eve's
  dirty worktree.
- Runtime consumes surface documents, plugin manifests, and provider
  advertisements through contracts.
- Runtime has no provider-specific renderer brain unless it is explicitly a
  provider-owned app.

## Phase 5: Move Product Fixtures To Provider Repos

Purpose: prevent demos from becoming quiet product authority inside Eve.

Work:

- Repixelizer owns job/session/artifact/operator fixtures once they carry real
  product state or receipts.
- Aetheria owns RTS/ARPG world surfaces, assets, generated level state, command
  receipts, and scenario conformance.
- Huginn owns `.cc` and Persona-state inspection fixture packs when they depend
  on runtime stewardship details.
- Mimir owns sensor/media/control surfaces that depend on live stream timing or
  room state.

Exit criteria:

- Provider repo publishes provider advertisements and fixture/conformance packs.
- Eve core keeps only minimal generic fixtures and references provider packs by
  contract.
- Product assets and receipts are not stored as Eve core truth.

## Phase 6: Cut Compatibility Paths

Purpose: make old routes unable to reassert authority.

Work:

- Remove hardcoded browser provider tabs once live/local advertisements cover
  the same flows.
- Remove direct Mimir deck probing from generic Eve paths.
- Remove renderer-private style shortcuts once token lowering is complete.
- Remove raw command construction APIs from new public runtime paths.
- Remove provider-specific renderer fallbacks from generic lowerers.

Exit criteria:

- The only normal path is provider advertisement -> surface document -> runtime
  lowering -> command intent -> provider receipt -> republished state.
- Compatibility routes exist only as named lowerings or debug probes.
- Parity and runtime diagnostics report the same layer of reality the user sees.

## Active Work Queue

1. Move EveUnity toward split readiness with runtime-owned UPM release and
   Unity capture/test lifecycle evidence.

Recently cut:

- Runtime capability manifests now declare world-surface lowering targets.
  `web/eve-runtime-capability.json` claims `web-reference`, and
  `packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json`
  claims `unity-uitoolkit`, each with supported world surface kinds,
  projection kinds, support level, evidence paths, and the rule that runtimes
  lower provider-owned world state without owning it. Parity compares those
  claims against the ledger, exports them through runtime records and
  `packs/runtime.json`, the runtime-owner smoke asserts them, and the generic
  conformance smoke now treats `unity-scene` as a narrow Unity scene graph
  command-surface claim while capture and release remain split blockers.
- Missing provider-advertised world-surface lowering targets are now assigned
  to their pending runtime owner when one exists. `unity-scene` gaps point at
  EveUnity's pending `unity-scene` runtime, and `tui` gaps point at EveTui's
  pending `tui` runtime. Eve only owns a world-lowering gap when no runtime
  target has been declared.
- The conformance export now carries `worldSurfaceLoweringGaps[]` as typed
  data in addition to the generic `capabilityGaps[]` ledger. Runtime owners can
  consume provider id, surface id, target id, owner repo, runtime id, split
  target, and runtime status without scraping prose or gap strings.
- The conformance export also carries `worldSurfaceLoweringCoverage[]`, a full
  provider-surface-to-target ledger that marks each advertised lowering target
  as `claimed`, `missing-claim`, or `missing-runtime`. The generic conformance
  consumer now asserts Aetheria's claimed web, UI Toolkit, and Unity scene graph
  targets plus the missing TUI targets from the same typed surface.
- The conformance export carries `commandBoundaryCoverage[]`, joining each
  provider-owned interactive world surface target to its runtime owner,
  provider command boundary, receipt schema, and runtime command envelope. Web
  Unity UI Toolkit, and Unity scene are `covered` because they advertise
  `gamecult.eve.command.v1`; TUI stays visible as `missing-runtime-claim`
  until its generic terminal lowerer exists.
- The browser reference lowerer now carries the active provider surface's
  advertised `worldInteraction.commandBoundary` and
  `worldInteraction.receiptSchema` into each `gamecult.eve.command.v1` intent.
  It can use component action metadata as a fallback, but the provider
  advertisement is the authority when present.
- The browser lowerer command intent path now passes the active surface id
  explicitly and tests that a provider with multiple world surfaces uses the
  active surface advertisement instead of the provider's first advertised
  surface. This keeps Aetheria game/editor command boundaries from collapsing
  inside the generic web reference.
- Unity scene now has a provider-shell contract skeleton under
  `runtimes/incubating/eve-unity-scene`. The skeleton consumes an advertised
  `worldInteraction` boundary, creates `gamecult.eve.command.v1` requests with
  command boundary and receipt schema fields, builds a provider-agnostic Unity
  scene graph DTO from the surface tree, and claims only the `unity-scene`
  graph command-surface target. It still does not own provider simulation,
  plugin projection adapters, release, or capture evidence.
- EveElectron now has a provider-shell contract skeleton under
  `runtimes/incubating/eve-electron`. The shell selects advertised provider
  surfaces, emits `gamecult.eve.command.v1` intents with provider command
  boundary and receipt schema fields, and has a runnable Node smoke without
  claiming embedded document rendering, packaged Electron lifecycle, or capture.
- EveTui now has a provider-shell contract skeleton under
  `runtimes/incubating/eve-tui`. The shell selects advertised provider
  surfaces, emits `gamecult.eve.command.v1` intents with provider command
  boundary and receipt schema fields, and produces an explicitly lossy
  `gamecult.eve.tui_grid.v1` summary without claiming full `tui` world lowering
  or transcript capture.
- The conformance export carries `splitHandoffMoveCoverage[]`, joining runtime
  split handoff move sets to source path status. EveElectron now exposes the
  existing Aetheria `Aetheria.Rts.Web/Electron` and command transport paths as
  `observed-provider` sources that must be replaced by a provider-agnostic
  shell; Unity scene now exposes current incubation paths for its generic scene
  graph body, world-surface lowering claim, and command transport, while scene
  capture remains replacement-required.
- The conformance export schema and consumer smoke now require minimum typed
  item shapes for plugins, providers, runtimes, and split targets. Owner repos
  can rely on exported ids, owners, statuses, split targets, manifest or
  advertisement paths, feature/plugin arrays, and blocker/proof arrays instead
  of treating those sections as untyped bags.
- Plugin ABI fixture operations are now exported as
  `plugins[].abiOperationContracts`. Sai and Norn can consume operation-level
  `input` and `expect` contracts for `describe`, `validate`, `project`,
  `lower`, `measure`, and `apply` without reading Eve-local fixture files.
- Plugin ABI operation coverage is now exported as root
  `pluginAbiOperationCoverage[]` records. The plugin-owner smoke asserts Sai
  and Norn `describe`, `lower`, and `apply` operations as `contracted`, so plugin
  owners can consume the coverage ledger without walking Eve's nested plugin
  records.
- Provider/plugin requirement coverage is now exported as root
  `providerPluginRequirementCoverage[]` records with availability. The
  plugin-owner smoke asserts `sai.vn` as the required VN plugin and
  `norn.graph` / `tex.math` as `optional-satisfied` nested plugins owned by
  Norn and EvePlugins. A Sai surface can embed Norn or TeX when those plugins
  are available, but Sai does not own their graph or math semantics.
- Runtime/plugin projection claims are now exported as root
  `runtimePluginProjectionCoverage[]` records. Runtime-owner smokes assert
  Unity UI Toolkit support for `sai.vn` and `norn.graph`, its declared TeX gap,
  and the pending Unity scene/Electron unsupported Sai projection until their
  generic lowerers exist.
- Provider/runtime/plugin projection coverage is now exported as
  `providerRuntimePluginProjectionCoverage[]`. The runtime-owner smoke proves
  the Sai VN provider surface lowers fully in web, lowers in Unity UI Toolkit
  with Norn support and TeX as a degraded optional nested plugin, and does not
  let UIKit's generic embedded-document path impersonate full Sai/Norn
  projection.
- Runtime/plugin projection gaps are now exported as
  `runtimePluginProjectionGaps[]`. The runtime-owner smoke asserts Unity and
  Electron plugin gaps as typed records, so missing Sai, Norn, or TeX projection
  support is owned by the runtime split target and does not imply those plugin
  semantics should move into Eve core or Aetheria product code.
- Split target blockers are now exported as `splitTargetBlockers[]` and as
  per-target `blockerRecords[]` with blocker kind, subject, owner, and source
  text. The split-target consumer smoke asserts Unity scene status/plugin
  blockers, Electron feature blockers, and TUI command-transport blockers
  without scraping the human `blockers[]` strings.
- EveUnity now has a pending Unity scene handoff at
  `runtimes/incubating/eve-unity-scene/eveunity-scene-split-handoff.json`.
  The active `unity-uitoolkit` runtime remains a semantic UI surface lowerer;
  it is not treated as full scene/world projection. The pending `unity-scene`
  runtime now names current scene graph and command-transport source paths,
  while release, capture, non-Aetheria provider proof, and runtime graduation
  remain EveUnity blockers.
- Unity scene now has a pending runtime capability manifest at
  `runtimes/incubating/eve-unity-scene/eve-runtime-capability.json` and a
  lifecycle smoke at `scripts/run-eveunity-scene-lifecycle-smoke.ps1`. The
  manifest claims a provider-agnostic scene graph command surface for
  `unity-scene`, types the package release, provider-advertisement scene smoke,
  command boundary, and scene capture contracts, and keeps plugin projection
  adapters unsupported until Sai, Norn, or TeX sidecar projection support exists
  in the Unity scene runtime.
- Unity scene now has a direct split handoff smoke at
  `scripts/run-eveunity-scene-split-handoff-smoke.ps1`. The smoke verifies the
  scene runtime's current source paths for runtime body, scene graph lowering,
  and command transport, does not treat Aetheria product paths as generic
  runtime source, names the required Eve contracts, and keeps capture as an
  external proof until EveUnity owns it.
- EveElectron now has a pending split target and handoff at
  `runtimes/incubating/eve-electron/eveelectron-split-handoff.json`. It does
  not claim an Electron runtime body yet. The handoff draws the line between a
  future provider-agnostic Electron shell and Aetheria's Starbridge RTS product
  client, and the split-target consumer smoke keeps the missing shell,
  provider-advertisement consumption, command transport, and capture proofs
  visible as blockers.
- EveElectron now has a direct split handoff smoke at
  `scripts/run-eveelectron-split-handoff-smoke.ps1`. The smoke verifies the
  observed Aetheria Electron/client paths that must be replaced, the required
  Eve contract inputs, and the pending external proofs without treating
  Aetheria's product client as the generic Electron runtime.
- EveElectron now has a pending runtime capability manifest at
  `runtimes/incubating/eve-electron/eve-runtime-capability.json` and a
  lifecycle smoke at `scripts/run-eveelectron-lifecycle-smoke.ps1`. The
  manifest declares no supported runtime features or plugin projection yet; it
  only types the pending command boundary, package release, provider-shell
  smoke, and Electron window capture contracts so EveElectron can consume the
  conformance export without pretending the generic shell already exists.
- Electron and TUI pending lifecycle details now live in their runtime
  capability manifests rather than being duplicated in
  `tools/parity/parity-manifest.json`. The parity ledger points at the
  capability documents; the conformance export reads command/lifecycle contracts
  from those documents for pending runtimes.
- EveTui now has a pending split target and handoff at
  `runtimes/incubating/eve-tui/evetui-split-handoff.json`. It does not claim
  the advertised `tui` world-surface lowering target yet. The handoff draws the
  line between a future provider-agnostic terminal/grid lowerer and
  provider-owned TUI surfaces, and the split-target consumer smoke keeps the
  missing runtime body, provider-advertisement consumption, command transport,
  transcript/cell-grid capture, and `tui` lowering proof visible as blockers.
- EveTui now has a direct split handoff smoke at
  `scripts/run-evetui-split-handoff-smoke.ps1`, a pending runtime capability
  manifest at `runtimes/incubating/eve-tui/eve-runtime-capability.json`, and a
  lifecycle smoke at `scripts/run-evetui-lifecycle-smoke.ps1`. The manifest
  declares no supported runtime features or plugin projection yet; it only
  types the pending command boundary, terminal package release,
  provider-advertisement TUI smoke, and transcript/cell-grid capture contracts.
- Aetheria interactive world surfaces now carry a structured provider-owned
  `worldInteraction` contract. The provider advertisement names projection
  kind, provider state schemas, daemon command boundary, receipt schema,
  lowering targets, and ownership rules for `aetheria.daemon.game` and
  `aetheria.daemon.editor`. The provider scenario requires the daemon game
  world-surface contract, parity validates it against the advertisement, and the
  conformance export carries both provider `surfaceContracts` and root
  `interactiveWorldSurfaces[]` records. The Aetheria consumer smoke asserts the
  advertised web, Unity UI Toolkit, and Unity scene lowering targets without
  importing Aetheria or Eve internals.
- EveUnity test lifecycle now carries a structured Unity EditMode runner
  contract. `packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json`
  names the runner script, consumer Unity project, default Unity editor path,
  package name, test assembly, platform, result artifacts, and temporary
  `testables` manifest mutation. The lifecycle smoke validates the runner
  script and Aetheria project, parity compares the contract against the ledger,
  and the runtime-owner consumer smoke asserts exported test fields. This is
  Unity package consumption proof for CultLib-produced assemblies; CultLib
  remains the owner of the .NET/NuGet dependency story.
- EveUnity release lifecycle now carries a structured UPM release contract.
  `packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json`
  names the package root, version source, tag pattern, artifact kind, and
  owner-side publish proof for `org.gamecult.eve.unity-uitoolkit`.
  `tools/eveunity/eveunity-release-contract.mjs` now builds a
  `gamecult.eve.runtime_release_request.v1` request from the runtime capability
  manifest and UPM package manifest, deriving the `eveunity-uitoolkit-v{version}`
  tag, package dependency set, and UPM artifact path. The lifecycle smoke
  validates that contract against the package manifest, parity compares it
  against the ledger, and the runtime-owner consumer smoke asserts the exported
  release fields without pretending the tagged EveUnity release already exists.
- EveUnity capture lifecycle now carries a structured pending capture contract.
  `captureContract` names the Unity UI Toolkit runtime, capture kind, PNG
  artifact pattern, conformance attachment point, required Aetheria provider
  surface, request schema, request builder, advertisement input, and authority
  rule. `tools/eveunity/eveunity-capture-contract.mjs` now builds a
  `gamecult.eve.runtime_capture_request.v1` request from the runtime capability
  manifest and provider advertisement, and
  `scripts/run-eveunity-capture-contract-smoke.ps1` proves that request path
  without pretending a Unity PNG has been captured. The actual capture artifact
  remains a split blocker for EveUnity.
- Runtime-owner conformance consumption now asserts EveUnity lifecycle stage
  evidence directly. The generic consumer supports
  `--expect-runtime-lifecycle-status` and
  `--expect-runtime-lifecycle-pending`; the runtime-owner smoke verifies the
  Unity UI Toolkit release/test/capture statuses plus the tagged UPM release,
  batchmode runner, and capture artifact pending proofs from the exported
  runtime record.
- Plugin manifests and advertisements now carry a typed runtime-independent
  sidecar ABI boundary. Sai, Norn, and TeX declare `invocationModel:
  executable-sidecar`, `gamecult.eve.plugin_abi.v1`, CultMesh/stdio transports,
  renderer independence, no provider-state mutation, provider-owned command
  acceptance, and `runtime.sidecar` fields for process kind, protocol,
  request/response schemas, operations, command envelope, receipt schema, and
  state authority. The parity harness validates manifest/advertisement
  agreement, checks sidecar operations against ABI fixture operations, exports
  the runtime boundary, and the plugin-owner consumer smoke asserts the Sai/Norn
  sidecar contract from the conformance pack.
- Conformance export now carries first-class `capabilityGaps[]` records derived
  from plugin errors, provider advertisement/scenario errors, runtime missing
  evidence, declared unsupported plugin projection, capture gaps, and split
  blockers. The generic consumer can assert named gaps with
  `--expect-capability-gap`; the default smoke now proves Direct2D capture and
  EveUnity release ownership remain visible blockers instead of hiding in
  Markdown prose.
- Conformance export now carries a first-class
  `gamecult.eve.capability_matrix.v1` projection. The matrix summarizes pack
  health, plugin ABI/capability claims, provider surfaces/commands/receipts,
  runtime feature/capture/command coverage, split readiness, and handoff counts
  from the exported evidence. The generic consumer smoke asserts it with
  `--expect-capability-matrix`, so owner repos do not need to scrape the
  Markdown report or rebuild Eve's summary logic to understand coverage.
- Conformance export now copies handoff documents into `handoffs/*.json` rather
  than exporting Eve-local source paths only. The export carries handoff export
  paths for EveConformance, Sai/Norn plugins, Aetheria, and EveUnity; the
  generic consumer verifies those copied documents for conformance, plugin,
  provider, and runtime handoff assertions. Owner repos can inspect the
  boundary map from the exported pack itself.
- EveConformance now has a machine-readable handoff at
  `tools/conformance/eveconformance-handoff.json` and a verifier at
  `scripts/run-eveconformance-handoff-smoke.ps1`. The handoff names the
  conformance runner, schemas, consumer smokes, fixture corpus, contract inputs,
  forbidden imports, and external proofs that leave Eve when the harness
  graduates. The conformance export carries `conformanceHandoffPath`, and the
  generic consumer smoke asserts it so EveConformance split readiness is not
  trapped in Eve's parity manifest.
- Sai and Norn now have plugin handoff manifests at
  `plugins/incubating/sai-vn.plugin-handoff.json` and
  `plugins/incubating/norn-graph.plugin-handoff.json`, plus a shared verifier
  at `scripts/run-plugin-handoff-smoke.ps1`. The handoffs name the manifest,
  advertisement, ABI fixture, move sets, contract inputs, forbidden imports,
  and external proofs that must move to the owner repos. The conformance export
  carries plugin `handoffPath`, and the plugin-owner smoke asserts it so Sai
  and Norn can consume the plugin boundary without reading Eve's parity
  manifest.
- Aetheria now has a provider handoff manifest at
  `web/fixtures/aetheria-provider-handoff.json` and a verifier at
  `scripts/run-aetheria-provider-handoff-smoke.ps1`. The handoff names the
  advertisement, interactive world fixture, provider scenario, contract inputs,
  forbidden imports, and external proofs that must move to Aetheria. The
  conformance export carries the handoff path, and the Aetheria consumer smoke
  asserts it so provider ownership does not depend on Eve's parity manifest.
- EveUnity now has a machine-readable split handoff at
  `packages/org.gamecult.eve.unity-uitoolkit/eveunity-split-handoff.json` and
  a verifier at `scripts/run-eveunity-split-handoff-smoke.ps1`. The handoff
  names the UPM package body, Unity test lifecycle, Unity capture lifecycle,
  contract inputs, forbidden imports, and required external proofs that must
  move to EveUnity. It is wired into the runtime capability manifest and
  lifecycle smoke, so the remaining split blockers are release/test/capture
  ownership rather than an undocumented migration shape.
- Split-target conformance consumption now verifies graduation state instead of
  only split-target presence. The generic consumer supports
  `--expect-split-target-status`, `--expect-split-target-blocker`, and
  `--expect-split-target-proof`; the parity harness runs
  `scripts/run-split-target-conformance-consumer-smoke.ps1`; and EveFlutter /
  EveUnity consumers can now prove that the targets remain incubating for named
  blockers while their current split-readiness proofs stay passed.
- Runtime owner conformance consumption now verifies runtime target health
  instead of only runtime presence. The generic consumer supports
  `--expect-runtime-status`, `--expect-runtime-feature`,
  `--expect-runtime-command-schema`, and `--expect-runtime-capture-status`; the
  export carries top-level `captureStatus`; and the parity harness runs a
  runtime-owner smoke that proves active Flutter/Unity/web targets while keeping
  Fensalir Direct2D explicitly demoted as `external-adapter-spike` with missing
  capture.
- Provider owner conformance consumption now verifies the interactive-world
  contract instead of only provider presence. The generic conformance consumer
  supports `--expect-provider-surface`, `--expect-provider-surface-kind`,
  `--expect-provider-command`, and `--expect-provider-receipt-state`; the
  export now carries provider receipt states and surface-kind claims; and
  Aetheria's consumer smoke asserts the daemon game/editor surfaces,
  interactive world surface roles, daemon command boundary, and
  accepted/reconciled receipts from the exported provider pack.
- Plugin owner conformance consumption now has a smoke runner at
  `scripts/run-plugin-owner-conformance-consumer-smoke.ps1`. The generic
  conformance consumer can assert plugin ABI operations and capabilities with
  `--expect-plugin-operation` and `--expect-plugin-capability`, and the export
  now carries plugin manifest paths, advertisement paths, split targets,
  graduation triggers, and optional plugin dependencies. Sai and Norn can prove
  the plugin contract from the conformance export without reading Eve's parity
  manifest.
- EveUnity now has a split lifecycle smoke at
  `scripts/run-eveunity-lifecycle-smoke.ps1`. It validates the existing
  `packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json`
  lifecycle claims directly instead of duplicating them, checks evidence paths,
  and runs the Aetheria Unity package consumer-build smoke. `-RunUnityEditMode`
  is available for the heavier Unity batchmode path. EveUnity remains
  incubating until tagged UPM release, batchmode runner ownership, and capture
  artifacts live under the `EveUnity` repo.
- EveFlutter now has explicit lifecycle incubation evidence at
  `flutter/eve_parity/eveflutter-lifecycle.json` and a smoke runner at
  `scripts/run-eveflutter-lifecycle-smoke.ps1`. The smoke validates the
  lifecycle document, checks release/test/capture evidence paths, runs Dart
  analysis from the bundled SDK, and consumes the exported conformance pack from
  inside `flutter/eve_parity`. The split-readiness blocker is now narrower:
  tagged release, test runner ownership, and capture runner ownership must move
  to `EveFlutter`, rather than pretending the lifecycle shape is still unknown.
- EveFlutter now has a provider-catalog picker primitive. `EveProviderCatalog`
  parses conformance-export provider entries, including Sai/Norn/TeX plugin
  requirements, and `EveProviderPicker` selects those provider ids without
  reading web fixture paths. The Flutter smoke test proves provider selection
  from an export-shaped provider list, so the split-readiness report records the
  provider-picker proof as passed while leaving release/capture lifecycle
  ownership as the remaining EveFlutter blocker.
- EveFlutter now has a conformance consumer smoke at
  `scripts/run-eveflutter-conformance-consumer-smoke.ps1`. It runs from
  `flutter/eve_parity`, consumes the exported conformance pack, and asserts the
  runtime pack, Sai provider fixture, Flutter runtimes, and `EveFlutter` split
  target without reading Eve's parity manifest. The split-readiness report now
  records that as a passed proof instead of leaving it as a permanent pending
  blocker.
- Fensalir now has a recorded runtime-pack
  `gamecult.eve.surface.v1` adapter fixture at
  `web/fixtures/fensalir-direct2d-surface.json`. The browser local catalog uses
  that contract-shaped surface instead of the older dashboard-state sketch, and
  the parity harness validates embedded-slot preservation, command descriptors,
  runtime authority witnesses, and style tokens. Direct2D capture and
  runtime-owned command smoke remain the activation blockers.
- UIKit and Kotlin device-edge runtimes now declare unsupported Sai/Norn/TeX
  plugin projection explicitly. They remain generic embedded-document and
  device-edge proofs; plugin projection authority belongs to EveFlutter,
  EveUnity, or future runtime-specific projection adapters instead of being
  reported as unexplained active capability gaps.
- The web reference no longer hardcodes the local provider list in
  `web/surface.js`. It loads `web/local-provider-catalog.json`, then opens
  advertisement-backed entries for Aetheria, Repixelizer, and Sai through the
  same `loadProviderAdvertisement` path used by the provider picker. Fixture-only
  surfaces remain explicit local catalog entries until they gain provider
  advertisements or move into their owner packs.
- Provider advertisements can now name sidecar plugin requirements per surface
  with `surfaces[].requiresPlugins[]`. The parity harness validates those
  requirements against known plugin manifests, exports them in the conformance
  provider list, and reports missing plugins or capabilities as provider
  capability gaps. The Sai VN fixture now has an advertisement-shaped provider
  entry for `gamecult.home.vn`, so Sai/Norn/TeX requirements sit at the
  provider/plugin boundary instead of hiding only in fixture metadata.
- The conformance runtime pack now exports `runtimeTargets` in
  `artifacts/conformance/latest/packs/runtime.json`. Runtime repos can consume
  runtime status, feature/plugin claims, command schema, lifecycle, capture
  status, capability manifest path, and missing evidence without depending on
  Eve's parity manifest layout.
- Sai, Norn, and TeX plugin ABI fixtures now cover `lower` and `measure` in
  addition to `describe`, `validate`, `project`, and `apply`. Eve validates the
  operation shape, preserved component kinds, measurement outputs, and provider
  authority flag without importing plugin internals or deciding plugin
  semantics.
- The web reference now publishes a runtime capability manifest at
  `web/eve-runtime-capability.json`, and the parity harness validates it through
  the same runtime capability path as Unity. Web remains Eve's behavior oracle,
  not an EveWeb split target, unless it gains independent deployment lifecycle.
  Its manifest explicitly claims provider advertisement consumption,
  embedded-document lowering, state bindings, style tokens, authority witnesses,
  plugin projection support, command intent emission, and Chrome headless
  capture evidence.
- Unity UI Toolkit now declares runtime lifecycle evidence in
  `packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json`. The
  parity harness validates release, test, and capture lifecycle claims against
  `tools/parity/parity-manifest.json`, checks declared evidence paths, and
  exports lifecycle status through the conformance index. Current proof covers
  incubating UPM package identity, package EditMode tests, Aetheria
  consumer-build smoke, and an Eve-owned batchmode EditMode run through the
  Aetheria Unity project; tagged EveUnity release, moving the batchmode runner
  into EveUnity, and editor or batchmode capture remain explicit split
  blockers.
- Aetheria now has repeatable Unity EditMode evidence for the Eve UI Toolkit
  runtime. `scripts/run-aetheria-unity-editmode-tests.ps1` temporarily adds
  `org.gamecult.eve.unity-uitoolkit` to Aetheria's Unity `testables`, runs
  `GameCult.Eve.UnityUIToolkit.Tests` in Unity batchmode, writes XML and log
  artifacts under `artifacts/aetheria-unity-editmode`, and restores
  `Packages/manifest.json` before returning. The Brokkr/CultMesh DLL references
  in the Unity test asmdef are Unity package assembly plumbing: CultLib already
  owns the .NET/NuGet dependency story. EveUnity's split blocker is proving how
  the Unity package resolves those assemblies after it leaves Eve incubation,
  not inventing a dependency system for CultLib. This proves the incubating test
  lifecycle; it does not make Eve own Unity's final runtime lifecycle.
- Aetheria now has repeatable Unity package consumer-build evidence for the
  Eve UI Toolkit runtime. `scripts/run-aetheria-unity-package-smoke.ps1`
  verifies Aetheria's Unity `Packages/manifest.json` consumes Eve's surface and
  UI Toolkit packages by file reference, checks the generated
  `GameCult.Eve.UnityUIToolkit.csproj` includes all current runtime files, and
  builds the package through Aetheria's Unity-generated project.
- Unity UI Toolkit now has a first-party `norn.graph` projection-adapter proof
  for `embed.norn`. `NornGraphUiToolkitProjectionAdapter` owns the native
  embedded graph shell and graph command emission path, while the Norn sidecar
  plugin keeps graph layout and graph semantics. EveUnity split-readiness is now
  blocked on runtime-owned release, test, and capture lifecycle evidence rather
  than missing Sai/Norn projection support.
- Unity UI Toolkit now has a first-party `sai.vn` projection-adapter proof. The
  runtime owns `IEveUiToolkitPluginProjectionAdapter`, registers
  `SaiVisualNovelUiToolkitProjectionAdapter` through
  `EveUiToolkitSurfaceOptions`, and declares support for `vn.stage`,
  `story.choose`, `story.continue`, and `story.jump` in its runtime capability
  manifest. Sai still owns story state and command semantics; Unity only lowers
  the visual stage/dialogue/action surface and emits Eve command requests.
- Unity UI Toolkit now publishes a runtime-owned capability manifest at
  `packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json`. The
  parity harness validates that manifest against
  `gamecult.eve.runtime_capability.v1`, cross-checks supported features,
  unsupported Sai/Norn/TeX plugin declarations, command transport schema, and
  incubation metadata, then exports the manifest path and validation errors
  through the conformance report.
- Aetheria now consumes the exported conformance pack from its own working
  directory through `scripts/run-aetheria-conformance-consumer-smoke.ps1`. The
  smoke asserts the provider pack, `aetheria-world` fixture, `aetheria`
  provider entry, and `aetheria-world-command-replay` scenario without reading
  Eve's parity manifest or dirtying the Aetheria worktree.
- The Aetheria consumer smoke now also asserts frontend extraction boundaries:
  web and Unity UI Toolkit are covered generic lowerings, Unity scene remains a
  typed EveUnity gap, and the observed Aetheria Electron shell/client paths are
  split-handoff evidence to replace with a provider-agnostic EveElectron body.
- The parity harness now runs a conformance consumer smoke against a copied
  `artifacts/conformance/latest` layout, proving the export can be consumed
  through `index.json` and `packs/*.json` without reading Eve's parity manifest.
- The parity harness now emits an `EveConformance`-shaped export under
  `artifacts/conformance/latest`, with a top-level index and per-pack JSON
  files for core, plugin, provider, and runtime consumers.
- Unity's plugin projection capability gap is now explicitly demoted. The UI
  Toolkit runtime owns generic projection and command requests, while Sai, Norn,
  and TeX semantics remain sidecar-plugin responsibilities. Unity only adds
  projection adapters for capabilities a plugin advertises through Eve.
- Flutter and Unity now have runtime command-transport smoke evidence in the
  parity report. Flutter emits `gamecult.eve.command.v1` intents from lowered
  controls, and Unity command requests now carry the same command schema.
- Aetheria now has a provider scenario replay fixture advertised through its
  provider advertisement. The parity harness validates advertised surfaces,
  command boundary consumption, command intents, and provider-owned receipt
  states without importing Aetheria internals into Eve.
- Aetheria's provider scenario now covers both `aetheria.daemon.game` and
  `aetheria.daemon.editor` as provider-owned interactive world surfaces. The
  Aetheria consumer smoke asserts editor ownership and the pending TUI lowering
  gap from the exported contract instead of letting editor support hide behind
  the game-surface scenario.
- The surface contract now states nested Norn and TeX placement as optional
  composition, not Sai custody. The plugin-owner consumer can assert
  provider-plugin requirement availability, so `sai.vn` remains required while
  `norn.graph` and `tex.math` stay optional nested sidecar plugins.
- Sai, Norn, and TeX now have plugin ABI fixtures for describe, validate,
  project, lower, measure, and apply behavior. The parity harness validates
  those fixtures against plugin manifests, so Eve proves the ABI shape without
  owning plugin semantics.
- Split-readiness reporting now exists for `EveFlutter` and `EveUnity`. The
  parity report lists member runtime health, required plugin capability claims,
  pending proofs, and blockers before either repo can graduate out of Eve
  incubation.
- Direct2D is now recorded as an external Fensalir adapter spike, not an active
  Eve runtime. Activation requires recorded `gamecult.eve.surface.v1` fixture
  replay, command emission through the advertised boundary, and Direct2D frame
  capture evidence from Fensalir.
- Fixture conformance metadata now lives beside each fixture and is validated by
  the parity harness, so the corpus can move toward `EveConformance` without
  relying only on Eve's local manifest layout.
- The browser reference now has an authority/staleness witness fixture. The
  parity report verifies visible `fresh`, `accepted`, `stale`, `missing`,
  `pending`, `denied`, `predicted`, and `reconciled` states, with provider and
  renderer ownership kept separate.
- Command descriptor validation now runs for strict fixtures. Sai proves
  `story.*`/`style.patch`; Aetheria proves the daemon command boundary; the web
  lowerer resolves authored `action.command` through the shared Eve command
  intent path.
- Provider advertisement validation now runs in the parity harness.
- Repixelizer and Aetheria provider advertisements are checked against
  `gamecult.eve.provider_advertisement.v1`.
- Aetheria has a minimal provider-owned interactive world fixture in Eve so the
  browser oracle can prove the surface path without owning Aetheria truth.

## Stop Conditions

Stop adding features and update the map when:

- a runtime needs product knowledge to render a generic surface;
- a plugin fixture needs provider state to prove plugin behavior;
- a provider fixture becomes necessary for core Eve tests;
- a compatibility route becomes easier to use than a provider advertisement;
- a generated report says "active" while listing missing source symbols,
  features, metadata, or plugin support;
- a split target exists but the owner, inputs, outputs, and release lifecycle
  are still awkward to explain.

If the sentence "X owns Y so that Z remains true" cannot be written cleanly, the
migration step is not ready. The machine may still be useful. It is not yet
coherent.
