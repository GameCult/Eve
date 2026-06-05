# CultUI Composition And Style System

CultUI is Eve's UI DSL.

The old CultUI was a Unity code-first composition library. Its best idea was
ergonomic binary composition: start with a vertical base layout, then use
horizontal and grid sugar to finish the tree without making every screen feel
like manual box bookkeeping.

The new CultUI keeps that ergonomic shape, but moves the authority into Eve's
portable retained surface model. A provider publishes a CultUI tree and style
state. Eve runtimes lower that tree into browser, Direct2D, UIKit, Android, TUI,
or future clients. The renderer is not the designer. The stylesheet is not the
truth.

## Objectives

- Make composition readable enough to write by hand and structured enough to
  generate from typed providers.
- Preserve the builder ergonomics of vertical-first composition with horizontal
  and grid sugar.
- Treat styling as typed provider-owned state, not as hidden renderer CSS.
- Make cross-runtime lowering boring: tokens, rules, variants, states, and
  capability gaps are explicit.
- Learn from CSS without inheriting the parts that made CSS a haunted attic:
  global selector fights, cascade traps, specificity escalation, layout/style
  entanglement, and browser-only assumptions.

## Authority

- Provider owns the CultUI tree, style profiles, token values, variants,
  accepted commands, and `style.patch` results.
- CultMesh owns publication, subscriptions, replay, freshness, and provenance.
- Eve owns the CultUI contract, parser/compiler, renderer parity harness, and
  local input/sensor publication.
- Runtimes own lowering into local UI primitives: DOM/CSS variables,
  DirectWrite/Direct2D brushes, UIKit views, Android views/styles, TUI cells, or
  overlays.

CSS, UIKit, Android XML, Direct2D brushes, and TUI attributes are generated
lowerings. They are not portable state owners.

## Composition Model

CultUI's default composition axis is vertical. The common tree should read like
the shape a person sees:

```cultui
surface repixelizer.operator
  pane "Repixelizer hosted demo"
    text "Force fake pixel art back onto a real grid."
    h
      card "Open demo"
      card "Upload image"
    end
  end
end
```

The structural primitives should stay small:

- `surface`: root of a provider-owned UI surface.
- `v` / implicit stack: vertical flow.
- `h`: horizontal flow.
- `grid`: repeated or dashboard-like layout.
- `dock`: rails and fixed regions.
- `pane`: section with stable role and optional title.
- `card`: repeated or framed unit.
- `text`, `metric`, `image`, `control.*`, `inspector.*`, `embed.*`: content
  and interaction leaves.

Builder sugar should lower into the same tree every runtime receives. A
horizontal helper is not a different layout authority; it is a more humane way
to write a tree.

## Style Model

CultUI style has four layers:

1. Tokens: named values owned by the provider.
2. Roles: semantic component intent such as `body`, `title`, `danger`, `primary`,
   `mono`, `surface`, `panel`, or `pixel-art-preview`.
3. Variants: named style packages for a component or profile, such as
   `repixelizer-retro-card`.
4. States: renderer-observed state such as focused, pressed, disabled, stale,
   predicted, denied, selected, loading, or capability-gap.

The portable style document should look like data:

```json
{
  "profile": "repixelizer.retro.pixel",
  "tokens": {
    "colorBackgroundTop": "#01040b",
    "colorPanel": "#0a2239",
    "colorText": "#efe5c9",
    "fontTitle": "Press Start 2P",
    "fontBody": "VT323",
    "borderWidthPx": 4,
    "pixelArt": true,
    "scanlineOverlay": true
  },
  "variants": {
    "card.retro": {
      "role": "card",
      "tokens": {
        "borderBottomWidthPx": 5,
        "cornerAccentPx": 12
      }
    }
  }
}
```

Rules should target component roles, variants, and state, not arbitrary global
text selectors. If a style cannot explain which component role or variant it
serves, it probably belongs in a runtime lowerer or nowhere.

## What CultUI Takes From CSS

Keep:

- reusable tokens;
- inheritance for a narrow set of text and color defaults;
- responsive constraints;
- stateful styling;
- media/capability queries;
- custom properties as a browser lowering target.

Cut:

- global selector soup;
- specificity games;
- source-order dependency as a normal design tool;
- implicit layout side effects hidden in style rules;
- browser-only units as portable truth;
- pseudo-elements as the only way to express common decoration;
- untyped stringly class names as the core style API.

## Layout And Style Separation

Layout belongs in the CultUI tree and layout props. Style may influence spacing,
border, typography, colors, and decoration, but it should not secretly rewrite
the semantic structure.

Allowed style influence:

- gaps, padding, border widths, radius, shadows;
- typography and text roles;
- image rendering mode;
- motion preferences;
- visibility of purely decorative layers such as scanlines.

Suspicious style influence:

- changing component kind;
- reparenting;
- hiding provider-owned state without an advertised reason;
- replacing a command control with a different command;
- making stale/denied/predicted state invisible.

## Cross-Runtime Lowering

Each runtime needs one style lowerer:

- Web: tokens to CSS custom properties and a small stable class set.
- Fensalir Direct2D: tokens to brushes, text formats, panel geometry, image
  sampling flags, and overlay materials.
- iOS/UIKit: tokens to colors, fonts, view metrics, layer borders, and image
  sampling.
- Android/Kotlin: tokens to native colors, typefaces, dimensions, view
  backgrounds, and image sampling.
- TUI: tokens to color pairs, text roles, borders, density, and glyph hints.

Runtime lowerers must report capability gaps. If Android cannot yet render
Repixelizer's pixel-art image preview or cleanup canvas, the surface should say
that plainly instead of faking a control that cannot carry the command.

## Style Patches

Style controls emit `style.patch`. The provider accepts, rejects, or reconciles
the patch and republishes the next surface version.

Local preview is allowed, but it must be marked pending. Provider state is the
authority.

```json
{
  "type": "surface-command",
  "schema": "gamecult.eve.command.v1",
  "command": "style.patch",
  "payload": {
    "profile": "repixelizer.retro.pixel",
    "tokens": {
      "colorAccent": "#ffd84a"
    }
  }
}
```

## Repixelizer First Target

Repixelizer is the first useful proving ground because its style is not generic
dashboard chrome. The portable style system must carry:

- pixel fonts;
- dark shell surfaces;
- blue panels;
- warm yellow/orange accents;
- chunky borders;
- corner accents;
- scanline and pixel-grid decoration;
- pixelated image sampling;
- comparison/editor capability gaps.

If CultUI can make Repixelizer recognizable across web, Direct2D, iOS, and
Android without smuggling CSS into every runtime, the mousetrap is earning its
name.

## Design Test

For every CultUI style feature, ask:

- What provider-owned value does this express?
- Which component role or state does it serve?
- How does each runtime lower it?
- What happens when a runtime cannot lower it?
- Can the user or provider patch it through a typed command?
- Does this make the UI more portable, or did we just reinvent CSS cruft with
  cleaner indentation?

If the answer is awkward, stop and sharpen the contract before adding syntax.
