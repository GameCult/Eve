# Thing 2.0: prior art for the contract forks (Imagination, 2026-10-10)

Forks served, all raised in `thing2:campaign:self`: `thing2:question:code-home`,
`thing2:question:thing-script-form`, `thing2:question:advertisement-owner`,
`thing2:question:port-cutover`. Agent `imagination-thing2-contract`, session
`self-2026-10-10c-eureka`. Facts read today through `gh api repos/<r>/contents`
(top-level and named subdirectories); **[background]** marks prior knowledge not
re-fetched in this pass. It does not repeat `thing2-foundation-prior-art.md` or
`thing2-text-input-a11y-prior-art.md`.

## 1. How established toolkits split their code across repos (fork `code-home`)

| Project | What one repo holds (read today) | What lives in other repos |
| --- | --- | --- |
| Slint (`slint-ui/slint`) | `internal/` = compiler, core, interpreter, `backends/` (android-activity, linuxkms, qt, selector, testing, winit), `renderers/` (anyrender, femtovg, skia, software); `api/` = cpp, node, python, rs, wasm-interpreter. `api/node` is a Rust napi crate (`Cargo.toml`, `build.rs`, `binding.cjs`) in the same tree. | none needed for the shipped language APIs |
| egui (`emilk/egui`) | `crates/` = egui, epaint, emath, ecolor, eframe, egui-wgpu, egui-winit, egui_glow, egui_kittest (tests), egui_extras, egui_plot, demo app | community backends (Bevy, macroquad) live with their hosts **[background]** |
| iced (`iced-rs/iced`) | core, runtime, widget, renderer, wgpu, tiny_skia, winit, graphics, futures, test, tester | none for first-party backends |
| Xilem (`linebender/xilem`) | masonry, masonry_core, masonry_winit, masonry_testing, xilem, xilem_core, xilem_web | Parley and Vello are separate linebender repos (independently consumed libraries) |
| AccessKit (org) | `accesskit` = schema crate, consumer, every platform adapter | `accesskit-c` (C bindings, CMake) and `accesskit-python` (maturin) are separate repos |
| Flutter | `flutter/flutter` now holds `engine/` beside `packages/`; `flutter/engine` is archived (last push 2025-02-25). The engine was merged into the framework repo to end cross-repo "rolls" **[background on the reason]**. | plugins and federated platform packages live in `flutter/packages` **[background]** |
| Adaptive Cards (`microsoft/AdaptiveCards`) | `source/` = android, dotnet, ios, nodejs, uwp, shared: every host renderer of one card schema in one repo; `source/nodejs` adds `adaptivecards-templating`, `ac-typed-schema`, the designer | hosts (Teams, Outlook) are not in the repo |
| Taffy | one crate, `test_fixtures/` + generated tests | Python binding `stretchable` is a third-party repo |

Pattern: the schema, the core and the first-party backends and language bindings
share one repo when they share one build system or can be built from one
workspace. Separate repos appear where a binding needs a different packaging
toolchain (AccessKit C/Python) or is an independently consumed library (Parley,
Vello). Flutter is the counter-example in the other direction: two repos with a
version roll between them were merged into one.

The operator's July concern (`thing2-foundation-prior-art.md` 1.1, 2026-07-10)
names what made the Thing 1 monorepo risk a swamp: "every runtime build system,
plugin fixture, platform SDK, and product demo starts sharing one git status".
Under the Thing 2.0 target, plugin fixtures and per-renderer lowerers do not
exist (invariants `compose-not-kind`, `closed-commands`); the remaining platform
SDKs with their own toolchains are Unity (UPM, Unity Editor) and Flutter (pub,
Android/iOS SDKs). Neither has a live consumer (census section 5: EveUnity and
EveFlutter are BUILD only; Aetheria publishes nothing).

## 2. How surface documents are authored (fork `thing-script-form`)

- **Typed document published by services, rendered by hosts:** Adaptive Cards
  (JSON card schema; `ac-typed-schema` package read today; hosts render with
  their own HostConfig theme **[background]**). Data binding is a separate
  templating package (`adaptivecards-templating`, read today) that expands a
  template against data before render. Slack Block Kit: JSON blocks with builder
  libraries per language **[background]**.
- **Text language compiled to a typed tree:** Slint `.slint`, compiled by
  `internal/compiler` and also loadable at run time by `internal/interpreter`
  (both read today as directories); QML, XAML **[background]**.
- **Code builders only:** Flutter, SwiftUI, Jetpack Compose, egui, Xilem
  **[background]**. All are single-process: the tree never crosses a wire.
- **Body:** Thing 1 has both. The text DSL `web/eve-dsl.js` (544 lines) parses
  `.eve` fixtures; its local mesh lets a button `append`/`set` state directly in
  the renderer and computes `derive ... count|latest` there (`eve-dsl.js:103-155`).
  The C# builder `packages/org.gamecult.eve.surface/Runtime/EveSurfaceBuilder.cs`
  (876 lines) and every provider's hand-built JSON (census) are the builder side.
  Ruling `thing:ruling:operator-dsl-thing-script` names the authoring DSL Thing
  Script and keeps the retained tree schema-named; target r1 calls the published
  typed documents Thing Script.

## 3. Who owns service discovery (fork `advertisement-owner`)

- Body: `gamecult.eve.provider_advertisement.v1` (329 lines, 18 properties,
  11 required) carries Verse discovery (`verseId`, `serviceId`,
  `canonicalService`, `locatedService`, `cultMeshAddress`, `freshness`,
  `schemas`, `witnesses`) beside UI facts (`surfaces`, `commands`). Odin reads it
  as `EveProviderAdvertisementRecord { value: Value }`
  (`Odin crates/odin-core/src/documents.rs`, origin/main): an untyped blob.
  CultLib's CultMesh runtimes declare no service-advertisement document of their
  own (`git grep -i advertis` over `src/` and `packages/cultmesh-ts/src`: only
  transport endpoint and certificate-pin mentions). So the Verse's only provider
  discovery document lives in the UI library's namespace.
- Weksa also writes `gamecult.eve.interface_binding.v1` holding a third copy of
  its routes (`provider.endpoints`, `routes`) and its whole surface
  (`weksa-daemon.mjs:321-341`); Odin reads it as
  `EveInterfaceBindingCompatRecord { value: Value }`.
- Prior art: app or service manifests are separate from UI payloads in the
  service-driven UI systems above: a Teams app manifest declares bots and
  commands, and cards are message content **[background]**; service registries
  (Consul, Kubernetes Services) are not owned by any UI toolkit **[background]**.

## 4. How a cutover crosses many live consumers (fork `port-cutover`)

- Thing 1 plan (campaign `thing` revision 5): one Verse window, every E1 carrier
  flips together, because a rename of one kind cannot be read under two ids
  without an alias (ruling `thing:ruling:operator-compat-rebuild` forbids it).
- Expand/contract ("parallel change") and the strangler-fig pattern migrate
  consumers one at a time while the old and new paths coexist, then delete the
  old path when the last consumer leaves **[background: Fowler]**.
- Body: Thing 2.0 kinds are not renames of Thing 1 kinds. The document shape,
  the command envelope and the binding model differ (see the map's model page),
  so an aggregator reading both is reading two kinds, not one kind under two ids.
  Live viewers today: Ghostlight's web client (vendored `eve-browser-lowering`,
  `ajv` in `web/package.json`) and the Nightwing browser reference
  (`nightwing-eve-browser-reference`, `Repo = "Eve"`, runtime-enforced, `Deploy =
  $null`, gamecult-ops `idunn-deployment-targets.ps1:262-272`).
