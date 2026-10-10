# Thing 2.0: text shaping, text input/IME, focus, accessibility, GPU glyphs: prior art (Eyes pass, 2026-10-10)

Serves the fork **thing2-text-ownership**: who owns text shaping, text editing/IME, keyboard
focus and accessibility under the ruling `thing:ruling:thing2-one-solver-taffy`
(typed retained document, one Taffy solver, closed render-command list, thin backends).
Options: (a) Thing owns all, backends only draw; (b) hybrid, solver owns geometry and
backends place native controls/a11y nodes at solved rects; (c) something unnamed.
Item 6 (GPU glyph rasterization) is an operator scope addition.

Read-only facts with evidence pointers. No recommendation. Does not repeat
`thing2-foundation-prior-art.md` (Clay/Taffy/Yoga basics, AccessKit web "planned").
Marks: **(inferred)** = my juxtaposition; **[background]** = prior knowledge, not re-fetched.
Versions/dates are crates.io `max_stable_version`/`updated_at` and GitHub API, read 2026-10-10.

---

## 1. Rust text stacks that pair with Taffy

| Crate | Latest (date) | Licence | Role |
| --- | --- | --- | --- |
| parley | 0.12.0 (2026-10-09) | Apache-2.0 OR MIT (emoji crate MIT-only) | rich-text layout, selection/editing, IME primitives |
| fontique | 0.12.0 (2026-10-09) | [background: same repo, Apache-2.0 OR MIT] | font enumeration, fallback |
| cosmic-text | 0.19.0 (2026-04-22) | Apache-2.0 OR MIT | shaping + layout + editor in one crate |
| harfrust | 0.14.0 (2026-10-04) | [background: MIT] | HarfBuzz port; shaping |
| rustybuzz | 0.20.1 (2024-11-12; no release since) | [background: MIT] | older HarfBuzz port |
| swash | 0.2.10 (2026-07-17) | [background: Apache-2.0 OR MIT] | scaling/rasterising |
| fontdb | 0.24.0 (2026-07-29) | [background: MIT] | font DB |
| taffy | 0.14.0 (2026-08-24) | MIT | layout |

- **parley** github.com/linebender/parley README: "provides an API for implementing rich text
  layout"; shaping by HarfRust, bidi by ICU4X, line breaking in Parley, "utilities for text
  selection and editing", fontique for fallback, skrifa for outlines, ICU4X for segmentation.
  753 stars, MSRV 1.88 (README). Repo tree has `parley/src/editing/{editor,selection}.rs` and
  `examples/editor/src/{accessibility,access_ids}.rs` (AccessKit text example). PRs: "Implement IME
  primitives for PlainEditor" #136 (closed 2025-01-21), "Add editor features required for Android IME"
  #334 (2025-06), IME baseline-jitter / text-doubling fixes #599, #601 (2026-04/05). Slint's
  `accessibility-text` feature enables `parley?/accesskit`.
- **cosmic-text** github.com/pop-os/cosmic-text: 2.2k stars, 841 commits. README: HarfRust shaping,
  bidi, swash rendering, own font fallback built from Chromium/Firefox lists; roadmap lists text
  editing, selection, bidi selection, copy/paste, click detection (page does not say which are
  done). IME not mentioned. Cargo.toml: harfrust 0.5, skrifa 0.40, fontdb 0.24, unicode-bidi,
  unicode-linebreak, unicode-segmentation; features `no_std`, `wasm-web`.
