# Eve DSL And Reactive CultMesh Bindings

Eve surfaces need a small declarative language for visual composition. The DSL
is not a command language for agents and not an application state owner. It is a
portable way to describe a surface that Eve can lower into the shared
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

## Reactive Surface Model

The ergonomic layer has three reactive shapes:

- `var`: one live value with subscribers.
- `collection`: an ordered event-shaped set with append/update streams.
- `derive`: a computed field that updates from vars or collections.

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
end
```

This is deliberately small. The current compiler lowers DSL cards, text,
metrics, lists, and buttons into the ordinary Eve surface component tree. The
browser renderer binds those components to a lightweight CultMesh-shaped store
so updates are pushed into the DOM through subscriptions rather than manual
rerender calls.

## DSL Contract

The DSL should stay declarative:

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
