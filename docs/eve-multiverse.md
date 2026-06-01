# Eve MultiVerse

Eve exists so distributed state can become a surface a person can touch without
collapsing every participant into one central app.

The promise is deliberately a little magical at the user boundary:

1. Choose a CultCache backing store.
2. Let CultMesh make it a Verse-aware consensus shard.
3. Annotate domain POCOs as CultCache documents.
4. Bind Eve surface fields to those typed document fields.
5. Subscribe anywhere in the Verse.
6. Render the same surface through browser, iOS, Android, Fensalir Direct2D,
   Unity, overlays, or future clients.
7. Keep authority visible: who can read, who can write, who predicted, who
   denied, who accepted, and what is stale.

That is the Eve MultiVerse: not one universe owned by a web app, but many
rule-bearing Verses whose surfaces can cross renderer bodies while preserving
ownership.

## Current Substrate Truth

CultMesh already has the lower bones:

- CultCache supplies typed documents, schema identity, names, indexes, globals,
  references, local persistence, and diffing.
- CultNet/CultMesh supply shard descriptors, shard epochs, primary authority,
  write rejection or forwarding, shard logs, replica catch-up, subscriptions,
  peer exchange, Verse descriptors, and authority leases.
- The C# database layer exposes R3 streams such as `Watch<T>()`,
  `WatchRecord<T>()`, `WatchGlobal<T>()`, `WatchByName<T>()`, and
  `WatchByIndex<T>()`.
- Eve surface documents already carry retained composition trees, commands,
  assets, nodes, selection, and sensor/media observation envelopes.
- Fensalir Direct2D/D3D12, browser DOM, UIKit, Android, and future clients are
  renderer bodies for the same document semantics.

The missing ergonomic layer is field binding:

```csharp
using var node = await CultMesh.StartNodeAsync("mimir.ccmp");

var program = node.Documents
    .Document<MimirProgramSurfaceConfigDocument>("mimir.program.default");

var opacity = program.Field(x => x.Layers[1].Opacity);

using var sub = opacity.Watch()
    .Subscribe(value => inspector.SetOpacity(value.Value));

await opacity.SetAsync(0.72f, authority: CultAuthority.LocalUser);
```

The exact API can change. The invariant cannot: a field binding must identify
document schema, document id or key, field path, value kind, access mode,
authority, freshness, prediction/reconciliation state, and the command boundary
for writes.

## Authority Split

- Provider owns accepted domain truth, permissions, commands, and side effects.
- CultCache owns document identity, schema compatibility, persistence, indexes,
  local diffing, and typed handles.
- CultMesh owns Verse membership, shard authority, remote subscriptions,
  replay/catch-up, leases, and conflict outcomes.
- Eve owns projection, renderer parity, local input capture, sensor timestamps,
  and command intent.
- Renderers own native projection mechanics only. They do not invent provider
  truth.

Local callbacks are not portable state. DOM handlers, UIKit actions, Android
listeners, Direct2D hit tests, and game-engine events are actuators for the
local body. The binding is the state contract.

## Staleness Is A Feature

Eve should make stale state visible. A dashboard that says `camera live` while
the last frame is old is lying with nice posture.

Every serious Eve backend should be able to expose:

- last update timestamp per bound field;
- current authority and access level;
- pending local prediction;
- denied command or refused write;
- reconciliation after authoritative commit;
- missing source or dead sensor;
- raw provider health when available.

This is not decoration. It is how Eve keeps love from turning into mush:
connection with enough dignity to refuse false confidence.

## Public Doctrine Anchors

The public site already carries this direction:

- [Integrated dossier](https://gamecult.org/dossier): GameCult's public thesis
  names CultMesh as typed distributed state and frames typed state as connective
  tissue for agent/human work.
- [Daily Damage Report - Week 07](https://gamecult.org/Blog/daily-damage-report/week-07):
  records the May 31 surface push across CultLib, Fensalir, Sai, Mimir, Odin,
  and Eve-adjacent work: operator surfaces becoming first-class state instead
  of UI exhaust.
- [The Free Mouth And The Native Body](https://gamecult.org/Blog/the-free-mouth-and-the-native-body):
  describes the split between public/social mouth and native body. Eve is one
  of the native bodies that makes shared state touchable.
- [The Sleeping Colossus Learns To Refuse The Throne](https://gamecult.org/Blog/the-sleeping-colossus-refuses-the-throne):
  states the means/end doctrine. Eve must not create distributed freedom by
  centralizing every interface into one remote-control throne.
- [GameCult compound tour](https://gamecult.org/tour): names the Eve pipeline:
  provider-owned state becomes a CultUI semantic tree; Eve projects it into
  local renderers; user action becomes command intent; the provider accepts or
  refuses and publishes updated truth.

## Implementation Pressure

The next coherent cuts are:

1. Define the field-binding descriptor as a stable Eve/CultMesh contract.
2. Add generated or expression-based C# field handles for annotated CultCache
   POCOs.
3. Bind Eve DSL primitives to those handles.
4. Render staleness and authority explicitly in the browser reference.
5. Lower the same binding metadata into iOS, Android, and Fensalir Direct2D.
6. Add a small witness surface that separates provider truth, local command
   pressure, denied intent, prediction, reconciliation, and stale sensor time.

The witness surface matters. Eve should not keep repeating the doctrine without
a specimen. The first ugly strip that says `this field is stale`, `this command
was denied`, and `this value is only predicted` is more valuable than another
flawless paragraph.
