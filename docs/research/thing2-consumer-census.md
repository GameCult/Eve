# Thing 2.0 consumer census

Campaign: `thing2`. Target: `thing2:target:r1`. Ruling cited: `thing:ruling:wire-rename-freeze-fold`.
Author: Eyes (agent `eyes-thing2-consumer-census`, session `self-2026-10-10c-eureka`), read 2026-10-10. Facts only; "(inferred)" marks a reading from patterns rather than a located line. No recommendation.

Purpose: size the floor of the four consumer-contract parts in `docs/thing2-target.md` (Thing Script documents, binding, commands with typed results, advertisement) from what consumers publish, bind and command today. It does not re-derive `docs/thing-campaign.md`; rows are cited as T (rename table), E1-E7 (edges), B1-B28 (body facts). Campaign B14 (102 eve ids, 24 repos carry the advertisement id), B15 (what Idunn runs), B16 (one Verse-wide discovery edge), B19-B24 stand and are not repeated.

## Method and limits

- Every repo read at its `origin` default ref (not the local branch), via `git grep` / `git show`. Heads read:
  Ymir `f8c0e39` (2026-09-29), CultLib `dbcb2a8e` (2026-10-10), EveUnity `92f0dbb` (2026-08-26), EveConformance `048ea2f` (2026-09-16), EveElectron `cba684c` (2026-09-13), EveFlutter `3511e5c` (2026-07-10), EvePlugins `c5a4a75` (2026-07-15), EveTui `01ea52f` (2026-07-10), AquaSynth `aed6525` (2026-09-13), Loki `b20fb98` (2026-06-13), repixelizer `06c1cf4` (2026-09-30), Sai `2e7be7e` (2026-07-10), Stonks `3f6e91c` (origin/codex/stonks-market-daemon, 2026-09-30; no origin/main default), StreamPixels `8d40541` (2026-10-03), Vili `8773c15` (2026-09-13), weksa `d16cff5` (2026-09-13), Bifrost `67072b2` (2026-10-10), Gjallar `6a92976` (2026-09-29), Odin `8e1de66` (2026-10-01), Ghostlight `327cbe3` (2026-10-10), Heimdall `7904e17` (2026-09-30), Hermodr `f8e6e84` (2026-09-06), Mimir `d88f2e6` (2026-09-14), Muninn `1d0ea0b` (2026-09-30), VoidBot `46d891b` (2026-09-13), Brokkr `f97d4dc` (2026-10-10), Aetheria `0caf1fa5` (origin/master, 2026-10-10), Eve `b7d154b` (2026-10-10), gamecult-ops `9aed01f` (2026-10-10; B15 pinned `e4042ee`).
