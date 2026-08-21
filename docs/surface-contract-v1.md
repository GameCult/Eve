# Eve Surface Contract v1

`gamecult.eve.surface.v1` is the shared CultMesh UI document for Eve surfaces.
It is the retained tree that CultUI emits and Eve runtimes lower. Renderers may
be web, UIKit, Android native views, Flutter, Windows Direct2D/DirectWrite, or
another local client, but the semantic surface is the same retained tree.

## Authority

- Provider owns truth, accepted state, command effects, and style token values.
- Eve owns the surface document contract, command envelope, renderer parity, and
  local input/sensor publication.
- CultMesh owns delivery, replay, provenance, and subscription state.
- Renderers own native projection only. They do not invent provider semantics.

The schema member names are also the canonical MessagePack wire keys. Providers
publish map-shaped documents which any runtime can decode into the schema shape
without a provider-specific adapter. The former C# indexed-array encoding is a
read-only migration format; it is not a second public contract.

## Surface Document

Required top-level fields:

- `type`: `surface-state`
- `schema`: `gamecult.eve.surface.v1`
- `providerId`: stable provider id.
- `providerKind`: provider family, for example `sai.visual_novel`.
- `title`: human label.
- `version`: provider-owned monotonically increasing version.
- `updatedAt`: provider timestamp.
- `surface.root`: retained CultUI component tree.
- `surface.styles`: synchronized style tokens and optional style controls.
- `commands`: command templates the provider accepts.

Providers that want Odin and other Eve clients to discover them should also
publish `gamecult.eve.provider_advertisement.v1`; see
[provider-advertisement-contract.md](./provider-advertisement-contract.md).

Compatibility fields:

- `nodes`: old graph/dashboard projection for legacy clients.
- `selectedNodeId`: old selection projection.

These fields are display projections. New renderers should prefer
`surface.root`.

## Eve DSL

CultUI is Eve's DSL for authoring `gamecult.eve.surface.v1` documents. It is
not a second runtime authority. A DSL compiler may lower cards, text, metrics,
lists, graphs, charts, formulas, and composites into `surface.root`, while
CultMesh still owns live state identity and providers still own accepted
commands.

The composition model learns from the old Unity CultUI without preserving its
construction accident. The useful part was resolver-backed standard elements
and ergonomic helpers for common UI structures, not vertical-first layout.
CultUI is now partition-first: surfaces divide named regions into relative or
absolute partitions, and common helpers lower into that explicit tree. The
authoring syntax is indentation-based; compiled surface documents remain the
renderer-facing contract. See [cultui-style-system.md](./cultui-style-system.md)
for the composition and styling design target.

Browser reference support starts in `web/eve-dsl.js` and the fixture
`web/fixtures/reactive-composition.eve`. The first binding primitives are:

- `var`: one live value surfaced as a reactive field.
- `collection`: event-shaped ordered values surfaced as lists or streams.
- `derive`: computed fields such as counts and latest events.
- `bind`: component props subscribe to a var, collection, or derived field.

The compiled document remains the contract renderers consume. Native clients do
not need to parse every authoring dialect immediately, but they must honor the
surface tree and binding semantics once the provider/CultMesh layer publishes
them.

## Component Shape

Every component has:

```json
{
  "id": "stable.local.id",
  "kind": "panel.dialogue",
  "props": {},
  "children": [],
  "stateBindings": [],
  "embeddedDocuments": []
}
```

Kinds are semantic, not HTML tags. Renderers lower them to native controls, but
standard controls may also carry CultUI anatomy for presentation parts such as
slider tracks, fills, thumbs, hit areas, and visual bleed. Native projection is
an implementation route, not permission to invent a different control face:

- `surface`, `partition`, `stack`, `grid`, `dock`, `panel`, `card`
- `text`, `text.dialogue`, `avatar`
- `image.background`, `image.sprite`, `media.stream`
- `embed.norn`, `embed.tex`, `layer.embedded-surfaces`
- `graph`, `tree`, `inspector.kv`
- `rail.actions`, `control.button`, `control.toggle`, `control.slider`,
  `control.stepper`, `control.segmented`, `control.color`, `control.select`,
  `control.input`
- domain kinds such as `vn.stage` when the provider needs richer semantics.

If a renderer does not know a specialized kind, it should fall back through the
kind path: `panel.dialogue` may render as `panel`; `image.sprite` may render as
`image`.

