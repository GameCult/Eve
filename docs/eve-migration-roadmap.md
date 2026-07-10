# Eve Migration Roadmap

## Objective

Eve is the contract kernel for a runtime-independent meta-game engine. A game
daemon publishes typed surfaces, commands, state bindings, assets, and plugin
requirements. Generic runtime clients lower those documents without knowing
the game. Semantic plugins run as sidecar daemons behind the Eve plugin ABI and
remain independent of rendering engines.

The proving scenario is Aetheria: its daemon publishes a 3D ARPG world surface
that a generic EveUnity client lowers into a playable game without importing
Aetheria code or assets as runtime authority.

## Authority Map

| Owner | Authority |
| --- | --- |
| Eve | Surface, command, provider, plugin, runtime, and receipt contracts; CultUI DSL; browser reference lowerer; minimal core fixtures |
| EveConformance | Fixture matrix, parity runner, capability ledger, witness attachment, portable exports, and cross-repo CI orchestration |
| EvePlugins / plugin owner repos | Runtime-independent semantic sidecars, domain fixtures, and plugin witnesses |
| EveUnity, EveElectron, EveFlutter, future runtime repos | Native projection, plugin transport, platform lifecycle, captures, and runtime tests |
| Aetheria and other providers | Live state, authored surfaces, assets, command handling, receipts, and product scenarios |

Boundary rule: Eve owns contracts. Plugins own semantics. Runtimes own native
projection. Providers own live truth. EveConformance owns proof.

No runtime may import provider or plugin internals. Provider/plugin
advertisements and typed command/receipt documents are the boundary.

## Live Data Flow

1. A provider daemon advertises surfaces, schemas, commands, assets, and plugin
   requirements through CultMesh/CultNet documents.
2. A generic runtime selects a surface and resolves required plugin
   advertisements.
3. Plugin operations execute through the runtime-independent sidecar ABI.
4. The runtime lowers the resulting Eve surface into native presentation and
   emits typed command invocations.
5. The provider remains the sole writer of game state and returns typed
   receipts/state updates.
6. EveConformance joins owner manifests and witnesses into a portable report;
   it never becomes provider or runtime truth.

## Completed Migration

- EveUnity owns the Unity scene and UI Toolkit packages. Aetheria consumes those
  packages directly.
- The generic EveUnity playable-world client lowers the separately running
  Aetheria daemon's 3D ARPG world, resolves provider-owned assets, and exercises
  movement, targeting, and fire command receipts.
- EveUnity's clean `TestProject` owns generic scene and UI Toolkit package
  verification; ordinary runtime tests no longer open or mutate Aetheria.
- CultLib emits a verified NuGet dependency closure for `GameCult.Mesh` and a
  clean package-reference consumer, while Unity consumes the corresponding
  `org.gamecult.cultlib` UPM assembly closure.
- EveElectron owns its shell, security lifecycle, captures, and runtime witness.
- EveFlutter owns the generic Flutter clients and platform lifecycle.
- Sai and Norn publish independent sidecar plugins. A Sai surface may request
  nested Norn or TeX capabilities when those plugins are available.
- EvePlugins owns the TeX sidecar and KaTeX-backed semantic witness.
- Aetheria owns its provider advertisement, world surface, scenario, asset
  manifest, and conformance pack.
- EveConformance owns the parity manifest, runner, fixture exporter, witness
  attachment, export consumer, and report artifacts.
- Eve retains the browser reference as the behavior oracle and a minimal generic
  interactive-world fixture.

## Remaining Work

### Runtime Graduation

- Extract EveTui when its process lifecycle and release surface are stable.
- Move Android Kotlin and iOS UIKit lowerers into runtime owner repos or retire
  them when Flutter is the intended native owner.
- Tag and publish EveUnity UPM packages; prove installation from a released
  package rather than sibling source paths.
- Tag EveFlutter releases and remove remaining incubation claims.

### Generic Game Lowering

- Replace local sibling-path discovery with CultMesh discovery for Aetheria,
  plugins, schemas, and assets.
- Prove cold-start Unity play from published packages plus daemon
  advertisements, with no Aetheria checkout available to the client.
- Expand world lowering only through generic surface contracts: entities,
  transforms, animation state, collision/navigation intent, cameras, effects,
  interaction prompts, and command boundaries.
- Keep simulation, AI, inventory, combat resolution, and authored world truth in
  Aetheria.

### Plugin Architecture

- Publish the verified CultLib NuGet and Unity package artifacts from tagged
  releases and consume released versions in runtime CI.
- Replace development `stdio-ndjson` transport where appropriate with the
  published CultNet/CultMesh sidecar transport while preserving the same plugin
  ABI operations.
- Graduate graph semantics fully to Norn and VN/Ink semantics fully to Sai once
  no Eve fixture is their semantic owner.
- Keep nested plugin availability explicit and non-transitive: Sai does not own
  Norn or TeX.

### Conformance

- Move remaining fixture metadata that describes product/plugin semantics to
  its owner pack; Eve keeps only minimal contract fixtures.
- Run EveConformance CI against released runtime/plugin artifacts, not only
  sibling development checkouts.
- Publish immutable conformance exports and capability matrices per release.
- Remove obsolete split-handoff schemas and checks after every named owner repo
  has a released consumer path.

## Graduation Criteria

- A runtime splits when it has its own build/deploy lifecycle or platform SDK
  pressure.
- A plugin splits when it owns domain semantics, fixtures, and conformance cases.
- A product fixture splits when it carries product state, assets, flows, or
  receipts.
- Conformance remains independent when runtimes/plugins consume its export
  without depending on Eve's checkout layout.

## Acceptance

The migration is complete when:

1. A clean generic EveUnity client installed from published packages discovers
   Aetheria through the Verse and plays its 3D world without Aetheria code.
2. Sai, Norn, and TeX execute as independent runtime-agnostic sidecars and can be
   composed through advertisements.
3. Browser, Unity, Electron, Flutter, and TUI/native owners consume the same
   provider contracts and report honest capability gaps.
4. Eve answers "what is the contract?" without carrying product state, plugin
   semantics, platform build bodies, or conformance orchestration.
5. EveConformance can verify released providers, plugins, and runtimes from
   public artifacts and typed witnesses.

## Verification

```powershell
node --test web/eve-dsl.test.mjs
npm --prefix packages/eve-browser-lowering test
powershell -ExecutionPolicy Bypass -File .\scripts\run-parity-harness.ps1
```

`run-parity-harness.ps1` is an Eve compatibility entry point. The matrix and
runner it invokes are owned by the sibling EveConformance repository.
