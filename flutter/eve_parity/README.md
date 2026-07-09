# Eve Flutter Parity

This is Eve's first Flutter parity renderer body. It exists to prove that
CultUI partitions, inspector rows, and slider anatomy can be lowered through a
shared graphical client instead of being rebuilt separately in every native
toolkit.

Current smoke target:

- `CultUiInspectorSurface`
- custom-painted slider track/fill/thumb
- `EmbeddedSurfaceDemo`, which verifies `surface.slot` /
  `embeddedDocuments` parsing and rendering from the shared fixture
- golden PNG output through `flutter test --update-goldens`

Run from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\capture-flutter-parity.ps1 -Target windows
```

Linux capture requires running the same harness on a Linux host. The Windows
host must not pretend to be a Linux renderer.

Split lifecycle evidence lives in `eveflutter-lifecycle.json`. From the
repository root, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-eveflutter-lifecycle-smoke.ps1
```

That smoke validates the lifecycle document, checks release/test/capture
evidence paths, runs the Dart analyzer through the bundled Dart SDK, and consumes
the exported conformance pack from inside `flutter/eve_parity`. The document is
incubation evidence only: tagged release, test runner ownership, and capture
runner ownership still graduate to the `EveFlutter` repo.