`stateBindings` are explicit `CultMeshStateBindingDescriptor` values attached
to component props. They keep provider state identity out of ad-hoc renderer
stores and out of string-only prop conventions. A binding names:

- `targetProp`: component prop receiving the live value, usually `value`.
- `pointerId`: stable typed CultMesh state pointer id.
- `sourceId`: provider/CultMesh source, record, witness, or field id.
- `schemaId`: schema of the source state.
- `routeKind`: preferred locality such as `in-process`, `shared-memory`,
  `ipc`, `network`, or `wasm`.
- `routeDescription`: optional diagnostics for tools and operators.

Renderers may still honor compatibility props such as `valueRef`, but new
CultUI/Eve runtimes should use `stateBindings` as the canonical contract and
let the CultMesh runtime resolve, watch, predict, or deny the value. Eve does
not define a parallel binding DTO; the live surface contract imports the shared
CultMesh primitive directly.

### Embedded Documents

`embeddedDocuments` are explicit CultMesh document slots attached to a component.
Use them when a provider wants one surface to own layout while a nested region
remains a separately synced document. Inventory panels, inspectors with live
subdocuments, tab bodies, drag/drop overlays, and remote tool panes should use
slots instead of copying child state into a parent DTO.

Each slot names:

- `slotId`: stable local slot identity inside the parent component.
- `documentId`: CultMesh document id to resolve and subscribe to.
- `schemaId`: expected schema, commonly `gamecult.eve.surface.v1` or a
  provider-specific surface document schema.
- `presentationKind`: semantic lowering hint such as `inventory.dropdown`.
- `routeHint`: optional CultMesh locality hint for resolving the child.

Renderers lower normal `children` first, then resolve and mount
`embeddedDocuments` through their CultMesh document resolver. A renderer that
cannot resolve a slot must preserve the slot identity in diagnostics or a
placeholder; it must not invent a local substitute for the child document.

The renderer-to-host request is provider-neutral. It carries `documentId`,
`schemaId`, `slotId`, `presentationKind`, and optional presentation context such
as the current viewport. The host returns a resolved envelope containing the
same document/schema identity and either an opaque typed document or a nested
Eve surface. Provider adapters or advertised plugins own schema-specific query
selection and decoding. Renderer code must not switch on provider schema ids or
call provider-specific query methods to resolve a slot.

## Embedded Knowledge Surfaces

Eve must be able to place rich interactive surfaces inside another surface.
Nested placement is composition, not custody. A parent surface may reserve scene
space for another plugin's surface when that plugin is available, but the
nested plugin keeps its own ABI, capability claims, conformance pack, and
semantic owner. For Sai, this means a VN scene can deploy with Norn and TeX as
optional diegetic scene elements: whiteboards, handheld tablets, hologram
panes, cockpit screens, chalkboards, or chromakey regions baked into sprite
assets. Sai owns the VN stage. Norn owns graph semantics. TeX owns math and
typesetting semantics.

### `embed.norn`

`embed.norn` means "run Norn here." It is not a request to draw a static graph
with whatever local widget happens to be nearby.

Minimum boundary:

- `pluginId`: `norn.graph`.
- `capability`: `embed.norn`.
- an embedded-document slot with `schemaId: norn.graph.document.v1` and a
  provider/Norn-owned CultMesh `documentId`.
- `interaction.nodeAction`: command emitted to the composing provider when a
  node is activated.
- `placement`: scene placement instructions owned by the composing surface.

Graph nodes, edges, solver settings, runtime packages, WASM assets, and native
crate hints belong to Norn's document and plugin advertisement. They are not
inline Eve or Sai surface semantics.

The Norn plugin advertisement declares its invocation and projection paths. A
runtime resolves the advertised `embed.norn` capability without importing Norn
internals. If it cannot do so, it must report a capability gap. It may show a
read-only fallback, but it must not silently claim full Norn support.

### `embed.tex`

`embed.tex` is a portable TeX/LaTeX surface. It carries source, macros, display
mode, renderer hints, and placement. Web clients may lower through KaTeX,
MathJax, Typst-assisted renderers, or a TeX WASM path. Native clients should
lower to vector/text primitives or cached images while preserving source,
baseline, scale, and command provenance.

Minimum props:

