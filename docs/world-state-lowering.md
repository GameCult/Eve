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

### Entity SoA Views

`gamecult.eve.entity_soa_view.v1` is the portable descriptor for hot entity
presentation state. A `world.scene2d` or `world.scene3d` component points to it
with `entityViewPointerId`; `entityViewSchema` names the schema. The surface
does not duplicate entity transforms as retained child components.

World scenes may also publish generic presentation intent derived from provider
state:

- `cameraRig` names the portable composition algorithm. For
  `planar.top-down-follow.v1`, the play plane is XZ and the perspective camera
  looks along negative Y;
- `cameraTargetEntityId` is the sole entity the active camera rig frames. A
  lowerer must not add combat selection, renderer bounds, or another implicit
  subject to that framing set;
- `cameraDistance`, `cameraVerticalFieldOfViewDegrees`,
  `cameraTargetScreenX`, `cameraTargetScreenY`, and `cameraPositionDamping`
  define the provider-owned lens and composition. Screen coordinates are
  normalized viewport coordinates with a bottom-left origin; damping uses the
  exponential response `1-exp(-damping*deltaTime)`;
- `cameraNearClipPlane` and `cameraFarClipPlane` complete the perspective lens
  contract. A lowerer must not substitute engine defaults that cull advertised
  world content;
- `ambientLightColor` and `ambientLightIntensity` define portable ambient
  illumination when the selected camera rig supports it;
- `skyboxAssetRef` optionally selects a provider-advertised material and
  `reflectionAssetRef` optionally selects a provider-advertised cubemap.
  Native Unity variants must resolve those exact references as `Material` and
  `Cubemap` respectively; an omitted reference requests no override for that
  part of the environment. `reflectionIntensity` scales the latter. Negative
  intensities clamp to zero; non-finite environment values invalidate the
  presentation contract. The active camera rig owns one
  reversible environment lease over the runtime's global lighting state and
  camera clear policy. A lowerer must reject a missing, incompatible, or
  unsupported advertised asset instead of substituting product-specific art;
- `lookCommand` accepts a controlled entity id and a unit `directionX`,
  `directionY`, `directionZ` vector. The provider remains the owner of the
  accepted look direction; runtimes only lower local pointing input into this
  intent. `lookModel` names the portable input geometry; `planar-yaw.v1`
  rotates on the XZ play plane. `lookSensitivityRadians` optionally maps one native pointer-delta
  unit to yaw radians, including the provider-authored axis sign;
- `subjectVisible` controls presentation of `playerEntityId` without deleting
  that authoritative entity from the world view;
- `movementEnabled` controls whether the runtime emits movement intents;
- `presentationMode` names a portable state such as `world` or `docked` for
  runtime-quality choices that do not alter provider truth.

These values are presentation instructions, not gameplay state. A provider may
derive them from docking, possession, spectating, incapacitation, cutscenes, or
another domain rule. A lowerer must not import the provider's private document
types to reconstruct them, and it must not treat hiding or camera retargeting as
removal of the underlying entity.

A Unity scene has one active world environment owner. A lowerer that mutates
scene-global render settings must restore the previous environment when its
world disconnects, its rig changes, or the lowering component is disabled or
destroyed.

An optional `aim.presentation` child binds presentation to that authoritative
body direction without duplicating it. `controlledEntityId` identifies the
body, `convergenceTargetEntityId` optionally names the selected body whose
distance sets convergence, and `minimumConvergenceDistance` supplies the lower
bound when there is no farther target. `viewDotRole` and `viewDotRadius`
describe the portable marker. A lowerer must not steer weapons, tractors, or
the body transform from the marker; it renders the direction committed by the
provider's body publication.

An optional `beam.presentation` child binds a continuous provider-authored
effect to an entity in the current SoA generation. It carries:

- `sourceEntityId`: the authoritative presented body that owns the effect;
- `directionMode`: the portable orientation rule. `source-forward.v1` follows
  the source body's published forward axis and never writes that transform;
- `assetRole`: a semantic provider-manifest role used to resolve native art;
- `power`: the provider-owned non-negative emission/intensity value;
- `activationThreshold`: the value below which emission is zero while the
  retained effect may finish its local particles;
- `radius` and `maximumDistance`: portable shape facts for lowerers that do not
  consume the provider's native effect asset;
- `renderChannel`: the semantic presentation channel, such as
  `world.effects`;
- `activationActionId`: an optional action from the advertised input
  capability that controls the effect. Generic clients may bind or invoke this
  action without knowing the provider's operation name.

Beam presentation is not a physics query. A lowerer must not raycast, apply
force, infer a hit/contact, collect an item, or emit a gameplay receipt from
the visual. Providers and their physics owner publish the state and contact
facts; runtimes only reconcile the effect against the current SoA transform.

