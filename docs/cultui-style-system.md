# CultUI Composition And Style System

CultUI is Eve's UI DSL.

The old CultUI was a Unity code-first composition library. Its useful idea was
not vertical-first layout. That was an artifact of how the first Unity panel was
constructed. The useful idea was ergonomic composition through resolver-backed
standard pieces: `HorizontalGroup`, `Label`, `SliderField`, `InputField`,
`BoolField`, `ProgressField`, `ButtonField`, and inspector helpers that assemble
common rows without every caller hand-authoring the parts.

The new CultUI keeps that reusable composition instinct, but moves the
authority into Eve's portable retained surface model. A provider publishes a
CultUI tree and style state. Eve runtimes lower that tree into browser,
Direct2D, UIKit, Android, TUI, or future clients. The renderer is not the
designer. The stylesheet is not the truth.

## Objectives

- Make composition readable enough to write by hand and structured enough to
  generate from typed providers.
- Make layout a tree of explicit partitions: relative or absolute, nested as
  deeply as the surface needs, with optional padding.
- Preserve builder ergonomics by offering standard elements and composition
  helpers for common structures such as inspector rows.
- Use indentation as the authoring grammar so the written document has the same
  shape as the UI tree.
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

## Authoring Syntax

CultUI is indentation-authored. Blocks are owned by indentation, not `end`
markers. Tabs and spaces may both be accepted by parsers, but a file must be
internally consistent. The formatter emits tabs by default because CultUI is
tree-shaped and depth should be visible.

Inline properties are preferred while they remain readable:

```cultui
part thumb size 12 12 bleed 3 radius 999 fill color.accent
```

Dense properties can become an indented property block without changing the
retained tree:

```cultui
part thumb
	size 12 12
	bleed 3
	radius 999
	fill color.accent
```

The authoring syntax is not the portable state format. The compiler lowers the
indented document into `gamecult.eve.surface.v1` retained components and style
state.

## Composition Model

CultUI composition is partition-first. A partition owns a rectangular region
and divides that region among children. The division may be relative or
absolute. Partitions can contain partitions. Padding is optional. Axis is a
property of a partition, not a global worldview.

```cultui
surface repixelizer.operator
	partition main split x gap 12
		pane hero size 1fr padding 12
			text body "Force fake pixel art back onto a real grid."

		partition tools size 2fr split y gap 8
			card open-demo
			card upload-image
```

The structural primitives should stay small:

- `surface`: root of a provider-owned UI surface.
- `partition`: named region with optional `split`, `size`, `padding`, `gap`,
  `align`, and `clip` properties.
- `split x`: horizontal partitioning.
- `split y`: vertical partitioning.
- `grid`: repeated or dashboard-like partitioning.
- `dock`: rails and fixed regions.
- `pane`: section with stable role and optional title.
- `card`: repeated or framed unit.
- `text`, `metric`, `image`, `control.*`, `inspector.*`, `embed.*`: content
  and interaction leaves.

Builder sugar should lower into the same partition tree every runtime receives.
Helpers such as `row`, `column`, `toolbar`, `fieldRow`, and `dashboardGrid` are
not separate layout authorities; they are humane ways to write partitions.

## Partitions

A partition describes how a parent region is divided:

```json
{
  "kind": "partition",
  "id": "inspector.fields",
  "props": {
    "split": "y",
    "gap": 6,
    "padding": 8
  },
  "children": []
}
```

Useful partition properties:

- `split`: `x`, `y`, `grid`, `overlay`, or `none`.
- `size`: `auto`, `content`, fixed pixels, percentages, viewport units, or
  relative fractions such as `1fr`, `2fr`.
- `min`, `max`: constraints for responsive lowering.
- `padding`: scalar or per-edge inset.
- `gap`: space between partition children.
- `align`: cross/main alignment.
- `clip`: whether overflowing content is clipped, scrollable, or visible.
- `scroll`: `none`, `x`, `y`, or `both`.

The inspector slider row becomes ordinary nested partitions:

```cultui
partition inspector split y gap 6
	partition exposure-row split x gap 8 padding 4
		partition exposure-label size 12rem
			label "Exposure"

		partition exposure-field size 1fr
			slider bind camera.exposure min 0 max 1 step 0.01
```

The same structure can be authored through sugar:

```cultui
fieldRow "Exposure"
	slider bind camera.exposure min 0 max 1 step 0.01
```

