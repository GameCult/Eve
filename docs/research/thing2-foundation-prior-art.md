# Thing 2.0: foundation prior art (Eyes pass, 2026-10-03)

Read-only facts with evidence pointers, gathered for the operator's question. No
conclusions or recommendations. Facts marked **[background]** come from prior
knowledge and were not re-fetched in this pass; everything else was read today.

The operator's words, verbatim: "I'm thinking about Thing 2.0. I think we learned
a lot about what not to do with Thing 1. I feel like doing it right means
building on a solid foundation with predictable affordances. Something like
https://github.com/nicbarker/clay maybe?"

---

## Part 1: Thing 1 (Eve), what the record shows

### 1.0 What the record does and does not contain

- `F:\Projects\Eve\docs\thing-campaign.md` (1,352 lines, revision 4, 2026-10-02)
  is a **rename and site campaign** (Eve to Thing, the deck page on
  gamecult.org). It records no lessons about the UI machine itself. The eureka
  mind's `thing` campaign holds the same: rulings on naming, repo home, deck
  cuts (`thing:ruling:operator-*`, `thing:cut_spec:cut-deck-*`). No Eve
  architecture findings were found in the mind (semantic query, 48 matches, all
  rename/deck/substrate).
- voidbot `search_history` (Discord) returned only 2019-2021 Aetheria UI chatter;
  nothing on Eve. The operator's Eve words below come from Codex session logs
  (`C:\Users\Meta\.codex\sessions\...`) and Claude transcripts.

### 1.1 Operator's own words (verbatim, with source)

