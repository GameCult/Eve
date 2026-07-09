import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildTuiCaptureArtifact } from "./evetui-capture-artifact.mjs";

const advertisement = JSON.parse(readFileSync(new URL("../../web/fixtures/aetheria.provider-advertisement.json", import.meta.url), "utf8"));
const capabilityManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-tui/eve-runtime-capability.json", import.meta.url), "utf8"));
const surfaceDocument = JSON.parse(readFileSync(new URL("../../web/fixtures/aetheria-world-surface.json", import.meta.url), "utf8"));
const worldSmokeAdvertisement = JSON.parse(readFileSync(new URL("../../web/fixtures/eve-world-smoke.provider-advertisement.json", import.meta.url), "utf8"));
const worldSmokeSurfaceDocument = JSON.parse(readFileSync(new URL("../../web/fixtures/eve-world-smoke-surface.json", import.meta.url), "utf8"));

test("builds TUI JSON grid capture artifact from provider advertisement and surface", () => {
  const { request, grid } = buildTuiCaptureArtifact({
    advertisement,
    capabilityManifest,
    surfaceDocument,
    advertisementPath: "web/fixtures/aetheria.provider-advertisement.json",
    capabilityManifestPath: "runtimes/incubating/eve-tui/eve-runtime-capability.json",
    stamp: "smoke",
    width: 72,
  });

  assert.equal(request.artifactKind, "json-grid");
  assert.equal(request.artifactPath, "artifacts/evetui-capture/smoke/tui-grid.json");
  assert.equal(grid.schema, "gamecult.eve.tui_grid.v1");
  assert.equal(grid.runtimeId, "tui");
  assert.equal(grid.providerId, "aetheria");
  assert.equal(grid.surfaceId, "aetheria.daemon.game");
  assert.equal(grid.commandBoundary, "aetheria.daemon.commands");
  assert.equal(grid.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.equal(grid.artifactKind, "json-grid");
  assert.equal(grid.captureKind, "terminal-cell-grid");
  assert.equal(grid.width, 72);
  assert.ok(grid.lines.some(line => line.includes("aetheria.daemon.game")));
});

test("builds TUI JSON grid capture artifact from a generic world provider", () => {
  const { grid } = buildTuiCaptureArtifact({
    advertisement: worldSmokeAdvertisement,
    capabilityManifest,
    surfaceDocument: worldSmokeSurfaceDocument,
    advertisementPath: "web/fixtures/eve-world-smoke.provider-advertisement.json",
    capabilityManifestPath: "runtimes/incubating/eve-tui/eve-runtime-capability.json",
    stamp: "smoke",
    width: 72,
  });

  assert.equal(grid.schema, "gamecult.eve.tui_grid.v1");
  assert.equal(grid.runtimeId, "tui");
  assert.equal(grid.providerId, "eve.world-smoke");
  assert.equal(grid.surfaceId, "eve.world-smoke.surface");
  assert.equal(grid.commandBoundary, "eve.world-smoke.commands");
  assert.equal(grid.receiptSchema, "eve.world_smoke.command_receipt.v1");
  assert.equal(grid.artifactKind, "json-grid");
  assert.equal(grid.captureKind, "terminal-cell-grid");
  assert.ok(grid.lines.some(line => line.includes("eve.world-smoke.surface")));
});
