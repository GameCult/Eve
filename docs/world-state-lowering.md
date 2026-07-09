# Eve World-State Lowering

Date: 2026-07-07

Eve does not only lower interface widgets. Eve lowers authored surfaces that may
include UI, live state pointers, commands, assets, 2D fields, 3D fields,
entity/object rows, and native view descriptors. A provider may publish a
surface for a compact dashboard, a browser canvas, a native mobile view, a
desktop tool, a 2D tactical map, a 3D action-game scene, or a future room-scale
projection. Those are different lowering targets for one semantic contract.

## Authority

Provider owns:

- committed domain state;
- rules and accepted command effects;
- state pointers and document identities;
- authored surface semantics;
- assets and asset manifests;
- render-field documents and view descriptors when they describe provider
  state.

Eve owns:

- the portable surface contract;
- layout and interaction semantics;
- state-binding and operation-invocation semantics;
- modal/dropdown placement semantics;
- generic asset-reference lowering hooks;
- 2D and 3D scalar/vector/color field visualization primitives;
- native-view descriptor semantics;
- renderer parity expectations across runtimes.

Runtime lowerers own:

- native projection;
- input hardware capture;
- frame timing;
- local caches and native buffers;
- quality/performance choices that do not change provider meaning.

CultMesh owns:

- typed state delivery;
- subscriptions and replay;
- provenance;
- asset transport;
- operation routing.

No renderer gains provider authority because it can draw a provider surface.

## World Surfaces

A world surface is an Eve surface whose retained tree describes a view into
provider world state. It may contain normal UI controls, but it also carries
instructions for reconstructing a spatial presentation.

World surfaces should be able to describe:

- state pointers to daemon/provider-owned typed documents;
- high-performance SoA or native-view descriptors;
- object/entity render rows with transforms, labels, selection metadata, and
  operation affordances;
- 2D scalar fields, such as height, influence, heat, pressure, or gravity;
- 2D vector/color fields, such as tint, fog, flow, current, or velocity;
- 3D scalar fields, such as density, temperature, or occupancy;
- 3D vector fields, such as flow, force, wind, or steering;
- field visualizers, such as isolines, shaded height, probes, volume slices,
  particles, streamlines, glyphs, or contour bands;
- render splat buffers and accumulation rules;
- asset refs for sprites, icons, meshes, materials, shaders, generated textures,
  and media;
- presentation-quality hints and level-of-detail policy.

The renderer chooses the best native projection it can support. It must not
invent provider semantics to compensate for missing contract information.

Provider advertisements attach the reusable boundary to world surfaces through
`surfaces[].worldInteraction`. That block names:

- `projectionKind`: the generic world presentation role, not a game-specific
  rule name;
- `stateSchemas`: provider-owned state documents that describe the world;
- `commandBoundary`: the provider command route that receives interaction
  intents;
- `receiptSchema`: the provider-owned receipt document schema;
- `loweringTargets`: runtime families expected to consume the surface;
- `ownership`: the plain-language authority rule for state, assets, command
  acceptance, and receipts.

Conformance scenarios can require `worldSurfaces[]` entries and the parity
harness checks them against the advertisement. This makes an interactive world
surface portable without giving Eve or a runtime private Aetheria knowledge.

Runtime capability manifests answer the other half with
`worldSurfaceLowering[]`. Each claim names a `targetId`, supported surface
kinds, projection kinds, support level, evidence paths, and the ownership rule
that the runtime lowers provider state without becoming provider truth. If a
provider advertises a lowering target and no runtime claims it, conformance
emits a capability gap instead of quietly pretending the engine exists.

## Quality Tiers

A low-end or debugging renderer may lower a world surface into labels, simple
icons, flat shaded fields, and command lists.

A browser renderer may lower the same surface into Canvas, WebGL, DOM overlays,
or a mixed scene.

A Unity, Godot, Direct2D, Vulkan, Metal, or future native renderer may lower the
same surface into engine-native meshes, materials, particles, UI panels, input
affordances, and camera-relative overlays.

Those are quality tiers over one Eve surface. They are not separate provider
contracts and they are not permission for a runtime to carry private domain
logic.

## Aetheria Conformance Example

Aetheria is the current pressure case for this contract.

The Aetheria daemon should publish the game state, rules, generated level,
assets, operations, scalar/vector fields, object rows, and Eve surfaces needed
to render both Starbridge RTS and ARPG views. Hermodr should reconstruct the RTS
surface as an unspecialized browser/Eve lowerer. Electron should render the same
surface as the player-facing Starbridge shell. Unity should become an ARPG
lowerer over the same kind of daemon-authored surface, and Godot should become
the equivalent non-Unity ARPG conformance target.

Aetheria-specific examples:

- gravity is a 2D scalar field; isolines are one visualization, not the field;
- nebula tint is a 2D vector/color field accumulated from provider-authored
  splat rules;
- volumetric flow is a 3D vector field;
- planets, ships, stations, projectiles, labels, and command affordances are
  object/entity render rows with provider-advertised assets;
- icons, sprites, materials, meshes, and generated textures resolve through
  CultMesh CDN refs.

If a renderer must know the phrase "Aetheria gravity" to draw the field, Eve is
missing a generic scalar-field primitive or the provider surface is
underspecified. If a renderer must know "Aetheria planet" to draw a body, the
object row or asset contract is underspecified.

The incubating Aetheria fixture advertises `aetheria.daemon.game` as
`interactive-world` with `worldInteraction.projectionKind:
provider-authored-world-surface`, `commandBoundary: aetheria.daemon.commands`,
and `receiptSchema: aetheria.eve_command_acceptance_status.v1`. Web, Unity UI
Toolkit, Unity scene, Electron shell, and TUI lowerers are lowering targets;
Aetheria remains the owner of world state, assets, command acceptance, and
receipts.

The Unity scene lowerer now has a playable-world extraction and client-session
proof. The fixture carries a generic `world.scene3d` node with a daemon state
pointer, asset manifest ref, third-person input/camera profile,
movement/focus/target command names, `world.entity3d` rows, and a
`field.vector3d` volume field. The Unity scene runtime lowers that into
`playableWorld` projection evidence: entity ids, kinds, labels, positions,
radii, asset refs, controllability, and command affordances. The generic
`EveUnitySceneClientSession` consumes provider surface snapshots and emits
`gamecult.eve.command.v1` intents through the advertised command boundary.
Aetheria-specific names appear only as provider-authored data and command ids;
the Unity client code does not import Aetheria runtime types or apply movement
locally.

This is not yet the final playable client. The remaining cut is a live
CultMesh/CultNet provider subscription adapter feeding `EveUnitySceneClientSession`,
Unity player instantiation of the projected world, and proof that daemon
receipts drive the next frame rather than renderer-local state.

## Non-Goals

Eve does not own provider gameplay rules.

Eve does not require every renderer to reach the same visual sophistication.

Eve does not collapse every engine into one rendering backend.

Eve does not turn native runtime caches into provider truth.

Eve does define enough shared semantics that provider-authored world surfaces can
be reconstructed across runtimes without provider-specific renderer brains.
