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

This already catches the most embarrassing class of parity lie: a runtime or
fixture claiming to render CultUI while the retained tree no longer contains
the partitions, bindings, tokens, or slider anatomy the renderer is supposed to
lower.

## Runtime Status

The harness tracks every target runtime:

- Web reference: active semantic and screenshot target through Chrome headless.
- iOS / UIKit: screenshot target through SSH and EveCanvas'
  `/var/mobile/Library/EveCanvas/capture-request` service.
- Android / Kotlin: screenshot target through `adb install`, activity launch,
  and `adb exec-out screencap`.
- Windows / Flutter: screenshot target through the Flutter parity golden smoke.
- Linux / Flutter: requires a Linux runner. A Windows host must fail this
  target instead of pretending to be Linux.
- Fensalir Direct2D: specialized native target, adapter/capture still missing.

Pending runtimes are allowed. Silent fake parity is not.

## Next Cuts

1. Move the Flutter parity renderer from hardcoded inspector anatomy to the
   compiled `gamecult.eve.surface.v1` fixture.
2. Wire iOS and Android capture to select a manifest fixture before capture,
   instead of only launching the current app body.
3. Add a Linux runner or WSL/Linux desktop capture body for Flutter.
4. Add Direct2D frame capture once the Eve-to-`AquariumUiDocument` adapter
   exists.
