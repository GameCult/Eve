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
absolute partitions, and common helpers lower into that explicit tree. See
[cultui-style-system.md](./cultui-style-system.md) for the composition and
styling design target.

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
  "children": []
}
```

Kinds are semantic, not HTML tags. Renderers lower them to native controls:

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

## Embedded Knowledge Surfaces

Eve must be able to place rich interactive surfaces inside another surface. For
Sai, this means the VN scene can host Norn and TeX as diegetic scene elements:
whiteboards, handheld tablets, hologram panes, cockpit screens, chalkboards, or
chromakey regions baked into sprite assets.

### `embed.norn`

`embed.norn` means "run Norn here." It is not a request to draw a static graph
with whatever local widget happens to be nearby.

Minimum props:

- `engine.id`: `norn`
- `engine.contract`: Norn surface contract id, currently
  `gamecult.norn.surface.v1`.
- `engine.web.wasm`: optional WASM asset for browser clients.
- `engine.native.rustCrate`: native solver crate, usually `norn-rs`.
- `layout`: layout mode and solver knobs.
- `graph.nodes` and `graph.edges`: provider graph state.
- `interaction.nodeAction`: command emitted when a node is activated.
- `placement`: scene placement instructions.

Each target renderer embeds Norn by using the strongest local path available:

- Web: Norn WASM / `@gamecult/norn-viewer`.
- iOS: native graph view using the Norn layout output, eventually Rust FFI.
- Android: native graph view using the same Norn contract, eventually Rust FFI.
- Windows Direct2D: Norn layout lowered to Direct2D/DirectWrite primitives.

If a client cannot run Norn, it must report a capability gap. It may show a
read-only fallback, but it must not silently pretend the fallback is full Norn.

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

Commands use `gamecult.eve.command.v1`:

```json
{
  "type": "surface-command",
  "schema": "gamecult.eve.command.v1",
  "providerId": "gamecult.home.vn",
  "surfaceId": "sai.visual_novel.surface",
  "command": "story.choose",
  "payload": { "index": 0, "targetPath": "eve" },
  "issuedAt": "2026-05-31T00:00:00.000Z",
  "clientId": "browser.reference"
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
- `pixelArt`
- `motion`

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
- embedded Norn graph/map surfaces with clickable node targets;
- embedded TeX surfaces for equations, whitepapers, ledgers, and proofs;
- diegetic placement with perspective, skew, keystone, chromakey, and occlusion
  metadata;
- synchronized style tokens;
- story commands for continue, choice, jump, and style patch.

Those requirements are now inside the contract, not Sai-specific browser
behavior.
