# Eve Plugin Architecture

Eve should be a presentation kernel, not a presentation monorepo.

The repo currently contains several renderer bodies because they were useful
proof vehicles: browser reference, iOS/UIKit, Android/Kotlin, Flutter parity,
Unity packages, and fixture lowerers. That does not mean every renderer,
domain representation, and product client should live in Eve forever. The
durable architecture is smaller and sharper:

- Eve core owns the surface/control contract.
- Plugins own domain representation semantics.
- Renderer clients own runtime substrate.
- Providers own accepted state and side effects.
- Odin/CultMesh owns discovery and routing.

The kernel should be boring enough that new renderers can prove conformance
without joining a single giant repo, and domain plugins can add expressive
surface kinds without forcing Eve core to absorb every product vocabulary.

## Authority

Eve core owns:

- `gamecult.eve.surface.v1` and related surface schemas;
- `gamecult.eve.command.v1` and operation binding/invocation descriptors;
- CultUI authoring and lowering contracts;
- plugin manifest schema and discovery rules;
- renderer capability reporting;
- conformance and parity harness expectations;
- core component kinds that are genuinely cross-domain.

Plugins own:

- domain component kinds;
- domain command semantics;
- domain state projection rules;
- executable capability runtime behavior exposed through the plugin ABI;
- plugin-local fixtures and conformance cases;
- compatibility adapters that live behind the plugin ABI.

Renderer clients own:

- native projection into their runtime;
- input capture and command emission;
- local sensor/media capture when relevant;
- runtime-specific capability gaps;
- runtime capability manifests that declare supported features, plugin-host
  support, unsupported plugin semantics, command transport, and split metadata;
- screenshots, frame capture, and performance telemetry.

Providers own:

- live state;
- command acceptance or refusal;
- receipts;
- reconciliation;
- side effects.

Odin/CultMesh owns:

- provider advertisement discovery;
- plugin advertisement discovery;
- document routing;
- freshness and availability view;
- replay/subscription substrate.

## Why Not A Monorepo

The monorepo path is tempting because Eve already has several client bodies.
It would make local edits easy at first: add Sai, absorb Aetheria's Electron
client, add Unity full-scene lowering, add Godot, add Direct2D, keep everything
under one Makefile. That is how a kernel becomes a warehouse with a logo.

The long-term costs are worse:

- Unity, Electron, Godot, Swift/UIKit, Kotlin/Android, Flutter, browser, and
  native Direct2D have different build systems and failure modes.
- Product semantics such as visual novels, RTS overlays, ARPG world-space HUDs,
  graph maps, proof fields, and sensor fusion views change at different speeds.
- Renderer clients need to release, test, and deploy independently.
- A domain plugin should be able to evolve without asking every renderer body
  to accept its source tree.
- Eve core should stay small enough that a renderer author can understand the
  contract without learning every GameCult product.

Eve can keep reference implementations and first-party packages while the
contract forms. The target is not "everything leaves Eve tomorrow." The target
is "nothing joins Eve core unless it protects a core invariant."

## Plugin Model

An Eve plugin is an executable capability package. It extends the
representation vocabulary and supplies the functionality needed to evaluate,
project, transform, validate, or lower that vocabulary. It does not become a
provider and does not accept commands on behalf of an app.

Plugin responsibilities:

- declare component kinds it introduces;
- declare command names or operation descriptors it introduces;
- declare state document schemas it can project or consume;
- provide renderer-agnostic semantics for those kinds;
- expose executable functionality through the standard plugin ABI;
- provide fallback behavior when a renderer lacks support;
- provide fixtures for the parity harness;
- optionally provide reference lowerers for web or another runtime.

Plugins may be distributed as separate repos, package artifacts, or in-repo
packages during incubation. Packaging does not change the call boundary:
providers and renderers invoke plugin functionality through the Eve plugin ABI,
not by importing plugin internals directly. A plugin implementation may use a
same-language library internally, but that is an implementation detail behind
the executable plugin boundary.

The ownership rule is semantic, not packaging ceremony: the plugin owns the
capability and representation shape, while providers own live state and
renderer clients own projection.

## Executable Plugin ABI

Direct embedding is not a supported integration mode. It is too easy for a
provider or renderer to bypass the contract because the plugin happens to be in
the same language today. The standard shape is an executable plugin runtime with
a typed request/response ABI.

Allowed implementation forms:

- process sidecar;
- WASM module hosted by an Eve runtime;
- native dynamic library behind the same ABI when performance demands it;
- in-process package only when wrapped by the same plugin host interface.

Forbidden integration:

- provider imports plugin internals and calls ad hoc functions;
- renderer imports plugin internals and invents local command effects;
- same-language shortcuts that skip the request/response contract;
- plugin sidecar mutating provider state directly.

