# Eve CultMesh Streaming UI Framework

Eve is the shared UI and sensor edge for the GameCult mesh. It is not only the
current jailbroken iPad app. The iPad client is the first native proof of a
larger framework: apps publish structured surfaces through CultNet, Eve clients
render those surfaces, and local devices publish timestamped sensor packets
back into the mesh.

## Authority Map

- Owner: each app owns its provider state and command side effects.
- Browser renderer: owns canonical layout behavior, accessibility semantics,
  visual reference, and cross-client comparison tests.
- Native clients: own platform rendering, local input capture, media decode, and
  sensor sampling for their device.
- CultNet API: owns transport of surface snapshots, command messages, and sensor
  packets.
- CultMesh documents: own typed state shape, provenance, versioning, and replay.

Eve does not become the business-logic owner for every dashboard. It is the
composition and device edge. Providers decide truth; Eve makes that truth
visible and touchable.

## Surface Model

Every app-facing UI surface should be expressible as a retained document:

- `surface`: provider id, title, schema, version, updated timestamp.
- `nodes`: panels, controls, cards, trees, media views, avatars, text blocks,
  graphs, and inspector panes.
- `selection`: current focus and provider-owned state path.
- `commands`: allowed user intents such as select, open provider, move, scale,
  rotate, toggle visibility, invoke action, edit value, and apply preset.
- `assets`: image URLs, local cache keys, font/material hints, and media stream
  references.
- `detail`: structured text, state paths, diagnostics, and provenance.

The browser is the reference renderer for this model. Native renderers should
match the document semantics, then choose native controls where that gives the
device better latency, touch, media, or sensor access.

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

The current iOS app consumes Mimir's `/eve/deck` WebSocket broker. That broker is
already shaped like the future API: provider manifests, retained dashboard
state, provider switching, commands, and typed node metadata. The VoidBot
provider proves that Eve can render an app-specific native cockpit from a
structured mesh snapshot: CTB rail, avatar images, selected Face/status pane,
state tree, and detail panel.

The Android proof under `android/` builds directly against the installed Android
SDK and runs on Periwinkle. It is deliberately small: display Eve's role, poll
the Mimir broker health endpoint, and show timestamped motion/touch samples.
It is a device-edge proof while the browser reference and Flutter/native shared
client are still being cut.

## Next Cut

1. Extract the shared surface schema from the iOS app and Mimir broker into a
   versioned CultMesh contract.
2. Build the browser Eve runtime as the canonical renderer and comparison
   target.
3. Add a replay harness that feeds recorded surface/sensor documents to browser
   and native clients.
4. Replace JSON/base64 sensor payloads with binary packets while preserving the
   typed envelope.
5. Add Android client scaffolding against the same provider and sensor API.
6. Add the Fensalir Direct2D lowering for the shared surface contract so engine
   clients can show the same dashboards without embedding a browser.
