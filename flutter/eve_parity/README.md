# Eve Flutter Parity

This is Eve's first Flutter parity renderer body. It exists to prove that
CultUI partitions, inspector rows, and slider anatomy can be lowered through a
shared graphical client instead of being rebuilt separately in every native
toolkit.

Current smoke target:

- `CultUiInspectorSurface`
- custom-painted slider track/fill/thumb
- golden PNG output through `flutter test --update-goldens`

Run from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\capture-flutter-parity.ps1 -Target windows
```

Linux capture requires running the same harness on a Linux host. The Windows
host must not pretend to be a Linux renderer.