The ABI should support at least these operations:

- `describe`: return manifest, schemas, component kinds, commands, fixtures,
  capabilities, and runtime version.
- `validate`: validate plugin-specific state, manifest, command payload, or
  surface subtree.
- `project`: turn provider-owned plugin state into an Eve surface subtree or
  document patch.
- `apply`: apply a plugin command to plugin-local state and return proposed next
  plugin state plus effect summary.
- `lower`: optional renderer-side helper for runtimes that delegate lowering to
  plugin code.
- `measure`: optional layout/measurement operation for TeX, graph, and scene
  placement plugins.

All operations are pure or bounded from the provider's perspective. A plugin
runtime can return a proposed next state, diagnostics, measurements, or rendered
assets. It cannot decide whether a provider command is allowed, cannot persist
app truth, and cannot write receipts except for its own runtime diagnostics.

Example ABI request:

```json
{
  "schema": "gamecult.eve.plugin_invocation.v1",
  "pluginId": "sai.vn",
  "operation": "apply",
  "requestId": "cmd-123",
  "input": {
    "stateSchema": "sai.vn.story_session.v1",
    "state": {},
    "commandSchema": "sai.vn.story_command.v1",
    "command": {
      "command": "story.choose",
      "payload": { "index": 0 }
    }
  }
}
```

Example ABI response:

```json
{
  "schema": "gamecult.eve.plugin_result.v1",
  "pluginId": "sai.vn",
  "operation": "apply",
  "requestId": "cmd-123",
  "status": "ok",
  "output": {
    "nextState": {},
    "effectSummary": "advanced story choice 0",
    "diagnostics": []
  }
}
```

If a provider and plugin are written in the same language, the provider may run
the plugin host in-process for performance. It still talks to the same ABI
object model. No special trusted back door.

### Example Plugin Manifest

```json
{
  "schema": "gamecult.eve.plugin.v1",
  "pluginId": "sai.vn",
  "title": "Sai Visual Novel",
  "owner": "sai",
  "version": "0.1.0",
  "componentKinds": [
    "vn.stage",
    "panel.dialogue",
    "text.dialogue",
    "rail.actions"
  ],
  "commands": [
    {
      "command": "story.continue",
      "schema": "sai.vn.story_command.v1",
      "effect": "advance-story"
    },
    {
      "command": "story.choose",
      "schema": "sai.vn.story_command.v1",
      "effect": "choose-branch"
    },
    {
      "command": "story.jump",
      "schema": "sai.vn.story_command.v1",
      "effect": "jump-to-knot"
    }
  ],
  "stateSchemas": [
    "sai.vn.story_session.v1",
    "sai.vn.visual_manifest.v1"
  ],
  "fixtures": [
    {
      "fixtureId": "sai.vn.basic-scene",
      "schema": "gamecult.eve.surface.v1",
      "path": "fixtures/basic-scene.surface.json"
    }
  ],
  "capabilities": {
    "requires": [
      "image.background",
      "control.button"
    ],
    "optionalCapabilities": [
      "scene.placement.keystone"
    ],
    "optionalPlugins": [
      {
        "pluginId": "norn.graph",
        "capabilities": [
          "embed.norn",
          "graph.node.activate"
        ]
      },
      {
        "pluginId": "tex.math",
        "capabilities": [
          "embed.tex",
          "tex.inline",
          "tex.block"
        ]
      }
    ]
  }
}
```

The exact fields can change, but the invariant should not: plugin metadata
must be enough for Eve, Odin, and renderer clients to know what semantics are
being introduced, what fixtures prove them, and what capability gaps must be
reported instead of hidden.

## Discovery

There are two different discoveries. Do not collapse them.

Provider discovery answers:

> What live thing owns state and accepts commands?

Plugin discovery answers:

> What representation vocabulary and command semantics are needed to render
> and interact with this surface correctly?

Provider advertisements remain `gamecult.eve.provider_advertisement.v1`.
Plugin advertisements should be a separate document family,
`gamecult.eve.plugin_advertisement.v1`, or a typed plugin catalog referenced
from provider advertisements.

Recommended discovery path:

1. A plugin publishes a plugin advertisement through CultMesh/Odin or ships a
   local package manifest.
2. A provider advertisement names the plugins its surfaces require.
3. Odin indexes providers and plugins separately.
4. A renderer asks Odin for the provider surface and the required plugin
   manifests.
5. The renderer checks local plugin support.
6. Unsupported required plugin capability becomes a visible capability gap.
7. Optional unsupported capability becomes a visible degraded lowering.

Provider advertisement sketch:

