# Eve Runtime App Parity Roadmap

Eve should exist as one generic app per supported runtime:

- Web reference
- Fensalir Direct2D / DirectWrite
- iOS / UIKit
- Android / Kotlin

Each app presents the same provider picker, subscribes to the selected
provider-owned Eve surface, lowers the same `gamecult.eve.surface.v1` tree, and
sends commands through the advertised command boundary. The app is the renderer
and local input edge. It is not the provider and not a product-specific
dashboard.

Repixelizer is the first parity target. Its current browser GUI already carries
the product feel: pixel fonts, dark shell, blue panels, warm pixel accents,
scanlines, image comparison, upload flow, solver progress, and cleanup tools.
The Eve app family should make that surface recognizable across web, Direct2D,
iOS, and Android before expanding into broader product coverage.

## Authority Map

Owner:

- Eve owns the shared surface contract, provider picker behavior, renderer
  parity harness, local input capture, and runtime-specific lowering.
- Providers own accepted state, commands, style tokens, assets, and side
  effects.
- CultMesh owns publication, discovery delivery, subscriptions, freshness, and
  command transport.
- Odin indexes provider advertisements and helps runtimes discover available
  providers.

Inputs:

- `gamecult.eve.provider_advertisement.v1`
- `gamecult.eve.surface.v1`
- `gamecult.eve.command.v1`
- Runtime-local sensor/input events
- Runtime-local capabilities such as fonts, image sampling, pointer models, and
  GPU/text APIs

Outputs:

- Native rendered UI in each target runtime
- Provider command documents or advertised command route calls
- Runtime capability/fidelity diagnostics
- Optional visual parity snapshots for comparison against the web reference

Derived State:

- Selected provider is local Eve app state unless the provider advertises a
  shared selection document.
- Runtime style objects are derived from `surface.styles.tokens`.
- Browser CSS variables, UIKit colors/fonts, Android styles, and DirectWrite
  brushes are lowerings, not portable authority.
- Visual parity reports are diagnostics, not product truth.

Forbidden Writers:

- Renderer callbacks must not mutate provider state directly.
- Runtime-specific hardcoded colors, fonts, control labels, image sampling
  rules, and layout decisions must not override provider style tokens except as
  documented fallback behavior.
- Product-specific apps must not become the canonical UI when an Eve surface
  exists.
- Compatibility HTTP/browser routes must not replace provider advertisements.

Shared Paths:

- Opening a provider from the dropdown, deep link, command, or startup default
  should use the same provider selection primitive.
- Style tokens should flow through one token lowering path per runtime.
- Commands from buttons, touch gestures, pointer gestures, keyboard shortcuts,
  and future TUI actions should emit the same `gamecult.eve.command.v1` shape.
- Visual parity fixtures should use the same surface document consumed by live
  runtimes.

Deletion Line:

- Replace hardcoded browser tabs with provider advertisements once the first
  local advertisement source exists.
- Demote renderer-specific style shortcuts to fallbacks behind the token
  lowering path.
- Remove product-owned duplicate UI shells once the product surface is complete
  enough for Eve to be the normal app entry.

## Generic App Shell

Every runtime app should expose the same operator shape:

1. Discover providers from CultMesh/Odin, plus explicitly configured local
   fixtures during development.
2. Show a target picker listing provider title, provider id, freshness, kind,
   and primary surface mode.
3. Subscribe to the selected provider surface.
4. Lower `surface.root`, `surface.styles.tokens`, assets, commands, and
   diagnostics through the runtime renderer.
5. Publish commands through the advertised boundary.
6. Report capability gaps when a component, token, asset, command, or embedded
   engine cannot be faithfully lowered.

The browser reference can keep fixtures, but fixture selection should use the
same provider picker model as live providers. A fixture is just a local
advertisement with a local surface source.

## Runtime Targets

### Web Reference

Role:

- Canonical behavior oracle.
- Fastest fixture runner.
- Visual parity screenshot source.

First cuts:

- Replace hardcoded tabs with a provider picker.
- Represent existing fixtures as provider advertisements.
- Add Repixelizer fixture loading from `docs/fixtures/repixelizer.eve-surface.json`.
- Map the full Repixelizer style token set to CSS variables.
- Add screenshot capture for the Repixelizer first viewport and main app
  workflow states.

### Fensalir Direct2D

Role:

- Native desktop/game-runtime lowering through existing DirectWrite/Direct2D
  overlay machinery.

First cuts:

- Build an adapter from `gamecult.eve.surface.v1` to `AquariumUiDocument`.
- Map common style tokens to DirectWrite fonts, brushes, panel fills, borders,
  and pixel-art image sampling flags.
- Render the Repixelizer shell, cards, metrics, upload/action controls, and
  image preview placeholders before implementing the full editor canvas.
- Emit command documents through the same advertised command boundary as web.

### iOS / UIKit

Role:

- Native multitouch Eve app and sensor edge.

First cuts:

- Put the provider picker in front of the current native dashboard view.
- Route selected provider surfaces through the generic `surface.root` lowerer.
- Map common style tokens to UIKit colors, fonts, borders, and image sampling.
- Package or load Repixelizer pixel fonts.
- Add visual parity fixtures for Repixelizer shell and progress states.

### Android / Kotlin

Role:

- Native Kotlin Eve app and Periwinkle device edge.

First cuts:

- Connect provider picker to the existing broker/provider path.
- Finish `surface.root` traversal beyond status/dashboard proof.
- Map `surface.styles.tokens` before hardcoded tone/text/font fallback rules.
- Package or cache Repixelizer pixel fonts.
- Lower image asset refs to pixelated `ImageView` content.
- Lower command controls to upload/document picker and provider job routes.

## Repixelizer Parity Contract

Repixelizer parity starts with recognizability, not total editor feature
completion. Each runtime should first prove:

- provider picker can open Repixelizer;
- title/body fonts preserve the pixel-art profile;
- background, panel, text, muted text, accent, border, and shadow tokens lower
  visibly;
- shell frame, card hierarchy, metrics, and primary action controls match the
  surface structure;
- image assets render with pixelated sampling;
- commands route through provider-owned command paths;
- missing editor/canvas features are reported as capability gaps, not silently
  replaced with fake controls.

Only after those hold should the runtimes chase full comparison canvas,
pan/zoom, eyedropper, pencil, and upload parity.

## Verification

Minimum parity verification should cover:

- static fixture render for each runtime;
- provider picker selection and re-selection;
- style token snapshot against the Repixelizer token set;
- command emission shape for primary controls;
- capability gap report for unsupported components;
- screenshot or frame capture for the first viewport where the runtime supports
  it.

The web reference remains the visual oracle until a better cross-runtime
snapshot harness exists.
