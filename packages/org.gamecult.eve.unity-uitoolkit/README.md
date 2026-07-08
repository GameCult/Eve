# Eve UI Toolkit Lowering

This package lowers `gamecult.eve.surface.v1` retained surface documents into
Unity UI Toolkit `VisualElement` trees.

It owns native projection only. Providers still own truth, accepted state,
style token values, and command effects through CultMesh/CultNet. Unknown
component kinds degrade to inert containers instead of gaining local semantics.

Plugin semantics enter through plugin ABI sidecars and advertisements, not
through Unity. This package includes first-party projection adapters for the
`sai.vn` projection surface (`vn.stage`, dialogue panels, action rails, and
story command requests) and the `norn.graph` projection surface (`embed.norn`).
Sai still owns story state and command semantics. Norn still owns graph layout
and graph semantics. Unity only owns native projection of already-declared
plugin capabilities and emits `gamecult.eve.command.v1` requests. `tex.math`
still passes through as generic Eve component structure until it gains an
explicit Unity projection adapter.

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

The runtime capability manifest is
`eve-runtime-capability.json`. Its lifecycle section records the current split
evidence:

- release: incubating UPM package identity and import surface;
- test: package-owned EditMode tests plus Aetheria consumer-build smoke through
  Unity's generated project;
- capture: pending Unity editor or batchmode artifact.

Those lifecycle claims are validated by the parity harness. A missing evidence
path is a runtime capability error, not a README footnote.

For Aetheria, the Unity evidence path is:

- `powershell -ExecutionPolicy Bypass -File ..\..\scripts\run-aetheria-unity-package-smoke.ps1`

Those checks sit alongside Eve's shared browser, Flutter, iOS, Android/Kotlin,
and Rust contract tests, all discoverable from the parity manifest.
