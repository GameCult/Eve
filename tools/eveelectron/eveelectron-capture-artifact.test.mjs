import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildElectronCaptureArtifact } from "./eveelectron-capture-artifact.mjs";

const advertisement = JSON.parse(readFileSync(new URL("../../web/fixtures/aetheria.provider-advertisement.json", import.meta.url), "utf8"));
const capabilityManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-electron/eve-runtime-capability.json", import.meta.url), "utf8"));
const surfaceDocument = JSON.parse(readFileSync(new URL("../../web/fixtures/aetheria-world-surface.json", import.meta.url), "utf8"));
const worldSmokeAdvertisement = JSON.parse(readFileSync(new URL("../../web/fixtures/eve-world-smoke.provider-advertisement.json", import.meta.url), "utf8"));
const worldSmokeSurfaceDocument = JSON.parse(readFileSync(new URL("../../web/fixtures/eve-world-smoke-surface.json", import.meta.url), "utf8"));

test("builds Electron shell projection capture artifact from provider advertisement and surface", () => {
  const { request, projection } = buildElectronCaptureArtifact({
    advertisement,
    capabilityManifest,
    surfaceDocument,
    advertisementPath: "web/fixtures/aetheria.provider-advertisement.json",
    capabilityManifestPath: "runtimes/incubating/eve-electron/eve-runtime-capability.json",
    stamp: "smoke",
  });

  assert.equal(request.artifactPath, "artifacts/eveelectron-capture/smoke/electron-shell.png");
  assert.equal(projection.schema, "gamecult.eve.electron_shell_projection.v1");
  assert.equal(projection.runtimeId, "electron-shell");
  assert.equal(projection.providerId, "aetheria");
  assert.equal(projection.surfaceId, "aetheria.daemon.game");
  assert.equal(projection.commandBoundary, "aetheria.daemon.commands");
  assert.equal(projection.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.equal(projection.artifactKind, "json-projection");
  assert.equal(projection.captureKind, "electron-shell-projection-json");
  assert.equal(projection.root.id, "aetheria.daemon.game.root");
});

test("builds Electron shell projection capture artifact from a generic world provider", () => {
  const { projection } = buildElectronCaptureArtifact({
    advertisement: worldSmokeAdvertisement,
    capabilityManifest,
    surfaceDocument: worldSmokeSurfaceDocument,
    advertisementPath: "web/fixtures/eve-world-smoke.provider-advertisement.json",
    capabilityManifestPath: "runtimes/incubating/eve-electron/eve-runtime-capability.json",
    stamp: "smoke",
  });

  assert.equal(projection.schema, "gamecult.eve.electron_shell_projection.v1");
  assert.equal(projection.runtimeId, "electron-shell");
  assert.equal(projection.providerId, "eve.world-smoke");
  assert.equal(projection.surfaceId, "eve.world-smoke.surface");
  assert.equal(projection.commandBoundary, "eve.world-smoke.commands");
  assert.equal(projection.receiptSchema, "eve.world_smoke.command_receipt.v1");
  assert.equal(projection.root.id, "eve.world-smoke.root");
});