- `source` or `sourceUri`
- `format`: `latex`, `tex`, or a stricter future dialect.
- `display`: `inline`, `block`, or `page`.
- `macros`
- `renderer`
- `placement`

## Scene Placement

Any component can carry `props.placement` when it needs to live in scene space.

```json
{
  "space": "scene",
  "anchor": "whiteboard",
  "mode": "keystone",
  "quad": [[0.16, 0.18], [0.58, 0.13], [0.62, 0.50], [0.14, 0.56]],
  "zIndex": 4,
  "opacity": 0.94,
  "chromaKey": { "color": "#00ff00", "tolerance": 0.12 },
  "occlusion": "sprite-mask:whiteboard-hand",
  "lighting": "scene"
}
```

Placement modes:

- `overlay`: normal 2D scene overlay.
- `billboard`: scene-space panel facing the viewer.
- `skew`: affine skew.
- `keystone`: four-corner perspective fit.
- `sprite-chromakey`: render into a keyed region of a sprite or prop.

Coordinates are normalized to the stage unless an explicit coordinate space is
named. Renderers that cannot do true perspective must preserve hit-testing and
report the degradation.

## Commands

Authored command descriptors use `gamecult.eve.command.v1`. Runtime command
invocations use `gamecult.eve.command_invocation.v1`:

```json
{
  "schema": "gamecult.eve.command_invocation.v1",
  "providerId": "gamecult.home.vn",
  "surfaceId": "sai.visual_novel.surface",
  "operation": {
    "operationId": "story.choose",
    "schemaId": "sai.story_choice.v1",
    "idempotencyKey": "21a816d5-7ed5-4513-afb0-0a9bc9aa334b",
    "routeHint": { "sourceVersion": 41 }
  },
  "payload": { "index": 0, "targetPath": "eve" },
  "issuedAt": "2026-05-31T00:00:00.000Z",
  "clientId": "browser.reference",
  "commandBoundary": "sai.commands",
  "receiptSchema": "gamecult.eve.command_receipt.v1"
}
```

Standard command names:

- `select`
- `invoke`
- `open-provider`
- `story.continue`
- `story.choose`
- `story.jump`
- `style.patch`
- `edit.value`
- `toggle.visibility`
- `transform.move`
- `transform.scale`
- `transform.rotate`

Providers may add command names, but they must advertise them in `commands`.
Live Eve command templates carry `CultMeshOperationBindingDescriptor` values:
the operation id is the canonical command identity, `schemaId` may name the
typed request body, `label` names the visible affordance, and `routeHint`
describes the preferred invocation locality. Compatibility fields such as
`command` and `transport` may still be projected for old renderers, but they
are not the authoritative live command model and should not appear as public
runtime construction APIs.

Renderer command requests carry `CultMeshOperationInvocationDescriptor` values.
Editable controls remain state bindings rather than form-shaped command DTOs.
Bindings may additionally name their document and field, value kind, access
mode, authority, stable `bindingName`, and optional `writeCommand`. Renderers
keep unaccepted edits as local drafts. Operations declare `captureBindings` and
receive those values under `payload.bindings`; accepted command results may
request that exact bindings be cleared. HTML form elements are an accessibility
lowering detail, not part of Eve's public ontology.
That invocation descriptor is the canonical operation identity at click/change
time and preserves request schema, preferred route, and optional idempotency.
Renderer command requests also carry `CultMeshOperationPayload`, a shared
payload value with typed scalar readers. Legacy `command` strings and string
payload fields may be serialized while old documents migrate, but live
CultUI/Eve runtimes route from the shared CultMesh invocation descriptor and
read scalar fields through the shared payload primitive. Renderer code should
construct requests from `CultMeshOperationInvocationDescriptor` and
`CultMeshOperationPayload`, not from command strings plus raw dictionaries.

### Inventory manipulation

`inventory.grid`, `inventory.item`, and `inventory.drag_session` are standard
Eve component kinds. They describe a spatial inventory without making the
renderer an inventory authority.

An `inventory.item` that can be moved carries `sourceKind`,
`sourceEntityKey`, `sourceIndex`, `itemKey`, `quantity`, `x`, `y`, optional
`rotation`, and `draggable`. An accepting `inventory.grid` carries
`targetKind`, `targetEntityKey`, `targetIndex`, its spatial dimensions, and
either `dropCommand` or source-specific `dropCommand.<sourceKind>` entries.