- **Who uses which** (manifests on `main`, read today):
  - **Bevy**: `bevy_ui` -> taffy 0.14, accesskit 0.25; `bevy_text` -> parley 0.11, swash 0.2.6.
    IME PRs #23795 / #23841 "Text input IME support" closed 2026-04-21; #24421 "Fix IME text input
    wrapping" closed 2026-06-06. [background: Bevy used cosmic-text before.]
  - **Slint**: Taffy 0.10, flexbox feature only (`internal/core/Cargo.toml`); `shared-parley` is a
    default feature; parley 0.11.1; `accessibility-text` feature; accesskit 0.24, accesskit_winit 0.33.
  - **Blitz** (DioxusLabs): Stylo (CSS) + Taffy (box layout) + Parley (text layout) per README;
    `blitz-dom` has `events/ime.rs` and `accessibility.rs`; feature `accessibility = ["accesskit"]`;
    `blitz-shell` = winit + AccessKit + muda. README: "beta ... many bugs and missing features".
  - **Xilem/Masonry**: README: winit, Parley/Fontique, AccessKit. `masonry_core` depends on accesskit
    and parley; widgets `text_area.rs`, `text_input.rs`. masonry/xilem 0.4.0 on crates.io are
    2025-10-29 (repo pushed 2026-09-14). README: "experimental".
  - **GPUI (Zed)**: `crates/gpui` depends on taffy and accesskit; `font-kit` default feature;
    per-platform text systems (`gpui_apple/src/text_system.rs`, `gpui_wgpu` with font-kit,
    `gpui_web/src/{text_system,canvas_text}.rs`). AccessKit PRs #54398, #56065, #64212, #64214 all
    closed (merged vs not not checked), latest 2026-09-24.
  - **COSMIC / iced**: cosmic-text is pop-os's own crate [background].
  - **iocraft** (terminal): Taffy 0.5.2 flexbox, unicode-width 0.1.13 (section 5).
  - **egui**: accesskit workspace dep; own text layout [background].
- Taffy has no text layout; leaf measure functions supply sizes (prior-art doc 2.2).

## 2. How Taffy-based toolkits do text input and IME

- **Masonry/Xilem (desktop)**: IME flows from winit into `TextArea`. Issues in
  github.com/linebender/xilem: "Re-add IME support" #762 (closed 2024-11-30), "Ensure that IME events
  interact with focus as expected" #1004, "Improve IME area reporting and set IME area in
  TextArea" #785, open #1692 "TextArea: on Ime::Disabled use finish_compose()" (2026-03-26),
  baseline-jitter fixes #1716 / #1718 (2026-04). Editing buffer is Parley's `PlainEditor` (inferred
  from parley #136 + masonry text_area). `xilem_web` is a separate DOM backend (README: "a web backend
  and a Masonry backend"); no Masonry-on-canvas web build found.
- **Blitz**: `blitz-dom/src/events/ime.rs` `handle_ime_event` sends `BlitzImeEvent` to the focused
  node's `text_input_data_mut().apply_ime_event(font_ctx, layout_ctx, event)`: text input state lives
  in the DOM node, not a native control. Shell is winit; README lists no web target.
- **Bevy UI**: IME merged 2026-04/06 (above); accessibility in `bevy_a11y`.
- **Slint**: docs.slint.dev/latest/docs/slint/guide/platforms/web: "Accessibility features (such as
  screen readers) are not available" (WebGL canvas, no DOM); Wasm uses Winit backend + FemtoVG;
  "running Slint in the browser is currently not recommended for building general-purpose web
  applications". Text input / IME on web not addressed on that page.
- **GPUI web** (`crates/gpui_web/src/ime_mirror.rs` header): "The hidden `<textarea>` that connects
  browser IMEs to GPUI". It mirrors a window of document text (UTF-16 units each side of the
  selection) into the textarea because IMEs "decide what backspace, autocorrect, and suggestions mean
  by inspecting the focused editable element's value and selection"; every write makes the browser
  restart the IME connection, so writes are coalesced to one per event-loop turn.
  `canvas_text.rs` rasterises glyphs via OffscreenCanvas 2D (4096 px max raster dimension).
- **egui web**: `crates/eframe/src/web/text_agent.rs`: "a hidden `<input>` element used to capture
  IME and mobile keyboard input events", opacity 0, pointer-events none, 1x1 px, parked over the
  canvas corner "so that focusing it can never scroll some other part of the page into view".
  PR #8273 (closed 2026-08-23): the agent created "dead zones" swallowing clicks right of the cursor.
  #8078 (2026-04) "Delegate handling of IME interruptions to integrations to fix virtual keyboard
  flickering on web". `eframe/src/web/screen_reader.rs` is Web Speech `speak()`, not an a11y tree.
