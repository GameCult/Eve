import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildElectronCaptureRequest } from "./eveelectron-capture-contract.mjs";

const advertisement = JSON.parse(readFileSync(new URL("../../web/fixtures/aetheria.provider-advertisement.json", import.meta.url), "utf8"));
const capabilityManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-electron/eve-runtime-capability.json", import.meta.url), "utf8"));

test("builds Electron shell capture request from provider advertisement", () => {
  const request = buildElectronCaptureRequest({
    advertisement,
    capabilityManifest,
    advertisementPath: "web/fixtures/aetheria.provider-advertisement.json",
    capabilityManifestPath: "runtimes/incubating/eve-electron/eve-runtime-capability.json",
    stamp: "smoke",
  });

  assert.equal(request.schema, "gamecult.eve.runtime_capture_request.v1");
  assert.equal(request.runtimeId, "electron-shell");
  assert.equal(request.ownerRepo, "EveElectron");
  assert.equal(request.providerId, "aetheria");
  assert.equal(request.surfaceId, "aetheria.daemon.game");
  assert.equal(request.targetId, "electron-shell");
  assert.equal(request.projectionKind, "provider-authored-world-surface");
  assert.equal(request.commandBoundary, "aetheria.daemon.commands");
  assert.equal(request.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.equal(request.artifactPath, "artifacts/eveelectron-capture/smoke/electron-shell.png");
  assert.match(request.authority, /provider state/);
});

test("rejects capture request when the surface does not advertise Electron shell", () => {
  const withoutTarget = structuredClone(advertisement);
  const surface = withoutTarget.surfaces.find(candidate => candidate.surfaceId === "aetheria.daemon.game");
  surface.worldInteraction.loweringTargets = surface.worldInteraction.loweringTargets.filter(target => target !== "electron-shell");

  assert.throws(
    () => buildElectronCaptureRequest({ advertisement: withoutTarget, capabilityManifest, stamp: "smoke" }),
    /does not advertise lowering target electron-shell/,
  );
});