| Date | Words | Source |
| --- | --- | --- |
| 2026-07-02 | "Aetheria view is still busted. All commands are failing, and the layouts are quite bad. Go look at the main menu, it's very confused" | `.codex/sessions/2026/07/02/rollout-2026-07-02T12-43-25-...jsonl` |
| 2026-07-02 | "...deferred scalar field lowering needs to be an Eve feature, not an Aetheria Electron feature" | same file |
| 2026-07-02 | "...doesn't Eve provide bindings to CultMesh reactive typed state? Eir shouldn't have to reload to display new contents" | `.codex/sessions/2026/07/02/rollout-2026-07-02T14-05-11-...jsonl` |
| 2026-06-17 | "And if an Eve surface contains a pointer to daemon state, the UI runtime should resolve that automatically" | `.codex/sessions/2026/06/17/rollout-2026-06-17T22-22-21-...jsonl` |
| 2026-07-10 | "...avoid a giant Eve monorepo as the long-term shape. It will feel good while everything is young, then become a swamp: every runtime build system, plugin fixture, platform SDK, and product demo starts sharing one git status. We are already seeing the smell." | `.codex/sessions/2026/07/10/rollout-2026-07-10T02-54-*.jsonl` (may be a pasted plan the operator endorsed; the message is in the user turn) |
| undated (Claude) | "the login button returns invalid Eve command result: data must not have additional properties" | a Claude transcript under `C:\Users\Meta\.claude\projects\` |
| undated (Claude) | "they're separate, Eve CultUI is the lowering target. I'm not sure about the state of the Unity package, it kinda fell behind in the rush to build Eve" | Claude transcript; also memory `F--Projects/memory` (Unity CultUI vs Eve CultUI note) |
| 2026-10-03 (above) | AetheriaEve: "an abomination preserved for taxidermy" | Claude transcript |

### 1.2 Body facts (read today)

**Layout semantics are delegated to each host's native layout engine.**
- The contract (`Eve/docs/surface-contract-v1.md` l.32, 78-110) is a retained
  component tree, `surface.root`, with semantic `kind`s; "Kinds are semantic,
  not HTML tags. Renderers lower them to native controls". Unknown kinds fall
  back along the kind path (`panel.dialogue` to `panel`).
- Layout vocabulary (`Eve/docs/cultui-style-system.md` l.22, 80-140):
  partition-first tree, relative or absolute division, `size` in `auto`,
  `content`, px, percent, viewport units or `fr`; `min`/`max`; `clip`; `scroll`.
- No shared layout solver exists. The browser lowering
  (`Eve/packages/eve-browser-lowering/src/index.ts`, 2,680 lines) maps layout
  props onto CSS flexbox (`flexDirection`, `flexWrap` at l.679, 1057-1059) and
  measures with `getBoundingClientRect`. Flutter (`EveFlutter/lib/main.dart`,
  1,512 lines, one file) and Unity UI Toolkit
  (`EveUnity/packages/org.gamecult.eve.unity-uitoolkit/Runtime/EveUiToolkitSurfaceLowerer.cs`,
  900 lines) each re-interpret the same props with their own widgets/engine.
  Unity UI Toolkit's engine "uses the layout principles of Yoga"
  (docs.unity3d.com/Manual/UIE-LayoutEngine.html).
- `Eve/docs/cultmesh-streaming-ui-framework.md` l.19: "Browser renderer: owns
  canonical layout behavior, accessibility semantics"; l.120 "the canonical
  behavior still belongs to the browser Eve runtime". `renderer-parity.md`
  names the web reference "the first renderer that can be used as a practical
  comparison oracle". So the layout spec is, in practice, whatever Chrome's
  flexbox does with the browser lowering's mapping.

**Per-renderer component implementations.**
- Each runtime carries its own lowerer for the full kind set: web TS (2,680),
  Flutter Dart (1,512), Unity UITK (900) plus Unity scene lowerer (932) plus a
  1,544-line Unity CultMesh live transport
  (`EveUnity/.../Runtime/CultMesh/EveUnityCultMeshLiveProviderTransport.cs`),
  iOS UIKit "EveCanvas", native Android/Kotlin, Fensalir Direct2D spike,
  EveTui (`EveTui/src/eve-tui-shell.mjs`, 297 lines). EveElectron 64 lines.
- The contract keeps adding domain kinds: `inventory.grid`, `inventory.item`,
  `inventory.drag_session` as "standard Eve component kinds"
  (`surface-contract-v1.md` l.311-330), `vn.stage`, `embeddedDocuments` slots,
  scalar/vector field lowering, Japanese-capable font roles and TUI pixel roles
  (l.359-392). 41 distinct `"kind"` values appear across `Eve/web/fixtures`.
- Operator, 2026-07-02, asked that deferred scalar-field lowering move from an
  Aetheria Electron feature into Eve (1.1).

**Parity is evidence-heavy and admitted uneven.**
- `Eve/docs/renderer-parity.md`: "Parity is currently uneven by design." Target
  is "recognizable CultUI fidelity", not pixel identity. Table rows: Flutter
  "Needs native window capture and tighter text/style normalization"; iOS "Not a
  plugin projection acceptance target"; Android Kotlin "Not a plugin projection
  acceptance target"; Fensalir "External adapter spike, not active parity
  runtime".
- `Eve/docs/parity-testing-harness.md` (681 lines): a manifest
  (`tools/parity/parity-manifest.json`) of fixtures x runtimes, PNG captures per
  platform (phone/tablet/desktop; SSH capture on Nightwing, Periwinkle, iOS),
  runtime capability manifests, and exported gap ledgers
  (`capabilityGaps[]`, `worldSurfaceLoweringGaps[]`,
  `runtimePluginProjectionGaps[]`, command-boundary coverage). Parity is
  asserted on features/claims and screenshots, not on computed geometry.
- Eve git: 381 commits; 18 match layout/parity/wrap/overflow (e.g. `e81c81b
  Measure Sai web layout probe`, `c0c17be Add web layout probe evidence`,
  `c4cd5b5 Polish native Odin wall layout`).

**Live CultMesh loop.**
- `renderer-parity.md`: web reference "Needs live Odin/CultMesh provider feed
  and command round-trip tests"; Android Flutter "Needs live provider picker and
  command transport beyond fixture assets"; iOS "still needs provider picker
  and command transport". The local provider list is a fixture catalog
  (`web/local-provider-catalog.json`); live discovery "still belongs to
  CultMesh/Odin advertisements".
- Operator words on reload, auto-resolving state pointers, failing commands and
  a schema-rejected command result (1.1).

**Text and input.**
- `Eve/docs/input-capabilities.md` exists; no Eve doc mentions IME, caret or
  screen readers (grep of `Eve/docs/*.md` for `ime|caret|accessib|aria|screen
  reader` hit only the "accessibility semantics" ownership line above).
  `control.input` is a kind (`surface-contract-v1.md` l.105). Text styling
  normalization is a named Flutter gap. Font fallback for Japanese is a
  contract requirement (l.372-387).

**Repo shape.** Eight repos (Eve, EveUnity, EveFlutter, EveElectron, EveTui,
EvePlugins, EveConformance, AetheriaEve); last commits 2026-07 to 2026-09
(`thing-campaign.md` B1). The Unity CultUI package in CultLib "fell behind"
(operator) and is a separate lineage.

### 1.3 Agent inferences (not operator words)

- "The composition model learns from the old Unity CultUI without preserving its
  construction accident ... not vertical-first layout" (`surface-contract-v1.md`
  l.56-58, agent-written doc).
- The repo-strategy text attributed in 1.1 to 2026-07-10 reads like an agent's
  plan; its authorship in the user turn is a fact, its origin is not.
- Pairing of operator complaints with the absence of a shared solver (1.2) is
  this pass's juxtaposition, not a recorded diagnosis.

---

## Part 2: layout and UI foundations

### 2.1 Clay (nicbarker/clay), read from README and GitHub API today

- **Licence** Zlib. Single header `clay.h`, C99/C++20, no dependencies. 18.2k
  stars, 279 open issues, last push 2026-05-20; latest release **v0.14,
  2025-06-06** (v0.13 2025-02, v0.12 2024-10). Pre-1.0.
- **Model**: per frame, `Clay_SetLayoutDimensions` -> `Clay_SetPointerState` ->
  `Clay_UpdateScrollContainers` -> `Clay_BeginLayout` -> `CLAY()` declarations
  -> `Clay_EndLayout(deltaTime)` returns a sorted `Clay_RenderCommandArray`
  (README l.617-621, l.109). Immediate-mode declaration; Clay retains element
  state internally by ID (`CLAY_ID`, `CLAY_IDI` for loops, l.305-309). Memory is
  a caller-provided arena (`Clay_MinMemorySize`, `Clay_Initialize`); multiple
  contexts allowed (l.587-601).
- **Layout model**: flex-like row/column (`layoutDirection`
  `CLAY_LEFT_TO_RIGHT`/`TOP_TO_BOTTOM`), `padding`, `childGap`, alignment;
  sizing `CLAY_SIZING_FIT | GROW | FIXED | PERCENT` with min/max. No CSS Grid,
  no wrap-to-next-row container in the sizing set.
- **Render commands** (complete enum in README): `NONE, RECTANGLE, BORDER,
  TEXT, IMAGE, SCISSOR_START, SCISSOR_END, OVERLAY_COLOR_START,
  OVERLAY_COLOR_END, CUSTOM`. Text commands are emitted one per wrapped line
  (l.1034). Transitions API with `deltaTime` (l.7, l.489).
- **Text measurement**: user callback `Clay_SetMeasureTextFunction(...)`
  returning width/height; "It is essential that this function is as fast as
  possible"; Clay caches measurements internally (l.643-649). Wrap modes:
  words, newlines, none. Shaping, fonts, bidi are the host's.
- **Scroll and floating**: scroll containers via `Clay_UpdateScrollContainers`
  (wheel and drag, smoothing by deltaTime) and `Clay_GetScrollOffset`;
  floating elements with `attachTo` (e.g. `CLAY_ATTACH_TO_PARENT`) and
  z-index, outside normal flow (l.419).
- **Input helpers**: `Clay_SetPointerState`, `Clay_Hovered()`,
  `Clay_OnHover(cb)`, `Clay_PointerOver(id)`. Hit boxes are "from the last
  frame"; README suggests running layout twice per frame if that matters
  (l.368-373). No keyboard focus model.
- **Not present**: the README has no mention of text input/editing, IME,
  keyboard focus or accessibility (grep empty). The web HTML renderer
  `renderers/web/html/clay-html-renderer.html` contains no `aria`/`role`
  attributes (grep count 0).
- **Bindings**: README "supported bindings": Odin (in-repo) and Rust
  (`clay-ui-rs/clay`; crate `clay-layout` 0.4.0, updated 2025-06-03, 3,779
  downloads). Other implementations: three Go ports. **No C#, TypeScript, Dart,
  Swift or Kotlin binding is listed**; the web path is the C header compiled to
  wasm with clang ("15kb uncompressed .wasm", README l.9).
- **Renderers in repo** (`renderers/`): GLES3, SDL2, SDL3, cairo, playdate,
  raylib, sokol, termbox2, terminal, web (`canvas2d`, `html`, prebuilt
  `clay.wasm`), win32_gdi.
- **Performance claim**: "Microsecond layout performance" (README l.5); no
  benchmark table in the README.

### 2.2 Taffy (DioxusLabs/taffy)

- MIT. 3.6k stars, pushed 2026-10-03, release v0.14.0 2026-08-24.
- Implements CSS **Block, Flexbox and CSS Grid** (README l.15). Retained tree
  `TaffyTree<NodeContext>` with `new_leaf`, `new_with_children`,
  `compute_layout`, `layout(node)`; also a low-level trait API for hosts that
  own their own tree **[background: `LayoutPartialTree` etc.]**. Leaf measure
  functions supply text/intrinsic sizes; Taffy does no text layout (README
  benchmarks note: "require text layout, which neither yoga nor taffy
  implement").
- Users listed in README: Servo, Blitz, Bevy, Takumi, iocraft (terminal UIs),
  Slint, Lapce/Floem, Zed/GPUI.
- Bindings: Python (`stretchable`); C and WASM bindings are **WIP PRs**
  (#404, #394). No official C#/TS/Dart binding.
- Tests: "Flexbox layouts are tested by validating that layouts written in this
  crate perform the same as in Chrome": HTML fixtures in `test_fixtures/`,
  `just gentest` drives Chrome via webdriver and generates Rust tests into
  `tests/generated` (CONTRIBUTING.md l.26-35).
- README benchmarks vs Yoga (M1 Pro, layout only): comparable, each wins some
  (e.g. 1,000 nested nodes 329 µs Taffy vs 365 µs Yoga; 100k wide 247 ms vs
  136 ms).

### 2.3 Yoga (facebook/yoga)

- MIT. 18.9k stars, pushed 2026-10-01; latest release v3.2.1 2024-12-13; npm
  `yoga-layout` 3.2.1.
- "An embeddable and performant flexbox layout engine with bindings for
  multiple languages." Repo top level: C++ core (`yoga/`), `java/`,
  `javascript/` (wasm), `Package.swift`; no C# directory today.
- Users **[background]**: React Native, Litho, ComponentKit; Unity UI Toolkit
  follows Yoga's layout principles (Unity manual, read today).
- Tests: `gentest/` (`gentest-driver.ts`, `fixtures/`, `test-template.html`)
  generates cross-language tests from browser-computed layouts, the same
  pattern Taffy copied. Flexbox only, no Grid.

### 2.4 Contrast, briefly

- **Morphorm** (vizia/morphorm): MIT, 334 stars, pushed 2026-08-21. Layout by
  stacking with "space" and "stretch" units rather than CSS rules
  **[background on the unit model]**; used by Vizia.
- **egui** **[background]**: immediate mode, single-pass layout during
  declaration (sizes known only after drawing, hence "sizing pass" tricks);
  output is `epaint` clipped shapes/meshes to thin backends (wgpu, glow,
  web canvas via eframe); integrates AccessKit; text editing is in-crate.
- **Slint**: uses Taffy (README list) under its own declarative language;
  renderers femtovg/Skia/software **[background]**.
- **Flutter** **[background]**: retained RenderObject tree, "constraints go
  down, sizes go up"; the engine paints display lists via Skia/Impeller.
  On the web, CanvasKit draws to canvas while a parallel DOM semantics tree
  (`flt-semantics`) carries accessibility and a hidden DOM input element
  carries text editing and IME.

### 2.5 Pattern: typed retained document -> layout -> render commands -> thin backends

- Clay is the direct instance of the last two arrows: one solver, a closed
  10-type command list, backends that only draw rectangles/borders/text
  lines/images/scissors (`renderers/*`, including terminal and termbox2).
- Taffy and Yoga cover the solver over a retained tree; the host owns the tree
  shape, the measure callbacks and painting.
- Parity techniques found in primary sources:
  - Taffy and Yoga: **generated geometry tests from a reference browser**
    (`test_fixtures` + gentest), asserting computed boxes, not pixels.
  - Eve today: screenshot captures per device plus capability/gap ledgers
    (`parity-testing-harness.md`); no geometry or render-command assertion.
  - With a single solver emitting commands, the command array is a
    renderer-independent artifact that can be compared directly; no project
    read in this pass publishes such a golden-command suite (not found, not
    searched exhaustively).

### 2.6 Text input and accessibility for canvas-style renderers on the web

- **AccessKit** (BSD-3 and MIT/Apache files in repo; pushed 2026-09-29): a
  schema for an accessibility tree pushed by the toolkit; "only the platform
  adapter needs to retain a complete accessibility tree", which the README
  says suits immediate-mode toolkits. Released adapters: Android, iOS, macOS,
  Unix (AT-SPI), Windows (UIA). **Web adapter is listed under "Planned
  adapters": "web (for applications that render their own UI elements to a
  canvas)"**. C bindings (`accesskit-c`) and Python bindings exist.
- **DOM mirroring** is the shipped web practice in Flutter web (2.4,
  background) and is the only web path visible here; Clay's own HTML renderer
  emits plain DOM without ARIA.
- Text editing/IME: Clay, Taffy and Yoga all leave it to the host. Eve's
  browser lowering currently gets native inputs from the DOM it builds.

---

## Pointers

- Eve docs: `F:\Projects\Eve\docs\{thing-campaign,renderer-parity,parity-testing-harness,surface-contract-v1,cultui-style-system,cultmesh-streaming-ui-framework}.md`
- Lowerers: `F:\Projects\Eve\packages\eve-browser-lowering\src\index.ts`, `F:\Projects\EveFlutter\lib\main.dart`, `F:\Projects\EveUnity\packages\org.gamecult.eve.unity-uitoolkit\Runtime\EveUiToolkitSurfaceLowerer.cs`, `F:\Projects\EveTui\src\eve-tui-shell.mjs`
- Clay: github.com/nicbarker/clay (README, `renderers/`); Taffy: github.com/DioxusLabs/taffy (README, CONTRIBUTING.md); Yoga: github.com/facebook/yoga (`gentest/`); AccessKit: github.com/AccessKit/accesskit (README).