- **Flutter web (text)** `engine/src/flutter/lib/web_ui/lib/src/engine/text_editing/text_editing.dart`:
  a real `<input>`/`<textarea>`, transparent color and caret, positioned by `transform` from
  framework-sent geometry; per-browser strategies (iOS moves it off-screen and re-places after 100 ms;
  Firefox listens `keyup`/`select`; Safari desktop skips focus and blur). Comments cite flutter issues
  98817 (skip re-placing during IME composition), 136006, 71275 (Safari ignores zero-sized fields),
  155265, 189744 (iOS blur during caret drag drops keyboard), 180652 (keep real field in its semantics
  node for tab order), 178743 (iOS no scroll-into-view in iframes); a TODO calls focus pulling
  "grabby" (166857). File read to char 100000 of 111416.
- Pattern: egui, GPUI web, Flutter web all use a hidden/transparent native text element for IME with
  toolkit-pushed geometry (inferred from the three files above). Slint says nothing.

## 3. Accessibility and EditContext

- **AccessKit** github.com/AccessKit/accesskit: BSD-3-Clause (GitHub API; some crates Apache-2.0,
  e.g. accesskit_xplat), 1.5k stars. accesskit 0.25.1 (2026-09-25), accesskit_winit 0.34.1,
  accesskit_unix 0.24.0. README released adapters: Android, iOS, macOS, Unix (AT-SPI), Windows
  (UIA). **Web still under "Planned adapters"**: "for applications that render their own UI elements
  to a canvas". No web-adapter issue found (search "web" returned #561 "How closely to follow the
  WAI-ARIA roles spec/naming?" open since 2025-05; #705 "Add a property to allow exposing DOM ID"
  closed 2026-08-25; #565 "iOS adapter" open; docs PRs #753/#760 "Document ARIA mappings"
  2026-07/08). Inference: groundwork for DOM mapping, not an adapter.
- **Integrators with Taffy-driven trees**: Bevy (`bevy_a11y`), Blitz (`BaseDocument::build_
  accessibility_tree` -> `accesskit::TreeUpdate`; tests `accessibility_roles.rs`,
  `accessibility_hidden.rs`), Masonry, Slint (desktop only), GPUI (annotation API PRs), egui.
  Blitz ships `accesskit_xplat 0.2.1` (winit-free adapter) whose README warns that AccessKit
  developers "have noted that the approaches used by both this crates and accesskit_winit may not be
  the optimal way" (accesskit PR #656 comment).
- **Flutter web semantics** docs.flutter.dev/ui/accessibility/web-accessibility: Semantics tree is
  translated to an accessible HTML DOM with ARIA roles; "For performance reasons, Flutter's web
  accessibility is not on by default"; enabled by an invisible `aria-label="Enable accessibility"`
  button or `SemanticsBinding.instance.ensureSemantics()`. No cost quantified. Open
  github.com/flutter/flutter issues read 2026-10-10: #194011 "Clip semantics DOM text labels to stop
  stealing taps" (2026-10-08); #192466 "[iOS Safari] Long Semantics label overflows its button and
  intercepts taps on a later sliver" (2026-10-08); #191529 "prefer pointer events over semantics tap
  for mouse clicks on web"; #194109 "Remove the a11y placeholder only after the gesture ends";
  #172206 "excludeSemantics breaks aria-label on flutter web input for TextFormField"; #98160
  "Enable accessibility" read by screen reader even when auto-enabled; #118723 focus ring disappears
  when enabled in Chrome; #77283 not navigable with vimium-c. Pattern: semantics DOM layered over the
  canvas intercepts pointers and needs clipping (inferred).
- **EditContext** developer.mozilla.org/en-US/docs/Web/API/EditContext_API: "Limited availability",
  experimental, standards track. MDN browser-compat-data `api/EditContext.json`: Chrome 121+ (and
  Chromium derivatives), **Firefox not supported** (bugzil.la/1904161), **Safari not supported**
  (webkit.org/b/269922). MDN: you render the editable region yourself (canvas ok); EditContext holds
  text/selection/composition state; you must report selection and caret location (IME window
  placement) and apply format updates; MDN recommends an offscreen DOM view of the text for screen
  readers since canvas text is unreadable. Spec body: [background: W3C Editing WG draft].

## 4. Hosts that are not ours

### Unity (UI Toolkit TextField)
- docs.unity3d.com/Manual/UIE-uxml-element-TextField.html: `keyboard-type`, `auto-correction`,
  `hide-mobile-input`, `select-all-on-focus`, `select-word-by-double-click`, `max-length`,
  `is-delayed`, `emoji-fallback-support`, inherited `language-direction`. Page says nothing on IME,
  shaping or the advanced text generator.
