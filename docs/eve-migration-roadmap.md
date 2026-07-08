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
  Fensalir/Direct2D, and future bodies own projection, build glue, plugin host
  adapters, capture, and runtime tests.
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

Exit criteria:

- Eve core knows plugin manifests and capability gaps, not plugin internals.
- Providers invoke plugins through the ABI object model.
- Runtimes declare plugin support through capability manifests.
- Unsupported required plugin capabilities appear as visible gaps.

## Phase 4: Graduate Runtime Bodies

Purpose: let runtime repos own native projection without losing conformance.

Work:

- EveFlutter: provider picker, command transport, plugin host, Android/iOS/desktop
  build flow, native capture, and parity reports.
- EveUnity: UPM package release, plugin host behavior, resolver-backed embedded
  documents, Unity test/capture lifecycle, and Aetheria consumption.
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

1. Add runtime command-transport smokes for Flutter and Unity so split targets
   can prove command emission through `gamecult.eve.command.v1`.

Recently cut:

- Aetheria now has a provider scenario replay fixture advertised through its
  provider advertisement. The parity harness validates advertised surfaces,
  command boundary consumption, command intents, and provider-owned receipt
  states without importing Aetheria internals into Eve.
- Sai, Norn, and TeX now have plugin ABI fixtures for describe, validate,
  project, and apply behavior. The parity harness validates those fixtures
  against plugin manifests, so Eve proves the ABI shape without owning plugin
  semantics.
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
