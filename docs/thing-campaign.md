# Thing: the rename of Eve, map and target

Status: map, Imagination (`imagination-thing`), revision 1 of 2026-10-02.
Campaign slug `thing`. Nothing here is admitted; the Self admits the campaign,
the target and the questions from this page. Questions, cut specs, rulings and
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
| Schema id | `gamecult.eve.<name>.v<n>` in `Eve/schemas/*.schema.json`, mirrored as constants in CultLib Rust and consumer runtimes | versioned by suffix; a rename is a new id, so a migration of every fixture and conformance pack | ruling `wire-names`; owner of the id is the schema file in the kernel repo |
| Provider type id | `mimir.eve_*.v1` and any other provider ids naming eve | provider-versioned | the provider repo, under `wire-names` |
| Package id | `org.gamecult.eve.*` (UPM), `@gamecult/eve-*` (npm, unpublished), `org.gamecult.eve` / `org.gamecult.evecanvas` (installed app ids) | UPM: consumers pin by git URL plus id, a rename breaks every manifest; app ids: a rename is a new app on the device | `wire-names` |
| Persona identity | `identityId: eve` (identity.json), `agentId` in `eve.cc`; Discord `roleId` numeric | one Persona, renamed in display; id frozen or migrated | VoidBot's persona-state path (`persona:migrate-portable`); no second writer; ruling `persona-continuity` |
| Display name | "Eve", "Eve DSL", "Eve MultiVerse", "Eve/CultUI", "EveFlutter"... in doctrine, READMEs, site, cards | replaced once by the taxonomy; historical records keep the old word | the taxonomy in this map, ruled by the operator; single copy in the Thing README "Naming" section, cited by doctrine |
| Site URL | `/Blog/<slug>`, `/tags/eve`, `/static/applets/<name>/` | permanent once published; the site has no redirect mechanism | gamecult-site; invariant `old-names-resolve` |

No cut is mapped on a kind whose cell is empty; none is.

## The authority map

- Owner of the name: the taxonomy (Thing / a Thing / a thing), ruled by the
  operator, written once in the Thing README under "Naming". Doctrine files
  (`F:\Projects\CLAUDE.md`, charters, memory notes) cite it; they do not
  restate it differently.
- Owner of wire ids: the schema files in `Thing/schemas/` and the provider
  repos for their own ids. Under the recommended `wire-names` ruling they are
  frozen at the `eve` spelling for every `v1`; a `gamecult.thing.*` id appears
  only with a breaking revision that is paid for by something else.
- Owner of Persona state: `.voidbot/state/eve.cc` through VoidBot's
  persona-state service. `identity.json` and the site card are derived
  display; they do not decide the Persona's name.
- Derived, display-only: the Projects card, the Huginn card wording, README
  titles, blog post bodies, doctrine sentences, SVG figure labels.
- Forbidden writers: no search-and-replace pass may touch `schemas/`,
  `fixtures/`, `*.cc`, `Packages/manifest.json` pins, `package.json` names,
  `pubspec.yaml` names, Android `applicationId`, iOS bundle ids, or Discord
  ids. A rename of any of those is a cut of its own under a ruling.
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
- `wire-ids-under-ruling`: no stored or published id (`gamecult.eve.*`,
  `mimir.eve_*`, `org.gamecult.eve*`, `@gamecult/eve-*`, `identityId eve`)
  changes except as the `wire-names` ruling allows; EveConformance fixtures and
  exported packs decode unchanged after every cut.
- `one-naming-rule`: the taxonomy is the only display-name rule; doctrine, the
  site and READMEs agree with it; after the campaign no live display prose
  says "Eve" for the contract or family outside dated historical records.
- `persona-continuity`: one Persona, one state file, one writer; the rename
  keeps provenance (`updatedAt`, `storedAt`, history) and introduces no second
  copy of Persona state.
- `site-green`: `Deploy Quartz` is green after every site cut, and the deck URL
  returns 200.
- `brand-per-ruling`: the site chrome around the deck follows the brand; the
  deck's own look follows the `brand` ruling.