- Legacy `Input.compositionString` / `compositionCursorPos` docs: built-in GUI draws composition; for
  your own GUI "you need to take care of displaying the string at the current cursor position" and
  report position via `compositionCursorPos`. Docs call the Input class legacy.
- Issue tracker: IN-147103 "Japanese IME candidate window overlaps the input field" (Unity 6, Win11
  and macOS standalone; field type unstated); 1171328 predictive text far from field for CJK (fixed
  2019.4/2020.1); UUM-100552 Japanese suggestion clears TextMeshPro field (fixed 6000.0.51f1).
  Whether UITK TextField is affected is **not established**.
- Local: EveUnity UITK lowerer (prior-art doc 1.2); no IME/caret doc in Eve.

### Flutter
- `TextInputConnection` (api.flutter.dev/flutter/services/TextInputConnection-class.html): the
  framework sends the host `setEditingState(TextEditingValue)`, `updateConfig`,
  `setEditableSizeAndTransform(Size, Matrix4)`, `setComposingRect`, `setCaretRect`,
  `setSelectionRects`, `setStyle`/`updateStyle` (family, size, weight, direction, align),
  `requestAutofill`, `show`/`close`. This is the data a self-rendered field pushes to the platform
  IME. No wire format or mandatory subset given on the page.
- `HtmlElementView` (docs.flutter.dev/platform-integration/web/web-content-in-flutter): reserves
  layout space for a DOM element; "underlying platform views might sometimes swallow pointer events
  before they can reach Flutter"; documented fix `pointer_interceptor` (transparent platform view
  behind overlapping widgets: buttons, drawers, dialogs, menus). Page silent on clipping, scroll,
  z-order, performance. flutter#115679 (open, updated 2025-10-14) "[web] (Potential) Performance
  regression when scrolling platform views".

### Overlay failure modes with sources
- Click interception by hidden/overlapping elements: egui #8273; Flutter docs; Flutter #194011, #192466.
- Focus loss / keyboard: Flutter text_editing.dart comments (189744, 155265, 166857).
- IME restarts on value writes: GPUI `ime_mirror.rs` header.
- Page scroll on focus: egui text_agent comment; Flutter iOS 100 ms re-placement; 178743.
- Safari ignoring zero-sized fields: Flutter 71275.
- Scroll sync / clipping of overlays in scrolled canvas content: only flutter#115679 found; no
  first-hand scroll-sync source (not searched exhaustively).

## 5. TUI cell measurement

- **iocraft** github.com/ccbrown/iocraft (0.9.1, 2026-09-04, 188k downloads; `packages/iocraft/Cargo.toml`):
  taffy 0.5.2 (flexbox + taffy_tree only; far behind 0.14), unicode-width 0.1.13, crossterm 0.29.
  `components/text.rs`: Taffy `measure_func` wraps content with `s.wrap(width)` and returns the max
  `line.width()` (UnicodeWidthStr); modes Wrap / NoWrap; `MinContent` wraps at width 1. `canvas.rs`:
  draws per character group, advances `x += value.width().max(1)`, clips in cells; doc: "Character
  groups containing only zero-width marks reserve one column"; special case for U+FE0F with a
  `compatibility()` callback adjusting padding. `text_input.rs` keeps `cursor_offset: State<usize>`;
  no IME handling seen. Grep for "grapheme" in text.rs / canvas.rs / text_input.rs found none; where
  character groups are segmented was not traced.
- **ratatui** (not Taffy): layout via `kasuari` 0.4.9 (Cassowary), `unicode-width >= 0.2.0` (version
  pin explained in ratatui issue #1271), `unicode-segmentation`, `unicode-truncate 3`.
- unicode-width 0.2.2 (2025-10-06); unicode-segmentation 1.13.3 (2026-06-01).
- Local: `EveTui/src/eve-tui-shell.mjs` (297 lines); no cell-width logic read in this pass.
- No second Taffy-based TUI toolkit examined.

---

## 6. GPU glyph rasterization (operator scope addition)

### 6a. Slug
- **Patent**: terathon.com/blog/decade-slug.html: "effective today, I am permanently and irrevocably
  dedicating the Slug patent to the public domain", **2026-03-17**; US 10,373,352 (granted 2019, would
  have run to 2038); USPTO SB/43 disclaimer filed.
