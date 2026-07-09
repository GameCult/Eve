import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateSchemaSubset } from "../../runtimes/incubating/test-support/schema-subset.mjs";
import { buildUnitySceneCaptureArtifact, buildUnitySceneProjection } from "./eveunity-scene-capture-artifact.mjs";

const unitySceneProjectionSchema = JSON.parse(readFileSync(new URL("../../schemas/gamecult.eve.unity_scene_projection.v1.schema.json", import.meta.url), "utf8"));
const aetheriaAdvertisement = JSON.parse(readFileSync(new URL("../../web/fixtures/aetheria.provider-advertisement.json", import.meta.url), "utf8"));
const capabilityManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-unity-scene/eve-runtime-capability.json", import.meta.url), "utf8"));
const aetheriaSurfaceDocument = JSON.parse(readFileSync(new URL("../../web/fixtures/aetheria-world-surface.json", import.meta.url), "utf8"));
const saiAdvertisement = JSON.parse(readFileSync(new URL("../../web/fixtures/sai-vn.provider-advertisement.json", import.meta.url), "utf8"));
const saiSurfaceDocument = JSON.parse(readFileSync(new URL("../../web/fixtures/sai-vn-surface.json", import.meta.url), "utf8"));

test("builds Unity scene projection capture artifact from provider advertisement and surface", () => {
  const { request, projection } = buildUnitySceneCaptureArtifact({
    advertisement: aetheriaAdvertisement,
    capabilityManifest,
    surfaceDocument: aetheriaSurfaceDocument,
    advertisementPath: "web/fixtures/aetheria.provider-advertisement.json",
    capabilityManifestPath: "runtimes/incubating/eve-unity-scene/eve-runtime-capability.json",
    stamp: "smoke",
  });

  assert.equal(request.artifactPath, "artifacts/eveunity-scene-capture/smoke/unity-scene.png");
  assert.deepEqual(validateSchemaSubset(unitySceneProjectionSchema, projection), []);
  assert.equal(projection.schema, "gamecult.eve.unity_scene_projection.v1");
  assert.equal(projection.runtimeId, "unity-scene");
  assert.equal(projection.providerId, "aetheria");
  assert.equal(projection.surfaceId, "aetheria.daemon.game");
  assert.equal(projection.commandBoundary, "aetheria.daemon.commands");
  assert.equal(projection.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.equal(projection.artifactKind, "json-projection");
  assert.equal(projection.captureKind, "unity-scene-projection-json");
  assert.equal(projection.root.id, "aetheria.daemon.game.root");
  assert.equal(projection.root.children[1].children[0].sceneObjectKind, "world-projection-node");
});

test("marks Sai required and Norn TeX optional sidecar plugin projections", () => {
  const advertisement = structuredClone(saiAdvertisement);
  advertisement.surfaces[0].worldInteraction = {
    projectionKind: "provider-authored-visual-novel-surface",
    commandBoundary: "sai.vn.plugin.commands",
    receiptSchema: "gamecult.eve.command_receipt.v1",
    loweringTargets: ["unity-scene"],
    ownership: "provider-owns-story-state-independent-plugin-sidecars-own-semantics",
  };

  const projection = buildUnitySceneProjection(saiSurfaceDocument, advertisement, "sai.visual_novel.surface");
  assert.deepEqual(validateSchemaSubset(unitySceneProjectionSchema, projection), []);
  const graphNode = projection.root.children.find(child => child.id === "sai.graph");
  const texLayer = projection.root.children.find(child => child.id === "sai.embeds");
  const texNode = texLayer.children.find(child => child.id === "sai.tex.log-power");

  assert.equal(projection.root.pluginProjection.pluginId, "sai.vn");
  assert.equal(projection.root.pluginProjection.semanticOwner, "Sai");
  assert.equal(projection.root.pluginProjection.availability, "required");
  assert.equal(graphNode.pluginProjection.pluginId, "norn.graph");
  assert.equal(graphNode.pluginProjection.semanticOwner, "Norn");
  assert.equal(graphNode.pluginProjection.availability, "optional-nested");
  assert.equal(texNode.pluginProjection.pluginId, "tex.math");
  assert.equal(texNode.pluginProjection.semanticOwner, "EvePlugins");
  assert.equal(texNode.pluginProjection.availability, "optional-nested");
});