The lowerer owns only the transient pointer or keyboard gesture. On drop it
combines source identity with the selected target cell and emits the advertised
operation. The portable payload includes `sourceKind`, `originEntityKey`,
`originIndex`, `originCargoIndex`, `itemKey`, `quantity`, `sourceX`, `sourceY`,
`destinationKind`, `destinationEntityKey`, `destinationIndex`,
`destinationCargoIndex`, `destinationX`, `destinationY`, and
`hasDestinationPosition`. Providers ignore aliases their typed operation does
not consume.

Fit, rotation constraints, stack limits, access, mutation, and receipts remain
provider authority. A lowerer may preview a footprint, but it must not suppress
an advertised command from a locally reconstructed acceptance opinion.
Click-to-pick/click-to-place and pointer dragging emit the same operation
payload.

## Synchronized Style

`surface.styles.tokens` is provider-owned appearance state. Renderers project
tokens into CSS variables, UIKit colors/fonts, Android styles, DirectWrite
brushes, overlay material parameters, TUI attributes, or platform equivalents.
For migrated products, the first source of truth may be an existing CSS system,
but the canonical portable form is the Eve token set, not the stylesheet.

CultUI style is intentionally not CSS with different punctuation. Style should
be typed provider-owned state made of tokens, roles, variants, and states.
Runtime stylesheets, brushes, platform view styles, and TUI attributes are
lowerings, not authorities.

Style controls are ordinary controls whose command is usually `style.patch`.
They synchronize appearance by sending token edits back to the provider. The
provider accepts or rejects the patch and republishes the next surface version.
Local renderers may preview a pending value, but provider state is the authority.

Minimum common tokens:

- `colorBackground`
- `colorPanel`
- `colorPanelAlt`
- `colorText`
- `colorMuted`
- `colorAccent`
- `colorLink`
- `radiusPanel`
- `fontBody`
- `fontTitle`
- `fontDisplay`
- `pixelArt`
- `motion`

Typography tokens describe roles, not one runtime's installed fonts. `fontBody`
should favor `M PLUS 1` and `Ubuntu Sans`/Ubuntu for GUI lowerers. `fontDisplay`
and `fontTitle` may use Montserrat for Latin text, but must include a
Japanese-capable contemporary display fallback such as `Zen Kaku Gothic New`;
Ubuntu remains the body voice, not the flashy title answer.

TUI pixel typography is a separate lowering capability, not a GUI webfont
fallback. A TUI lowerer that claims Japanese pixel support must expose fixed
raster-cell fonts for each advertised scale, with Latin, hiragana, and katakana
in the same cell grid. The expected capability roles are:

- `tuiPixelDisplay`: large raster display labels, roughly 16px or larger.
- `tuiPixelBody`: readable dense raster text, roughly 12px.
- `tuiPixelSmall`: the smallest readable kana lane, roughly 10px.

If a TUI target lacks a Unicode raster atlas for one of those scales, it should
publish a capability gap instead of silently falling back to tofu, proportional
Japanese text, or a Latin-only console font.

Product surfaces may add scoped token groups such as:

- `streamPixels.characterPreview`
- `streamPixels.inventoryGrid`
- `streamPixels.overlayHud`
- `repixelizer.comparisonCanvas`
- `repixelizer.cleanupTool`

These are still Eve style state. A browser lowering may emit CSS variables and
classes; the Kotlin Android runtime may emit native styles and view properties;
Fensalir may emit DirectWrite brushes and renderer flags. The provider owns the
style document and accepts or rejects edits through `style.patch`.

## Sai VN Requirements

Sai requires Eve/CultUI to carry:

- visual novel stage semantics;
- background images;
- speaker, avatar, dialogue, and choices;
- sprite layers with position, scale, and offsets;
- external provider-owned cards/fragments;
- optional embedded Norn graph/map surfaces with clickable node targets when
  `norn.graph` is advertised and available;
- optional embedded TeX surfaces for equations, whitepapers, ledgers, and proofs
  when `tex.math` is advertised and available;
- diegetic placement with perspective, skew, keystone, chromakey, and occlusion
  metadata;
- synchronized style tokens;
- story commands for continue, choice, jump, and style patch.

Those requirements are now inside the Eve surface and plugin-advertisement
contracts, not Sai-specific browser behavior. Optional nested Norn or TeX gaps
degrade the nested surface; they do not move graph, math, or renderer semantics
into Sai.