- **Repo** github.com/EricLengyel/Slug ("Reference code for the Slug Algorithm"), 1,547 stars, pushed
  2026-04-15. Files: `SlugPixelShader.hlsl`, `SlugVertexShader.hlsl`, `LICENSE`, `LICENSE-MIT`,
  `LICENSE-APACHE`, `NOTICE`, `README.md`. **Licence detail**: `LICENSE` says dual MIT or Apache-2.0 at
  your option; shader headers say MIT, "Copyright 2017, by Eric Lengyel"; GitHub API reports
  `NOASSERTION`. README adds "may be freely used by anyone for any purpose ... If you do use this code
  in software that gets distributed in any way, then you are required to give credit." Blog says MIT.
- **Shaders cover**: pixel shader `SlugRender` (curve texture 4096 wide, 4x16-bit float; band texture
  2x16-bit uint; horizontal and vertical bands per glyph; per-band curves sorted by max coordinate;
  winding number per ray). Vertex shader includes **dynamic dilation**, which JCGT 2017 did not cover
  (blog). Blog: multi-colour emoji drawn as stacked glyph layers each with a bounding polygon (replaced
  a loop-in-shader design); adaptive supersampling removed; dilation addresses tiny and large text; the
  optional band split optimisation removed; band data reduced to two 16-bit components. Quadratic
  Beziers only (lines encoded {p1,p2,p2}). **Hinting**: README: "This algorithm ignores font hinting";
  suggests picking size so `size * sCapHeight` is an integer. Repo holds shaders only: no layout,
  shaping, atlas or texture builder (README tips describe the CPU preprocessing the host must do).
- **JCGT 2017**: Lengyel, "GPU-Centered Font Rendering Directly from Glyph Outlines", JCGT 6(2),
  jcgt.org/published/0006/02/02 (page did not extract; abstract paraphrased from a search result of
  the paper.pdf): antialiased text from outline data on the GPU, no precomputed textures or distance
  fields; fixes numerical-precision artifacts of prior art; avoids divergent branching; accurate under
  affine and projective transforms.
- **Open implementations** (GitHub search 2026-10-10, not exhaustive):
  - gabdube/rust-slug-wgpu: MIT, 15 stars, pushed 2026-04-15, "demo, not a rust crate. The code is not
    production ready"; WebGPU with storage buffers instead of textures; dynamic dilation not ported.
  - zzstar17/ash-slug: MIT, 1 star, 2026-09-29: preprocessing for Slug shaders (Vulkan/ash).
  - countertype/three-text: MIT, 126 stars, 2026-07-04: Three.js/WebGL/WebGPU adapters, HarfBuzz
    (harfbuzzjs wasm) shaping, Knuth-Plass justification, glyph caching (Slug use not confirmed in
    the README lines read).
  - No published wgpu crate or WebGL2 reference port found.
- **Commercial Slug Library** (sluglibrary.com): "Full source is included with every license" (source
  available, not open source); single-engineer licence one-time $1,500 USD, unlimited commercial
  products, free updates while solo. Beyond the algorithm: UTF-8 layout services (glyph positions);
  kerning, ligature replacement, combining-mark placement, character composition, alternates;
  OpenType stylistic alternates, small caps, oldstyle figures, sub/superscripts, fractions; full-colour
  emoji incl. skin tones and ZWJ sequences. **Bidi/RTL: not mentioned**; complex scripts not explicitly
  claimed; full shaping not claimed; dynamic effects and hinting not mentioned. APIs: Vulkan,
  D3D10/11/12, OpenGL 3.0-4.6, Metal, **WebGL2**, consoles. Blog names Activision, Blizzard, id, 2K,
  Ubisoft, Warner Bros., Insomniac, Zenimax, Adobe as licensees.

