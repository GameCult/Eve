# Eve UI Toolkit Lowering

This package lowers `gamecult.eve.surface.v1` retained surface documents into
Unity UI Toolkit `VisualElement` trees.

It owns native projection only. Providers still own truth, accepted state,
style token values, and command effects through CultMesh/CultNet. Unknown
component kinds degrade to inert containers instead of gaining local semantics.

Plugin semantics enter through runtime plugin hosts. The package includes a
first-party `sai.vn` host proof for `vn.stage`, dialogue panels, action rails,
and story command projection. Sai still owns story state and command semantics;
Unity only owns native projection and emits `gamecult.eve.command.v1` requests.
The package also includes a `norn.graph` host proof for `embed.norn`; Norn still
owns graph layout and graph semantics, while Unity owns the embedded graph shell
and command emission. `tex.math` still passes through as generic Eve component
structure until it gains an explicit Unity plugin host.

This package lives in the Eve repository as the shared Unity lowering target.
Aetheria and other Unity consumers should import it from Eve instead of
carrying local copies.

Nested CultUI regions use component `EmbeddedDocuments`. Pass an
`EmbeddedDocumentResolver` through `EveUiToolkitSurfaceOptions`; the lowerer
mounts the resolved child surface under the slot while preserving the child
document's command surface id.

Discovery and test coverage for this feature live in the shared Eve parity
matrix: `../../tools/parity/parity-manifest.json` names `embeddedDocuments` and
`../../web/fixtures/cultui-embedded-surface.json` is the canonical fixture.
Unity consumers should keep verifier coverage that builds a parent surface with
a resolver-backed child, then checks for the embedded visual element rather than
copying child state into a local adapter.

For Aetheria, the Unity evidence path is:

- `dotnet build GameCult.Aetheria.State.Unity.csproj --no-restore --nologo -v:minimal`
- `dotnet run --project Aetheria.State.Verify\Aetheria.State.Verify.csproj --no-restore`

Those checks sit alongside Eve's shared browser, Flutter, iOS, Android/Kotlin,
and Rust contract tests, all discoverable from the parity manifest.
