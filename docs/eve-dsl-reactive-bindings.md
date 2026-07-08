# CultUI DSL And Reactive CultMesh Bindings

Eve surfaces need a small declarative language for visual composition. That DSL
is CultUI. It is not a command language for agents and not an application state
owner. It is a portable way to describe a surface that Eve can lower into the shared
`gamecult.eve.surface.v1` retained tree.

## Authority

- Provider owns accepted truth, commands, side effects, and permissions.
- CultMesh owns state identity, versioning, provenance, subscriptions, event
  replay, and conflict semantics.
- Eve owns visual composition, renderer parity, local input capture, and
  platform lowering.
- Renderers own native projection only. They subscribe, render, and send
  actions back through the advertised command boundary.

Eve makes state feel local. CultMesh decides what is true.

## CultCache Field Binding Target

The intended user story is that a provider can move a field into CultCache and
Eve can bind to it without inventing a bespoke dashboard store:

```csharp
[CultDocument("mimir.program_surface_config", "mimir.program_surface_config.v1")]
public sealed record MimirProgramSurfaceConfigDocument(...);

using var node = await CultMesh.StartNodeAsync("mimir.ccmp");

var program = node.Documents
    .Document<MimirProgramSurfaceConfigDocument>("mimir.program.default");

metric "Opacity" bind program.Field(x => x.Layers[1].Opacity)
```

Today the lower substrate exposes reactive document changes through CultMesh /
CultNet database watch streams. The field-level POCO binding handle is the
next ergonomic cut. Eve documents now carry explicit
`CultMeshStateBindingDescriptor` values on each component so renderers do not
have to infer provider state from string props:

- `targetProp`, the component prop that receives the live value;
- `pointerId`, the stable typed CultMesh state pointer;
- `sourceId`, the provider/CultMesh source, record, witness, or field id;
- `schemaId`, the state schema;
- `routeKind` and `routeDescription`, so runtimes can prefer in-process,
  shared-memory, IPC, network, or WASM paths without app glue.

This keeps the DSL honest. The visual language can name a field; the provider
and CultMesh decide whether that field is readable, writable, predicted,
accepted, denied, stale, or missing.

Commands follow the same rule. Eve command templates carry
`CultMeshOperationBindingDescriptor` values so a button or menu item points at
a typed operation id, optional request schema, label, and route hint. The DSL
may provide friendly `button` sugar, but the compiled surface should not make a
free-floating command string the canonical operation boundary or public
runtime construction path.

When a renderer fires that command, the request carries a
`CultMeshOperationInvocationDescriptor`. That invocation preserves operation id,
request schema, preferred route, and optional idempotency through the renderer
boundary so Aetheria, Bifrost, Unity, Electron, and browser runtimes do not each
invent a local command envelope. The request payload is a
`CultMeshOperationPayload`, so renderers can ingest surface props at the edge
while command handlers read scalar fields through shared typed helpers. New
runtime code should construct requests from the invocation descriptor and
payload primitive directly; raw command strings and dictionary payloads are
serialization details, not live APIs.

Discovery of those backing documents should come from a provider advertisement
when available. See
[provider-advertisement-contract.md](./provider-advertisement-contract.md) for
the service-level map that tells Odin and Eve which schemas, witnesses,
surfaces, commands, nested Verses, and style capabilities a daemon deliberately
publishes.

## Reactive Surface Model

The ergonomic layer has three reactive shapes:

- `var`: one live value with subscribers.
- `collection`: an ordered event-shaped set with append/update streams.
- `derive`: a computed field that updates from vars or collections.

These are browser-reference fixture names, not a rival state model. In the
Eve MultiVerse target, `var`, `collection`, and `derive` become convenient
views over typed CultCache/CultMesh state. If they cannot explain their backing
document, authority, and freshness, they are only mock state.

The browser reference fixture proves the first cut with `web/eve-dsl.js` and
`web/fixtures/reactive-composition.eve`:

```eve
var face.name "Eve"
collection swarm.events
item swarm.events "surface compiled from Eve DSL"
derive swarm.eventCount count swarm.events

card pulse "Reactive Pulse"
metric "Event Count" bind swarm.eventCount
button "Append Event" append swarm.events "operator touched the stream at {{now}}"
```

This is deliberately small. The current compiler lowers DSL cards, text,
metrics, lists, and buttons into the ordinary Eve surface component tree. The
browser renderer binds those components to a lightweight CultMesh-shaped store
so updates are pushed into the DOM through subscriptions rather than manual
rerender calls.

## DSL Contract

CultUI should stay declarative:

- describe components, bindings, and actions;
- avoid hidden imperative renderer behavior;
- avoid provider-specific business logic;
- avoid posting, dispatch, or transport side effects.

The DSL can name an action, but the provider/CultMesh boundary accepts or
rejects that action. A local renderer may preview pending UI, but provider state
must remain the authority.

## Planned Visual Primitives

The first browser slice implements:

- `surface`
- `version`
- `var`
- `collection`
- `item`
- `derive count`
- `derive latest`
- `card`
- `title`
- `text`
- `metric`
- `list`
- `button append`
- `button set`

Next primitives should map onto the existing surface contract:

- `image`, `crop`, and `composite` for Eve-owned visual composition;
- `graph` / `embed.norn` for Norn-backed graph surfaces;
- `chart` for SVG-backed data views;
- `formula` / `embed.tex` for TeX cards;
- `layout`, `stack`, `grid`, `dock`, and `placement` for portable scenes;
- `bind` on every primitive that can expose a CultMesh var, collection, or
  derived stream.

Do not turn this into a universal scripting language. If a feature needs
authority, persistence, or side effects, it belongs behind a provider command or
CultMesh action, not inside the visual DSL.

The composition surface should preserve CultUI's old reusable-element
ergonomics without preserving the old Unity construction accident.
Partitioning is the base case: users can define relative or absolute partitions,
nest partitions inside partitions, and use helpers such as `fieldRow` only when
they lower to the same explicit retained tree. CultUI authoring uses
indentation for flow instead of `end` markers. Standard element presentation is
also specifiable through element anatomy, so a runtime lowers slider tracks,
thumbs, hit areas, and bleed instead of silently substituting its own taste.
Styling is a first-class typed system, not a bag of CSS selectors. See
[cultui-style-system.md](./cultui-style-system.md).

## Public Context

The DSL is the renderer-facing half of the public surface-web claim. The
integrated dossier calls CultMesh the typed distributed-state layer behind
GameCult's human/agent work. The Week 07 damage report records the same pressure
showing up in Eve, Fensalir, CultLib, Sai, Mimir, and Odin: operator surfaces
are becoming first-class state instead of UI exhaust. The DSL should embody
that pressure by making state binding explicit rather than making renderers
guess what a pretty control means.
