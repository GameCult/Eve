import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildUnityCaptureRequest } from "./eveunity-capture-contract.mjs";

const advertisement = JSON.parse(readFileSync(new URL("../../web/fixtures/aetheria.provider-advertisement.json", import.meta.url), "utf8"));
const capabilityManifest = JSON.parse(readFileSync(new URL("../../packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json", import.meta.url), "utf8"));
const sceneCapabilityManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-unity-scene/eve-runtime-capability.json", import.meta.url), "utf8"));

test("builds Unity UI Toolkit capture request from provider advertisement", () => {
  const request = buildUnityCaptureRequest({
    advertisement,
    capabilityManifest,
    advertisementPath: "web/fixtures/aetheria.provider-advertisement.json",
    capabilityManifestPath: "packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json",
    stamp: "smoke",
  });

  assert.equal(request.schema, "gamecult.eve.runtime_capture_request.v1");
  assert.equal(request.runtimeId, "unity-uitoolkit");
  assert.equal(request.ownerRepo, "EveUnity");
  assert.equal(request.providerId, "aetheria");
  assert.equal(request.surfaceId, "aetheria.daemon.game");
  assert.equal(request.targetId, "unity-uitoolkit");
  assert.equal(request.projectionKind, "provider-authored-world-surface");
  assert.equal(request.commandBoundary, "aetheria.daemon.commands");
  assert.equal(request.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.equal(request.artifactPath, "artifacts/eveunity-uitoolkit-capture/smoke/unity-uitoolkit.png");
  assert.match(request.authority, /provider state/);
});

test("rejects a capture request when the surface does not advertise the runtime target", () => {
  const withoutTarget = structuredClone(advertisement);
  const surface = withoutTarget.surfaces.find(candidate => candidate.surfaceId === "aetheria.daemon.game");
  surface.worldInteraction.loweringTargets = surface.worldInteraction.loweringTargets.filter(target => target !== "unity-uitoolkit");

  assert.throws(
    () => buildUnityCaptureRequest({ advertisement: withoutTarget, capabilityManifest, stamp: "smoke" }),
    /does not advertise lowering target unity-uitoolkit/,
  );
});

test("builds Unity scene capture request from provider advertisement", () => {
  const request = buildUnityCaptureRequest({
    advertisement,
    capabilityManifest: sceneCapabilityManifest,
    advertisementPath: "web/fixtures/aetheria.provider-advertisement.json",
    capabilityManifestPath: "runtimes/incubating/eve-unity-scene/eve-runtime-capability.json",
    stamp: "smoke",
  });

  assert.equal(request.schema, "gamecult.eve.runtime_capture_request.v1");
  assert.equal(request.runtimeId, "unity-scene");
  assert.equal(request.ownerRepo, "EveUnity");
  assert.equal(request.providerId, "aetheria");
  assert.equal(request.surfaceId, "aetheria.daemon.game");
  assert.equal(request.targetId, "unity-scene");
  assert.equal(request.projectionKind, "provider-authored-world-surface");
  assert.equal(request.commandBoundary, "aetheria.daemon.commands");
  assert.equal(request.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.equal(request.artifactPath, "artifacts/eveunity-scene-capture/smoke/unity-scene.png");
  assert.match(request.authority, /provider state/);
});