The sugar is acceptable only because it lowers to the explicit partition tree.

## Standard Elements

CultUI should provide a small standard element set so every document does not
reinvent the same wheel with new names.

Text and display:

- `label`: short non-editable text, usually naming a field.
- `text`: body text.
- `title`: heading text.
- `value`: read-only formatted bound value.
- `metric`: numeric value with optional bar/gauge lowering.
- `progress`: read-only ranged value.

Input and command:

- `button`: command invocation.
- `toggle`: boolean field.
- `input.text`: text field.
- `input.number`: numeric field.
- `slider`: ranged numeric field.
- `stepper`: increment/decrement numeric field.
- `select`: enum/single-choice field.
- `multiSelect`: flags or multi-choice field.
- `color`: color picker or color well.

Containers and repeated structures:

- `partition`: explicit region division.
- `pane`: titled region.
- `card`: framed item.
- `foldout`: expandable partition.
- `list`: repeated items.
- `tree`: hierarchical state.
- `inspector.row`: label/control row sugar.
- `toolbar`: command row/rail sugar.

Media and embedded surfaces:

- `image`: still image with sampling rules.
- `canvas`: provider-owned drawable/work area.
- `graph` / `embed.norn`: graph surface.
- `embed.tex`: TeX/math surface.
- `media.stream`: live media.

These elements are semantic. A runtime may lower `slider` to an HTML input,
UIKit `UISlider`, Android `SeekBar`, Direct2D custom control, or TUI command
row. The portable document remains one standard element, not five renderer
dialects.

## Element Anatomy

Standard elements are not runtime-owned presentation black boxes. A renderer may
choose efficient native machinery, but it must honor the CultUI element anatomy:
parts, local sizing, hit areas, state hooks, and allowed visual overflow.

Partitions own structural layout space. Element anatomy owns visual parts inside
that space. A slider's field partition allocates the logical control box; the
slider anatomy describes the track, fill, thumb, hit area, and any bleed beyond
the strict track bounds.

```cultui
slider bind tester.fov min 0 max 120 step 1
	box
		height 18
		overflow visible

	part track
		anchor center
		size 100% 6
		radius 2
		fill color.panelInset

	part fill
		anchor left center
		size value% 6
		radius 2
		fill color.accent

	part thumb
		anchor value center
		size 12 12
		bleed 3
		radius 999
		fill color.accent
		shadow glow color.accent 0.35 radius 6

	hitArea
		size 100% 18
```

The thumb may extend past the track because `part thumb` has `bleed 3` and the
control box permits `overflow visible`. That is not a partition violation. It
is local control presentation.

Reusable skins can package that anatomy:

```cultui
skin inspector.orangeSlider for slider
	box height 18 overflow visible
	part track anchor center size 100% 6 radius 2 fill color.panelInset
	part fill anchor left center size value% 6 radius 2 fill color.accent
	part thumb anchor value center size 12 12 bleed 3 radius 999 fill color.accent

fieldRow "FOV"
	slider bind tester.fov min 0 max 120 step 1 skin inspector.orangeSlider
```

The runtime lowers `slider` anatomy into DOM, Direct2D, UIKit, Android, or TUI.
It does not invent the slider's visual identity unless the document deliberately
uses the default skin.

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

### Parity Unit Boundary

CultUI layout values are portable design units. A runtime may map them through
device scale for normal application rendering, but parity capture must make
that mapping explicit. The screenshot harness treats responsive web sizes,
Flutter test surface sizes, Android `wm size` captures, and native panel
captures as different verification layers.

Renderer defaults are forbidden writers for portable geometry. A runtime can
choose the local primitive that draws a slider, graph, card, dialogue panel, or
button, but the portable surface owns:

- component kind;
- child order;
- partition split, size, padding, gap, and alignment;
- style tokens and variants;
- element anatomy such as slider track/fill/thumb/bleed;
- embedded surface identity such as `embed.norn` or `embed.tex`;
- command identity and payload shape.

The current parity harness exposes this boundary with five fixtures:
CultUI Inspector, Repixelizer, Sai VN, Reactive DSL, and Huginn `.cc`. The
current screenshot body emits web, Windows Flutter, Linux Flutter on Nightwing,
iOS/UIKit, and Android/Kotlin captures. Fensalir Direct2D remains a named
pending target until the Eve-to-`AquariumUiDocument` adapter and Direct2D frame
capture exist.

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