```json
{
  "schema": "gamecult.eve.provider_advertisement.v1",
  "providerId": "aetheria.rts.commander",
  "surfaces": [
    {
      "surfaceId": "aetheria.rts.commander.vn-briefing",
      "schema": "gamecult.eve.surface.v1",
      "requiresPlugins": [
        {
          "pluginId": "sai.vn",
          "versionRange": "^0.1.0",
          "requiredCapabilities": [
            "vn.stage",
            "story.choose"
          ]
        }
      ]
    }
  ]
}
```

Plugin advertisement sketch:

```json
{
  "schema": "gamecult.eve.plugin_advertisement.v1",
  "pluginId": "sai.vn",
  "ownerService": "sai",
  "version": "0.1.0",
  "manifestAddress": "cultmesh://asgard.sai/plugins/vn/manifest",
  "schemas": [
    "sai.vn.story_session.v1",
    "sai.vn.visual_manifest.v1"
  ],
  "componentKinds": [
    "vn.stage"
  ],
  "commands": [
    "story.continue",
    "story.choose",
    "story.jump"
  ],
  "fixtures": [
    "cultmesh://asgard.sai/plugins/vn/fixtures/basic-scene"
  ]
}
```

Local development may use file manifests, but live discovery should flow through
Odin/CultMesh. A renderer must not scrape random repo paths to guess plugin
support.

## Sai As The VN Plugin Owner

Sai should own Eve's VN/Ink representation plugin.

Sai's current body is already crisp:

- static-site Ink loading through `inkjs`;
- visual manifest interpretation;
- DOM rendering for static sites;
- static-site auto-init;
- Eve surface projection through `eve.js`.

Sai should not become a daemon merely because Eve needs VN semantics. Sai can
own the plugin because it understands Ink, visual manifests, choices, story
state, scene assets, and static-site constraints. The active app or provider
still owns live session state and receipts.

Sai plugin responsibilities:

- define `vn.stage` semantics;
- define story state projection shape;
- define `story.continue`, `story.choose`, and `story.jump` semantics;
- expose Ink/story operations through the executable plugin ABI;
- define visual manifest schema as Eve-facing representation input;
- provide slots for embedded surfaces inside VN scenes without owning the
  embedded surface semantics;
- declare optional plugin dependencies such as Norn graph and TeX math when a
  scene embeds those documents;
- provide fixtures for Eve parity;
- provide a web/static-site reference implementation.

Sai does not own:

- Aetheria story session state;
- RTS or ARPG command acceptance;
- multiplayer synchronization;
- save/load authority;
- Unity/Electron/Godot renderer bodies;
- CultMesh provider routing.
- Norn graph/map semantics;
- TeX/math/typesetting semantics.

## Norn And TeX As First-Class Plugins

Norn and TeX are not Sai subfeatures. Sai can place them inside a visual-novel
scene, but ownership stays with their plugins.

Norn plugin responsibilities:

- define `embed.norn` semantics;
- define graph/node/edge document expectations;
- define layout intent and solver/runtime requirements;
- define graph interaction commands such as node activation, focus, selection,
  pan, zoom, and jump;
- define fallback and capability-gap behavior when a renderer cannot run Norn;
- provide graph/map fixtures for Eve parity.

TeX plugin responsibilities:

- define `embed.tex` semantics;
- define accepted source dialects such as TeX, LaTeX, or stricter future
  subsets;
- define macro handling, display mode, baseline, scale, and layout expectations;
- define renderer requirements and cached-render policy;
- define fallback and capability-gap behavior when a renderer cannot typeset;
- provide inline, block, and scene-placed math fixtures for Eve parity.

Sai may declare optional dependencies:

```json
{
  "pluginId": "sai.vn",
  "optionalPlugins": [
    {
      "pluginId": "norn.graph",
      "capabilities": [
        "embed.norn",
        "graph.node.activate"
      ]
    },
    {
      "pluginId": "tex.math",
      "capabilities": [
        "embed.tex",
        "tex.inline",
        "tex.block"
      ]
    }
  ]
}
```

That means a VN scene can put a graph on a whiteboard or an equation in a
briefing without Sai becoming a graph engine or a TeX engine. Sai owns the
stage. Norn owns the graph. TeX owns the math. Eve owns the plugin ABI and
renderer conformance. The app provider owns live state and receipts.

## Building An App With Eve And Sai

An app that wants VN functionality composes four layers.

1. App provider owns live state.
   For Aetheria, this might be `aetheria.rts.commander` and
   `aetheria.arpg.world`. Each provider owns its own current story/session
   state, save/load integration, eligibility, command acceptance, and receipts.

2. Sai plugin owns VN representation.
   The provider invokes Sai through the plugin ABI to validate story state,
   apply story commands, and project the accepted state as `vn.stage`, choices,
   speaker, line, scene, sprites, manifest-backed assets, and story commands.

