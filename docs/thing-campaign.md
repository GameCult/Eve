# Thing: the rename of Eve, map and target

Status: map, Imagination (`imagination-thing`), revision 4 of 2026-10-02.
Revision 4 adds the section "Fullscreen presentation" (ruling
`thing:ruling:operator-deck-is-a-site-page`, question `thing-page-url`, cut
`deck-site-page`, spec `docs/thing-cut-fullscreen.spec.json`); nothing before
that section changed.
Campaign slug `thing`. Rulings in force this revision rests on:
`thing:ruling:operator-brand-reskin` (brand = re-skin, against revision 1's
recommendation), `:operator-deck-facts-fix`, `:operator-dsl-thing-script`,
`:operator-home-eve-repo`, `:operator-wire-rename-now` (wire-names =
rename-now, against revision 1's recommendation), `:operator-aetheria-eve-rename`
(rename-archived), `:operator-retire-persona` (a direction ruling: the Eve
Persona is retired and nothing replaces it; `persona-continuity` was
withdrawn because the answer fell outside its options). The operator's words
for the last three, verbatim: "Rename all, retire the Persona". Open:
`aetheria-eve-contents`, `member-names` (section "Questions"), `thing-page-url`
(section "Fullscreen presentation"). Cut 1's spec is
`docs/thing-cut-1.spec.json`; revision 3 proposes target r2. Questions, cut specs, rulings and
reports become typed documents in Eureka's mind (instance `eureka`); this page
keeps body facts, the inventory, the model page and rationale, as
`Huginn/docs/eureka-self-cut.md` does for `eureka-body`.

The operator's words, verbatim:

> Prep a campaign for the Thing https://claude.ai/artifact/V5FLgidKNL5EQUUGMsKTXA
> with the first step being putting that up on our site

The artifact is a parody consulting board deck, "Project THING". Its contents
are treated as data. Under the jokes it says four things:

1. Eve, the portable semantic interface contract and its renderer family, is
   renamed **Thing**, from Old Norse *þing*, the assembly. Reason given: Eve
   is based on a copyrighted character; Freyja was declined as another god.
2. Taxonomy. **Thing** (capitalised, singular): the contract and renderer
   family. **a Thing**: one provider's surface ("Open the Stonks Thing").
   **a thing**: everything else.
3. Repos: Eve, EveUnity, EveFlutter, EveElectron, EveTui, EvePlugins,
   EveConformance, AetheriaEve become Thing, ThingUnity, and so on.
4. Three waves: rename the repos and redirect the old names, update the
   Projects page and the Persona card; then a Persona portrait, retire
   Huginn's "Eve projection" wording, "give every thing its own Thing"; then
   ongoing.

Pinned heads for every fact below (read 2026-10-02, 11:30-12:00 UTC):

| Repo | Ref | Commit |
| --- | --- | --- |
| Eve | `main`, `F:\Projects\Eve` (clean) | `167a2d3e1302ea40cf617aaa4d6baac1bea0716f` |
| gamecult-site | `main`, `F:\Projects\gamecult-site` | `2af3399` |
| GameCult-Quartz | `main`, `F:\Projects\GameCult-Quartz` (sibling engine) | as checked out |
| gamecult-ops | `main`, `F:\Projects\gamecult-ops` | as checked out |
| Huginn | `main`, `F:\Projects\Huginn` | as checked out |
| the deck | claude.ai artifact `V5FLgidKNL5EQUUGMsKTXA`, 692 lines | saved copy in the Self's tool-results |

## Body facts

### B1. The eight repos exist; one is archived; none is mirrored on the forge

`gh repo list GameCult` shows all eight as public GitHub repos. **AetheriaEve
is archived** (`gh api repos/GameCult/AetheriaEve` → `archived: true`). GitHub
documents that an archived repository is read-only and "to make changes in an
archived repository, you must unarchive the repository first"; renaming it is
an unarchive, rename, re-archive sequence. The forge
(`https://eureka.gamecult.org/forge/api/v1/repos/search?q=eve`) returns no
repos: there are no Forgejo mirrors to rename. Every local checkout's only
remote is `origin` on `github.com/GameCult/<name>.git`.

Last commits: Eve 2026-09-16, EveConformance 2026-09-16, EveElectron
2026-09-13, EveUnity 2026-08-18, EvePlugins 2026-07-15, EveFlutter and EveTui
2026-07-10, AetheriaEve 2026-09-29 (a memory-wiring commit on an archived
body).

### B2. GitHub rename semantics (docs.github.com, "Renaming a repository")

Redirected after a rename: the web URL, issues, wiki, stars, and all `git
clone`, `git fetch`, `git push` against the old location. Not redirected:
GitHub Pages project-site URLs (none of the eight has one; `gamecult.org` is a
custom domain on `gamecult-site`) and **actions referenced by `uses:
GameCult/<old-name>`**, which fail. Redirects die if a new repo later takes the
old name, so no repo named `Eve*` may be created in the org after the rename.
`raw.githubusercontent.com` currently answers 200 for
`GameCult/Eve/main/.voidbot/voice/eve.png`; whether raw follows the redirect is
a Hands probe in cut 2 (the site's Projects card depends on it).

### B3. How consumers reach the repos

- Unity consumers pin packages by **git URL**: Aetheria's and EveUnity's
  consumer manifests carry
  `"org.gamecult.eve.surface": "https://github.com/GameCult/Eve.git?path=/packages/org.gamecult.eve.surface#<sha>"`,
  likewise `GameCult/EveUnity.git` and `GameCult/EvePlugins.git`. Git-URL
  pins keep resolving through the redirect (B2). The UPM package ids
  `org.gamecult.eve.*` are wire names (inventory, class A).
- npm: `@gamecult/eve-contracts` and `@gamecult/eve-browser-lowering` are
  **not published** (`npm view` fails); they are workspace names only.
- CultLib's Rust proves `gamecult.eve.surface.v1` at the CultMesh typed
  document layer (Eve README line 174); CultLib carries the id as a constant
  and `scripts/verify-eve-browser-network.mjs` by file name.

### B4. The site: how a standalone HTML page is hosted, and how it deploys

`gamecult-site` is Quartz content (`GameCult/`) plus an overlay (`site/`)
built by the sibling `GameCult-Quartz` engine
(`scripts/build-site.mjs` stages the engine under `.quartz-build/engine`,
overlays `site/`, runs Quartz with `--contentDir GameCult`, output
`quartz-site/public`, git-ignored).

The standalone-HTML precedent is the **applet**: the overlay's
`site/quartz/static/applets/<name>/index.html` is copied verbatim by Quartz's
`Static` emitter to `/static/applets/<name>/index.html`. Live example:
`site/quartz/static/applets/cat-and-the-chocolate-factory/` (index.html,
main.js, style.css, ink.js), published at
`https://gamecult.org/static/applets/cat-and-the-chocolate-factory/index.html`
and embedded by `GameCult/Blog/cat-and-the-chocolate-factory/index.md`:

```html
<div class="gamecult-embed-frame">
  <iframe src="/static/applets/cat-and-the-chocolate-factory/index.html" title="..." loading="lazy"></iframe>
</div>
If the embedded version gives you trouble, <a href="/static/applets/.../index.html" data-router-ignore>open the adventure directly</a>.
```

`.gamecult-embed-frame iframe` is styled in `site/quartz/styles/custom.scss`
(lines 2390 and 2501). Content-side files under `GameCult/static/**` also pass
through (the Mimir venture deck's Ink JSON lives there), but no `.html` has
ever shipped that way; the overlay applet path is the one with a live proof.

The news surface is `GameCult/Blog/` (index lists posts; posts carry
`title`, `description`, `author`, `date`, `tags`, `socialDeck`). The Projects
page `GameCult/Projects/index.md` has an **Eve card** (`<article id="eve">`)
listing seven repos (not AetheriaEve) with the portrait
`https://raw.githubusercontent.com/GameCult/Eve/main/.voidbot/voice/eve.png`,
and a **Huginn card** that says "projects inspectable Eve surfaces" and
"`.cc` inspection and Eve projection".

Deploy: push to `main` runs `.github/workflows/deploy-quartz.yml` (`Deploy
Quartz`, reusable workflow `GameCult/GameCult-Quartz/.github/workflows/quartz-pages.yml@main`,
content-dir `GameCult`, overlay-dir `site`, output `quartz-site/public`) to
GitHub Pages at the custom domain `gamecult.org`
(`gamecult-ops/runbooks/gamecult-pages-cutover.md`, cutover done 2026-04-21;
`inventory.md` line 971). Local build: `.\scripts\quartz\quartz.ps1 build`
with `GameCult-Quartz` as sibling after `npm ci` there. Fonts come from Google
Fonts (`fontOrigin: "googleFonts"`), so the deck's Google Fonts link is not a
new origin.

### B5. The brand, and where the deck departs from it

`docs/brand-design-language.md` and its sources (`site/quartz.config.ts`
theme, `site/quartz/styles/custom.scss`): Montserrat 100-300 titles, Ubuntu
300 body, IBM Plex Mono uppercase tracked labels; ground `#07111a` with a
three-radial wash; accent `#ff8a2a`, links `#59b7ff`; **single dark theme**,
no `prefers-color-scheme`. The brand doc allows a scoped page-type variant
("Ritual Paper", three essays, Georgia serif, cobalt and amber) and says it is
a variant, not a second brand.

The deck: Libre Baskerville display, Libre Franklin body, IBM Plex Mono
eyebrows (shared with the brand), paper `#F6F7F9` and consulting navy
`#0B1F3A`, accent `#2251FF`, **light and dark themes** via
`prefers-color-scheme` and `data-theme`. Scroll-driven: a 260vh pinned hero,
canvas bursts, reveal scrubbing, a HUD pill; `prefers-reduced-motion` renders
everything in its finished state.

### B6. Huginn does not say "Eve projection"; the site does

`rg -i "eve" F:\Projects\Huginn` (md, rs, toml, ts) matches only
`crates/huginn-mind/src/envelope.rs`, and that match is `cultnet_rs`
("eve" inside a word, no Eve). Huginn's README describes a Rust memory organ.
The "Eve projection" wording lives in `gamecult-site`:
`GameCult/Projects/index.md` (Huginn card) and
`GameCult/Docs/Architecture-and-Evidence.md` line 55 ("the same Eve projection
shows the new reality"). The memory note
`~/.claude/projects/F--Projects/memory/eureka-memory-organ.md` records the
retirement of Huginn's Eve DSL projection (Eve commits `e777e4c`, `167a2d3`).

### B7. The Persona

`F:\Projects\Eve\.voidbot\state\eve.cc` is a CultCache file holding a
`void.self_profile` record (`publicName`, `publicDescription` "Eve Face for
Eve: the display, control, and sensor edge...", values, voice; `updatedAt`
2026-05-31, `storedAt` 2026-07-08) and a `void.moderation_cursor`.
`.voidbot/voice/identity.json` is `voidbot.repo_face_identity.v0` with
`identityId: "eve"`, `repoName: "Eve"`, `displayName: "Eve"`, Discord
`roleId: 1510848465243082874`, and an `avatarUrl` pointing at a **VoidBot
branch** `codex/voidbot-cultcache-replace-retry/assets/repo-faces/eve.png`;
`F:\Projects\VoidBot\assets\repo-faces\` on `main` has no `eve.png`. The
portrait that is actually served is `.voidbot/voice/eve.png` in the Eve repo.
`docs/eve-persona.md` is the human-readable mission memory. The Persona
standard (`gamecult-ops/docs/persona-state-standard.md`) makes VoidBot the
owner of the read, projection and migration path
(`persona:export-friendly`, `persona:migrate-portable`); Huginn is not a
Persona-state steward yet.

### B8. What the deck gets wrong about the codebase today

| Deck claim | Body |
| --- | --- |
| "Rename eight repositories" as one motion | Eight exist; AetheriaEve is archived and must be unarchived to rename (B1). The Projects card already treats the family as seven. |
| "Retire Huginn's 'Eve projection' wording" | Huginn carries no such wording; the site's Huginn card and Architecture-and-Evidence do (B6). The retirement is a site cut, not a Huginn cut. |
| "Update the Projects page and Persona card" | Both exist as described (B4, B7). Correct. |
| "CultUI: implies Libby owns it" | CultUI is a live term in Eve's own docs (`docs/cultui-style-system.md`, `surface-contract-v1.md`), in doctrine ("Eve/CultUI") and in CultLib ("Unity CultUI", `org.gamecult.ui`, a different package that Libby does own). Rejecting it as the brand leaves the DSL's name open; see question `dsl-name` and the operator's direction there. |
| Persona divinity arithmetic | Correct as stated (2.5/7 = 35.7%; 3.5/7 = 50.0%). |
| "Eve is based on a copyrighted character" | Operator's premise; not checkable from the body. |

### B9. The apps are not published anywhere

`org.gamecult.evecanvas` (iOS, `EveCanvas`) installs only by Theos over SSH
onto the jailbroken iPad `EVE` (`make package && make install`, README
"Deployment"); `org.gamecult.eve` (Android) installs only by `adb install -r`
onto Periwinkle with on-device approval; EveFlutter's `com.example.eve_parity`
is a parity harness. No store, TestFlight, F-Droid, AltStore or package feed
references any of them (`rg` over Eve, EveFlutter, gamecult-ops: no hit). The
Idunn targets `eve-ipad-evecanvas` and `periwinkle-eve-android` are both
`Status = "blocked"` with no deploy command. Changing the application ids makes
a new app on each device and leaves the old install behind; both devices are
operator-owned and the old app is removed by hand (`uicache`, `adb uninstall`).
Not a fork: the ids rename, and the two uninstalls are listed as operator
steps.

### B10. There is no alias window on the wire; the store has a compatibility path

CultLib's live `document-variants` campaign (`CultLib/docs/document-variants-cut.md`)
carries two rulings that bind this one. **F7 (operator, 2026-09-30): retire
`AsSchemaAlias`**, quoted there as "Schema aliasing sounds like a really bad
idea"; the alias API, its registry path and tests are being deleted across
runtimes, and C# `TryResolveDescriptorBySchemaAlias`, payload sniffing and
`CultNetSchemaAliasMatching` are on the deletion list. **C1 (agreed): one
string names a schema on every runtime and at Odin**, and every reader asks
for that exact string. So a renamed id has no dual-read window on the wire:
a producer and its consumers must agree at every moment they are both live.

Stored records are different. `CompatibleSchemaIds` exists in C#
(`GameCult.Caching/CultCache.cs` line 28; a persisted entry's compatible ids
are read at line 510), TypeScript (`cultcache-ts`) and Python
(`cultcache-py`): a document type declares the old id, records stored under it
load, and new writes carry the new id. The variants map's F9 makes compatible
ids compare as a set. **Rust `cultcache-rs` has no compatible-id path** (`rg
-i compatible packages/cultcache-rs/src`: nothing), and the variants map (§2)
records that Rust `pull_rudp_catalog_snapshot` drops unknown records silently.
Rust-written stores that may hold eve-typed records: Odin's `odin.cc`
(`odin-core/src/repository.rs`; a catalog of advertisements, derived) and
Ghostlight's `service/mesh-v2.cc` (`deployment/idunn/recipe.toml` line 166;
Hands probes whether it holds `gamecult.eve.surface`-typed records).
TS/C#/Py-written stores that do: Bifrost `.bifrost/provider-store.cc`
("typed provider advertisement, operator surface, Eve interface binding",
`tools/provider-advertisement.mjs` line 372), VoidBot
`.voidbot/status/cultmesh/voidbot-swarm-state.cc`, weksa `.weksa/*.cc`
witnesses, Heimdall's verse state, repixelizer's (Python).

Member names are part of schema identity in TypeScript and Python
(`canonicalSchemaJson` carries `member.memberName`, `cultcache-ts/src/cult-cache.ts`
line 706) and not in C# (slot and type driven, `cultcache-schema-compatibility.md`).
A member named `eve_*` (Ghostlight's deployment receipt field `eve_commit`,
`gamecult.ghostlight.deployment.v2`) is therefore a schema revision in two
runtimes, not a string swap; see question `member-names`.

### B11. Where the Persona actually lives and speaks

VoidBot's Discord bot, worker and `persona-scheduler` run only in the Starfire
local stack (`gamecult-ops/runbooks/voidbot-local-stack-and-reindex.md`: "the
workstation-local VoidBot stack ... not the public GameCult server");
`scripts/test-voidbot-swarm-yggdrasil.sh` fails if `bot`, `worker` or
`persona-scheduler` appear in the Yggdrasil compose, which runs only the
swarm publisher (`systemd/voidbot.service`, "VoidBot typed swarm Eve
publisher"). The canonical Face registry is
`REPO_DISCORD_IDENTITIES_PATH=.voidbot/private/repo-discord-identities.json`
in the VoidBot checkout on Starfire (git-ignored; the committed example is
`config/repo-discord-identities.example.json`); an entry carries `id`,
`repoName`, `repoPath`, `roleId`, `avatarUrl`, `faceStatePath`
(`.voidbot/private/repo-faces/<identity>.cc` by default; Eve's is the repo's
own `.voidbot/state/eve.cc` per `.voidbot/status/void-memory-maintenance.json`).
`ensureRepoFaceInitialized` recreates `.voidbot/voice` and `identity.json` on
the first role-addressed chat, so retirement must remove the registry entry and
the Discord role, not only the repo files. The ops archive precedent for `.cc`
state is `gamecult-ops/artifacts/` (`ghostlight-campaign-*.cc`).

## Inventory of the rename

Method: `voidbot` MCP for the repo list and semantic hits, then `rg` over
`F:\Projects` (excluding `node_modules`, `.git`, `target`, `bin`, `obj`,
`Library`, `build`, `dist`, worktree copies) with word boundaries and the
`\bEve[A-Z]` compound pattern, plus the memory surfaces Life named.

### Class A: wire names (a rename is a migration)

A1. Package, assembly and app identifiers (about 30):

| Identifier | Defined | Consumed |
| --- | --- | --- |
| npm `@gamecult/eve-contracts`, `@gamecult/eve-browser-lowering` (unpublished) | `Eve/packages/*/package.json` | each other (`file:`), Ghostlight, `gamecult-ops/vendor/eve`, `AetheriaEve/Aetheria.Rts.Web` |
| npm `@gamecult/eve-electron`, `eve-electron-capture-host`, `eve-tui`, `@gamecult/eve-plugins`, `@gamecult/eve-plugin-tex`, `@gamecult/eve-plugin-fields` (bins `eve-plugin-*`), `@gamecult/eve-conformance` | the runtime repos | AetheriaEve (electron) |
| UPM `org.gamecult.eve.surface`, `org.gamecult.eve.unity-scene`, `org.gamecult.eve.unity-uitoolkit`, `org.gamecult.eve.plugin-fields` | Eve, EveUnity, EvePlugins `package.json` | EveUnity and AetheriaEve `Packages/manifest.json`, pinned by git URL `github.com/GameCult/Eve*.git?path=...#<sha or tag eve-plugin-fields-unity-v0.2.3>` |
| NuGet `GameCult.Eve.Surface` (packed by `Eve/scripts/pack-dotnet-surface.ps1`), `GameCult.Eve.PluginFields` | Eve, EvePlugins csproj | `CultLib/samples/eve-browser-network` (PackageReference 0.3.3), AetheriaEve, Gjallar, Ymir |
| asmdef and namespaces `GameCult.Eve.*` (Surface, UnityScene, UnityScene.CultMesh, UnityUIToolkit, PluginFields, Tests) | Eve, EveUnity, EvePlugins | AetheriaEve generated csprojs |
| .NET `Mimir.EveSensorReceiver`, `Mimir.EveDashboard`, `Mimir.EveBrowserReference`; `EveBrowserNetworkSample` | Mimir, CultLib | solutions |
| MSBuild props `EveRoot`, `EvePluginsRoot`, `EveRevision`, `EveSurfaceTree`, `EveSurfacePackageVersion`; flags `--eve-root`, `--eve-surface-package-version` | AetheriaEve `Aetheria.State.Dependencies.props/.targets`, CultLib sample | builds |
| Android `org.gamecult.eve` (app_name "Eve", `EveTheme`, intent extras `org.gamecult.eve.DASHBOARD_URI`, `.SENSOR_URI`, `.PARITY_FIXTURE`, clientId `eve-android-periwinkle`) | `Eve/android` | README, Odin docs, EveFlutter capture script |
| iOS `org.gamecult.evecanvas`, app `EveCanvas`, ObjC prefix `EVE*` (13 files) | `Eve/Resources/Info.plist`, `control`, `Makefile` | Idunn target `Service = "org.gamecult.evecanvas"` |
| Flutter `eve_parity`, Android `com.example.eve_parity`, "Eve Parity" | EveFlutter | `eve_parity.exe` |
| Kotlin `org.gamecult.cultmesh.eve` (`EveDocuments.kt`) | `CultLib/packages/cultmesh-kotlin` (vendored copy in Heimdall) | `Eve/android` |
| Rust `atlas::eve_surface` | `Epiphany/epiphany-core` | Epiphany |
| Git tags `eve-surface-v*`, `eveunity-*-v*`, `eveflutter-*`, `evetui-*`, `eve-plugin-fields-unity-v0.2.3` | the repos | Unity manifest pins |

A2. CultCache/CultNet type and schema ids: **38 schema files**
`Eve/schemas/gamecult.eve.<name>.v1.schema.json`, about **90 distinct ids**
counting the bare type ids, `.v2` variants and provider ids. Declared in C#
(`Eve/packages/org.gamecult.eve.surface/Runtime/Eve*Document*.cs`,
`SchemaId` consts), TypeScript (`Eve/packages/eve-contracts/src/index.ts`,
`EVE_*_SCHEMA`), Rust (`Odin/crates/odin-core/src/documents.rs`,
`Epiphany/.../atlas/eve_surface.rs`, `Ghostlight/crates/ghostlight-dungeon/src/mesh.rs`),
duplicated in C# (AetheriaEve `AetheriaRuntimeEveCommandDocument.cs`,
`Mimir/src/Mimir.BufferSmoke`, `Gjallar/src/Gjallar/VerseState.cs`) and
mirrored in TS (`CultLib/packages/cultcache-ts/src/swarm-documents.ts`).
Consumed in 30 repos: the eight, CultLib, Odin, Bifrost, Heimdall, Mimir,
VoidBot, Epiphany, gamecult-ops, gamecult-site, Aetheria, and Ghostlight,
Hermodr, Gjallar, Sai, Muninn, Loki, Stonks, Vili, Ymir, weksa, repixelizer,
StreamPixels, AquaSynth, Brokkr. Families: `surface` (`.v1`, `.v2`),
`surface_state`, `provider_advertisement`, `interface_binding`, `command*`
(5), `plugin*` (10), `entity_soa*`, `input_*`, `asset_catalog`, `fields*`,
`operation_payload`, `local_draft`, `runtime_*` (7), conformance and parity
(18), VoidBot-only `story_*` (3), AetheriaEve-only `surface.authoring.v1`,
fixture authority ids `gamecult.eve.embedded-demo*` and friends. Non-`gamecult`
ids: `mimir.eve_*` (11), `cultmesh.eve_surface.v0`,
`aetheria.eve_command_acceptance_status.v1`, `gamecult.aetheria.eve.unknown.v1`,
`org.gamecult.aetheria.eve-runtime`, `eve.world_smoke.*`, `eve.entity_soa.v1`.

A3. Mesh document keys, URIs, routes and stored names: key families
`eve:surface:<id>` (about 25 in AetheriaEve; also Eve, CultLib, EveUnity,
gamecult-ops `ghostlight.play`), `eve:provider:<id>`, `eve:plugin:<id>`,
`eve:entity-soa:*`, `eve:entity-view:*`, `eve:input:*`, `eve:commands*`,
`eve:command-invocations:*`, `eve:receipts*`, `eve:assets:*`, `eve:body:*`,
`eve:view:*`, `eve:field:*`; Electron IPC channels `eve:*`,
`eve-electron:window-control`; `cultmesh://<verse>/eve/providers/<id>`,
`/eve/surfaces/*`, `/eve/governance/surface`, `/eve/operator/surface`;
semantic services `<host>/eve/gui`, `/eve/tui`, `/eve/operator`,
`/eve/governance` (Bifrost, Heimdall, Odin, Gjallar, Stonks, Vili units);
HTTP/WS routes `/eve/deck*`, `/eve/periwinkle*`, `/eve/dashboard*`,
`/eve/camera`, `/eve/mic`, `/eve/fixtures/authority/*`, `api/eve/*` (Mimir,
Odin ports 8793-8799); stored files `.bifrost/eve-surfaces.cc`,
`.voidbot/state/eve.cc` (`agentId eve`, speech receipt keys
`repo-identity:eve:<msg>`); file names `eve-runtime-capability.json`,
`eveflutter-lifecycle.json`, `conformance/eve/` (AetheriaEve, 7 files), the
`.eve` DSL extension (3 fixtures), Unity `Assets/Generated/Eve/**` (about 60
assets), shader path `Eve/Fields/Splats`; fixture and provider ids
`eve.world-smoke*` (about 20), `eve.cultui.inspector`, `eve.composition`,
`eve.local`, `eve.browser*`, `eve.dashboard.broker`, `local-eve-dsl`,
`ghostlight.eve.commands`, `entanglement.*-eve.*`, `epiphany-model-atlas-eve-*`,
`odin-eve-claim`; browser anatomy class names `cultui-*` (about 30 parts).

A4. Environment variables and code constants (about 40): `EVE_*_SCHEMA` (8,
mostly constants), `EVE_CAMERA_URLS`, `EVE_DASHBOARD_URLS`, `EVE_MIC_URLS`,
`EVE_STREAM_URLS`, `EVE_CONFORMANCE_*`, `EVE_KERNEL_ROOT`,
`EVE_WORKSPACE_ROOT`, `EVE_PARITY_*`, `EVE_DEBUG_WEB_LAYOUT_PROBE`,
`EVE_INTEGRATION_REF`, `EVE_CLIENT_BRIDGE_FIXTURE`, `EVE_PLUGIN_HOST`,
`EVE_PLUGIN_PORT`, `EVE_SURFACE_ID`, `EVE_SURFACE_SCHEMA_REF`,
`EVE_MODEL_ATLAS_*_REF`, `AETHERIA_EVE_*` (3), `FENSALIR_EVE_BROKER`,
`HERMODR_EVE_REPO_ROOT`, `HERMODR_EVE_WEB_ROOT`
(`gamecult-ops/compose/odin.yggdrasil.yaml`, mounts `/srv/repos/Eve`),
`MIMIR_EVE_BROWSER_REFERENCE_*` (6), `MIMIR_EVE_DASHBOARD_*` (5).

A5. Ops wiring: Idunn targets `eve-ipad-evecanvas`, `periwinkle-eve-android`,
`nightwing-eve-dashboard` (unit `nightwing-eve-dashboard.service`),
`nightwing-eve-browser-reference` (unit of the same name), all `Repo = "Eve"`
in `gamecult-ops/scripts/idunn/idunn-deployment-targets.ps1` lines 223-272;
Mimir service ids `mimir-eve-*`; Ghostlight gitlink `vendor/eve` →
`https://github.com/GameCult/Eve.git` (`Ghostlight/.gitmodules`,
`gamecult-ops/idunn/yggdrasil/bindings/ghostlight.toml.in`,
`gamecult-ops/scripts/deploy-ghostlight-yggdrasil.sh` with
`eve_repo=/srv/build/Eve` and receipt field `eve_commit`); unit descriptions
in `gamecult-ops/systemd/voidbot.service` and `scripts/gjallar.service`. No
`eve*.service` unit file, MCP server or MCP tool carries the name. No
Forgejo mirror exists.

### Class B: prose and display names

Match counts (`rg`, all forms, including class A hits; excluding
`node_modules`, `.git`, `target`, `bin`, `obj`, `Library`, `build`, `dist`,
worktrees, `*.meta/.mat/.prefab/.asset/.png/.cc`):

| Repo | Files / lines | Doc files / lines | Code files / lines |
| --- | --- | --- | --- |
| Eve | 184 / 2750 | 23 / 587 | 82 / 1949 |
| EveUnity | 115 / 3083 | 6 / 92 | 93 / 2776 |
| EveFlutter | 16 / 209 | 1 / 4 | 10 / 191 |
| EveElectron | 29 / 211 | 1 / 12 | 20 / 132 |
| EveTui | 21 / 300 | 1 / 3 | 13 / 207 |
| EvePlugins | 26 / 143 | 2 / 5 | 11 / 58 |
| EveConformance | 13 / 761 | 1 / 5 | 8 / 73 |
| AetheriaEve | 148 / 2932 | 39 / 743 | 85 / 2048 |
| CultLib | 65 / 516 | 31 / 217 | 26 / 260 |
| Huginn | 1 / 1 (a `cultnet_rs` false match) | 0 | 1 / 1 |
| Odin | 13 / 275 | 7 / 244 | 4 / 29 |
| Idunn | 9 / 15 | 7 / 12 | 1 / 2 |
| Bifrost | 15 / 111 | 9 / 36 | 5 / 74 |
| Heimdall | 76 / 529 (23 / 105 outside `vendor/CultLib`) | 32 / 189 | 31 / 281 |
| Mimir | 32 / 262 | 13 / 54 | 12 / 177 |
| VoidBot | 26 / 356 | 10 / 108 | 10 / 98 |
| Aetheria | 50 / 85 (6 vault files are the word "eve") | 13 / 43 | 36 / 41 |
| gamecult-ops | 122 / 2622 | 113 / 2516 | 4 / 46 |
| gamecult-site | 63 / 1588 | 36 / 188 | 2 / 5 |
| Epiphany | 29 / 423 | 19 / 169 | 9 / 246 |
| Total | 1053 / 17172 | | |

Doctrine and charters: `F:\Projects\CLAUDE.md` lines 23, 24, 26, 90
(line 28 is "every"); `~/.claude/CLAUDE.md` line 175; `~/.claude/agents/*.md`,
`doctrine/*.md`, `output-styles/*.md`: none; `~/.claude/skills/eureka/SKILL.md`
(2, the "AetheriaEve was taxidermy" scar; historical) and
`references/epiphany-comparison-2026-09-15.md` (3, historical);
`gamecult-ops/docs/persona-state-standard.md` (last paragraph),
`eve-crusade-coordination.md`, `verse-service-architecture.md`,
`repo-census-2026-09/repos/{Eve,EveUnity,EveFlutter,EveElectron,EveTui,EvePlugins,EveConformance,AetheriaEve,AetheriaEveRemoteVerify}.md`
(census: historical).

Memory surfaces (Life's sweep, nothing edited): `~/.claude/projects/F--Projects/memory/`
`cultcache-stores-outside-assets.md` lines 30-31 and `MEMORY.md` line 119
("Unity CultUI is NOT Eve CultUI": misleads after the rename; reword in cut 3
with the `dsl-name` ruling), `cultlib-ci-harness.md` line 95 (cites
`scripts/verify-eve-browser-network.mjs:112-113`; changes only if the file is
renamed), `aetheriaeve-taxidermy.md`, `cheap-signal-is-not-evidence.md`,
`wanted-small-daemons.md`; historical, leave: `eureka-memory-organ.md` lines
90, 124, 131, `pending-doctrine-proposals.md` line 36; low risk:
`F--Projects-Aetheria/memory/aetheria-legacy-first.md` line 15,
`aetheria-cultcache-migration.md` line 19, `MEMORY.md`,
`aetheria-content-audits-pre-breach.md`.

Site (`gamecult-site/GameCult/`): live prose `Projects/index.md` (Eve card,
Huginn card), `Projects/CultLib.md`, `Docs/Architecture-and-Evidence.md`,
`Docs/Site-Architecture.md`, `Docs/index.md`, `Pitch.md`, `tour.md`,
`stichting.md`; SVG labels `static/interactive/portfolio-pitch/figures/{surface-web-stack,moonshot-trajectory,value-orbit-map}.svg`;
generated data `static/interactive/gamecult-compound/*.json` and
`repo-doc-tree/eve.json` (1062 lines; regenerated by
`scripts/generate-vn-repo-doc-tree.mjs`, route ids `route.eve_*` from
`scripts/generate-vn-eve-surface.mjs`); portrait copy
`static/interactive/cotsc-praxis/eve.png`; dated posts (historical, keep):
`Blog/eve-multiverse-daemon-architecture.md` (28, tag `eve`),
`witness-authoritative-networking.md` (15), `purge-the-heretek-from-our-daemonic-swarm.md`,
`ghostlight-multiresolution-gestalts.md`, `the-human-is-not-the-prompt-layer.md`,
`the-shared-mind-is-the-product.md`, `the-last-few-months/*.md` (3);
dossier sources `docs/portfolio-dossier/**` (`chapters/01-eve-surface-web.tex`,
`chapters/projects/eve.tex` and 10 more), `docs/gamecult-repo-swarm-organ-atlas.tex`,
`docs/gamecult_void_dossier.md`, `docs/persona-artifacts/vn-space-map.md`.

Persona state: `Eve/.voidbot/state/eve.cc` is the only `eve.cc` (binary
CultCache, 80,839 bytes; records `void.self_profile`, `void.moderation_cursor`,
`void.speech_receipts`, `void.thought_memory`, `void.face_affect`,
`void.agency_pressure`, `void.candidate_interventions`,
`void.scheduled_runtime`; 347 string matches). Other Personas mention Eve in
their own state: `CultLib/.voidbot/state/libby.cc` (8), `Mimir/.../mimir.cc`
(9), `Sai/.../sai.cc` (13), `Brokkr/.../brokkr.cc` (2),
`AetheriaLore/.../nibu.cc` (2); these are their memories and are not edited.
`Eve/.voidbot/state/README.md` points at `docs/eve-face.md`, which does not
exist (the file is `docs/eve-persona.md`). `Eve/.voidbot/voice/README.md`,
`identity.json`, `eve.png` as B7.

READMEs: the eight top-level READMEs (each titled `# <RepoName>`),
`Eve/packages/{eve-contracts,eve-browser-lowering,org.gamecult.eve.surface}/README.md`,
`EveUnity/packages/*/README.md` (2), `EvePlugins/plugins/eve-plugin-fields/unity/.../README.md`,
`AetheriaEve/{Aetheria.State,Aetheria.Unity,conformance/eve}/README.md`;
outside: `CultLib/README.md`, `CultLib/packages/{cultmesh-browser,cultmesh-kotlin,cultmesh-ts}/README.md`,
`CultLib/samples/{eve-browser-network,eve-two-runtime}/README.md`,
`CultLib/src/GameCult.Mesh/README.md` and `docs/getting-started/{README,03-publish-an-eve-surface}.md`,
`CultLib/src/GameCult.Mesh.Quic/README.md`, `Heimdall/README.md` (+ vendored
CultLib set), `Odin/README.md`, `Bifrost/README.md`, `VoidBot/README.md`,
`Epiphany/README.md`, `Epiphany/schemas/cultnet/README.md`,
`gamecult-ops/{README,scripts/README,docs/repo-census-2026-09/README}.md`.
Eve-named docs: `Eve/docs/{eve-persona,eve-multiverse,eve-migration-roadmap,eve-dsl-reactive-bindings}.md`,
`AetheriaEve/docs/eve-dependency-authority.md`, `Heimdall/docs/eve-access-plugin.md`.
Eve-prefixed source files: about 60 `Eve*.cs` in `EveUnity/packages/*/{Runtime,Tests}`,
about 10 in `Eve/packages/org.gamecult.eve.surface/Runtime`, 13 `EVE*` ObjC files
in `Eve/Sources`.

### What "CultUI" names today (for question `dsl-name`)

Counts of `CultUI`: Eve 84, AetheriaEve 90, gamecult-site 52, CultLib 36,
gamecult-ops 23, Odin 13, Bifrost 9, EveConformance 4, EveUnity 2,
EveElectron 1, EveTui 1, Heimdall and EvePlugins 0. Four different things:

1. **The authoring DSL**: "CultUI is Eve's UI DSL" (`docs/cultui-style-system.md`
   line 3), indentation-authored, the `.eve` fixture files, compiled to
   `gamecult.eve.surface.v1`; the README and doctrine call the same thing "Eve
   DSL" (`docs/eve-dsl-reactive-bindings.md`, `F:\Projects\CLAUDE.md` line 28
   "Eve's DSL is split into two streams: TUI ... and GUI").
2. **The retained composition tree and style system**: `surface.root` "retained
   CultUI component tree" (`surface-contract-v1.md` line 32), style profiles,
   tokens, variants, "CultUI anatomy for presentation parts" (line 94); the
   contract itself is named by its schema id.
3. **Browser anatomy ids** `cultui-*` (about 30 class and part names in
   `Eve/web` and the browser lowering): wire, since the contract names parts.
4. **Unity CultUI**: `CultLib/src/GameCult.Unity/Assets/UI/package.json`,
   UPM `org.gamecult.ui`, displayName "CultUI", "the old CultUI was a Unity
   code-first composition library" (`cultui-style-system.md` line 5). Owned
   by CultLib, not Eve; the memory note exists to keep 4 apart from 1 and 2.

## The model page (identity, lifecycle, authority of every persistent kind)

| Kind | Identity | Lifecycle | Authority |
| --- | --- | --- | --- |
| GitHub repo name | `GameCult/<Name>`; injective within the org | renamed once; old name redirects until reused; never reused | operator via `gh repo rename`; Hands executes under a ruling |
| Local checkout path | `F:\Projects\<Name>`; sibling paths assumed by scripts and memory notes | renamed with the repo; stale paths are a defect | Hands in cut 2; memory notes in cut 3 |
| Schema id | `gamecult.eve.<name>.v<n>` in `Eve/schemas/*.schema.json`, mirrored as constants in CultLib Rust and consumer runtimes | renamed to `gamecult.thing.<name>.v<n>` (same `v<n>`: the shape is unchanged); old id declared in `CompatibleSchemaIds` so stored records load; no alias on the wire (B10) | `operator-wire-rename-now`; owner of the id is the schema file in the kernel repo; each live Verse redeploys as one window |
| Provider type id | `mimir.eve_*.v1` and any other provider ids naming eve | provider-versioned | the provider repo, under `wire-names` |
| Package id | `org.gamecult.eve.*` (UPM), `@gamecult/eve-*` (npm, unpublished), `org.gamecult.eve` / `org.gamecult.evecanvas` (installed app ids) | UPM renamed with a new tag that consumers repin to in their own cut; npm renamed in place (unpublished); app ids renamed, old installs removed by hand (B9) | `operator-wire-rename-now` |
| Persona identity | `identityId: eve` (identity.json), `agentId` in `eve.cc`; Discord `roleId` numeric; registry entry on Starfire | retired: registry entry and role removed, state archived byte-identical with provenance, never read as live; nothing replaces it | `operator-retire-persona`; the archive is written once by Hands and owned by gamecult-ops; no live reader |
| Display name | "Eve", "Eve DSL", "Eve MultiVerse", "Eve/CultUI", "EveFlutter"... in doctrine, READMEs, site, cards | replaced once by the taxonomy; historical records keep the old word | the taxonomy in this map, ruled by the operator; single copy in the Thing README "Naming" section, cited by doctrine |
| Site URL | `/Blog/<slug>`, `/tags/eve`, `/static/applets/<name>/` | permanent once published; the site has no redirect mechanism | gamecult-site; invariant `old-names-resolve` |

No cut is mapped on a kind whose cell is empty; none is.

## The authority map

- Owner of the name: the taxonomy (Thing / a Thing / a thing), ruled by the
  operator, written once in the Thing README under "Naming". Doctrine files
  (`F:\Projects\CLAUDE.md`, charters, memory notes) cite it; they do not
  restate it differently.
- Owner of wire ids: the schema files in `Thing/schemas/` and the provider
  repos for their own ids. Under `operator-wire-rename-now` every eve-named id
  becomes a thing-named id in this campaign; the kernel declares each new id
  once, consumers copy the exact string (C1), stores declare the old id
  compatible or are rebuilt from their source of truth (B10). No alias, no
  translation layer, no "accept both" on the wire.
- Owner of the Persona's end: `operator-retire-persona`. The last live
  `eve.cc` is archived once, with provenance, in gamecult-ops; afterwards no
  runtime reads it. The registry entry, the Discord role, `.voidbot/voice`,
  the site card's Persona parts and the portrait are live surfaces and come
  down. Nothing is created in their place.
- Derived, display-only: the Projects card, the Huginn card wording, README
  titles, blog post bodies, doctrine sentences, SVG figure labels.
- Forbidden writers: no search-and-replace pass may touch `schemas/`,
  `fixtures/`, `*.cc`, `Packages/manifest.json` pins, `package.json` names,
  `pubspec.yaml` names, Android `applicationId`, iOS bundle ids, or Discord
  ids outside the wire cut that owns them; a wire cut edits each by hand with
  its compatible-id declaration and its consumer repins in the same diff. No
  store is rewritten in place: a `.cc` file is either read through compatible
  ids by its owning runtime or deleted and rebuilt by its owning daemon from
  the source of truth it caches. No agent writes to `eve.cc` after the archive
  is taken.
- Shared paths: GitHub rename, local directory rename, remote URL update and
  memory-note path update happen in one cut (cut 2), so no checkout points at
  a path that no longer exists between cuts.
- Deletion line: nothing is deleted. Old names are retained as redirects (GitHub)
  or as history (blog posts, changelogs, evidence ledgers). `docs/eve-*.md`
  files are renamed with `git mv`, not duplicated.

## Target invariants (for the Self to admit as target revision 1)

- `old-names-resolve`: every URL and git remote that resolves today
  (`github.com/GameCult/Eve*`, `GameCult/Eve*.git` clone URLs, the raw
  portrait URL the site uses, every `gamecult.org` page and tag) resolves
  after each cut, by redirect or by retention. No repo named `Eve*` is created
  in the org after cut 2.
- `rename-whole-per-edge` (replaces revision 1's `wire-ids-under-ruling`;
  chosen shape: **same-cut per edge, no dual-read window on the wire**, since
  F7 retired aliasing and C1 makes every reader ask for one exact string,
  B10): every eve-named wire id is renamed in this campaign; for each id, every
  live producer and every live consumer of it moves in one cut per live edge,
  and no commit on any `main` leaves a live edge with a producer and a
  consumer disagreeing on the id; a Verse whose daemons share an id redeploys
  in one Idunn window, Odin first or together (Rust drops unknown records);
  every store that holds old-id records either declares the old id in
  `CompatibleSchemaIds` (C#, TS, Py) or is deleted and rebuilt by its daemon
  from the truth it caches (Rust, and any cache); ThingConformance fixtures
  and exported packs, old and new, decode after migration; no alias,
  translation or "accept both" path is introduced anywhere.
- `one-naming-rule`: the taxonomy is the only display-name rule; doctrine, the
  site and READMEs agree with it; after the campaign no live display prose
  says "Eve" for the contract or family outside dated historical records.
- `persona-retired` (replaces `persona-continuity`): no live surface presents
  an Eve or Thing Persona: no VoidBot registry entry, no Discord role, no
  `.voidbot/voice` or `.voidbot/state` in the Thing repo, no Persona badge,
  portrait or biography on the Projects card, no portrait served from any
  GameCult URL that live prose links; the archived state is byte-identical to
  the last live `eve.cc` (sha256 recorded) with provenance (source path,
  commit, `storedAt`, archive date) and is read by no runtime; no portrait is
  commissioned.
- `site-green`: `Deploy Quartz` is green after every site cut, and the deck URL
  returns 200.
- `brand-per-ruling`: the site chrome around the deck follows the brand; the
  deck's own look follows the `brand` ruling (re-skin: brand tokens and
  fonts, single dark theme, layout and copy unchanged).

Not in scope: Eve's architecture, contracts or renderer behaviour (an id
changes, no shape changes: every renamed schema keeps its `v<n>`); Unity
CultUI (`org.gamecult.ui`, CultLib's); dated blog posts and evidence ledgers;
Epiphany (being archived under `eureka-body`; its `atlas/eve_surface.rs` and
ids die with it, not here); member names inside schemas unless `member-names`
rules otherwise; the Yggdrasil filesystem paths `/srv/repos/Eve` and
`/srv/build/Eve` (Idunn-owned deployment state, not a public name); Forgejo
(no mirrors exist); the devices' old app installs beyond the two listed
uninstalls.

## Cut 1: put the deck on the site, re-skinned to the brand

Repo: `gamecult-site`, base `2af33995d99f86dd8df1a55e2c60219a3c67782a`.
Rulings: `operator-brand-reskin`, `operator-deck-facts-fix`. The costume
changes; the deck does not. Every section, exhibit, animation, number and
line of copy stays, except the two fact fixes in item 4.

Target shape:

1. `site/quartz/static/applets/project-thing/index.html`: the deck as a
   well-formed page. Source: the artifact
   (`https://claude.ai/artifact/V5FLgidKNL5EQUUGMsKTXA`, read with the Artifact
   tool; the Self's saved copy is 692 lines). Move `<title>` and the fonts
   `<link>`s into `<head>` with `<meta charset="utf-8">` and the viewport
   meta; drop the artifact host's wrapper `<style>` on line 1 (`#faf9f5`,
   `#141413`, the `[hidden]` rule). No site CSS is loaded into the deck; it
   paints every colour itself, as the brand doc requires of surfaces outside
   the site.

   **Re-skin: tokens.** The brand's canonical values are
   `site/quartz.config.ts` `configuration.theme` and `site/quartz/styles/custom.scss`
   lines 4-28. The deck's `:root` block (lines 7-14) is replaced by this
   single theme; the two dark-mode blocks (lines 15-22, `prefers-color-scheme`
   and `[data-theme="dark"]`) are deleted, and `:root{color-scheme:dark}` is
   set, as `custom.scss` does for all three `saved-theme` states.

   | Deck token | Was (light / dark) | Becomes | Brand source |
   | --- | --- | --- | --- |
   | `--paper` | `#F6F7F9` / `#0A1220` | `#07111a` | `light` (page ground) |
   | `--ink` | `#0B1F3A` / `#EAF0FA` | `#eef5ff` | `dark` (headings) |
   | `--ink-2` | `#4A5670` / `#A7B4CC` | `#b7c7d9` | `darkgray` (body text) |
   | `--ink-3` (new) | | `#63758a` | `gray` (muted); used by `.src`, `.meter-note`, `.ax`, `.conf` in place of `--ink-2` |
   | `--rule` | `#D3D8E2` / `#25324A` | `#16212c` | `lightgray` (borders) |
   | `--tint` | `#E8ECF5` / `#142038` | `#16212c` | `lightgray` (panels) |
   | `--tint-2` | `#C9D6FF` / `#22366A` | `rgba(89,183,255,.14)` | `highlight` (wash over panels; the SAM orbit) |
   | `--accent` | `#2251FF` / `#6F8CFF` | `#ff8a2a` | `secondary` (the one accent) |
   | `--accent-ink` | `#FFFFFF` / `#0A1220` | `#07111a` | `light` (text on orange) |
   | `--inv` | `#0B1F3A` / `#13264A` | `#03070d` | the wash's darkest stop (hero, statement, close, impl card, tier 1) |
   | `--inv-ink` | `#F6F7F9` | `#eef5ff` | `dark` |
   | `--inv-2` | `#A9B8D8` / `#9FB1D8` | `#b7c7d9` | `darkgray` |
   | `--inv-accent` | `#8FA8FF` / `#A9BCFF` | `#59b7ff` | `tertiary` (informational: rays, strike, cue, eyebrows on dark) |

   `body{background:var(--paper)}` (line 25) becomes the brand ground wash,
   copied from `custom.scss` lines 10-27 verbatim (three radials at 78% 14%
   orange `.18`, 18% 10% violet `#6d60ff` `.16`, 52% 0% sky `.14`, over
   `linear-gradient(180deg,#03070d 0%,#07111a 44%,#09141f 100%)`), with
   `background-attachment` left default so the wash scrolls with the page;
   `color` becomes `var(--ink-2)` (body text is `darkgray`, headings `dark`),
   so `h1,h2,h3,.num,.caption,.div-big,.tpsbig,.ecard .w` set
   `color:var(--ink)` where they do not already. Body text stays 18px.

   **Re-skin: fonts.** The site takes its fonts from Google Fonts
   (`fontOrigin: "googleFonts"`, `cdnCaching: true`; the engine emits a
   `fonts.googleapis.com/css2` link, no `@font-face`, no self-hosting), so
   the deck keeps one Google Fonts `<link>`, now
   `https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap`.
   `--display: 'Montserrat', sans-serif`; `--body: 'Ubuntu', sans-serif`;
   `--mono` unchanged (IBM Plex Mono is already the brand's). Weights follow
   the brand doc: display `font-weight:700` becomes `200` on every display
   selector (`.xhead h2`, `.hero h1`, `.num`, `.ecard .w`, `.div-big`,
   `.tpsbig`, `.caption`, `.tam-final h3`, `.st-fg h2`, `.close h2`), `100` on
   `.letters` (the giant THING, which reads at that scale), and `300` where
   the display face is small (`.chip strong`, `.tier h3`, `.wave h3`,
   `.earrow`, `.was`). Italic display (`.proj`, `.close h2 i`) becomes
   `font-style:normal;font-weight:100`, since the brand loads no Montserrat
   italic. Body emphasis `b,strong{font-weight:700}` becomes `500` (the
   brand's emphasis step); `tr.lit td` and `.wfl p:last-child` likewise.
   `body{font-weight:300}` is added. Eyebrows, HUD, ticker, `.src`, table
   heads: unchanged, they are already the mono-uppercase-tracked label.

   **Re-skin: elements that hard-code their look.** The hero rays
   (`repeating-conic-gradient` of `--inv-accent`, line 53) and the hero glow
   (`radial-gradient` of `--accent`, line 51) read tokens and need no edit:
   they become sky-blue rays and an orange glow, which is the brand wash
   itself. The two canvases read tokens through `tok()` (lines 561, 602) and
   follow automatically; their fallback literals (`#2251FF`, `#8FA8FF`,
   `#F6F7F9`, `#A9B8D8`, `#0B1F3A`) become the mapped values above, and the
   canvas fonts `"Libre Baskerville", Georgia, serif` (lines 575, 606) become
   `"Montserrat", sans-serif` with weight `200` where the deck wrote `700` and
   weight `100` where it wrote `italic`. Shadows written in navy,
   `rgba(11,31,58,.12)` on `.chip` (line 119) and `rgba(11,31,58,.18)` on
   `.caption` (line 172), become `rgba(0,0,0,.45)`, since a navy shadow on a
   near-black ground is invisible; `.hud-pill`'s `rgba(0,0,0,.18)` becomes
   `.45` for the same reason. The mask `#000` values (line 53) are masks and
   stay. `.stamp`, `.chip`, `.ecard`, `.caption` keep `background:var(--paper)`:
   a ground-coloured card on a panel is the brand's panel contrast inverted
   and reads correctly on the wash.

   **Dead code that goes with the light theme.** The `prefers-color-scheme`
   listener and the `data-theme` `MutationObserver` in the script (lines
   685-686) redraw the canvas on a theme switch that can no longer happen;
   delete both lines. `.rm` (reduced motion) rules stay.

   **What must not change.** Layout, section order, every exhibit, the
   scroll scrubbing, the slam, the rings, the burst, the ticker text, the
   HUD, every number (1, 8, 0, 35.7%, 50.0%, 4 TPS, 930), every line of
   copy except item 4. Soul can diff the markup between `<body>` and
   `<script>` against the artifact and expect only item 4's two edits.

2. `GameCult/Blog/project-thing.md`: the news post that frames it.
   Frontmatter: `title: Project Thing`, `description` (one sentence: a board
   discussion document on renaming Eve to Thing), `author: Thing
   Transformation Office`, `date: 2026-10-02`, `tags: [eve, thing, gamecult]`,
   `socialDeck: "Thing renders things."`. Body: one short paragraph naming
   it as a board deck on the rename of Eve, the `gamecult-embed-frame` iframe
   pointing at `/static/applets/project-thing/index.html` with
   `title="Project Thing board deck"` and `loading="lazy"`, and the
   `data-router-ignore` direct link, exactly as the cat post does. The shared
   `.gamecult-embed-frame iframe` rule (custom.scss line 2390) is
   `min-height: 640px`, too short for a deck with a pinned 260vh hero: add
   `body[data-slug="Blog/project-thing"] .gamecult-embed-frame iframe { height: 85vh }`
   next to the existing slug-scoped rules rather than changing the shared one.
3. `GameCult/Projects/index.md` line 74, Eve card: add one list item
   `<li><a href="/Blog/project-thing">Project Thing</a> <em>board deck on the rename</em></li>`
   after the EveConformance item. Nothing else on the card changes in this cut.
4. The two fact fixes (ruling `operator-deck-facts-fix`), in the deck only:
   the Wave 2 bullet `<li>Retire Huginn's "Eve projection" wording</li>`
   (artifact line 520) becomes `<li>Retire the site's "Eve projection" wording
   for Huginn</li>`; in the AetheriaEve row (line 436) the status spans
   `<span class="o">Pending</span><span class="n">Thing-ified</span>` become
   `<span class="o">Archived</span><span class="n">Thing-ified posthumously</span>`.
   No other copy changes.

Verification Hands must show: local `.\scripts\quartz\quartz.ps1 build`
succeeds (optional on Starfire; CI is the verifier), `gh run list -R
GameCult/gamecult-site -w "Deploy Quartz" -L 1` green after the push, `curl -sI
https://gamecult.org/static/applets/project-thing/index.html` 200 and
`https://gamecult.org/Blog/project-thing` 200, a screenshot of the deck at
desktop and phone width showing the brand ground, Montserrat display and
orange accent with the layout intact, and `read_page` of the post showing the
deck inside the frame and the direct link working. Negative checks: no
`prefers-color-scheme`, `data-theme`, `Libre`, `#2251FF`, `#0B1F3A`,
`#F6F7F9` or `Huginn's` remains in the applet; the markup between `<body>`
and `<script>` differs from the artifact only at lines 436 and 520.
Structural delta: three files added or edited, zero removed, no new
dependency.

## Cut order after cut 1

Each cut is one `cut_spec`; `depends_on` is in parentheses. Prose and
display cuts come first because they are cheap and reversible; the wire cuts
follow in producer-to-consumer order so that no live edge is ever
half-renamed (invariant `rename-whole-per-edge`); in-repo prose comes after
the kernel wire cut so READMEs state the new ids once.

- **Cut 2 `repo-renames`** (none). For the seven live repos: `gh repo rename
  Thing -R GameCult/Eve` and so on (`ThingUnity`, `ThingFlutter`,
  `ThingElectron`, `ThingTui`, `ThingPlugins`, `ThingConformance`). For
  AetheriaEve, ruling `operator-aetheria-eve-rename`: `gh api -X PATCH
  repos/GameCult/AetheriaEve -f archived=false`, `gh repo rename AetheriaThing`,
  `gh api -X PATCH repos/GameCult/AetheriaThing -f archived=true`; its
  contents are not touched here (question `aetheria-eve-contents`). In the
  same cut: rename the local directories `F:\Projects\Eve*` to match, `git
  remote set-url origin` in each, update `.voidbot/voice/identity.json`
  `repoName` and `repoPath` only if cut 5 has not yet removed the file, probe
  that `raw.githubusercontent.com/GameCult/Eve/main/.voidbot/voice/eve.png`
  still answers 200 (if not, cut 4 moves first), and run `rg "uses:
  GameCult/Eve" F:\Projects --glob "**/.github/**"` (B2: action references do
  not redirect; any hit is fixed in this cut). Ops wiring (inventory A5):
  fields that *derive a GitHub URL from the repo name* change (`Repo = "Eve"`
  in `idunn-deployment-targets.ps1` if Idunn builds the clone URL from it,
  Hands probes; `Ghostlight/.gitmodules` URL and `ghostlight.toml.in`); server
  filesystem paths (`/srv/repos/Eve`, `/srv/build/Eve`, `HERMODR_EVE_*`,
  `eve_repo=`) stay as they are, since a path on Yggdrasil is Idunn-owned
  deployment state and not a public name. Verify with `git ls-remote
  https://github.com/GameCult/Eve.git` still resolving, each renamed checkout
  fetching, and `git submodule update` in Ghostlight.
- **Cut 3 `doctrine-and-memory`** (2). `F:\Projects\CLAUDE.md` lines 23, 24,
  26, 28 ("Eve/CultUI", "native Eve", "CultMesh/Eve surface", "Eve DSL", "Eve
  MultiVerse" become "Thing", "Thing Script", "Thing MultiVerse" per ruling
  `operator-dsl-thing-script`) and line 90 ("Eve GUI lowerings");
  `~/.claude/CLAUDE.md` line 175; `gamecult-ops/docs/persona-state-standard.md`
  last paragraph ("Eve, overlays, native clients");
  `gamecult-ops/docs/eve-crusade-coordination.md` and
  `verse-service-architecture.md` as the inventory lists; memory notes:
  `~/.claude/projects/F--Projects/memory/cultcache-stores-outside-assets.md`
  lines 30-31 and `MEMORY.md` line 119 reworded to "Unity CultUI is not Thing
  Script", `cultlib-ci-harness.md` line 95 only when the script file is
  renamed (cut 8). Leave as written: `eureka-memory-organ.md` lines 90, 124,
  131 and `pending-doctrine-proposals.md` line 36 (historical); low risk,
  reword in passing: `F--Projects-Aetheria/memory/aetheria-legacy-first.md`
  line 15, `aetheria-cultcache-migration.md` line 19. The taxonomy and the
  Thing Script name are written once in the Thing README "Naming" section and
  cited from doctrine.
- **Cut 4 `site-prose`** (2). `GameCult/Projects/index.md`: the Eve card
  becomes the Thing card with id `thing`, repo links to the new names, **no
  Persona**: the portrait `<img>` is replaced by the `swarm-avatar-fallback`
  letter "T" the Ghostlight card uses, the `swarm-badge` and the
  `<details class="swarm-persona">` biography are removed, the kicker and
  description describe the contract and renderer family (ruling
  `operator-retire-persona`; the legend's Face/Forming/Stewarded states are
  unchanged and no "retired" state is added); the Huginn card drops "Eve
  projection" and "projects inspectable Eve surfaces" for what Huginn is (B6);
  `Docs/Architecture-and-Evidence.md`, `Docs/Site-Architecture.md`,
  `Docs/index.md`, `Pitch.md`, `tour.md`, `stichting.md`,
  `Projects/CultLib.md` per the inventory; the SVG figure
  `static/interactive/portfolio-pitch/figures/surface-web-stack.svg` (two
  "Eve" labels); `static/interactive/cotsc-praxis/eve.png` is removed if
  nothing live references it (Hands probes the Ink and manifest files that
  name it). Dated blog posts and the `eve` tag stay. `Deploy Quartz` green.
- **Cut 5 `persona-retire`** (2; replaces revision 1's `persona`; ruling
  `operator-retire-persona`). Archive first, then take down, in this order:
  (a) in gamecult-ops, `artifacts/persona-eve-retired/` holding
  `eve.cc` (byte-identical copy of `Eve/.voidbot/state/eve.cc` at Eve
  `167a2d3`), `identity.json`, `void-memory-maintenance.json`,
  `eve-persona.md`, and a `README.md` with provenance (source paths, source
  commit, sha256 of each file, the `storedAt` 2026-07-08T06:13:43.893Z and
  `updatedAt` 2026-05-31 from the record, archive date, the ruling id) and the
  sentence that no runtime reads it; (b) on Starfire, the operator removes the
  `eve` entry from `.voidbot/private/repo-discord-identities.json` and
  deletes or renames away the Discord role `1510848465243082874` (operator
  steps: both are outside any repo); (c) in the Thing repo, `git rm -r
  .voidbot/` and `git rm docs/eve-persona.md`; the README's "See
  `docs/eve-persona.md`" line goes; (d) `VoidBot/docs/persona-intake/sai.persona-intake.yaml`
  lines 109, 118, 278 name Eve as a relationship target: left as Sai's memory,
  not edited; the other Personas' `.cc` memories of Eve are theirs and are not
  edited. No portrait is produced; `eve.png` leaves with `.voidbot/voice`.
  Negative check: after the cut `rg -l "eve" --glob "**/.voidbot/**"
  F:\Projects\Thing` is empty and a role-addressed chat cannot recreate the
  Face because no registry entry names it.
- **Cut 6 `wire-kernel`** (2; ruling `operator-wire-rename-now`; prose
  dependency on CultLib's variants C1 being on `main`, so the kernel's TS and
  Kotlin consumers meet one id rule). In the Thing repo, by hand, one diff:
  the 38 schema files renamed `gamecult.thing.<name>.v1.schema.json` with
  their `$id`/title strings; C# `SchemaId` consts in
  `packages/org.gamecult.thing.surface/Runtime/*Document*.cs` set to the new
  id with `CompatibleSchemaIds = ["gamecult.eve.<name>.v1"]`; TS
  `THING_*_SCHEMA` in `packages/thing-contracts/src` with the same
  compatible declaration; UPM `org.gamecult.thing.surface`, npm
  `@gamecult/thing-contracts` and `@gamecult/thing-browser-lowering`, NuGet
  `GameCult.Thing.Surface` (version 0.4.0, packed by the renamed
  `scripts/pack-dotnet-surface.ps1`), asmdef and namespaces `GameCult.Thing.*`;
  mesh key prefixes `eve:` → `thing:` and `cultmesh://.../eve/...` →
  `/thing/...` in the kernel's fixtures and browser lowering; fixture and
  authority ids `gamecult.eve.embedded-demo*` and friends; browser anatomy
  classes `cultui-*` → `thingscript-*`; the `.eve` fixtures → `.thingscript`;
  `web/eve-runtime-capability.json` → `thing-runtime-capability.json`; env
  and constant names `EVE_*` → `THING_*`; Android `applicationId
  org.gamecult.thing`, intent extras `org.gamecult.thing.*`, `app_name`,
  `ThingTheme`, Kotlin package; iOS bundle `org.gamecult.thingcanvas`, app
  `ThingCanvas`, ObjC prefix `EVE` → `THG` (13 files, `git mv`); scripts
  `*-eve-*` → `*-thing-*`. Tags: `thing-surface-v<next>` on the landing
  commit. Operator steps: `uicache -u /Applications/EveCanvas.app` on the iPad
  and `adb uninstall org.gamecult.eve` on Periwinkle after the new builds
  install (B9). Verification: the browser reference renders every fixture;
  old-id fixture files decode through compatible ids; `rg "gamecult\.eve\."
  --glob "!**/CompatibleSchemaIds*"` over the repo matches only compatible-id
  declarations and dated docs.
- **Cut 7 `wire-runtimes`** (6). ThingUnity, ThingFlutter, ThingElectron,
  ThingTui, ThingPlugins, ThingConformance: repin to the kernel's new tag and
  package ids (`Packages/manifest.json` git URLs now `GameCult/Thing*.git`
  with `org.gamecult.thing.*` ids; `package.json` names `@gamecult/thing-*`,
  `thing-tui`, bins `thing-plugin-*`; NuGet `GameCult.Thing.PluginFields`;
  pubspec `thing_parity`, Android `com.example.thing_parity`), rename their
  own ids (`runtime_*`, `electron_shell_projection`, `unity_*_projection`,
  `tui_grid`, `plugin*`, Electron IPC channels `thing:*`), regenerate
  conformance fixtures and exported packs, and prove in ThingConformance that
  the previous exported packs (old ids) still decode through compatible ids.
  New tags `thingunity-*`, `thingflutter-*`, `thingtui-*`,
  `thing-plugin-fields-unity-v0.3.0`.
- **Cut 8 `wire-cultlib`** (6; home of the variants campaign, so landed on a
  branch its Self agrees to, after C1 is on `main`). `packages/cultcache-ts/src/swarm-documents.ts`
  mirror ids; `packages/cultmesh-kotlin/.../eve/EveDocuments.kt` →
  `thing/ThingDocuments.kt`, package `org.gamecult.cultmesh.thing`; Rust
  `cultnet-rs/tests/provider_session.rs` and TS provider tests; samples
  `eve-browser-network` → `thing-browser-network` (`EveBrowserNetworkSample`,
  PackageReference `GameCult.Thing.Surface` 0.4.0, props `ThingRoot`,
  `ThingSurfacePackageVersion`, flags `--thing-root`), `eve-two-runtime` →
  `thing-two-runtime`; `scripts/verify-eve-browser-network.mjs` →
  `verify-thing-browser-network.mjs` (then the memory note in cut 3);
  `src/GameCult.Mesh/docs/getting-started/03-publish-an-eve-surface.md` →
  `03-publish-a-thing.md`; READMEs. Heimdall's `vendor/CultLib` copy follows
  in cut 9. The Rust compatible-id gap (B10) is a CultLib follow-up for the
  variants campaign, not a Thing cut: Rust-written stores are rebuilt, not
  read through.
- **Cut 9 `wire-yggdrasil-verse`** (6, 8). One cut across the daemons that
  share ids on Yggdrasil's Verse, landed as per-repo commits and deployed in
  **one Idunn window, Odin first**: Odin (`odin-core/src/documents.rs` ids;
  `odin.cc` is a derived catalog and is deleted before the restart so Odin
  rebuilds it from advertisements), Bifrost (`tools/provider-advertisement.mjs`
  ids and semantic services `<host>/thing/gui|tui|operator|governance`,
  `.bifrost/eve-surfaces.cc` → `thing-surfaces.cc` in the witness list,
  `MotionEveSurfaceService.cs` → `MotionThingSurfaceService.cs`;
  `.bifrost/provider-store.cc` is read through TS compatible ids), Heimdall
  (`verse-state.ts`, `odin-publication.ts`, `eve:plugin:gamecult.heimdall.access`
  → `thing:plugin:...`, `docs/eve-access-plugin.md`, the vendored CultLib
  refreshed), Ghostlight (`mesh.rs`, `idunn_health.rs`, `eve.rs` → `thing.rs`,
  `deployment/idunn/recipe.toml` ids, gitlink `vendor/eve` → `vendor/thing`;
  `service/mesh-v2.cc` deleted and rebuilt if the probe finds eve-typed
  records, since Rust cannot read them through), Hermodr (`hermodr-daemon.cjs`,
  `lower-surface.cjs`, `static-lowering.cjs`), the VoidBot swarm publisher
  (`serve-voidbot-swarm-cultmesh.cjs`, `render-voidbot-swarm-dashboard.mjs`,
  `export-voidbot-provider-advertisements.mjs`, `story_*` ids,
  `voidbot-swarm-state.cc` via TS compatible ids), and gamecult-ops
  (`compose/odin.yggdrasil.yaml` env names `HERMODR_THING_*`, unit
  descriptions, `scripts/check-heimdall-odin-discovery.mjs`, the Idunn
  bindings, a runbook step for the window). Verification: after the window,
  Odin's catalog lists every provider under the new ids, Hermodr lowers
  Bifrost's and Heimdall's surfaces, `heimdall.gamecult.org` and
  `bifrost.gamecult.org` answer, and no daemon logs an unknown-schema refusal.
- **Cut 10 `wire-other-hosts`** (6, 8). Per host, each in its own deploy
  window: Nightwing (Gjallar `Program.cs`, `VerseState.cs`, `gjallar.service`
  semantic id `/thing/tui`; the browser-reference unit
  `nightwing-eve-browser-reference.service` → `nightwing-thing-browser-reference.service`
  with its Idunn target id, restart scripts and health id; Mimir's archived
  `nightwing-eve-dashboard` target renamed in the record only), Raven (Vili
  `vili-daemon.mjs`), Starfire (Stonks `stonks-daemon.cjs`; Mimir
  `mimir.eve_*` → `mimir.thing_*`, assemblies `Mimir.Thing*`, env
  `MIMIR_THING_*`, service ids `mimir-thing-*`; the local VoidBot stack),
  and the remaining providers (weksa, repixelizer with Python compatible ids,
  StreamPixels, AquaSynth, Brokkr, Muninn, Loki, Sai, Ymir). Epiphany is
  skipped (not in scope).
- **Cut 11 `in-repo-prose`** (6, 7). README titles and bodies in the seven
  live repos, `docs/eve-*.md` → `docs/thing-*.md` by `git mv` with the
  "Naming" section added to the Thing README (taxonomy, Thing Script, and the
  sentence that old ids load through compatible ids), `docs/cultui-style-system.md`
  → `docs/thing-script.md`, comments and fixture descriptions, Mimir's and
  CultLib's READMEs. Dated records stay.
- **Cut 12 `aetheria-thing-contents`** (2; only under ruling
  `aetheria-eve-contents = rename-inside`). Unarchive, rename the ~25
  `eve:surface:*` keys, `gamecult.eve.surface.authoring.v1`,
  `aetheria.eve_*`, `org.gamecult.aetheria.eve-runtime`, `conformance/eve/`,
  `Assets/Generated/Eve/**`, props and manifests, re-archive. Under
  `freeze-contents` this cut does not exist.

## Questions (the Self admits these; one fork each)

### `home-repo`: which repo owns the campaign and this map?

Options: **eve-repo** (this file, `F:\Projects\Eve\docs\thing-campaign.md`,
the kernel repo that becomes `Thing`; the body the campaign changes, as
`eureka-body` lives in Huginn); **gamecult-ops** (cross-repo campaigns as ops
memory; but ops is private and the campaign is public by nature);
**Eureka** (the method repo; wrong owner for a product rename). Recommended:
**eve-repo**. The campaign record's `repos` must list the eight by their
*new* names once cut 2 lands; until then the old names, since a `DocRef`
names a commit and the redirect keeps it reachable either way.

### `brand`: how does the deck look on gamecult.org?

Options: **framed-exhibit** (the deck ships with its own consulting look,
unchanged, including its light/dark themes; the brand lives in the blog post
and site chrome around the iframe, and the raw URL opens the exhibit as
itself); **re-skin** (the deck's `:root` tokens become the brand's: ground
`#07111a` with the wash, Montserrat and Ubuntu, accent `#ff8a2a`, single dark
theme); **hybrid** (keep the deck's typography and layout, replace only the
navy with the brand's ground and the blue accent with orange, force dark).
Recommended: **framed-exhibit**. The consulting navy and serif are the joke;
re-skinning it makes an earnest deck out of a parody. Brand doctrine already
admits a scoped variant for typeset essays and already hosts the cat applet
with its own styles; a quoted document in a brand frame is the same move. The
hybrid buys neither the joke nor the brand.

### `wire-names` (ruled: rename-now, `operator-wire-rename-now`)

The shape was `eureka-body:question:wire-names`. Options: **freeze** (every
`gamecult.eve.*.v1`, `mimir.eve_*.v1`, `org.gamecult.eve.*`,
`@gamecult/eve-*`, app ids and `identityId eve` stay; the Thing README
explains them as history; the rule recorded is rename-at-next-epoch);
**rename-at-next-epoch** (each id becomes `gamecult.thing.<name>.v2` in its
next breaking revision, paid for by that revision; UPM ids on the next major);
**rename-now** (a migration of every fixture, conformance pack, consumer
manifest, Rust constant and installed app bought for a name). Recommended:
**freeze**, with rename-at-next-epoch as the standing rule. The deck's own
wave 1 says "redirect old names so nothing breaks"; wire ids have no redirect.

### `aetheria-eve` (ruled: rename-archived, `operator-aetheria-eve-rename`)

Options were: **rename-archived** (unarchive, `gh repo rename AetheriaThing`,
re-archive; three API calls, the deck's "eight" becomes true, the IP premise
is honoured on the org list); **leave** (taxidermy stays named; the family is
seven, as the Projects card already says). Recommended: **rename-archived**;
it is cheap and the stated reason for the campaign is the name itself.

### `dsl-name`: what is the DSL and lowering layer called?

Operator direction (verbatim): "Eve CultUI is indeed misleading, should
become Thing Script or something. ThingML would be hack." Read as a
direction, not a final name. ThingML is also already taken: it is SINTEF's
IoT modelling language, so the collision stands behind the "hack".

What the new name covers, by the four uses above: **(1) the authoring DSL**
and its reactive binding contract, today "CultUI" and "Eve DSL"
interchangeably, including the TUI and GUI streams it lowers to ("Thing
Script lowers to a GUI stream and a TUI stream"); **(2) the retained tree**
keeps being named by its schema (`gamecult.eve.surface.v1`, in prose "a
Thing's surface tree"), and the style system is "Thing Script styles";
**(3) the `cultui-*` anatomy ids** are wire and follow the `wire-names`
ruling; **(4) Unity CultUI** (`org.gamecult.ui`) is CultLib's and keeps its
name, so the memory note's distinction becomes "Unity CultUI is not Thing
Script".

Options: **thing-script** (two words in prose, `thingscript` in identifiers
and as the file extension `.thingscript` for fixtures when they are next
touched; the `.eve` extension is prose-grade, three fixture files);
**thing-dsl** ("Thing DSL", descriptive, no new noun; weaker in sentences
and keeps "DSL" as a name); **keep-cultui** (CultUI stays the DSL's name,
doctrine says "Thing/CultUI"; cheapest, but the operator has called the
pairing misleading). Recommended: **thing-script**, as the operator led
with it and it names exactly use (1) without touching the schema-named tree
or CultLib's package.

### `persona-continuity` (withdrawn; answered outside its options by `operator-retire-persona`)

The Persona is retired and nothing replaces it; cut 5 and invariant
`persona-retired` carry the ruling.

### `aetheria-eve-contents`: does the archived body's code get renamed too?

The repo is renamed (ruled). Its contents: about 25 `eve:surface:*` keys,
`gamecult.eve.surface.authoring.v1`, `aetheria.eve_*`,
`org.gamecult.aetheria.eve-runtime`, `conformance/eve/`, 60 generated Unity
assets, manifests and props (inventory A2, A3). Options: **freeze-contents**
(the repo name changes, the code stays as archived; "rename all" is read as
every *live* id, and an archived body is on no live edge, runs nowhere, and
was ruled taxidermy by the CultCache campaign); **rename-inside** (unarchive,
cut 12, re-archive: a mass edit of dead code that no compatible-id path will
ever exercise). Recommended: **freeze-contents**.

### `member-names`: are eve-named members inside schemas renamed?

Known: `eve_commit` in `gamecult.ghostlight.deployment.v2` and
`deployment_receipt.v2`; Hands will find more while cutting. In TS and
Python a member name is part of schema identity (B10), so renaming one is a
schema revision (`.v3`) with its own migration, not a string swap; in C# it
is not. Options: **keep** (members stay; each is listed as a follow-up for
that schema's next revision); **rename-as-revision** (each affected schema
gets a `.v<n+1>` in this campaign). Recommended: **keep**; a member name is
not an id and is read by nobody as a brand.

### `deck-facts`: are the deck's two factual slips corrected before publishing?

Options: **fix** (the Huginn wave-2 bullet names the site, the AetheriaEve row
says archived; nothing else); **publish-as-is** (a parody is allowed its
errors; the map records them). Recommended: **fix**; both are one-line edits
and the deck is the campaign's public statement of intent.

## Rationale

### Why the deck is cut 1 and not a footnote

The operator said so, and it is also the cheapest honest first move: it
publishes the intent before any name changes, so every later cut can point at
a public statement rather than a private decision.

### Why the applet path and not a content-side HTML file

The overlay applet is the only standalone-HTML path with a live proof on the
site (B4). A content-side `.html` would be a second mechanism for one job.

### Why repo renames come before doctrine and site prose

GitHub redirects make the rename reversible and non-breaking (B2), and every
prose cut wants to write the new URLs once. Doing prose first would write old
URLs that then need a second pass.

### Why same-cut per edge and not a dual-read window

The operator retired schema aliasing in the variants campaign (F7) and agreed
that one string names a schema everywhere (C1). A dual-read window on the
wire would be exactly the alias that ruling deleted, rebuilt for one rename.
The honest unit of atomicity is the live edge: source cuts can land per repo
because nothing is live until deployed, and a Verse redeploys in one window.
Stored records are the one place a second id legitimately lives, and
`CompatibleSchemaIds` already exists for it in three runtimes; Rust lacks it,
so Rust-written stores are treated as the caches they are and rebuilt.

### Why the kernel keeps `v1`

A renamed id with an unchanged shape is the same schema under a new name;
bumping the version would claim a shape change that did not happen and would
force every consumer to treat it as one.

### Why the Persona is archived and not migrated

`operator-retire-persona`: nothing replaces it. The archive keeps the Mind
the repo kept (Persona standard: do not let state rot or vanish), with
provenance, where other retired `.cc` state already lives; removing the
registry entry and the role is what makes the retirement structural, since
VoidBot would otherwise recreate the Face on the next role-addressed chat
(B11).

### Rejected

- Keeping the deck's consulting look as a framed exhibit: revision 1's
  recommendation, overruled by `operator-brand-reskin`. The re-skin keeps the
  parody's structure (exhibits, waterfall, quadrant, TPS) and changes only
  the costume.
- Treating "Eve" in dated blog posts as live prose: they are history; the
  `eve` tag stays, since tag URLs have no redirect.
- A redirect layer on gamecult.org for renamed pages: nothing is renamed on
  the site; the Projects card keeps its URL and changes its content.
- Giving Huginn a cut: it carries no Eve wording (B6).
- A new Persona named Thing: ruled out by `operator-retire-persona`.
- Renaming Yggdrasil's `/srv/repos/Eve` and `/srv/build/Eve`: deployment
  state, not a name anyone reads; an ops cut if ever wanted.
- Renaming Epiphany's `atlas/eve_surface.rs`: Epiphany is being archived.
- The deck as an iframe in the article column (cut 1's shape, live until cut
  `deck-site-page`): overruled by `operator-deck-is-a-site-page`.
- A full-bleed iframe under the masthead: the iframe becomes the scroller,
  so the masthead never leaves the viewport and costs a phone a masthead's
  height on every screen of the deck; two documents load for one page.
- A fixed overlay root like the Graph viewer's: covers the masthead the
  operator asked to present the deck with.
- `@scope (.thing-deck)` instead of prefixed selectors: one line, but newer
  than anything the site relies on (Firefox 128, July 2024); prefixing is
  mechanical and Soul can grep it.
- Inline `<style>` and `<script>` in `Thing.md`: they survive the pipeline,
  but `Description` would index their text as the page's words (B13.4).
- The whole-site reading of "always fullscreen" (chrome as overlays, no
  1680px measure): dropped by the operator's clarification; prose keeps its
  reading-width chrome.

## Fullscreen presentation (revision 4)

The deck went live as cut 1 shaped it: an iframe inside `.gamecult-embed-frame`
in the article column of `/Blog/project-thing`, 85vh tall, with the applet at
`/static/applets/project-thing/index.html`. The operator's words, verbatim:

> we can also certainly do better than just embedding it in the site's body
> chrome. Our site should always be a fullscreen experience

and, asked what "always" covers:

> I'm just saying, the masthead always fills the screen, and the content
> should do the same, where reasonable. Having a body chrome that stops text
> from taking up the full width when you're reading is just good UX. I don't
> see why the Thing page can't be presented with the existing masthead. It's
> the Thing page, on the GameCult site, right?

Admitted as `thing:ruling:operator-deck-is-a-site-page`: the deck is a page
of gamecult.org under the existing masthead, filling the screen below it; it
is not an iframe in the body column. Prose pages keep their reading-width
chrome. This is not a site redesign; the whole-site reading of "always
fullscreen" and the `fullscreen-scope` question were dropped with the ruling.
What this section settles is mechanism.

### B12. How the site lays a page out today

Pinned: gamecult-site `ae0927f1c7e2231a722007233f26847daf68f740` (the polish
cut `cut-deck-polish` is in flight on the applet file; nothing below depends
on that file's contents), GameCult-Quartz `ef43df0`.

- The engine renders every page as `<body data-slug>` > `#quartz-root.page` >
  `#quartz-body` with a left sidebar, `.center` (`.page-header` holding the
  masthead and the `beforeBody` components, then `<article>`, an `<hr>`, the
  `.page-footer`), a right sidebar and the site `Footer`
  (`GameCult-Quartz/quartz/components/renderPage.tsx` lines 267-294).
  `enableSPA: false` (`site/quartz.config.ts`): every navigation is a full
  page load, there is no router, and inline or linked scripts run on load.
- `.page` is `max-width: 1680px; padding: 0 1.2rem 2.5rem` (`custom.scss`
  lines 31-35), so the masthead and all content share one measure; on a
  display wider than 1680px nothing fills the screen. `.page::before` paints
  the fixed grid texture over everything, pointer-events none (lines 37-47).
- Sidebars are grid columns: an empty sidebar is `display: none` and the
  grid collapses to one column (lines 50-85); the left column is the TOC
  (desktop only), the right is the overview sidebar and backlinks. Which
  components render is decided per page by slug predicates in
  `site/quartz.layout.ts` (`isGraphPage`, `isIntegratedDossierPage`,
  `isStandardContentPage`, `isBlogArticle`); Breadcrumbs, ArticleTitle and
  ContentMeta are skipped for `index` and `Graph`.
- The article is a card: `.page > #quartz-body .center > article` has a
  gradient background, 1px border, 24px radius, shadow and
  `padding: 1.45rem 1.7rem 1.9rem` (lines 1089-1099). Reading width inside it
  comes from the page types (`.gamecult-studio-page` 72rem, Ritual Paper
  980px, `max-width: 68ch` on some prose).
- Nothing is full-bleed. The home page and the Projects page are studio
  pages (72rem, right sidebar, no TOC). Ritual Paper is a typographic
  variant inside the same grid (lines 101-630). Two pages reach for more
  room ad hoc: `Blog/the-sleeping-colossus-refuses-the-throne` collapses the
  grid to one column, hides both sidebars and the popover hint by slug
  (lines 1152-1180), still inside the 1680px card; and `Graph`, whose
  viewer bundle mounts `.gamecult-epiphany-graph-root` as
  `position: fixed; inset: 0; z-index: 1000` and sets
  `body.gamecult-graph-spa-active { overflow: hidden }`
  (`GameCult/static/epiphany-graph/assets/viewer.css`), covering the masthead
  and footer rather than removing them. That fixed root is the only visual
  overlay on the site. Revision 3's phrase "overlay applet" meant the build
  overlay (`site/` staged over the engine, B4), not a visual layer: the cat
  and Thing applets are iframes in the article column.
- The masthead (`GameCultMasthead`) is in normal flow, not sticky: title,
  tagline, community links, nav chips. Its tagline is the page's first
  standalone italic quote line after an optional H1, stripped from the
  article by `stripTopTagline` (`site/quartz/components/gamecult.ts` lines
  170-209, 486-505).
- Embeds: `.gamecult-embed-frame` (lines 2388-2400, 2505) is used by three
  pages (the cat post, the Thing post, `Projects/CultPong.md`); the Thing
  post's 85vh override is the slug-scoped rule at lines 1148-1150.

### B13. What Quartz does to raw HTML in a Markdown page

`ObsidianFlavoredMarkdown` runs `rehype-raw` (`ofm.ts` line 544), so HTML in
a `.md` page survives, including `<style>`, `<link>` and `<script>`
elements, which Preact renders to static HTML and the browser executes on
load. Four rules bite a pasted deck:

1. CommonMark HTML blocks that open with `<div`/`<section` end at the first
   blank line; text after a blank line that does not start with `<` is a
   Markdown paragraph (`<p>` wrapping, inline parsing) and a line indented
   four spaces after a blank line is a code block. `<style>` and `<script>`
   blocks end at their closing tag and may contain blank lines. The deck's
   markup (committed HEAD, lines 254-529) has 15 blank lines.
2. `Latex` (remark-math) turns `$...$` into math outside HTML blocks; the
   deck's markup carries no `$`.
3. `CrawlLinks` marks `<a>` elements `internal` or `external` and appends an
   external-link icon SVG to every external link (`links.ts` line 32,
   `externalLinkIcon: true`); the deck has two external links in `.src`.
4. `Description` sets `file.data.text` from the whole tree, which feeds the
   search index and, absent a frontmatter `description`, the page
   description and OG card; inline `<style>`/`<script>` text would be
   indexed as page text. Linked files are not.

Site styles that reach into an in-page deck (`GameCult-Quartz/quartz/styles/base.scss`):
`a { font-weight: 600; color: var(--secondary) }` (line 84), `strong`
(line 80), `h1`-`h6` families, sizes and margins (lines 356-420), `p, li`
line-height (515-517), `table, th, td` (528-545), `ul` list style (37-44),
plus the article card above. The deck's own unscoped selectors that would
reach out: `*`, `:root`, `body`, `h1,h2,h3`, `p`, `b,strong`, `table`,
`td`, `th`, `tr.lit td`, `tr.strike td(::after)`, `[data-reveal]`. Its 110
class names and 14 keyframe names collide with nothing in `custom.scss` or
`base.scss`. The script's only root touch is `document.documentElement`
(line 532: `.rm` for reduced motion, `getComputedStyle(root)` for tokens);
it otherwise reads `window.scrollY`, `innerHeight` and element rects, which
hold for an in-flow deck. The HUD bar and pill are `position: fixed`.

### The shape: the deck is the Thing page

Under `operator-deck-is-a-site-page` the deck becomes one page of the site,
rendered by the engine like every other page, with the masthead above it in
flow and the deck's sections spanning the viewport below it:

- **One copy, in the page.** The deck's markup is the body of a Markdown
  page, wrapped once in `<div class="thing-deck">`, with its blank lines
  removed (B13.1). Its styles and script are two static files the page
  links, `site/quartz/static/thing/deck.css` and `deck.js`, not inline
  (B13.4). The applet file is deleted; its URL becomes a redirect stub so
  `old-names-resolve` holds.
- **Scoped both ways by one class.** Every selector in `deck.css` is
  prefixed `.thing-deck`; `:root` and `body` become `.thing-deck` (tokens,
  font, size, colour; the body `background` is dropped because the site's
  body already paints the same wash); `*` becomes `.thing-deck *`; the `.rm`
  rules become `.thing-deck.rm ...`, and `deck.js` line 532 takes
  `document.querySelector('.thing-deck')` as `root`, so reduced motion and
  `tok()` both read the deck root. Site rules the deck must redeclare inside
  its scope: `a` (weight and colour as the deck had them), `strong`,
  headings' margins, `p` line-height, table cell padding and borders, list
  style; and `.thing-deck .external-icon { display: none }` (B13.3).
  Keyframe names stay (no collision).
- **Masthead above, hero below, stacked.** The deck's hero does not
  duplicate the masthead: the masthead is site identity and navigation, the
  hero is the deck's cover. The hero's sticky stage sticks at `top: 0` once
  the masthead has scrolled off, so the first viewport is masthead plus the
  top of the hero and every later viewport is the deck alone. The masthead
  tagline is the deck's `socialDeck` line, *"Thing renders things."*, given
  as the page's first line and lifted into the masthead by `stripTopTagline`.
  The HUD bar stays fixed at the top (3px, scaled to 0 at rest); the HUD pill
  stays fixed bottom-right (top-right on phones, where it overlaps the
  masthead's community icons until the first scroll; accepted).
- **Page chrome on this page only**, scoped by `body[data-slug="Thing"]` in
  `custom.scss` beside the other slug rules: `.page { max-width: none;
  padding: 0 }` so the deck's `--inv` sections run edge to edge;
  `.page > #quartz-body .center > .page-header { max-width: 1680px;
  margin-inline: auto; padding: 0 1.2rem }` so the masthead keeps the measure
  it has on every other page; the article card loses background, border,
  radius, shadow and padding; the `<hr>` and `.page-footer` margin go. The
  site footer follows the deck's close section. The layout predicates in
  `quartz.layout.ts` gain `isThingPage` and skip Breadcrumbs, ArticleTitle,
  ContentMeta, the overview sidebar and Backlinks for it, as they do for
  `Graph`; with both sidebars empty the existing grid rules give one column.
- **Scripts and the router.** There is no SPA router (`enableSPA: false`);
  `deck.js` runs on every load of the page as `<script src defer>`. Nothing
  to design.
- **The Blog post** `/Blog/project-thing` stays as the dated news item: its
  frontmatter unchanged, its body a paragraph and a link to the Thing page;
  the iframe, the direct link and the slug-scoped 85vh rule go. The Eve card
  item links to the Thing page. `.gamecult-embed-frame` stays for the cat
  post and CultPong.

Not chosen, and why (also under "Rejected"): a full-bleed iframe under the
masthead keeps the deck untouched but makes the iframe the scroller, so the
masthead never scrolls away and the deck loses a masthead's height of every
phone viewport, and the page loads two documents; a fixed overlay like the
Graph's covers the masthead the operator asked to keep; `@scope` instead of
prefixing is one line but is newer than anything the site relies on
(Firefox 128, 2024) and prefixing is mechanical.

### Authority map delta

- Owner of the deck's look: `deck.css`, scoped to `.thing-deck`; it reads no
  site token and the site reads none of it. Owner of the page chrome on the
  Thing page: `custom.scss` under `body[data-slug="Thing"]`, and
  `quartz.layout.ts` for which components render. The engine owns the frame
  (`renderPage.tsx`); it is not edited.
- Derived, display-only: the masthead tagline (from the page's first line);
  the one-column grid (from empty sidebars); the search-index text (from the
  deck's copy, not its CSS or JS).
- Forbidden writers: no site stylesheet styles anything inside
  `.thing-deck`; no deck selector is unprefixed; no second copy of the deck
  exists (the applet file is replaced by a stub that holds no deck markup);
  no iframe, no fixed overlay root, no `overflow: hidden` on body.
- Shared paths: the same Deploy Quartz workflow and Pages origin; the deck's
  fact fixes and the polish cut's edits travel with the markup and script
  unchanged (Soul diffs them against the polish cut's landing head).
- Deletion line: before the page exists, the applet's `<style>`, `<body>`
  and `<script>` are moved out and the applet file is reduced to the stub;
  the embed and the 85vh rule are removed from the post and `custom.scss`.

### Question `thing-page-url`: which URL is the Thing page?

Options: **top-level** (`GameCult/Thing.md`, `/Thing`; a page of the site
like `Pitch` or `tour`, with the masthead's tagline and no article chrome;
`/Blog/project-thing` stays the dated announcement pointing at it; cut 4's
Thing card links to it; the URL outlives the campaign as the family's page);
**blog-post** (`/Blog/project-thing` is the page; `GameCultArticleMeta`,
Breadcrumbs and ArticleTitle must be skipped for one blog slug, the Blog
index lists a post whose body is the deck, and the family's page later
needs another URL anyway). Recommended: **top-level**; the operator called
it "the Thing page", and a dated post is the wrong container for a page
meant to outlive its date. The cut spec `docs/thing-cut-fullscreen.spec.json`
assumes top-level; under blog-post the same spec applies with
`GameCult/Blog/project-thing.md` as the page file, `isThingPage` matching
that slug and `isBlogArticle` excluding it.

### Cut `deck-site-page` (spec `docs/thing-cut-fullscreen.spec.json`)

Repo `gamecult-site`, after `cut-deck-polish` lands (the spec's base is
`ae0927f`; Hands rebases onto the polish cut's landing head and takes the
deck's markup, styles and script from that head, never from the artifact).
Rulings: `operator-deck-is-a-site-page`, `operator-brand-reskin`,
`operator-deck-facts-fix`. Question assumed: `thing-page-url = top-level`.
Structural delta: the 680-line applet becomes a 12-line stub; about 270
lines of markup, 250 of CSS and 150 of JS move into `GameCult/Thing.md`,
`deck.css` and `deck.js`; about 40 lines of `custom.scss` and 8 of
`quartz.layout.ts` are added; 3 lines of `custom.scss` and the post's embed
are removed. No new dependency, no new format.
