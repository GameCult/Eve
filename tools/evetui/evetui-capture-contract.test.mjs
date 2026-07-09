import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildTuiCaptureRequest } from "./evetui-capture-contract.mjs";

const advertisement = JSON.parse(readFileSync(new URL("../../web/fixtures/aetheria.provider-advertisement.json", import.meta.url), "utf8"));
const capabilityManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-tui/eve-runtime-capability.json", import.meta.url), "utf8"));

test("builds TUI capture request from provider advertisement", () => {
  const request = buildTuiCaptureRequest({
    advertisement,
    capabilityManifest,
    advertisementPath: "web/fixtures/aetheria.provider-advertisement.json",
    capabilityManifestPath: "runtimes/incubating/eve-tui/eve-runtime-capability.json",
    stamp: "smoke",
  });

  assert.equal(request.schema, "gamecult.eve.runtime_capture_request.v1");
  assert.equal(request.runtimeId, "tui");
  assert.equal(request.ownerRepo, "EveTui");
  assert.equal(request.providerId, "aetheria");
  assert.equal(request.surfaceId, "aetheria.daemon.game");
  assert.equal(request.targetId, "tui");
  assert.equal(request.projectionKind, "provider-authored-world-surface");
  assert.equal(request.commandBoundary, "aetheria.daemon.commands");
  assert.equal(request.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.equal(request.captureKind, "terminal-transcript-or-cell-grid");
  assert.equal(request.artifactKind, "ansi-transcript-or-json-grid");
  assert.equal(request.artifactPath, "artifacts/evetui-capture/smoke/tui-transcript.ansi");
  assert.match(request.authority, /provider state/);
});

test("rejects capture request when the surface does not advertise TUI", () => {
  const withoutTarget = structuredClone(advertisement);
  const surface = withoutTarget.surfaces.find(candidate => candidate.surfaceId === "aetheria.daemon.game");
  surface.worldInteraction.loweringTargets = surface.worldInteraction.loweringTargets.filter(target => target !== "tui");

  assert.throws(
    () => buildTuiCaptureRequest({ advertisement: withoutTarget, capabilityManifest, stamp: "smoke" }),
    /does not advertise lowering target tui/,
  );
});