- "Kind" counts come from regex over publisher source (JSON/JS/Rust/C#/Python literals `kind: "x"`, `"kind": "x"`, and builder-call names such as `pane(`, `.Metric(`). The vocabulary used to recognise a kind is the union of the kernel fixtures and `eve-browser-lowering`'s `kind ===` tests (70 names). Counts are literal-occurrence counts in publisher files, not runtime node counts. Publishers that build node trees from computed strings or typed structs are undercounted (inferred). Test, doc, dist and fixture paths excluded unless stated.
- "Advertisement fields filled" is a text match for the schema's property names in the publisher files; typed-struct publishers can hide fields from it (inferred).
- Aetheria publishes nothing: `git grep` for `gamecult.eve`, `EveSurface`, `cultui` in non-markdown files of `origin/master` finds one Obsidian index blob only. Its surfaces come through AetheriaEve (frozen, out of scope per target).
- Not located: Gjallar and Ghostlight do not appear in `scripts/idunn/idunn-deployment-targets.ps1` at `9aed01f` (Ghostlight has its own binding `idunn/yggdrasil/bindings/ghostlight.toml.in`; Gjallar's `gjallar.service` is as B15 states). Not re-derived.

## The kernel's own vocabulary (floor reference)

- Kernel fixtures: `web/fixtures/*.json` surface fixtures at Eve `b7d154b` hold 35 distinct node kinds over 12 fixture files (node = object with `id`, `kind` and props/children); 24 `card`, 34 `text`, 10 `metric`, 8 `input.number`, 7 `partition`, 7 `pane`, 7 `control.button`, 6 `surface`. Single-use kinds: `vn.stage`, `embed.norn`, `embed.tex`, `field.surface2d`, `graph`, `canvas.editor`, `dropzone`, `input.file`, `layer.cards`, `layer.embedded-surfaces`, `status.stage`, `panel.dialogue`, `text.dialogue`, `rail.actions`, `image.background`. (`thing2-target.md` says 41 kinds in the fixtures; the 35 here is the JSON surface fixtures only, `.eve` DSL fixtures use `card`/`text`/`list`.) Source: `/f/Projects/Eve` `web/fixtures/` (script `s/k1.py`).
- Kernel authoring/lowering mentions 70 distinct kind names across `eve-browser-lowering/src/index.ts` (`kind ===` tests: `rail`, `row`, `column`, `grid`, `form`, `modal`, `dashboard`, `cockpit`, `world.scene2d`, `world.scene3d`, `world.entity3d`, `inventory.grid`, `inventory.item`, `inventory.drag_session`, `list.item`, `control.*`, `input.*`, `image.sprite`, ...), the fixtures, and the C# builder.
- Kernel contract doc: `docs/surface-contract-v1.md:93-109` ("Kinds are semantic", primitives plus "domain kinds such as `vn.stage` when the provider needs richer semantics", fallback "through the kind path": `panel.dialogue` renders as `panel`); `:293-` bindings (`bindingName`, `writeCommand`, `captureBindings`, local drafts); `:255-` standard command names (`select`, `invoke`, `open-provider`, `story.*`, `style.patch`, `edit.value`, `toggle.visibility`, `transform.*`).

## 1. Per-consumer facts

Liveness key: LIVE = Idunn target running per B15 (cited, not re-derived); BUILD = build-time or library consumer; DORMANT = no deploy target and no commit within ~90 days of 2026-10-10 (or no target).

### Providers and Verse daemons (publishers)

**Ghostlight** `327cbe3` — LIVE (Yggdrasil, own binding; B15). Commits 90d: many (2026-10-10).
- Publishes: `gamecult.eve.surface.v1` via `crates/ghostlight-dungeon/src/eve.rs` (1007 lines). Kind literals: `text` x7 (:173), `card` x3 (:188), `control.input.textarea` x6 (:271), `control.input.text` x5 (:257), `control.input.number` x1 (:433), `control.button` x1 (:826), `surface` x1 (:808), `heimdall.access_gate` (:119), `heimdall.identity` (:236). 9 distinct kinds, 2 domain (`heimdall.*`). Provider/surface ids in `mesh.rs` (12 id hits).
- Binding: node `stateBindings` with `local_draft` entries `{targetProp:"value", pointerId:"ghostlight.local.<key>", sourceId:"eve.browser.local", schemaId:"gamecult.eve.local_draft.v1", routeKind:"in-process", bindingName, valueKind, accessMode:"local-draft", authority:"eve.browser"}` (`eve.rs:872-884`; 19 `stateBindings` hits, `eve.rs:259`). Capture of drafts: `captureBindings` sent under `payload.bindings` (`runtime.rs:144` comment). Relies on the renderer (vendored `vendor/eve` lowering via its own web client, B17) to hold drafts and resolve; server routes `/api/eve/{provider,surfaces/{id},commands,events}` (`runtime.rs:655-658`, from B17).
- Commands handled (operation ids, `runtime.rs:845-1476`; request schema map `eve.rs:708-720`): `heimdall.auth.begin` (`heimdall.auth_begin_command.v1`), `heimdall.auth.complete` (`heimdall.auth_complete_command.v1`), `app.auth.logout` (`ghostlight.app_logout.v2`), `world.create` (`ghostlight.world_create.v4`), `world.approve` (`..._v0`), `world.activate`, `world.advance_time`, `world.seed` (`ghostlight.world_seed.v1`), `world.play` (`ghostlight.world_play.v0`). 9 operations. Envelope validated at `eve.rs:665-700` (invocation schema `gamecult.eve.command_invocation.v1`, `receiptSchema` must equal `gamecult.eve.command_result.v1`, payload schema must equal the operation's). Result: `gamecult.eve.command_result.v1` built by `eve.rs:734 command_result`.
- Known rejected path (in source): `eve.rs:723-731` — a flat result is rejected whole by the browser ("invalid Eve command result: data must not have additional properties", no command completes) because the result schema admits exactly `schema, receipt, transientProjection, pluginPayload, draftDirective`. Schema: Eve `schemas/gamecult.eve.command_result.v1.schema.json` (`required: [schema, receipt]`).
- Advertisement: 17 of 18 schema properties matched in `mesh.rs` (all 11 required); also `plugin` surface docs via Heimdall (below).
- Test gap: four `#[ignore]` Eve-bridge tests run on no automated path (B17).

**Muninn (daemon + sleipnir)** `1d0ea0b` — LIVE (Starfire, Raven, Nightwing; B15).
- Publishes: `crates/muninn-daemon/src/main.rs:2637-2750` (`publish_move_hue_eve_surface`): `card` (:2655), `dashboard` (:2687), `pane` x5 (:2695), `text` x4 (:2698); surface key `surface:muninn.telemetry.<host>.move-hue` (`:611`). `crates/sleipnir-daemon/src/main.rs`: `card` x3 (:1034), `pane` x7 (:1104), `dashboard` x2 (:1121), `input.binding-map` (:1376), `binding.target` (:1401), `text` x2 (:1459). 6 distinct kinds across both; all primitives (inferred: `input.binding-map` is a kernel lowering kind, `docs/surface-contract-v1.md`/`index.ts`).
- Binding: records written to a CultCache node via `node.put(&surface_key, &surface)` with `EveSurfaceStateRecord` (`main.rs:2673-2753`); no stateBindings located (inferred: static snapshots republished each tick).
- Commands: reads `gamecult.eve.command.v1` documents (`main.rs:785`), command names `muninn.capture_stream_command` (:2966), `muninn.move_light_command` (:2978), `muninn.set-move-hue-program` (:2986); actions `start`/`stop` with `pending`/`running` states (:1185-1191); supersede logic for stale capture commands (:1172-1282). Receipts: command document default id `"eve-command"` (:840).
- Advertisement: 13 of 18 properties; `schemas` and `witnesses` (required) not matched (inferred: may be built elsewhere).

**VoidBot** `46d891b` — LIVE (swarm publisher on Yggdrasil; B15).
- Publishes: `scripts/render-voidbot-swarm-dashboard.mjs` builds the tree with `eveNode(id, kind, props, children)`: `metric` x13 (:1449), `pane` x10 (:1411), `text` x8 (:1412), `list` x7 (:1484), `grid` x3 (:1455), `row` x2 (:1397), `control.button` x2 (:1495), `cockpit` (:1378), `rail` (:1400), `control.slider` (:1428). 10 distinct, all primitives. Provider ads in `scripts/export-voidbot-provider-advertisements.mjs`.
- Binding: richest located use. Node props carry `stateBindings: [{targetProp:"text", pointerId:"globalHeat", sourceId:"voidbot.swarm_control_state:voidbot-swarm", schemaId:"voidbot.swarm_control_state.v1", routeKind:"cultmesh-rudp", routeDescription}]` (`render-...dashboard.mjs:1415-1421`). `statePointer`-family regex finds 175 hits repo-wide, mostly Persona/state-path code unrelated to Eve (inferred; the Eve use is the dashboard). Also `gamecult.eve.surface_state.v1` x9, `interface_binding.v1` x5 id mentions (e.json).
- Commands: `scripts/serve-voidbot-swarm-cultmesh.cjs:159-193` — accepts `gamecult.eve.command.v1`, only `command.command === "swarm.set_heat"` for `providerId "voidbot.swarm"` (:161), range check 0.05-2 throws (:164), applies `globalHeat` and writes `gamecult.eve.command_receipt.v1` (:182-193). One command.
- Advertisement: 9 of 18 properties; `serviceId`, `kind` (required) not matched.

**Vili** `8773c15` — LIVE (Raven; B15).
- Publishes: `scripts/vili-daemon.mjs:422-449` `eveSurface()` — nodes use the legacy `type` key not `kind`: `panel` (:431), `stat` x7 (:434), `command` x2 (:441). `stat` and `command` are not kernel kinds (not in the 70-name vocabulary) (inferred legacy dialect; `command` is `{type:"command", method:"GET", href}`). Vili also serves `/eve/operator`, `/eve/deck` (:25, :256-308).
- Binding: none. Commands: none through Eve; `gamecult.vili.command_boundary.v1` is its own schema (:85-96, :315-322). Advertisement: 9 of 18; `serviceId, kind, freshness, schemas, witnesses, commands` not matched.

**Stonks** `3f6e91c` (origin/codex/stonks-market-daemon) — LIVE (Starfire; B15).
- Publishes: `src/stonks-daemon.cjs:623-720` builders `pane(` x5, `metricNode(` x14, `textNode(` x6, plus a `kind: "interface"` node (:661) that child-surface aggregators read (Gjallar `Program.cs:616` filters children on `kind == "interface"`). `gamecult.eve.surface_state.v1` document type (:195-199).
- Binding: none located. Commands: `stonks.command_boundary.v1` own schema (:179-183); no Eve command handler. Advertisement: 10 of 18; required `serviceId, verseId, freshness, schemas, witnesses` not matched.

**weksa** `d16cff5` — LIVE (Starfire; B15).
- Publishes: `scripts/weksa-daemon.mjs` `buildOperatorSurface` area (:619, :826, :1014): `panel`, `person`, `text`. Document types `gamecult.eve.surface_state.v1`, `interface_binding.v1`, `provider_advertisement.v1` (:395-423); witness `eve-surfaces.cc` (:160, :286). `person` is likely a weksa domain node (inferred).
- Binding: `gamecult.eve.interface_binding.v1` document (:412); 18 `state_ref`/`statePath`-family hits (e.json). Commands: RUDP command server (`scripts/weksa-rudp-command.cjs`), single command `mimo voicedesign` (`weksa-daemon.mjs:69-71`, schema `WEKSA_MIMO_VOICEDESIGN_COMMAND_SCHEMA_ID`), receipt via `handleMimoVoiceDesign`; not an Eve `command.v1` handler (inferred). Advertisement: 14 of 18; `freshness` unmatched.

**Gjallar** `6a92976` — LIVE (Nightwing `gjallar.service`; B15).
- Publishes: `src/Gjallar/Program.cs` kind literals `dashboard` (:846), `pane` (:1599), `text` (:1610), `interface` (:810); reads child `interface` nodes (:616). `VerseState.cs:169` `dashboard`. 4 distinct, 1 non-kernel (`interface`).
- Binding/commands: none located (0 command hits). Advertisement: 15 of 18; `commands` unmatched.

**Heimdall** `7904e17` — LIVE (Yggdrasil; B15).
- Publishes: no surface; `gamecult.eve.plugin_advertisement.v1` (x5) with plugin id `HEIMDALL_ACCESS_PLUGIN_ID`, capability `heimdall.access_gate` (`src/access-plugin.ts:86`), ABI `gamecult.eve.plugin_abi.request.v1` (:63), plugin operations `describe/validate/project` (:40), transport `cultnet.operation.v0` (:33-37). This is the only live domain-kind capability besides Ghostlight's use of it.
- Commands advertised: `heimdall.auth.begin`, `heimdall.auth.complete`, `app.auth.logout` (:56); envelope `gamecult.eve.command_invocation.v1`, receipt `gamecult.eve.command_result.v1` (:41-42). Private command receipts in Postgres (`src/store/schema.ts:70`).
- Advertisement: 8 of 18; `serviceId, verseId, freshness, surfaces` unmatched.

**StreamPixels** `8d40541` — LIVE (Yggdrasil service + web; B15).
- Publishes: advertisement only (`apps/service/src/verse-state.ts:32-134`), surface reference `eveSurfaceId: "streampixels.eve.service_status.v0"` (:134); no kind literals. Binding/commands: none located (0 hits). Advertisement: 8 of 18; `serviceId, verseId, freshness, schemas` unmatched.

**Odin** `8e1de66` — LIVE (Yggdrasil, Starfire, Raven; B15). Consumer/aggregator, emits none.
- `crates/odin-core/src/documents.rs:10-12,155-183`: reads `gamecult.eve.surface_state.v1` (`EveSurfaceStateRecord`), `interface_binding.v1` (`EveInterfaceBindingCompatRecord`), `provider_advertisement.v1`. Rust readers drop unknown records (B10/B16).

**Hermodr** `f8e6e84` — target status `archived` though a compose service exists (B15). Role: lowering and command relay: `src/hermodr-daemon.cjs:37-52` document types `command.v1`, `command_receipt.v1` ("reconciled" state per README); `src/static-lowering.cjs`, `src/lower-surface.cjs` (no kind literals found; Hermodr lowers server-side, inferred). Subscription code present (17 `subscribe` hits).

**Bifrost** `67072b2` — blocked (B15); 66 commits in 90 days.
- Publishes: `tools/provider-advertisement.mjs` `metricNode(` x9 (:859), `dashboard` (:914), `panel` (:984), `metric` (:993), `list` (:1001), `text` x2 (:1006), `Program.cs:229` `Text(` x24; `Features/Motions/MotionEveSurfaceService.cs`: `form` (:35), `text` x3 (:47), `panel` (:53), `card` (:100). 6 distinct, all primitives. Surface endpoints `/eve/tui`, `/eve/gui` (:321-322).
- Commands: `bifrost.motion_command.v0` at `cultmesh://<svc>/commands/motion` (`MotionEveSurfaceService.cs:7`, `provider-advertisement.mjs:166,330`), `bifrost.bridge_action.v0`, discord-post commands (:323-326). These are Bifrost schemas, not `gamecult.eve.command*` (inferred from endpoint list). Binding: `interface_binding.v1` x2. Advertisement: 15 of 18; `serviceId` unmatched.

**Mimir** `d88f2e6` — Nightwing dashboard target `archived` (B15 / ops file :250-259).
- Publishes: `src/Mimir.EveDashboard/Program.cs`: builder calls `Text(` x77 (:1198), `Pane(` x20 (:1197), `Card(` x7, `Metric(` x8, `Row(` x3; literals `avatar` (:3424). Own ids `mimir.eve_dashboard_state.v1`, `mimir.eve_operator_surface.v1`, `cultmesh.eve_surface.v0` (x3), `mimir.eve_sensor_observation.v1`, `mimir.eve_media_observation.v1`, `mimir.eve_dashboard_command.v1` (E1 per T). Binding: reload-heavy (274 `reload|poll` hits) (inferred polling dashboard). Advertisement: 7 of 18.

**repixelizer** `06c1cf4` — blocked (B15); 4 commits in 90 days.
- Publishes: `src/repixelizer/eve_surface.py`: `partition` x5 (:214), `text` (:27), `card` (:38), `pane` (:72), `input.select` (:310), `control.range` (:342), `surface` (:443); fixture `web/fixtures/repixelizer.eve-surface.json` in Eve. 7 distinct, all primitives. `surface_state.v1` x2, `verse_state.py` x16 id hits. Commands/binding: none located. Advertisement: 8 of 18.

**Loki** `b20fb98` — DORMANT (not deployed; last commit 2026-06-13).
- Publishes: `src/loki-daemon.mjs:517-622` `surface`, `panel` x2, `metric` x8 (call+literal), `text` x2, `inspector.kv` x4 (:492) (`inspector.kv` is not a kernel kind except in EveUnity UI Toolkit lowerer; inferred domain-ish). Advertisement 16 of 18 (`schemas` incl. `gamecult.eve.surface.v1` :389,446); `commands: []` (:453,456). Binding/commands: none.

**Sai** `2e7be7e` — DORMANT (not deployed; last commit 2026-07-10).
- Publishes: `src/eve.js` emits the VN domain family: `vn.stage` (:301), `panel.dialogue` (:267), `text.dialogue` (:279), `rail.actions` (:285), `image.background` (:255), `layer.embedded-surfaces` (:262), `layer.sprites` (:263), `layer.cards` (:264), `embed.norn` (:117), `embed.tex` (:170), `control.button` (:216); plus `color`/`select` style controls (:76, :90). 11 domain-or-VN kinds; this is the only repo emitting `vn.*`. It also emits `surface-state`/`surface-command` envelopes (:290, :333).
- Commands: `src/eve-sidecar.cjs:52` `story.continue`, `story.choose`, `story.jump`; capabilities `vn.stage` + same (:53); rejects with `respond(..., "rejected", error.message)` (:21); `receiptSchema: gamecult.eve.command_receipt.v1` (:95). Plugin advertisement `plugins/sai-vn.plugin.json`.

**AquaSynth** `aed6525` — DORMANT/undeployed; 8 commits in 90 days. `tools/export-provider-advertisement.mjs`: advertisement only (7 of 18), kinds `patch, compile, instrument, speech, operator` are provider sub-kinds, not node kinds (inferred). No surface builder, binding or Eve command. 133 `reload`, 33 `subscribe` hits are audio, not Eve (inferred).

**Brokkr** `f97d4dc` — not deployed (B15); 41 commits in 90 days (active). `brokkr-daemon/src/main.rs`: advertisement partial (5 of 18) with `surfaces`, `commands`; own command schemas `brokkr.unity.command_receipt.v0` (:284), `brokkr.blender.command_receipt.v0` (:320); operation kinds `transform`, `parent`, `material`, `active-state` (:2749-3083) (not Eve node kinds; inferred). No surface kind literals.

**Ymir** `f8c0e39` — not deployed (B15); 23 commits in 90 days. `src/Ymir.Core/YmirServicePublicationDocument.cs:124-134`: `GameCult.Eve.Surface.EveSurface.Create("ymir.physics.operator")` with 5 `.Metric(...)` calls; record key `surface:ymir.physics.operator` (:147). Advertisement: 3 of 18 (`providerId, title, updatedAtUtc`) (inferred: typed `YmirServicePublicationDocument` rather than Eve's advertisement type). `CommandLowerings = []` (:29,109). Uses the C# `GameCult.Eve.Surface` package (E5 ProjectReference).

### Library, build-time and test consumers

**CultLib** `dbcb2a8e` — BUILD. Carries Eve ids in: `packages/cultcache-ts/src/swarm-documents.ts` (16 hits; document types `surface_state`, `interface_binding`, `:83-100`), `packages/cultmesh-kotlin/.../EveDocuments.kt` (8), `packages/cultnet-ts/test/cultnet.test.ts` (17), `tests/GameCult.Mesh.Tests/CultMeshBodyTransportTests.cs` (6), `samples/eve-two-runtime/sample.mjs` (10, with `stateBindings` at :61), `samples/eve-browser-network/` (C# + TS), provider session tests. Mesh primitives: `CultMeshOperationInvocationDescriptor`/`CultMeshOperationPayload`/`bindingName` (`GameCult.Mesh/CultMeshPrimitives.cs:3387`, `cultmesh-ts/src/index.ts:319`, 39 hits). B19 covers compatible-id wire behaviour. No node-kind emission (0 kind-literal publisher files).

**EveUnity** `92f0dbb` — BUILD (renderer; Unity packages; 2026-08-26). See section 6. Commands: `ResolveOperation` builds `CultMeshOperationInvocationDescriptor` from node props (`EveUnitySceneSurfaceLowerer.cs:64`, `EveUiToolkitSurfaceLowerer.cs:495,510`); command receipts class with default `gamecult.eve.command_receipt.v1` (`EveUnityPlayableWorldLiveClient.cs:284,298`). Binding: world root reads props `statePointerId`/`worldStatePointerId`, `assetManifest`, `inputProfile`, `cameraRig`, `movementCommand`, `focusCommand` (`EveUnitySceneSurfaceLowerer.cs:121-128`); scene lowerer additionally reads kinds `field.volume3d` (:114), `field.particles3d` (:116). Live provider transport over CultMesh: `Runtime/CultMesh/EveUnityCultMeshLiveProviderTransport.cs` (41 id hits). Pins: UPM git URLs (B21).

**EveConformance** `048ea2f` — BUILD (test/parity tooling). `tools/parity/parity-manifest.json` (22 schema-id hits; schemas under `../Eve/schemas/`), `consume-export.mjs`, `run-parity.mjs`. Requires every runtime to report command schema `gamecult.eve.command_invocation.v1` (`consume-export.mjs:883,1118`, `run-parity.mjs:1471`). Lock file pins six family repos (B21).

**EveElectron** `cba684c` (2026-09-13), **EveTui** `01ea52f` (2026-07-10), **EveFlutter** `3511e5c` (2026-07-10), **EvePlugins** `c5a4a75` (2026-07-15) — BUILD / renderer repos. EveTui command schema `gamecult.eve.command_invocation.v1` (`src/eve-tui-shell.mjs:42`); EveElectron `src/cultmesh-provider-client.mjs:2,229` (invocation schema; `operationId`); EveFlutter `lib/main.dart:326`. Output grid schema `gamecult.eve.tui_grid.v1` (EveTui x8). EvePlugins: plugin ABI/endpoint ids only (`gamecult.eve.plugin_endpoint.v1`, `plugin_witness.v1`), 0 surface hits.

**Eve kernel fixtures/package** `b7d154b`: browser reference + `eve-browser-lowering`, C# `org.gamecult.eve.surface` (`EveSurfaceBuilder.cs`: 149 id/builder hits), Android `MainActivity.kt`, iOS `Sources/`. B-rows: B14, B17-B19, B24.

## 2. Binding: observed shapes (union)

| # | Shape | Where | Resolved by |
| --- | --- | --- | --- |
| BD1 | Node prop `stateBindings: [{targetProp, pointerId, sourceId, schemaId, routeKind, routeDescription}]` | VoidBot `render-voidbot-swarm-dashboard.mjs:1415-1421`; CultLib `samples/eve-two-runtime/sample.mjs:61` | renderer (inferred; no daemon pushes values into the tree) |
| BD2 | `stateBindings` local draft: adds `bindingName, valueKind, accessMode:"local-draft", authority:"eve.browser"`; `schemaId gamecult.eve.local_draft.v1`, `routeKind in-process` | Ghostlight `eve.rs:872-884` | renderer holds draft; `captureBindings` -> `payload.bindings` (`runtime.rs:144`) |
| BD3 | `writeCommand` on a binding; `captureBindings` on operations; "accepted results may request that exact bindings be cleared" (`draftDirective`) | `docs/surface-contract-v1.md:293-` ; command_result schema | renderer + provider |
| BD4 | World root props `statePointerId`, `worldStatePointerId`, `assetManifest(Uri)`, `inputProfile`, `cameraRig`, `viewId`, `playerEntityId`, `movementCommand`, `focusCommand` | EveUnity scene lowerer `:121-128` | Unity host with CultMesh live transport |
| BD5 | DSL binding primitives `var`, `collection`, `derive`, `bind` (compiled into the tree) | `docs/surface-contract-v1.md` (Eve DSL section); fixtures `reactive-composition.eve`, `huginn-cc-surface.eve` (`collection ...`, `list ... bind <collection>`) | browser reference `web/eve-dsl.js` |
| BD6 | Whole-document republish: provider writes `gamecult.eve.surface_state.v1` records (`{providerId, version, updatedAt, surface}`) to a CultCache/CultMesh node and bumps `version` | Muninn `main.rs:2673-2753`, Vili, Stonks, weksa, Gjallar, Hermodr, Bifrost (`surface_state` id counts: VoidBot 9, Gjallar 7, Stonks 4, Bifrost 3, Odin 3, Hermodr 3) | Odin aggregates; renderer re-fetches/reloads on version change (inferred) |
| BD7 | `gamecult.eve.interface_binding.v1` document (13 id mentions: VoidBot 5, CultLib 2, weksa 2, Bifrost 2, Odin 2) | `swarm-documents.ts:99`, weksa `:412`, Odin `documents.rs:11,173` | Odin reads as `EveInterfaceBindingCompatRecord` ("Compat" in the type name) |
| BD8 | Embedded documents: node `embeddedDocuments:[{slotId, documentId:"cultmesh://norn/graphs/...", schemaId, presentationKind}]` | `web/fixtures/sai-vn-surface.json`; `surface-contract-v1.md:144-153` | renderer plugin (`embed.norn`, `embed.tex`) |
| BD9 | Reload/poll: DOM reference has `reload` (poll) paths; Mimir 274 `reload|poll` hits, StreamPixels 59, Odin 34 (repo-wide, not Eve-specific; inferred) | n/a | per-process |

Daemons using no binding at all in their published tree: Muninn, Vili, Stonks, Gjallar, Bifrost, repixelizer, Loki, Ymir (BD6 only) (inferred from absence of `stateBindings`/`pointerId` in publisher files).

## 3. Commands: observed set (union)

| Command / operation id | Handler | Request schema | Result schema | Cite |
| --- | --- | --- | --- | --- |
| `heimdall.auth.begin` / `.complete` / `app.auth.logout` | Ghostlight (and advertised by Heimdall plugin) | `heimdall.auth_begin_command.v1`, `heimdall.auth_complete_command.v1`, `ghostlight.app_logout.v2` | `gamecult.eve.command_result.v1` | `eve.rs:708-713`, `access-plugin.ts:56` |
| `world.create`, `world.approve`, `world.activate`, `world.advance_time`, `world.seed`, `world.play` | Ghostlight | `ghostlight.world_*` (v0/v1/v4) | `command_result.v1` | `eve.rs:714-719`, `runtime.rs:1272-1476` |
| `swarm.set_heat` | VoidBot swarm publisher | `gamecult.eve.command.v1` payload `{value}` | `gamecult.eve.command_receipt.v1` | `serve-voidbot-swarm-cultmesh.cjs:159-193` |
| `muninn.capture_stream_command`, `muninn.move_light_command`, `muninn.set-move-hue-program` | Muninn | `gamecult.eve.command.v1` | command receipt (shape inferred) | `main.rs:2966-2986` |
| `story.continue`, `story.choose`, `story.jump` | Sai sidecar | `command.v1` (`eve.js:3`) | `command_receipt.v1` | `eve-sidecar.cjs:52,95` |
| `style.patch`, `select`, `invoke`, `open-provider`, `edit.value`, `toggle.visibility`, `transform.*` | kernel standard names | `command_invocation.v1` | `command_receipt.v1` | `surface-contract-v1.md:255-` |
| `motion` command, `bridge_action`, `discord-post` | Bifrost | `bifrost.motion_command.v0`, `bifrost.bridge_action.v0`, Bifrost discord schema | `bifrost.*_receipt` (inferred) | `provider-advertisement.mjs:323-330` |
| `mimo voicedesign` | weksa RUDP server | `WEKSA_MIMO_VOICEDESIGN_COMMAND_SCHEMA_ID` | own receipt | `weksa-daemon.mjs:69-71` |
| `transform`/`parent`/`material`/`active-state` | Brokkr (Unity/Blender bridges) | `brokkr.*` | `brokkr.unity.command_receipt.v0`, `brokkr.blender.command_receipt.v0` | `brokkr-daemon/src/main.rs:284,320,2749-3083` |
| `mimir.eve_dashboard_command.v1` | Mimir | own | n/a | e.json |
| Ymir: `CommandLowerings = []`; own typed session commands (`YmirStepSessionCommand` etc.) are not Eve commands | n/a | n/a | n/a | `YmirServicePublicationDocument.cs:29,109` |

Counts (id mentions in non-test, non-JSON source): `command_receipt.v1` 35 (Eve 13, CultLib 7, VoidBot 5, Ghostlight 4, Hermodr 3, EveUnity 2, Sai 1), `command_invocation.v1` 34 (Eve 14, EveConformance 6, Ghostlight 5, EveElectron 3, EveTui 3, EveFlutter 2, Heimdall 1), `command.v1` 29, `command_result.v1` 12 (Eve 6, Ghostlight 5, Heimdall 1).

Rejected or failing command paths located in source or schema:
- Ghostlight `eve.rs:723-731`: flat result is rejected whole by the browser lowering's schema check (see section 1).
- Sai `eve-sidecar.cjs:21,43`: `rejected` responses and `rejectedComponentKinds` when a requested kind is not owned.
- Muninn `main.rs:4721-4768`: `rejected_stale/radius/bounds/continuity` counts (these are sensor tracking counters, not command rejections; listed so they are not mistaken, inferred).
- VoidBot `swarm.set_heat` out-of-range throws (:164).
- `thing2-target.md` Why section cites "July failures (views that had to reload, failing commands, schema-rejected results)"; the schema-rejected case is the Ghostlight one above (inferred correspondence; the July commits were not read).

## 4. Advertisement

Schema `schemas/gamecult.eve.provider_advertisement.v1.schema.json` in Eve: 18 properties; required 11: `schema, providerId, serviceId, verseId, title, kind, freshness, schemas, witnesses, surfaces, commands`; optional `rootVerse, canonicalService, locatedService, cultMeshAddress, updatedAt, updatedAtUtc, conformanceScenarios`. Fixtures: `web/fixtures/*.provider-advertisement.json` (sai-vn, repixelizer, epiphany-model-atlas, eve-world-smoke) carry also `requiresPlugins[]` per surface entry with `pluginId, versionRange, availability, requiredCapabilities`.

Fields matched per publisher (matched / 18; text-match, so typed-struct publishers may be undercounted, inferred):

| Publisher | matched | required-not-matched |
| --- | --- | --- |
| Ghostlight | 17 | none |
| Loki | 16 | none |
| Bifrost | 15 | serviceId |
| Gjallar | 15 | commands |
| weksa | 14 | freshness |
| Muninn | 13 | schemas, witnesses |
| Stonks | 10 | serviceId, verseId, freshness, schemas, witnesses |
| VoidBot | 9 | serviceId, kind |
| Vili | 9 | serviceId, kind, freshness, schemas, witnesses, commands |
| Heimdall | 8 | serviceId, verseId, freshness, surfaces |
| StreamPixels | 8 | serviceId, verseId, freshness, schemas |
| repixelizer | 8 | serviceId, verseId, schemas, commands |
| Hermodr | 8 | serviceId, verseId, freshness, schemas, witnesses |
| Mimir | 7 | serviceId, verseId, freshness, schemas, witnesses |
| AquaSynth | 7 | serviceId, verseId, freshness, commands |
| Odin (reads) | 7 | n/a (consumer) |
| Brokkr | 5 | providerId, serviceId, verseId, freshness, schemas, witnesses |
| Ymir | 3 | most |

Other advertisement-adjacent ids: `plugin_advertisement.v1` x11 (Heimdall 5, CultLib 2, Eve 2, EveConformance 1, Odin 1), `plugin_abi.v1` x12 (EveUnity, EveElectron, EveTui 3 each), `mimir.eve_sensor_observation.v1` x9 (Mimir 3, Eve 3, Odin 2, CultLib 1; E1). Top-line id mention counts (non-test, non-JSON source): `surface.v1` 94 (Bifrost 15, Eve 15, Ghostlight 12, weksa 7), `provider_advertisement.v1` 72, `surface_state.v1` 40 (VoidBot 9, Gjallar 7), `interface_binding.v1` 13, 64 distinct eve-named schema ids found by this pass (B14's 102 includes JSON/docs paths this pass excludes).

## 5. Liveness summary

| Class | Consumers |
| --- | --- |
| LIVE Idunn targets (B15; ops `9aed01f` re-read for targets file: Odin x3 hosts, Stonks, weksa, Muninn x3, Vili, VoidBot, StreamPixels, Heimdall are listed with Status `idunn-managed`/`runtime-enforced`/`enforced`) | Odin, Ghostlight, Heimdall, VoidBot, StreamPixels, Muninn (Starfire, Raven, Nightwing), sleipnir, Vili, Stonks, weksa, Gjallar |
| Blocked or archived targets (code present) | Bifrost (blocked), repixelizer (blocked), Hermodr (archived target), Mimir dashboard (archived), `eve-ipad`, `periwinkle` (blocked) |
| Not deployed by any target | Sai (last 2026-07-10), Loki (2026-06-13), AquaSynth, Brokkr (active, 41 commits/90d), Ymir (23 commits/90d), Epiphany (excluded) |
| Build-time / library | CultLib, EveUnity, EveConformance, EveElectron, EveFlutter, EveTui, EvePlugins, Eve kernel |
| No Eve publication | Aetheria (surfaces via frozen AetheriaEve) |

## 6. Renderer-side (renderer repos only)

Renderer capability manifests (`eve-runtime-capability.json`, schema `gamecult.eve.runtime_capability.v1`) list `supportedFeatures`, `supportedPlugins[].capabilities` and `unsupportedPlugins`; none lists node kinds. Every manifest's `unsupportedPlugins` is `[]`. Kind coverage therefore comes from literal presence in renderer source (heuristic, section Method), not a declared matrix.

| Renderer | features (manifest) | plugin capabilities | node-kind names present in source (of 70) |
| --- | --- | --- | --- |
| Eve web reference (`web/`, `eve-browser-lowering`) | 8 (`embeddedDocuments, providerAdvertisements, odinProviderDiscovery, genericWorldDiscovery, providerAssets, stateBindings, styleTokens, authorityWitnesses`) | `fields.surface` 5, `sai.vn` 4, `norn.graph` 1, `tex.math` 1 | 56 |
| Eve Android (`MainActivity.kt`, 1 file) | not read | not read | 35 |
| Eve iOS (`Sources/*.mm`, 8 files) | not read | not read | 23 |
| Eve C# surface package (builder/document) | n/a (authoring) | n/a | 27 |
| EveUnity UI Toolkit | `embeddedDocuments` | `sai.vn` 4, `norn.graph` 1, `tex.math` 3 | 28 (incl. `world.scene2d/3d`, `inspector.kv`) |
| EveUnity scene | 26 (`providerSurfaceSession, sceneGraphProjection, playableWorldProjection, unityGameObjectSceneSink, ...`) | `fields.surface` 6 (incl. `volume.raymarch`), `sai.vn` 4, `norn.graph` 1, `tex.math` 4 | 13 (+ `field.volume3d`, `field.particles3d` literals) |
| EveFlutter | no manifest in repo | n/a | 35 |
| EveElectron | 9 | `sai.vn` 4, `norn.graph` 1, `tex.math` 3 | 8 (bar, embed.norn, embed.tex, label, surface, surface.slot, text, vn.stage) — low; delegates to browser lowering (inferred) |
| EveTui | 6 | `sai.vn` 4, `norn.graph` 1, `tex.math` 3 | 7 (embed.*, label, metric, surface.slot, text, vn.stage); output `tui_grid.v1`; delegates to lowering package (inferred) |
| Hermodr lowering | n/a | n/a | 0 |
| Ghostlight web client | n/a | n/a | 1 (`surface`); uses `vendor/eve` browser lowering (B17) |

Kinds in the kernel vocabulary that no live publisher emits (rows of section 7 with zero in the "live" columns) include every `vn.*`, `embed.*`, `layer.*`, `field.*`, `world.*`, `inventory.*`, `canvas.*`, `image.*`, `color.swatch`, `control.tabs/popup/toggle/select/choice-group/box/part` and `modal/form/options/progress/bar` (live publisher counts below).

## 7. Cross-table: kind x consumer (publisher literal counts)

Columns: GL Ghostlight, MU Muninn+sleipnir, VB VoidBot, VI Vili (legacy `type`), ST Stonks, WK weksa, GJ Gjallar, BF Bifrost, MI Mimir (call+literal), RP repixelizer, LK Loki, SA Sai, YM Ymir, KF kernel fixtures (JSON, 12 files). First six data columns after KF are LIVE except as noted: GL MU VB VI ST WK GJ are LIVE; BF MI RP blocked/archived; LK SA YM undeployed. `-` is zero. Domain = my classification of a kind owned by one provider/domain rather than a layout/display/input primitive (inferred).

| kind | class | GL | MU | VB | VI | ST | WK | GJ | BF | MI | RP | LK | SA | YM | KF |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| text | primitive | 7 | 6 | 8 | - | 6 | 1 | 1 | 5 | 78 | 1 | 2 | - | - | 34 |
| pane | primitive | - | 12 | 10 | - | 5 | - | 1 | - | 21 | 1 | - | - | - | 7 |
| card | primitive | 3 | 4 | - | - | - | - | - | 1 | 7 | 1 | - | - | - | 24 |
| metric | primitive | - | - | 13 | - | 14 | - | - | 10 | 9 | - | 8 | - | 5 | 10 |
| dashboard | primitive | - | 3 | - | - | - | - | 2 | 1 | - | - | - | - | - | - |
| panel | primitive | - | - | - | 1 | - | 1 | - | 2 | - | - | 2 | - | - | 2 |
| partition | primitive | - | - | - | - | - | - | - | - | - | 5 | - | - | - | 7 |
| list | primitive | - | - | 7 | - | - | - | - | 1 | - | - | - | - | - | 4 |
| grid / row / rail / cockpit | primitive | - | - | 3/2/1/1 | - | - | - | - | - | 3 (row) | - | - | - | - | rail 1 |
| form | primitive | - | - | - | - | - | - | - | 1 | - | 8 (calls) | - | - | - | - |
| surface | primitive | 1 | - | - | - | - | - | - | - | - | 1 | 1 | - | - | 6 |
| control.button | primitive | 1 | - | 2 | - | - | - | - | - | - | - | - | 1 | - | 7 |
| control.slider / control.range | primitive | - | - | 1 | - | - | - | - | - | - | 1 (range) | - | - | - | 1 (range) |
| control.input.text / textarea / number | primitive | 5/6/1 | - | - | - | - | - | - | - | - | - | - | - | - | - |
| input.number / input.select | primitive | - | - | - | - | - | - | - | - | - | 1 (select) | - | - | - | 8/1 |
| input.binding-map, binding.target | primitive | - | 1/1 | - | - | - | - | - | - | - | - | - | - | - | - |
| avatar | primitive | - | - | - | - | - | - | - | - | 1 | - | - | - | - | - |
| interface (aggregate marker) | non-kernel | - | - | - | - | 1 | - | 1 | - | - | - | - | - | - | - |
| stat, command (legacy `type`) | non-kernel | - | - | - | 7/2 | - | - | - | - | - | - | - | - | - | - |
| person | domain (inferred) | - | - | - | - | - | 2 | - | - | - | - | - | - | - | - |
| heimdall.access_gate, heimdall.identity | domain | 1/1 | - | - | - | - | - | - | - | - | - | - | - | - | - |
| inspector.kv | domain | - | - | - | - | - | - | - | - | - | - | 4 | - | - | - |
| vn.stage, panel.dialogue, text.dialogue, rail.actions, image.background, status.stage | domain | - | - | - | - | - | - | - | - | - | - | - | 1 each (no status.stage) | - | 1 each |
| layer.cards / layer.embedded-surfaces / layer.sprites, embed.norn, embed.tex | domain | - | - | - | - | - | - | - | - | - | - | - | 1 each | - | 1 each (no layer.sprites) |

Aggregates:
- Distinct node kinds emitted by the 7 LIVE surface publishers (GL, MU, VB, VI, ST, WK, GJ): text, pane, card, metric, dashboard, panel, list, grid, row, rail, cockpit, control.button, control.slider, control.input.text, control.input.textarea, control.input.number, input.binding-map, binding.target = 18 kernel primitives; plus non-kernel `interface`, `stat`, `command` and domain `heimdall.access_gate`, `heimdall.identity`, `person` (inferred) = 24 names total, 2 to 3 domain.
- Including blocked/archived/undeployed publishers (BF MI RP LK SA YM): adds partition, form, surface, input.select, control.range, avatar, inspector.kv, and the full Sai VN family (11 domain kinds). Union 40 names; domain kinds 14 (11 Sai + 2 heimdall + inspector.kv), all but heimdall tied to the dormant Sai or Loki.
- The kernel fixtures (35 kinds) contain 15 single-use domain/embed kinds; their only repo-owned emitter in source is Sai (`vn.*`, `layer.*`, `embed.*`, `panel.dialogue` family) and, for `field.surface2d` / `world.*`, the kernel and EveUnity (provider side not located in the repos surveyed; Aetheria's emission is via frozen AetheriaEve).
- Of the kernel's 70-name vocabulary, the live publishers emit 18 (26 percent). `inventory.*` (3 kinds) is emitted by no surveyed publisher (Eve's own `EveInventoryInteraction.cs` and tests only); `world.*` is consumed by EveUnity scene and emitted by none surveyed (inferred: Aetheria-side, frozen).
- Binding union: BD1-BD9 above. Command union: section 3 table (7 distinct command families on the Eve `command.v1`/`command_invocation.v1`/`command_result.v1` envelopes; others use their own schemas).

## 8. Source notes and scars

- Scripts and per-pass outputs: `eyes-thing2-consumer-census/s/*.py` in the scratchpad (a.py repo refs, c.py kind literals, e.py id matrix `e.json`, f.py command hits, h.py/m.py located kinds, j.py renderer coverage `j.json`, k.py advertisement fields).
- One shell mistake created a stray interactive Python process that wrote a 64 MB tool-result file (`C:\Users\Meta\.claude\projects\F--Projects-CultLib\4afe6932-3e75-4766-be3f-a62ca680f00c\tool-results\b6rc8vggm.txt`); the task was stopped; the file is harness-owned and left in place.
- Kind-literal counting is regex-based and undercounts computed or typed-struct emission; the Mimir 114 builder-call figure and VoidBot numbers are the largest counts and the least uniform (inferred).
- Not read: Epiphany (excluded by `operator-epiphany-out-of-scope`), AetheriaEve (frozen), Fensalir/Delvehold-class Eve consumers outside the named list, Android/iOS manifests.