3. Eve owns surface/control contract.
   Eve validates that the surface and command descriptors conform to
   `gamecult.eve.surface.v1`, the plugin manifest, and operation binding rules.

4. Renderer client owns projection.
   Electron, Unity UI Toolkit, Unity scene, Godot, browser, or Direct2D lower
   the same surface locally and emit commands back to the provider's advertised
   route.

The app-provider receipt is the proof, not the button click. A Unity ARPG scene
and an Electron RTS shell can both emit `story.choose`; the Aetheria provider
decides whether that command is accepted in that runtime, records the receipt,
and republishes state.

## Aetheria RTS And ARPG Example

Aetheria may need VN functionality in two runtimes:

- RTS layer: commander briefings, dialogue overlays, strategic decisions,
  lore panels, faction negotiations, mission choices.
- ARPG layer: in-world conversations, diegetic prompts, scene dialogue,
  cinematic overlays, localized interaction choices.

Sai should not care which runtime is displaying the VN. Sai should care about
the VN representation:

- current story path/knot;
- speaker;
- dialogue line;
- choices;
- scene/background/sprites;
- visual manifest references;
- story commands;
- embedded surface slots.

Aetheria owns the runtime-specific meaning:

- whether a choice is allowed during combat;
- whether a dialogue pauses simulation;
- whether RTS and ARPG sessions share story state;
- whether a choice writes to save state;
- whether multiplayer/authority rules allow the command;
- whether a receipt is visible to the player, operator, or both.

Renderer clients own projection:

- Electron RTS may lower `vn.stage` as a 2D overlay panel or mission briefing.
- Unity UI Toolkit may lower the same surface as a native 2D UI document.
- Unity full-scene renderer may place dialogue in world space or cinematic
  scene space.
- Godot may lower the same plugin semantics into Godot controls or scene nodes.

The shared command path:

```text
renderer click
  -> Eve command envelope
  -> Aetheria provider command route
  -> Aetheria accepts/denies story command
  -> Aetheria invokes Sai plugin ABI for proposed story transition
  -> provider writes receipt
  -> provider republishes surface state
  -> renderer updates from provider state
```

No runtime gets to decide the story consequence just because it rendered the
button. Sai proposes the story transition through its ABI; Aetheria accepts,
persists, receipts, and republishes it.

## Renderer Client Repos

Long-term renderer/client bodies should split out when they become real apps:

- `EveElectron2D` or Aetheria-owned Electron client for RTS/editor/operator 2D.
- `EveUnityUIToolkit` for Unity UI Toolkit 2D lowering.
- `EveUnityScene` or Aetheria-owned Unity scene frontend for full game 2D/3D.
- `EveGodot` for Godot lowering.
- `Fensalir` for Direct2D/native runtime lowering if Fensalir remains the body.
- `EveWebReference` can stay in Eve core as the canonical reference renderer
  unless it grows product-specific runtime ownership.

While these live in the Eve repo as proofs, they should behave like clients of
the plugin ABI. They should not be allowed to reach into plugin source or
provider internals as a convenience.

## Conformance

Every plugin needs conformance fixtures. Every renderer that claims plugin
support needs to run them.

For Sai VN:

- basic `vn.stage` scene;
- choice command fixture;
- continue command fixture;
- visual manifest asset fixture;
- embedded surface slot fixture with optional Norn/TeX plugin dependencies;
- degraded renderer fixture for clients without scene placement;
- receipt round-trip fixture driven by a fake provider.
- ABI fixture proving `validate`, `apply`, and `project` produce the expected
  plugin results without direct imports.

The parity manifest should be extended so runtimes declare plugin support:

```json
{
  "runtimeId": "aetheria.unity.uitoolkit",
  "supportedPlugins": [
    {
      "pluginId": "sai.vn",
      "capabilities": [
        "vn.stage",
        "story.choose",
        "story.continue"
      ]
    }
  ]
}
```

A renderer can be honest without being complete. Unsupported features should
show up as capability gaps, not disappear into a local approximation.

## Repo Strategy

Recommended path:

1. Keep Eve core in `E:/Projects/Eve`.
2. Define `gamecult.eve.plugin.v1` and `gamecult.eve.plugin_advertisement.v1`.
3. Let Sai publish the first domain plugin manifest for VN/Ink.
4. Add Sai VN fixtures to Eve parity as plugin fixtures, not Eve core fixtures.
5. Make the browser reference load plugin manifests and report missing
   capabilities.
6. Spin renderer clients out as they become real bodies.
7. Keep in-repo clients only as references or incubation bodies with explicit
   exit criteria.

Absorbing Sai into Eve is the fallback if the plugin boundary fails. It should
not be the first move. The cleaner machine is Eve as kernel, Sai as VN plugin,
Aetheria as provider, and renderer clients as separate bodies.
