import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildUnityUiToolkitCaptureArtifact, buildUnityUiToolkitProjection } from "./eveunity-uitoolkit-capture-artifact.mjs";

const aetheriaAdvertisement = JSON.parse(readFileSync(new URL("../../web/fixtures/aetheria.provider-advertisement.json", import.meta.url), "utf8"));
const capabilityManifest = JSON.parse(readFileSync(new URL("../../packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json", import.meta.url), "utf8"));
const aetheriaSurfaceDocument = JSON.parse(readFileSync(new URL("../../web/fixtures/aetheria-world-surface.json", import.meta.url), "utf8"));
const saiAdvertisement = JSON.parse(readFileSync(new URL("../../web/fixtures/sai-vn.provider-advertisement.json", import.meta.url), "utf8"));
const saiSurfaceDocument = JSON.parse(readFileSync(new URL("../../web/fixtures/sai-vn-surface.json", import.meta.url), "utf8"));

test("builds Unity UI Toolkit projection capture artifact from provider advertisement and surface", () => {
  const { request, projection } = buildUnityUiToolkitCaptureArtifact({
    advertisement: aetheriaAdvertisement,
    capabilityManifest,
    surfaceDocument: aetheriaSurfaceDocument,
    advertisementPath: "web/fixtures/aetheria.provider-advertisement.json",
    capabilityManifestPath: "packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json",
    stamp: "smoke",
  });

  assert.equal(request.artifactPath, "artifacts/eveunity-uitoolkit-capture/smoke/unity-uitoolkit.png");
  assert.equal(projection.schema, "gamecult.eve.unity_uitoolkit_projection.v1");
  assert.equal(projection.runtimeId, "unity-uitoolkit");
  assert.equal(projection.providerId, "aetheria");
  assert.equal(projection.surfaceId, "aetheria.daemon.game");
  assert.equal(projection.commandBoundary, "aetheria.daemon.commands");
  assert.equal(projection.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.equal(projection.artifactKind, "json-projection");
  assert.equal(projection.captureKind, "unity-uitoolkit-projection-json");
  assert.equal(projection.root.id, "aetheria.daemon.game.root");
  assert.equal(projection.root.visualElementKind, "VisualElement");
  assert.deepEqual(projection.root.classNames.slice(0, 2), ["eve-component", "eve-kind-surface"]);
});

test("marks Sai required and Norn TeX optional sidecar plugin UI projections", () => {
  const advertisement = structuredClone(saiAdvertisement);
  advertisement.surfaces[0].worldInteraction = {
    projectionKind: "provider-authored-visual-novel-surface",
    commandBoundary: "sai.vn.plugin.commands",
    receiptSchema: "gamecult.eve.command_receipt.v1",
    loweringTargets: ["unity-uitoolkit"],
    ownership: "provider-owns-story-state-independent-plugin-sidecars-own-semantics",
  };

  const projection = buildUnityUiToolkitProjection(saiSurfaceDocument, advertisement, "sai.visual_novel.surface");
  const graphNode = projection.root.children.find(child => child.id === "sai.graph");
  const texLayer = projection.root.children.find(child => child.id === "sai.embeds");
  const texNode = texLayer.children.find(child => child.id === "sai.tex.log-power");

  assert.equal(projection.root.pluginProjection.pluginId, "sai.vn");
  assert.equal(projection.root.pluginProjection.semanticOwner, "Sai");
  assert.equal(projection.root.pluginProjection.availability, "required");
  assert.equal(projection.root.visualElementKind, "SaiVisualNovelStageElement");
  assert.equal(graphNode.pluginProjection.pluginId, "norn.graph");
  assert.equal(graphNode.pluginProjection.semanticOwner, "Norn");
  assert.equal(graphNode.pluginProjection.availability, "optional-nested");
  assert.equal(graphNode.visualElementKind, "NornGraphElement");
  assert.equal(texNode.pluginProjection.pluginId, "tex.math");
  assert.equal(texNode.pluginProjection.semanticOwner, "EvePlugins");
  assert.equal(texNode.pluginProjection.availability, "optional-nested");
  assert.equal(texNode.visualElementKind, "TeXMathElement");
});