Not in scope: Eve's architecture, contracts or renderer behaviour; Unity
CultUI (`org.gamecult.ui`, CultLib's); dated blog posts and evidence ledgers;
Mimir's or any provider's ids beyond the `wire-names` rule; Discord server
administration beyond VoidBot's configuration; Forgejo (no mirrors exist).

## Cut 1: put the deck on the site

Repo: `gamecult-site`. Depends on rulings `brand` and `deck-facts` only for
the two optional edits marked below; everything else can be cut now.

Target shape:

1. `site/quartz/static/applets/project-thing/index.html`: the deck. Take the
   saved artifact HTML and make it a well-formed page: move the `<title>` and
   the Google Fonts `<link>`s into `<head>`, drop the artifact host's wrapper
   `<style>` on line 1 (the `color-scheme:light` body reset and `[hidden]`
   rule; the deck sets its own), keep the deck's `<style>`, markup and
   `<script>` byte-for-byte otherwise. Add
   `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`
   and `<meta charset="utf-8">`. No site CSS is loaded into the deck.
   Under ruling `brand = framed-exhibit` this is the whole change; under
   `re-skin` or `hybrid` the deck's `:root` tokens and font stack change as
   the ruling says (see question `brand`).
2. `GameCult/Blog/project-thing.md`: the news post that frames it.
   Frontmatter: `title: Project Thing`, `description` (one sentence: a board
   discussion document on renaming Eve to Thing), `author: Thing
   Transformation Office`, `date: 2026-10-02`, `tags: [eve, thing, gamecult]`,
   `socialDeck: "Thing renders things."`. Body: one short paragraph naming
   it as a board deck on the rename of Eve, the `gamecult-embed-frame` iframe
   pointing at `/static/applets/project-thing/index.html` with
   `title="Project Thing board deck"` and `loading="lazy"`, and the
   `data-router-ignore` direct link, exactly as the cat post does. The iframe
   needs real height for a scroll-driven deck; if `.gamecult-embed-frame
   iframe` (custom.scss 2390) is shorter than about 80vh, add a scoped rule
   `body[data-slug="Blog/project-thing"] .gamecult-embed-frame iframe { height: 85vh }`
   next to the existing slug-scoped rules rather than changing the shared one.
3. `GameCult/Projects/index.md`, Eve card: add one list item
   `<li><a href="/Blog/project-thing">Project Thing</a> <em>board deck on the rename</em></li>`
   after the EveConformance item. Nothing else on the card changes in this cut.
4. Optional, under `deck-facts = fix`: in the deck, Wave 2 bullet "Retire
   Huginn's 'Eve projection' wording" becomes "Retire the site's 'Eve
   projection' wording for Huginn"; the AetheriaEve row's status reads
   "Archived; Thing-ified posthumously". No other copy changes.

Verification Hands must show: local `.\scripts\quartz\quartz.ps1 build`
succeeds (optional on Starfire; CI is the verifier), `gh run list -R
GameCult/gamecult-site -w "Deploy Quartz" -L 1` green after the push, `curl -sI
https://gamecult.org/static/applets/project-thing/index.html` 200 and
`https://gamecult.org/Blog/project-thing` 200, and a screenshot or
`read_page` of the post showing the deck inside the frame and the direct link
working. Structural delta: three files added or edited, zero removed, no new
dependency.

## Cut order after cut 1

Each cut is one `cut_spec`; `depends_on` is in parentheses.

- **Cut 2 `repo-renames`** (none). For the seven live repos: `gh repo rename
  Thing -R GameCult/Eve` and so on (`ThingUnity`, `ThingFlutter`,
  `ThingElectron`, `ThingTui`, `ThingPlugins`, `ThingConformance`); for
  AetheriaEve as ruling `aetheria-eve` says (unarchive, rename to
  `AetheriaThing`, re-archive, or leave). In the same cut: rename the local
  directories `F:\Projects\Eve*` to match, `git remote set-url origin` in each,
  update `.voidbot/voice/identity.json` `repoName` and `repoPath`, probe that
  `raw.githubusercontent.com/GameCult/Eve/main/.voidbot/voice/eve.png` still
  answers 200 (if not, cut 4 moves the card's image URL first), and run
  `rg "uses: GameCult/Eve" F:\Projects --glob "**/.github/**"` (B2: action
  references do not redirect; any hit is fixed in this cut). Ops wiring
  (inventory A5): fields that *derive a GitHub URL from the repo name* change
  (`Repo = "Eve"` in `idunn-deployment-targets.ps1` if Idunn builds the clone
  URL from it, Hands probes; `Ghostlight/.gitmodules` URL and
  `ghostlight.toml.in`); server filesystem paths (`/srv/repos/Eve`,
  `/srv/build/Eve`, `HERMODR_EVE_*`, `eve_repo=`) stay as they are, since a
  path on Yggdrasil is Idunn-owned deployment state and not a public name;
  moving them is a separate ops cut if ever wanted. Verify with `git
  ls-remote https://github.com/GameCult/Eve.git` still resolving, each
  renamed checkout fetching, and `git submodule update` in Ghostlight.
- **Cut 3 `doctrine-and-memory`** (2). `F:\Projects\CLAUDE.md` lines 23, 24,
  26, 28 ("Eve/CultUI", "native Eve", "CultMesh/Eve surface", "Eve DSL", "Eve
  MultiVerse") and line 90 ("Eve GUI lowerings"); `~/.claude/CLAUDE.md` line
  175; `gamecult-ops/docs/persona-state-standard.md` last paragraph ("Eve,
  overlays, native clients"); `gamecult-ops/docs/eve-crusade-coordination.md`
  and `verse-service-architecture.md` as the inventory lists; memory notes:
  `~/.claude/projects/F--Projects/memory/cultcache-stores-outside-assets.md`
  lines 30-31 and `MEMORY.md` line 119 (reworded with the `dsl-name` ruling
  so the Unity CultUI versus DSL distinction survives: "Unity CultUI is not
  Thing Script" under the recommendation),
  `cultlib-ci-harness.md` line 95 only if the script file is renamed. Leave as
  written: `eureka-memory-organ.md` lines 90, 124, 131 and
  `pending-doctrine-proposals.md` line 36 (historical); low risk, reword in
  passing: `F--Projects-Aetheria/memory/aetheria-legacy-first.md` line 15,
  `aetheria-cultcache-migration.md` line 19. The taxonomy is written once in
  the Thing README "Naming" section and cited from doctrine.
- **Cut 4 `site-prose`** (2). `GameCult/Projects/index.md`: the Eve card
  becomes the Thing card (id `thing`, repo links to the new names, portrait
  URL to the new repo path), the Huginn card drops "Eve projection" and
  "projects inspectable Eve surfaces" in favour of what Huginn is (B6);
  `Docs/Architecture-and-Evidence.md`, `Docs/Site-Architecture.md`,
  `Docs/index.md`, `Pitch.md`, `tour.md`, `stichting.md`,
  `Projects/CultLib.md` per the inventory; the SVG figure
  `static/interactive/portfolio-pitch/figures/surface-web-stack.svg` (two
  "Eve" labels). Dated blog posts and the `eve` tag stay. `Deploy Quartz`
  green.
- **Cut 5 `persona`** (2, ruling `persona-continuity`). Through VoidBot's
  persona-state path: `publicName` and `publicDescription` in `eve.cc`
  renamed with provenance preserved; `identity.json` `displayName: Thing`,
  `avatarUrl` repointed to the repo's own `.voidbot/voice/` (the current URL
  names a dead VoidBot branch, B7); a new portrait `thing.png` per
  `~/.claude/doctrine/images.md` (the deck's own constraints, played
  straight: no orange rock, at least one arm, nothing ordinal); `docs/eve-persona.md`
  → `docs/thing-persona.md` by `git mv` with its text updated;
  `.voidbot/state/README.md` repointed from the nonexistent `docs/eve-face.md`
  to it; the site card image in cut 4 follows. The Discord role's display name is an operator
  action in Discord and is listed, not executed.
- **Cut 6 `in-repo-prose`** (2). README titles and bodies in the eight repos,
  `docs/eve-*.md` → `docs/thing-*.md` by `git mv`, comments and fixture
  descriptions, `EveCanvas`/`EVE*` class prefixes only if the ruling on wire
  names allows (installed app ids are wire). Forbidden-writer rule applies:
  no pass over `schemas/`, fixtures or manifests.
- **Cut 7 `wire-ids`** (6, ruling `wire-names`). Under `freeze`: one
  paragraph in the Thing README "Naming" section: wire ids keep the `eve`
  prefix as history; new breaking revisions take `gamecult.thing.*`. Under
  `rename-now`: the migration, specified then, per id class.

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

### `wire-names`: do the eve-named wire ids get renamed?

The shape is `eureka-body:question:wire-names`. Options: **freeze** (every
`gamecult.eve.*.v1`, `mimir.eve_*.v1`, `org.gamecult.eve.*`,
`@gamecult/eve-*`, app ids and `identityId eve` stay; the Thing README
explains them as history; the rule recorded is rename-at-next-epoch);
**rename-at-next-epoch** (each id becomes `gamecult.thing.<name>.v2` in its
next breaking revision, paid for by that revision; UPM ids on the next major);
**rename-now** (a migration of every fixture, conformance pack, consumer
manifest, Rust constant and installed app bought for a name). Recommended:
**freeze**, with rename-at-next-epoch as the standing rule. The deck's own
wave 1 says "redirect old names so nothing breaks"; wire ids have no redirect.

### `aetheria-eve`: what happens to the archived repo?

Options: **rename-archived** (unarchive, `gh repo rename AetheriaThing`,
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

### `persona-continuity`: is Thing the same Persona as Eve?

Options: **same-persona-renamed** (one `eve.cc`, `publicName` and
description change through VoidBot's path, `identityId eve` frozen under
`wire-names`, history and `storedAt` preserved); **new-persona** (a fresh
Persona "Thing" with new state; Eve's state archived). Recommended:
**same-persona-renamed**; the Persona standard says preserve provenance and
do not let a second writer exist, and the deck itself says "we are not
renaming the product, we are confessing it".

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

### Why wire ids are a ruling and not a cut

A stored id has no redirect. Renaming `gamecult.eve.surface.v1` is a
migration of every fixture, pack, manifest and Rust constant that names it,
across at least four repos and two runtimes, and the campaign's reason (a
character's name on the brand) is not served by it; nobody reads a schema id
and sees a character. The `eureka-body` campaign faced the same fork and
recommended freeze.

### Why the Persona is renamed rather than reborn

Persona state is the Mind the repo keeps (Persona standard). A new Persona
would discard the operating lessons in `eve.cc` to change a display name.

### Rejected

- Re-skinning the deck to the brand (question `brand`): kills the parody.
- Treating "Eve" in dated blog posts as live prose: they are history; the
  `eve` tag stays, since tag URLs have no redirect.
- A redirect layer on gamecult.org for renamed pages: nothing is renamed on
  the site; the Projects card keeps its URL and changes its content.
- Giving Huginn a cut: it carries no Eve wording (B6).