### 6b. Vello family (github.com/linebender/vello, Apache-2.0, 4.4k stars, pushed 2026-10-09)
- README "Choose a renderer": **Vello CPU** (`vello_cpu` 0.3.0, 2026-10-02, 5.7M downloads) is "the most
  mature choice"; **Vello GPU** (`vello_gpu` 0.3.0, 2026-10-02, 4.8k downloads) does CPU-side path
  preprocessing, GPU rasterisation and compositing of sparse strips, "supports a native WebGL2 backend
  and a wgpu backend without requiring compute shaders", "intended to become the primary renderer for
  production GPU use cases as it matures; Vello CPU is currently overall more mature". **Vello
  compute** (`vello` 0.11.0, 2026-10-02, 983k downloads) lives under `research/`, "an experimental
  implementation for compute-capable GPUs".
- `vello_hybrid` 0.2.0 (2026-08-07) is the earlier crate name of the sparse-strips GPU renderer
  (inferred from README + issue titles); 2026-09 open issues are WebGL polish (#1625, #1943, #1167).
  `vello_gpu/src/lib.rs` features: `wgpu` (default), `webgl` ("browser support, using GLSL"), `text`.
- Text: `glifo` 0.4.0 (2026-10-02, Apache-2.0 OR MIT, 3.2M downloads): "APIs for efficiently rendering
  glyphs and paint styles"; README: "under rapid development. Consider it experimental for now".
  Takes glyphs + positions, caches rasterised glyphs in an **atlas** (`glifo/src/atlas/*`), has
  `colr.rs` (COLR colour glyphs), `HintCache`, `FontEmbolden`, optional `png` (bitmap glyphs); shares
  "the hinting instance and hinted advance" between shaper and renderer. `Scene::glyph_run` consumes
  runs. Parley (same org) produces runs (inferred; parley README does not name glifo).
- GPU requirements: wgpu backend needs no compute shaders; WebGL2 backend is native GLSL; the compute
  renderer needs compute-capable GPUs (README wording).

### 6c. SDF / MSDF atlases (contrast)
- **msdfgen** github.com/Chlumsky/msdfgen: MIT, 4,952 stars, pushed 2026-08-29: multi-channel signed
  distance field generator; MSDF uses "all three color channels" to reproduce sharp corners "almost
  perfectly"; `mtsdf` adds a true SDF in alpha. Per-glyph distance-field atlas sampled by a shader.
- [background] Valve 2007 SIGGRAPH "Improved Alpha-Tested Magnification" introduced SDF text atlases;
  single-channel SDF rounds corners; MSDF fixes corners (Chlumsky thesis, CTU Prague 2015); none
  address hinting or very small sizes well; colour emoji need a separate bitmap/COLR path. Not
  re-fetched.
- Contrast with Slug (README + blog above): Slug stores curve and band tables, not rasterised
  images; SDF/MSDF store pre-rasterised distance atlases.

---

## Pointers
- Prior Eyes doc: `F:\Projects\Eve\docs\research\thing2-foundation-prior-art.md`
- Ruling: eureka mind `thing:ruling:thing2-one-solver-taffy`
- Sources: github.com/linebender/{parley,vello,xilem}; github.com/pop-os/cosmic-text;
  github.com/DioxusLabs/blitz (`packages/blitz-dom/src/{events/ime.rs,accessibility.rs}`);
  github.com/zed-industries/zed `crates/gpui_web/src/ime_mirror.rs`;
  github.com/emilk/egui `crates/eframe/src/web/text_agent.rs`;
  github.com/flutter/flutter `engine/src/flutter/lib/web_ui/lib/src/engine/text_editing/text_editing.dart`;
  github.com/AccessKit/accesskit; github.com/ccbrown/iocraft `packages/iocraft/src/{components/text.rs,canvas.rs}`;
  github.com/EricLengyel/Slug; terathon.com/blog/decade-slug.html; sluglibrary.com;
  jcgt.org/published/0006/02/02/; MDN EditContext_API; docs.slint.dev web platform guide;
  docs.flutter.dev web-accessibility and web-content-in-flutter.

## Gaps
- No numbers for Flutter semantics DOM cost; `flt-semantics` structure not read.
- No measured scroll-sync failure source for native-control overlays beyond flutter#115679.
- Unity UITK TextField IME behaviour not established.
- iocraft grapheme segmentation origin not traced; Slug licence README credit clause differs from the
  blog's plain "MIT".
- No Masonry-on-web and no Taffy + AccessKit-web combination found.