The descriptor carries buffer locations, semantic columns, dirty ranges, and
render groups. CultMesh selects the buffer route: shared memory for co-located
runtimes, a native stream for remote runtimes, or another advertised backend.
Replacing the reactive descriptor publishes a new generation and lowerers apply
only its dirty ranges. A backend location is transport data, not provider
authority.

Stable composition, commands, and binding declarations may arrive in a
bootstrap snapshot. Live entity generations do not. UI values bind to reactive
typed documents named by state pointers. Versioned asset manifests are
bootstrap state and their content-addressed artifacts are cached.

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
to render both Starbridge RTS and ARPG views. Hermodr should carry provider
documents without interpreting plugin semantics; the browser fields adapter
should reconstruct the RTS view as part of the unspecialized Eve lowerer.
Electron should render the same surface as the player-facing Starbridge shell. Unity should become an ARPG
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
`EveUnitySceneProviderConnection` adds the live-source port shape:
`IEveUnitySceneProviderSurfaceSource` supplies current and updated snapshots,
while `IEveUnitySceneCommandSink` receives command envelopes.
`IEveUnitySceneProviderSurfaceDocumentSource`,
`EveUnitySceneProviderSurfaceDocument`, and
`EveUnitySceneProviderSurfaceDocumentSource` now make that snapshot source a
typed document-consumer boundary: a CultMesh/CultCache adapter can own surface
delivery and publish provider-authored documents, while EveUnity only converts
them into snapshots for the generic lowerer.
`EveUnityPlayableWorldLiveClient` composes that connection with the playable
world presenter: every provider snapshot is lowered into a presentation pass,
Unity input still emits provider-owned command intents rather than mutating
local world truth, and `IEveUnitySceneCommandReceiptSource` reports provider
receipts as derived command status. Pending receipts do not move the scene;
accepted or reconciled receipts only trigger a refresh from the provider surface
source, so the next presentation still comes from daemon-authored state.
`EveUnityPlayableWorldRuntime` is the generic runtime composition entry point:
it wires provider surface documents, provider asset manifest documents, command
sink, optional receipt source, asset manifest cache, presenter, and scene sink
into one Unity playable-world client without importing provider code. The
Aetheria provider bridge now implements the same receipt-source port: when the
daemon accepts a surface command envelope or routes a fallback Eve command, it
publishes an `EveUnitySceneCommandReceipt` through
`IEveUnitySceneCommandReceiptSource` so the Unity client observes provider
acceptance without mutating scene truth locally.
`EveUnityPlayableWorldPresenter` maps the provider-authored entity rows and
asset refs into scene operations through `IEveUnityPlayableWorldSceneSink` and
`IEveUnityPlayableWorldAssetResolver`, including removal of entities that
disappear from later provider snapshots. `EveUnityGameObjectPlayableWorldSceneSink`
is the first Unity-native implementation: it creates or updates generic
`GameObject` instances, applies transforms/radii, attaches an
`EveUnityPlayableWorldEntityMarker`, and resolves provider asset refs through an
`IEveUnityGameObjectAssetProvider` hook. `EveUnityPlayableWorldAssetManifest`
and `EveUnityManifestGameObjectAssetProvider` add the provider-manifest mapping
step: provider asset refs and entity kinds become Unity resource/prefab keys
through data rather than Aetheria code. `gamecult.eve.unity_playable_world_asset_manifest.v1`,
`IEveUnityPlayableWorldAssetManifestDocumentSource`, and
`EveUnityPlayableWorldAssetManifestDocumentSource` define the typed document
loading boundary for those Unity load keys. `IEveUnityPlayableWorldAssetManifestSource`
and `EveUnityPlayableWorldAssetManifestCache` key live manifest updates by the
`playableWorld.AssetManifest` pointer, so a CultMesh/CultCache source can update
Unity asset bindings without changing the lowerer. `EveUnityLivePlayableWorldAssetProvider`
connects that cache to the active world pointer for GameObject scenes. Aetheria-specific
names appear only as provider-authored data and command ids; the Unity client
code does not import Aetheria runtime types, prefab classes, or apply movement
locally.

This is not yet the final playable client. The Aetheria consumer bridge now
feeds surface documents, asset manifest documents, command submission, and
provider receipts into the generic Unity ports. The remaining cut is live
CultMesh/CultNet subscription ownership for those same ports and proof that
daemon receipts plus refreshed provider documents drive the next rendered Unity
frame rather than renderer-local state.

## Non-Goals

Eve does not own provider gameplay rules.

Eve does not require every renderer to reach the same visual sophistication.

Eve does not collapse every engine into one rendering backend.

Eve does not turn native runtime caches into provider truth.

Eve does define enough shared semantics that provider-authored world surfaces can
be reconstructed across runtimes without provider-specific renderer brains.
