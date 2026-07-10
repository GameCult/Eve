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
- EveUnity publishes immutable `0.1.0` Git package tags for surface, scene, and
  UI Toolkit. Its release-only consumer resolves those tags plus CultLib's
  assembled Unity package and passes 26 Unity EditMode tests without sibling
  package paths. Aetheria pins the same released sources.
- The same released-package consumer cold-starts from Aetheria's CultMesh
  rendezvous endpoint with no configured provider or surface ID, discovers the
  daemon's `interactive-world`, loads provider-owned assets, and reconciles
  movement, targeting, and action receipts without importing Aetheria code.
- EveUnity can start from one CultMesh rendezvous endpoint, discover a Verse,
  select an advertised `interactive-world` surface, and connect without
  configured Aetheria provider or surface identifiers. The Aetheria daemon
  publishes its Verse catalog on the same client endpoint.
- CultLib emits a verified NuGet dependency closure for `GameCult.Mesh` and a
  clean package-reference consumer, while Unity consumes the corresponding
  `org.gamecult.cultlib` UPM assembly closure.
- CultLib publishes transport-neutral `cultnet.operation_request.v0` and
  `cultnet.operation_response.v0` envelopes in TypeScript, C#, and Rust. These
  carry Eve plugin ABI documents without moving plugin semantics into CultLib.
- EveElectron owns its shell, security lifecycle, captures, and runtime witness.
- EveElectron owns its Electron test dependency and consumes Aetheria capture
  inputs from Aetheria's provider pack; it no longer borrows Aetheria's
  `node_modules` or Eve-local copies of product fixtures.
- EveElectron owns `EveCultMeshProviderClient`, the generic live RUDP provider
  transport. It starts from an Odin-resolved peer and advertisement record,
  follows provider-advertised surface/command/receipt/document references, and
  does not compile provider IDs, schemas, or record keys into the runtime.
- Aetheria's Electron client now delegates live provider advertisement, surface,
  embedded-document, command invocation, and receipt reads to that EveElectron transport. Its cold
  daemon witness proves the shared CultNet connection contract, portable Eve
  MessagePack documents, provider acceptance, and deterministic receipt records.
  The superseded Aetheria surface/provider readers, command serializer, and
  generated Eve IPC handler authority have been deleted. `AetheriaCultMeshClient`
  no longer exposes any Eve-facing method.
- EveElectron owns the standalone preload entry and generic browser renderer
  bootstrap. Aetheria consumes those runtime bodies directly; its generated
  renderer API contract, product preload, preload copy script, and product IPC
  registration are deleted.
- EveElectron owns the live main-process provider host: secure window creation,
  provider client construction, Eve IPC and receipt handling, provider readiness,
  renderer loading, and cleanup. Aetheria delegates that lifecycle and retains
  only daemon development launch, provider target configuration, its live smoke
  scenario, and provider-owned asset records.
- EveElectron owns generic CultMesh asset reads and the `eve-asset` protocol.
  The Aetheria renderer and main process contain no product asset transport;
  the cold-daemon witness decodes a provider-owned world image through the
  generic runtime path.
- EveFlutter owns the generic Flutter clients and platform lifecycle.
- Sai and Norn publish independent sidecar plugins. Sai serves retained Ink
  sessions and Norn serves graph projection and measurement through CultNet
  RUDP operation envelopes. A Sai surface may request
  nested Norn or TeX capabilities when those plugins are available.
- EvePlugins owns the TeX sidecar and KaTeX-backed semantic witness.
- The TeX owner sidecar serves its Eve ABI over CultNet RUDP operation
  envelopes; its stdio protocol is retained only as a local debug adapter.
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
- Tag EveFlutter releases and remove remaining incubation claims.

### Generic Game Lowering

- Route browser and remaining runtimes through Odin's aggregated provider
  discovery rather than local catalogs or sibling paths; Unity's direct
  CultMesh Verse discovery is the working reference.
- Expand world lowering only through generic surface contracts: entities,
  transforms, animation state, collision/navigation intent, cameras, effects,
  interaction prompts, and command boundaries.
- Keep simulation, AI, inventory, combat resolution, and authored world truth in
  Aetheria.

### Plugin Architecture

- Publish the verified CultLib NuGet and Unity package artifacts from tagged
  releases and consume released versions in runtime CI.
- Publish the shared TypeScript and Rust CultNet operation hosts from tagged
  CultLib releases. Sai, Norn, and TeX prove the same operation envelope across
  both language implementations; stdio remains a local diagnostic adapter.
- Graduate remaining graph fixture ownership fully to Norn once no Eve fixture
  is its semantic owner. Sai already owns VN/Ink execution and its live witness.
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
