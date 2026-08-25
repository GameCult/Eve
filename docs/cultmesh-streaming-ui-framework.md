# Eve CultMesh Streaming UI Framework

Eve is the shared UI and sensor edge for the GameCult mesh. It is not only the
current jailbroken iPad app. The iPad client is the first native proof of a
larger framework: apps publish structured surfaces through CultNet, Eve clients
render those surfaces, and local devices publish timestamped sensor packets
back into the mesh.

The larger frame is the Eve MultiVerse. CultMesh Verses let different local
systems share typed state without pretending they all have the same authority,
privacy, or rules. Eve is the surface layer for those Verses: a provider-owned
document becomes a CultUI-shaped retained tree, the tree binds to typed
CultCache fields, and each client lowers the same semantics into its local
body.

## Authority Map

- Owner: each app owns its provider state and command side effects.
- Browser renderer: owns canonical layout behavior, accessibility semantics,
  visual reference, and cross-client comparison tests.
- Native clients: own platform rendering, local input capture, media decode, and
  sensor sampling for their device.
- CultNet API: owns transport of surface snapshots, command messages, and sensor
  packets.
- CultMesh documents: own typed state shape, provenance, versioning, and replay.
- CultCache/CultMesh bindings: own the path from a visible UI field to the
  typed document field, access mode, authority, freshness, prediction, denial,
  and reconciliation status.

Eve does not become the business-logic owner for every dashboard. It is the
composition and device edge. Providers decide truth; Eve makes that truth
visible and touchable.

## Surface Model

Every app-facing UI surface should be expressible as a retained compositing
document. The old flat `nodes` list is a compatibility/data projection; the
distributed UI layer is `surface.root`, a CultUI-shaped tree:

- `surface`: provider id, title, schema, version, updated timestamp.
- `surface.root`: panels, rails, stacks, grids, controls, cards, trees, media
  views, avatars, text blocks, metric bars, graphs, and inspector panes.
- `nodes`: semantic state/selection/debug projection for clients that need a
  graph-shaped view or older compatibility.
- `selection`: current focus and provider-owned state path.
- `commands`: allowed user intents such as select, open provider, move, scale,
  rotate, toggle visibility, invoke action, edit value, and apply preset.
- `assets`: image URLs, local cache keys, font/material hints, and media stream
  references.
- `detail`: structured text, state paths, diagnostics, and provenance.
- `bindings`: field-level links to CultCache/CultMesh document fields. A
  binding names schema, document identity, field path, value kind, access,
  authority, and command boundary.

The current contract id is `gamecult.eve.surface.v1`; command envelopes use
`gamecult.eve.command.v1`. See `docs/surface-contract-v1.md`.

The browser is the reference renderer for this model. Native renderers should
match the document semantics, then choose native controls where that gives the
device better latency, touch, media, or sensor access.

Sai visual novels are now a first pressure test for this contract. Sai needs
backgrounds, dialogue panels, choices, sprite layers, provider-owned cards,
embedded Norn graph navigation, embedded TeX surfaces, diegetic placement on
scene props, and synchronized style controls. If a renderer can lower that
tree, it can handle more than a dashboard pretending to be a list.

## Sensor Model

Eve clients publish timestamped sensor streams:

- camera frames or frame events;
- microphone blocks;
- pointer, touch, Pencil, keyboard, and gamepad input;
- accelerometer, gyroscope, magnetometer, and device pose;
- display timing, viewport, scale, and dropped-frame diagnostics.

Each packet needs:

- source id;
- device id;
- monotonic device timestamp;
- wall-clock observation timestamp when available;
- sequence number;
- format metadata;
- payload reference or inline payload;
- clock-domain hint.

Mimir and other consumers can then align signals without pretending the client
is a timing authority for the whole system.

## Client Targets

Browser:

- canonical Eve runtime;
- layout and behavior oracle;
- fast iteration surface for new provider types;
- visual regression target for iOS and Android.

iOS:

- native fullscreen renderer;
- multitouch/Pencil control surface;
- camera, mic, and motion sensor publisher;
- low-latency media display and dashboard controller.

Android:

- same provider/sensor contracts as iOS;
- camera, mic, motion, and display timing publisher;
- native rendering where browser embedding would be weaker.

Flutter:

- likely shared native-client implementation path for Android/iOS parity;
- useful for matching controls, layout primitives, animation, and local media
  surfaces across native devices;
- not the browser ground truth. Flutter Web may be a compatibility target, but
  the canonical behavior still belongs to the browser Eve runtime and recorded
  CultMesh surface fixtures.

Fensalir Direct2D:

- desktop/native client surface inside the Fensalir runtime;
- lowers Eve/CultMesh surface documents into the existing DirectWrite/Direct2D
  overlay path;
- uses the same provider ownership and command contract as browser, iOS, and
  Android clients;
- keeps renderer mechanics in Fensalir while app-specific dashboard meaning
  remains with the provider repo.

## Current Proof

The current native iOS app consumes Gjallar's aggregate Eve surface through
Odin-owned Hermodr. Gjallar owns visible provider membership and weighted-bisect
layout intent. Hermodr only lowers the typed CultMesh record at the HTTP edge;
EveCanvas lowers the returned `surface.root` into UIKit and posts commands back
through the same bridge. Provider discovery remains Odin/CultMesh authority.

The Android proof under `android/` builds directly against the installed Android
SDK and runs on Periwinkle. It is deliberately small: display Eve's role, render
a configured CultMesh dashboard lowering when one is provided, and capture
timestamped motion/touch/media samples. It does not bake in Mimir dashboard or
sensor URLs; missing discovery stays visible until Odin/CultMesh provides the
endpoints. It is a device-edge proof while the browser reference and
Flutter/native shared client are still being cut.

The public site now reflects the same pressure. The integrated dossier frames
CultMesh as typed distributed state. The Week 07 damage report records Fensalir
adding Eve surface authority pieces, CultLib adding Kotlin Eve/CultMesh support,
Sai embedding Eve surfaces in narrative scenes, and Odin persisting discovered
Eve interface layout intent. This repo should treat that public story as a
receipt: the surface web is not a future slogan; it is already exerting design
pressure across the bench.

## Next Cut

1. Admit readable provider-owned surface-state records into Odin so Gjallar can
   compose live children instead of catalog-only advertisements.
2. Add a replay harness that feeds recorded surface/sensor documents to browser
   and native clients.
3. Prove native command receipts through Hermodr and provider-owned command
   routes.
4. Replace JSON/base64 sensor payloads with binary packets while preserving the
   typed envelope.
5. Add Android client scaffolding against the same provider and sensor API.
6. Add the Fensalir Direct2D lowering for the shared surface contract so engine
   clients can show the same dashboards without embedding a browser.
7. Add a visible stale/authority witness strip to the reference surface: bound
   fields must show when they are stale, predicted, denied, reconciled, or
   missing.
