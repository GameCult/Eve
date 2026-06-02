# Eve Renderer Parity

Parity is currently uneven by design. The shared surface contract is forming,
but the browser reference is the first renderer that can be used as a practical
comparison oracle.

## Current State

| Renderer | Status | Proof | Gap |
| --- | --- | --- | --- |
| Browser | First reference runner | `web/` renders live VoidBot and Fensalir fixture surfaces | Needs visual regression fixtures and command round-trip tests |
| iOS / EveCanvas | Native proof | Renders Odin's fullscreen interface wall from `surface.root`, generic provider trees, and a custom VoidBot cockpit with avatar images | Needs visual regression fixtures for the native Odin wall |
| Android / Periwinkle | Device-edge proof | APK builds and shows broker/sensor status | Install blocked until device allows ADB sideload; dashboard rendering is not implemented |
| Fensalir Direct2D | Documented landing zone | Existing `AquariumUiDocument` and `DirectWriteOverlay` path | Needs adapter from Eve surface document to `AquariumUiDocument` |
| Flutter | Candidate shared native path | Not installed locally | Needs toolchain and client scaffold |

## Spawned Surfaces

The browser reference runner spawns two surfaces:

- `VoidBot Live`: connects to Mimir's `/eve/deck` broker and opens
  `voidbot.swarm`.
- `Fensalir Direct2D`: loads `web/fixtures/fensalir-client-surface.json`, a
  recorded surface describing the Direct2D client lowering path.

Start it with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-browser-reference.ps1
```

Then open:

```text
http://127.0.0.1:8891/
```
