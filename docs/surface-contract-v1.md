# Eve Surface Contract v1

`gamecult.eve.surface.v1` is the shared CultMesh UI document for Eve surfaces.
It is the contract that CultUI should consume. Renderers may be web, UIKit,
Android native views, Flutter, Windows Direct2D/DirectWrite, or another local
client, but the semantic surface is the same retained tree.

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

Compatibility fields:

- `nodes`: old graph/dashboard projection for legacy clients.
- `selectedNodeId`: old selection projection.

These fields are display projections. New renderers should prefer
`surface.root`.

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

- `surface`, `stack`, `grid`, `dock`, `panel`, `card`
- `text`, `text.dialogue`, `avatar`
- `image.background`, `image.sprite`, `media.stream`
- `graph`, `tree`, `inspector.kv`
- `rail.actions`, `control.button`, `control.toggle`, `control.slider`,
  `control.segmented`, `control.color`, `control.select`
- domain kinds such as `vn.stage` when the provider needs richer semantics.

If a renderer does not know a specialized kind, it should fall back through the
kind path: `panel.dialogue` may render as `panel`; `image.sprite` may render as
`image`.

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
brushes, or platform equivalents.

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

## Sai VN Requirements

Sai requires Eve/CultUI to carry:

- visual novel stage semantics;
- background images;
- speaker, avatar, dialogue, and choices;
- sprite layers with position, scale, and offsets;
- external provider-owned cards/fragments;
- Norn-style graph components with clickable node targets;
- synchronized style tokens;
- story commands for continue, choice, jump, and style patch.

Those requirements are now inside the contract, not Sai-specific browser
behavior.
