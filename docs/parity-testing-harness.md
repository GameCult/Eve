# Eve Parity Testing Harness

The parity harness is the shared evidence path for Eve runtimes. It does not
try to prove byte-identical pixels. It proves that every runtime is aiming at
the same provider-owned CultUI surface: same fixture, same retained tree, same
style-token expectations, same control anatomy, and explicit capture gaps.

## Authority

- `tools/parity/parity-manifest.json` owns the fixture matrix, runtime list, and
  expectations.
- `tools/parity/run-parity.mjs` owns semantic fixture checks and report
  generation.
- Runtime capture adapters own screenshots or frame capture for their platform.
- `artifacts/parity/latest.md` and `artifacts/parity/latest.json` are reports,
  not source truth.

The manifest is the cut line. If a fixture or runtime is not in the manifest,
it is not part of the parity claim.

## Run

Semantic checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-parity-harness.ps1
```

Hard screenshot smoke:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-parity-smoke.ps1
```

Nightwing owns the Linux Flutter capture body. If its user-local Flutter SDK is
missing, install it first:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-nightwing-flutter-sdk.ps1
```

The smoke expands every resizable renderer across the manifest's responsive
viewport matrix:

- `phone`: 390 x 844
- `tablet`: 768 x 1024
- `desktop`: 1280 x 720

Device runtimes also capture native physical panel cases when the platform
adapter can control orientation without overriding size. Android currently
emits:

- `native-portrait`: Periwinkle at physical portrait resolution
- `native-landscape`: Periwinkle at physical landscape resolution

The semantic runner writes:

- `artifacts/parity/latest.md`
- `artifacts/parity/latest.json`
- `artifacts/parity/<timestamp>/parity-report.md`
- `artifacts/parity/<timestamp>/parity-report.json`

The smoke runner writes:

- `artifacts/parity-smoke/<timestamp>/parity-smoke.md`
- `artifacts/parity-smoke/<timestamp>/parity-smoke.json`
- one PNG per target that has a real capture body.

## Current Checks

The first pass is semantic and fixture-driven:

- compile local CultUI `.eve` fixtures;
- load local JSON surface fixtures;
- check provider id;
- check required component kinds;
- check minimum component counts where useful;
- check required style tokens;
- check required bindings;
- check retained slider skins and control parts.
- record the responsive viewport matrix used by screenshot smoke.

This already catches the most embarrassing class of parity lie: a runtime or
fixture claiming to render CultUI while the retained tree no longer contains
the partitions, bindings, tokens, or slider anatomy the renderer is supposed to
lower.

## Runtime Status

The harness tracks every target runtime:

- Web reference: active semantic and screenshot target through Chrome headless
  using the provider query parameter.
- Web responsive layout: Chrome headless emits phone, tablet, and desktop PNGs.
- iOS / UIKit: screenshot target through SSH and EveCanvas'
  `/var/mobile/Library/EveCanvas/capture-request` service. Current iOS capture
  is fixed-device until a simulator or device-resize adapter exists.
- Android / Kotlin: screenshot target through `adb install`, activity launch,
  optional `adb shell wm size`, orientation control, and `adb exec-out
  screencap`; the script restores device size and rotation after each viewport.
- Windows / Flutter: screenshot target through the Flutter parity golden smoke,
  with phone, tablet, and desktop goldens.
- Linux / Flutter: screenshot target through Nightwing over SSH. The smoke
  stages `flutter/eve_parity`, runs Flutter goldens on Nightwing, and pulls back
  phone, tablet, and desktop PNGs.
- Fensalir Direct2D: specialized native target, adapter/capture still missing.

Pending runtimes are allowed. Silent fake parity is not.

## Next Cuts

1. Add screenshot comparison metrics that score structure, color tokens,
   bounding boxes, and text presence without pretending byte-identical pixels
   are the goal.
2. Normalize text scale and font loading across web, Flutter, Android, and iOS.
3. Give iOS a real `vn.stage` scene compositor instead of compact stacked
   fixture lowering.
4. Replace Flutter golden screenshots with native window captures once the
   Flutter app body can emit a desktop frame without test harness help.
5. Add Direct2D frame capture once the Eve-to-`AquariumUiDocument` adapter
   exists.
