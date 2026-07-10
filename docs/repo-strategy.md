# Eve Repository Strategy

Eve is a kernel, not a warehouse.

## Ownership

- `Eve` owns contracts, CultUI, the browser reference oracle, and minimal core
  fixtures.
- `EveConformance` owns the parity matrix, runner, exported packs, witnesses,
  and CI orchestration.
- `EvePlugins` incubates reusable first-party semantic sidecars; Sai, Norn, and
  other domain owners take stable semantics into their own repos.
- Runtime repos own native lowering, platform builds, plugin transport, tests,
  and captures.
- Provider repos own state, authored surfaces, assets, commands, receipts, and
  product scenarios.

Repositories communicate through schemas, advertisements, CultNet/CultMesh
documents, packages, and conformance exports. A sibling checkout may support
development, but it is never an authority boundary.

## Graduation

- Split a runtime when it has an independent build/deploy lifecycle.
- Split a plugin when it owns domain semantics and conformance fixtures.
- Move a fixture when it contains product-specific truth.
- Publish a package when consumers should no longer depend on source layout.

The useful friction is deliberate: if a generic runtime needs an Aetheria
internal, either Eve lacks a generic contract or Aetheria is leaking authority.
