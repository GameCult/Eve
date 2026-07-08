# Eve Repo Strategy

Eve is a kernel, not a forever warehouse.

The boundary rule is deliberately blunt: Eve core owns contracts. Plugins own
semantics. Runtime repos own native projection. Provider repos own live truth.

## Kernel Scope

`E:\Projects\Eve` may own:

- `gamecult.eve.surface.v1`, command descriptors, binding descriptors, embedded
  document slots, provider advertisements, and plugin advertisements;
- CultUI DSL syntax, compiler behavior, and style contract;
- the browser reference lowerer while it remains the behavior oracle;
- conformance harness incubation and minimal core fixtures;
- first-party runtime or plugin proofs only while their contracts are still
  forming.

Anything else is guilty until it can explain why it protects a core invariant.

## Graduation Rules

- A runtime splits when it has its own build/deploy lifecycle, platform SDK pain,
  plugin projection behavior, capture pipeline, or release cadence.
- A plugin splits when it owns domain semantics, fixtures, and conformance cases.
- A product demo splits when it carries product-specific state, assets, flows,
  receipts, or deployment authority.
- Conformance splits when runtimes/plugins need to consume it without depending
  on Eve source layout.

## Target Repos

- `Eve`: kernel contracts, specs, browser reference, and conformance incubation.
- `EvePlugins`: first-party reusable plugins while young, such as fields,
  world 2D/3D, and TeX.
- `Sai`: owner for the VN/Ink plugin once `sai.vn` graduates.
- `Norn`: owner for graph plugin semantics once `norn.graph` graduates.
- `EveUnity`, `EveGodot`, `EveFlutter`, `EveElectron`, and similar runtime
  repos: native projection, platform build glue, plugin projection adapters, captures, and
  runtime tests.
- `EveConformance`: fixture corpus, parity runner, capability matrix,
  screenshot/report artifacts, plugin packs, and CI orchestration once the
  harness stops thrashing.
- Provider repos such as `Aetheria`: daemon state, authored surfaces, assets,
  provider fixtures, receipts, and real app scenarios.

## Incubation Metadata

`tools/parity/parity-manifest.json` is the current ownership ledger. Fixtures
declare a conformance pack. Plugins declare owner repo, split target, capability
claim, required fixtures, and graduation trigger. Runtimes declare owner repo,
repo role, split target, supported features, and graduation trigger.

The parity harness treats missing ownership metadata as a failure mode. That is
intentional. A renderer or plugin that cannot name its owner is not mature; it
is just code sharing a worktree.

## Forbidden Shortcut

Provider and plugin advertisements are the boundary between repos. A renderer
must not import provider or plugin internals because they happen to be nearby.
If a runtime needs an Aetheria concept, either Eve lacks a generic primitive or
Aetheria is leaking. The friction is useful. Keep it.
