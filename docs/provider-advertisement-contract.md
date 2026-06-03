# Eve Provider Advertisement Contract

Eve cannot be the gateway to the MultiVerse by guessing. Every daemon that wants
to be visible in a Verse should publish a small typed advertisement that tells
Odin, Eve, and local clients where the provider-owned truth and surfaces live.

This document defines the first target shape for
`gamecult.eve.provider_advertisement.v1`.

## Authority

- The provider owns the advertisement and accepts or denies commands named by
  it.
- CultMesh owns publication, delivery, replay, freshness, and Verse membership.
- Odin indexes advertisements and uses them to discover services and embedded
  surfaces.
- Eve lowers the advertised surfaces and sends command intent back through the
  advertised command boundary.
- Renderers do not probe private routes when an advertisement exists.

The advertisement is not a health page. It is a map of authority.

## Required Fields

```json
{
  "schema": "gamecult.eve.provider_advertisement.v1",
  "providerId": "streampixels",
  "serviceId": "streampixels.service",
  "verseId": "gamecult.local",
  "title": "StreamPixels",
  "kind": "service.product",
  "updatedAt": "2026-06-03T00:00:00Z",
  "freshness": {
    "state": "fresh",
    "lastSeenAt": "2026-06-03T00:00:00Z",
    "maxAgeMs": 15000
  },
  "schemas": [],
  "witnesses": [],
  "surfaces": [],
  "commands": [],
  "nestedVerses": [],
  "styleCapabilities": [],
  "contacts": []
}
```

Required top-level meanings:

- `providerId`: stable id used by Eve and Odin.
- `serviceId`: stable daemon/service id when different from the provider id.
- `verseId`: Verse where this advertisement is authoritative.
- `kind`: provider family, for example `service.product`, `service.operator`,
  `surface.renderer`, `inspection.huginn`, or `content.runtime`.
- `freshness`: whether this advertisement is fresh, stale, unreachable, or
  degraded.
- `schemas`: typed document schemas the provider owns or publishes.
- `witnesses`: CultCache `.cc` files, database exports, or document keys that
  witness durable state.
- `surfaces`: Eve surface documents or endpoints the provider publishes.
- `commands`: command boundaries the provider accepts.
- `nestedVerses`: child Verse boundaries carried by this provider.
- `styleCapabilities`: style token groups and lowering capability/lossiness
  notes.

## Schema Catalog Entries

Each schema entry names provider-owned state:

```json
{
  "schema": "streampixels.viewer_profile.v0",
  "owner": "streampixels",
  "authority": "accepted",
  "storage": "postgres-with-cc-witness",
  "cultMeshKey": "cultmesh://streampixels/viewers/{profileId}/character",
  "portable": true
}
```

Storage values are descriptive, not magic enums. Useful first values:

- `cultcache-cc`
- `postgres-with-cc-witness`
- `sqlite-with-cc-witness`
- `memory-dev-only`
- `artifact-reference`
- `external-authority-projection`

## Witness Entries

Witness entries tell Odin and Huginn where typed state can be inspected:

```json
{
  "id": "streampixels.local.witness",
  "kind": "cc-export",
  "path": "state/streampixels.witness.cc",
  "schemas": [
    "streampixels.viewer_profile.v0",
    "streampixels.event_rule.v0"
  ],
  "redaction": "provider-secrets-removed",
  "freshness": {
    "state": "fresh",
    "updatedAt": "2026-06-03T00:00:00Z"
  }
}
```

Witnesses may be file paths, CultMesh document keys, URLs, or named local
stores. They must say what is redacted. A witness that hides redaction is just a
polite leak wearing shoes.

## Surface Entries

Surface entries point at canonical presentation:

```json
{
  "surfaceId": "streampixels.creator.console",
  "schema": "gamecult.eve.surface.v1",
  "transport": "cultmesh-document",
  "key": "cultmesh://streampixels/creators/{creatorId}/surface",
  "audience": "creator",
  "mode": "interactive",
  "styleProfile": "streampixels.product",
  "commands": [
    "streampixels.preview_event",
    "streampixels.connector.patch"
  ]
}
```

Compatibility endpoints can be listed, but they are lowerings:

```json
{
  "surfaceId": "streampixels.web.creator.console",
  "schema": "gamecult.eve.surface.v1",
  "transport": "browser-lowering",
  "url": "https://streampixels.gamecult.org/admin",
  "canonical": false,
  "canonicalSurfaceId": "streampixels.creator.console"
}
```

## Command Entries

Commands are intent routes, not renderer callbacks:

```json
{
  "command": "streampixels.preview_event",
  "surfaceId": "streampixels.creator.console",
  "transport": "cultmesh-command",
  "schema": "gamecult.eve.command.v1",
  "authority": "creator-admin-or-operator",
  "result": "accepted-denied-or-reconciled"
}
```

The provider may expose HTTP, CultMesh command documents, local IPC, or another
transport. The advertisement must identify the route and authority level. Eve
can preview local intent, but the provider's result is the truth.

## Nested Verse Entries

Nested Verses describe authority topology:

```json
{
  "verseId": "streampixels.creator.{creatorId}",
  "parentVerseId": "gamecult.local",
  "kind": "creator-space",
  "authorityBoundary": "creator-membership-or-operator",
  "surfaceIds": [
    "streampixels.creator.console",
    "streampixels.overlay.space"
  ],
  "stateSchemas": [
    "streampixels.event_rule.v0",
    "streampixels.overlay_settings.v0"
  ],
  "carryRules": {
    "style": "inherit-product-tokens-with-creator-overrides",
    "identity": "heimdall-claims-projected",
    "commands": "provider-accepted-only"
  }
}
```

Nesting is not menu structure. It says which state crosses from one Verse to
another, which commands survive the crossing, and whose authority is being
borrowed.

## Style Capability Entries

Style capability entries let a provider preserve product identity without
pretending every renderer can do everything:

```json
{
  "styleProfile": "repixelizer.product",
  "tokenGroups": [
    "repixelizer.comparisonCanvas",
    "repixelizer.cleanupTool"
  ],
  "preferredLowerings": [
    "css",
    "android-native",
    "direct2d",
    "tui"
  ],
  "lossiness": {
    "tui": "no-pixel-canvas-editing; command list only",
    "android-native": "hover states omitted"
  }
}
```

Lossiness is not shame. Silent lossiness is shame.

## Odin Consumption Rule

Odin should prefer provider advertisements over probing, scraping, or private
configuration. LAN probes and hardcoded endpoints are compatibility discovery
only. Once a daemon publishes `gamecult.eve.provider_advertisement.v1`, Odin's
compliance view should be based on that advertisement and the freshness of its
referenced witnesses and surfaces.

## First Implementers

The first providers should be:

- `streampixels`: nested viewer, creator, operator, and overlay-space Verses.
- `repixelizer`: session, job, artifact, and hosted-operator Verses.
- `heimdall`: account, identity, grant, session, and app-profile Verses.
- `bifrost`: work, motion, patron, project, and account Verses.
- `huginn`: `.cc` and Persona-state inspection surfaces.
- `mimir`: room, sensor, stream, field, and operator Verses.

If this contract works, Odin stops asking "what ports are open?" and starts
asking the better question: "what truths did each daemon deliberately publish,
and who is allowed to touch them?"
